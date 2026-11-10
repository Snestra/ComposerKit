/*
 * The time zones of the DateTime: the system zone, UTC, fixed offsets and IANA
 * names, each answering with an offset in minutes for an instant.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
const MINUTES_PER_HOUR = 60;
const TWO_DIGITS = 2;
const SHORT_YEAR_LIMIT = 100;

/** Zero-pads the absolute value to `digits`, keeping a minus sign. */
export const pad = (value: number | string, digits: number) => {
  const text = String(Math.abs(Number(value)));
  const sign = Number(value) < 0 ? "-" : "";

  return `${sign}${text.padStart(digits, "0")}`;
};

/** The locale Luxon falls back to: the system's. */
export const systemLocale = () =>
  new Intl.DateTimeFormat().resolvedOptions().locale;

const systemZoneName = () =>
  new Intl.DateTimeFormat().resolvedOptions().timeZone;

const ianaFormatters = new Map<string, Intl.DateTimeFormat>();

const ianaFormatter = (name: string) => {
  let formatter = ianaFormatters.get(name);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      era: "short",
      hour: "numeric",
      hourCycle: "h23",
      minute: "numeric",
      month: "numeric",
      second: "numeric",
      timeZone: name,
      year: "numeric",
    });
    ianaFormatters.set(name, formatter);
  }

  return formatter;
};

const FIXED_ZONE_PREFIX = "utc";
const DIGITS = /^\d{1,2}$/u;

/** Luxon `formatOffset(offset, format)` for an offset in minutes. */
const formatMinutes = (offset: number, style: OffsetStyle) => {
  const hours = Math.trunc(Math.abs(offset / MINUTES_PER_HOUR));
  const minutes = Math.trunc(Math.abs(offset % MINUTES_PER_HOUR));
  const sign = offset >= 0 ? "+" : "-";

  if (style === "short") {
    return `${sign}${pad(hours, TWO_DIGITS)}:${pad(minutes, TWO_DIGITS)}`;
  }

  if (style === "techie") {
    return `${sign}${pad(hours, TWO_DIGITS)}${pad(minutes, TWO_DIGITS)}`;
  }

  return `${sign}${hours}${minutes > 0 ? `:${minutes}` : ""}`;
};

/** Luxon `parseZoneInfo`: the zone name Intl prints for an instant. */
const parseZoneInfo = (
  ts: number,
  format: Intl.DateTimeFormatOptions["timeZoneName"],
  locale: string,
  timeZone: string | undefined
): string | null => {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZoneName: format,
    year: "numeric",
  };

  if (timeZone !== undefined) {
    options.timeZone = timeZone;
  }

  const parsed = new Intl.DateTimeFormat(locale, options)
    .formatToParts(new Date(ts))
    .find((part) => part.type.toLowerCase() === "timezonename");

  return parsed?.value ?? null;
};

type ZoneKind = "fixed" | "iana" | "system";

export type OffsetStyle = "narrow" | "short" | "techie";

/** Luxon `Zone`: an offset in minutes for any instant. */
export class Zone {
  readonly kind: ZoneKind;

  readonly name: string;

  private readonly fixedOffset: number;

  private constructor(kind: ZoneKind, name: string, fixedOffset = 0) {
    this.kind = kind;
    this.name = name;
    this.fixedOffset = fixedOffset;
  }

  static readonly system = new Zone("system", "system");

  static readonly utc = new Zone("fixed", "UTC");

  /** Luxon `FixedOffsetZone.instance`: zero is UTC, others are named by `narrow`. */
  static fixed(minutes: number): Zone {
    if (minutes === 0) {
      return Zone.utc;
    }

    return new Zone("fixed", `UTC${formatMinutes(minutes, "narrow")}`, minutes);
  }

  /** A zone, "system"/"local", "UTC"/"GMT", "UTC+5:30" or an IANA name. */
  static from(zone: Zone | string | undefined): Zone {
    if (zone instanceof Zone) {
      return zone;
    }

    if (zone === undefined || zone === "local" || zone === "system") {
      return Zone.system;
    }

    const lower = zone.toLowerCase();

    if (lower === "utc" || lower === "gmt") {
      return Zone.utc;
    }

    const minutes = Zone.parseFixedOffset(lower);

    return minutes === undefined ? new Zone("iana", zone) : Zone.fixed(minutes);
  }

  /** "utc+5", "utc-05:30" or "utc+0530" as signed minutes. */
  private static parseFixedOffset(lower: string): number | undefined {
    const sign = lower.charAt(FIXED_ZONE_PREFIX.length);

    if (
      !lower.startsWith(FIXED_ZONE_PREFIX) ||
      (sign !== "+" && sign !== "-")
    ) {
      return undefined;
    }

    const rest = lower.slice(FIXED_ZONE_PREFIX.length + 1);

    // Luxon's fixed-offset grammar: one or two hour digits, optional :mm.
    if (!/^\d{1,2}(?::\d{2})?$/u.test(rest)) {
      return undefined;
    }

    const [head = "", clock] = rest.split(":");
    const hourText = clock === undefined ? head.slice(0, TWO_DIGITS) : head;
    const minuteText = clock ?? head.slice(TWO_DIGITS);
    const minutes = minuteText === "" ? "0" : minuteText;

    if (!DIGITS.test(hourText) || !DIGITS.test(minutes)) {
      return undefined;
    }

    const total = Number(hourText) * MINUTES_PER_HOUR + Number(minutes);

    return sign === "-" ? -total : total;
  }

  /** The offset from UTC, in minutes, at the instant `ts`. */
  offset(ts: number): number {
    if (this.kind === "fixed") {
      return this.fixedOffset;
    }

    if (this.kind === "system") {
      return -new Date(ts).getTimezoneOffset();
    }

    const values = new Map<string, number>();
    let isBc = false;

    for (const part of ianaFormatter(this.name).formatToParts(new Date(ts))) {
      if (part.type === "era") {
        isBc = part.value === "BC";
      } else if (part.type !== "literal") {
        values.set(part.type, Math.trunc(Number(part.value)));
      }
    }

    const hour = values.get("hour") ?? 0;
    const parsedYear = values.get("year") ?? 0;
    const year = isBc ? -Math.abs(parsedYear) + 1 : parsedYear;
    const month = values.get("month") ?? 1;
    const day = values.get("day") ?? 1;

    const wallClock = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour === 24 ? 0 : hour,
        values.get("minute") ?? 0,
        values.get("second") ?? 0
      )
    );

    // Date.UTC maps the years 0 to 99 to 1900 to 1999.
    if (year >= 0 && year < SHORT_YEAR_LIMIT) {
      wallClock.setUTCFullYear(year, month - 1, day);
    }

    const utcOfLocal = wallClock.getTime();

    const over = ts % MS_PER_SECOND;
    const wholeSeconds = ts - (over >= 0 ? over : MS_PER_SECOND + over);

    return (utcOfLocal - wholeSeconds) / MS_PER_MINUTE;
  }

  /** Luxon `formatOffset`: `narrow` +H[:m], `short` +HH:mm, `techie` +HHmm. */
  formatOffset(ts: number, style: OffsetStyle): string {
    return formatMinutes(this.offset(ts), style);
  }

  /**
   * Luxon `offsetName`: a fixed zone is named by its offset ("UTC+5:30"); the
   * others ask Intl for the zone's name in `locale`.
   */
  offsetName(
    ts: number,
    format: Intl.DateTimeFormatOptions["timeZoneName"],
    locale: string
  ): string | null {
    if (this.kind === "fixed") {
      return this.name;
    }

    return parseZoneInfo(
      ts,
      format,
      locale,
      this.kind === "iana" ? this.name : undefined
    );
  }

  get zoneName(): string {
    return this.kind === "system" ? systemZoneName() : this.name;
  }

  equals(other: Zone): boolean {
    return this.kind === other.kind && this.name === other.name;
  }
}
