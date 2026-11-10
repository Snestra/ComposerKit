import { formatWithTokens } from "./format-tokens";
import type { FormatContext, WeekParts } from "./format-tokens";
import { Locale } from "./locale";
import { Zone } from "./zone";

/*
 * The part of Luxon (MIT) the date picker uses, rebuilt on Intl. The picker
 * takes and returns this DateTime in place of a Luxon DateTime. Time zones are the system zone, UTC, fixed offsets and IANA names.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
const MINUTES_PER_HOUR = 60;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;
const MONTHS_PER_QUARTER = 3;
const DAYS_PER_WEEK = 7;
const ISO_MIN_DAYS_IN_FIRST_WEEK = 4;
const ISO_FIRST_DAY = 1;
const ISO_WEEKDAY_OFFSET = 10;
const LONG_ISO_YEAR_WEEKS = 53;
const SHORT_ISO_YEAR_WEEKS = 52;
const THURSDAY = 4;
const WEDNESDAY = 3;
const SHORT_YEAR_LIMIT = 100;
const FEBRUARY = 2;
const LEAP_YEAR_DAYS = 29;
const COMMON_YEAR_DAYS = 28;
const DAYS_IN_YEAR = 365;
const DAYS_IN_LEAP_YEAR = 366;

export type DateTimeUnit =
  | "day"
  | "hour"
  | "millisecond"
  | "minute"
  | "month"
  | "quarter"
  | "second"
  | "week"
  | "year";

export interface DurationLike {
  days?: number;
  hours?: number;
  milliseconds?: number;
  minutes?: number;
  months?: number;
  quarters?: number;
  seconds?: number;
  weeks?: number;
  years?: number;
}

export interface DateTimeFields {
  day?: number;
  hour?: number;
  millisecond?: number;
  minute?: number;
  month?: number;
  second?: number;
  year: number;
}

type Fields = Required<DateTimeFields>;

export interface DateTimeOptions {
  locale?: string | null;
  zone?: Zone | string;
}

interface ZonePlan {
  instant: DateTime;
  replacesZoneName: boolean;
  timeZone: string | undefined;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** One Intl.DateTimeFormat per locale and options. */
const cachedFormatter = (intl: string, options: Intl.DateTimeFormatOptions) => {
  const key = JSON.stringify([intl, options]);
  let formatter = formatterCache.get(key);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(intl, options);
    formatterCache.set(key, formatter);
  }

  return formatter;
};

const validZones = new Map<string, boolean>();

const isValidTimeZone = (name: string) => {
  let valid = validZones.get(name);

  if (valid === undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: name }).format();
      valid = true;
    } catch {
      valid = false;
    }

    validZones.set(name, valid);
  }

  return valid;
};

/* ------------------------------------------------------------ calendar math */

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const daysInMonthOf = (year: number, month: number) => {
  const index =
    (((month - 1) % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;

  const adjustedYear = year + Math.floor((month - 1) / MONTHS_PER_YEAR);

  if (index === FEBRUARY - 1) {
    return isLeapYear(adjustedYear) ? LEAP_YEAR_DAYS : COMMON_YEAR_DAYS;
  }

  return DAYS_IN_MONTH[index] ?? DAYS_IN_MONTH[0];
};

const utcFromFields = (fields: Fields) => {
  const date = new Date(
    Date.UTC(
      fields.year,
      fields.month - 1,
      fields.day,
      fields.hour,
      fields.minute,
      fields.second,
      fields.millisecond
    )
  );

  // Date.UTC maps years 0..99 to 1900..1999.
  if (fields.year < SHORT_YEAR_LIMIT && fields.year >= 0) {
    date.setUTCFullYear(fields.year);
  }

  return date.getTime();
};

const fieldsFromUtc = (localTs: number): Fields => {
  const date = new Date(localTs);

  return {
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    millisecond: date.getUTCMilliseconds(),
    minute: date.getUTCMinutes(),
    month: date.getUTCMonth() + 1,
    second: date.getUTCSeconds(),
    year: date.getUTCFullYear(),
  };
};

/** Luxon `fixOffset`: the instant whose local time in `zone` is `localTs`. */
const instantFromLocal = (
  localTs: number,
  zone: Zone,
  offsetGuess: number
): number => {
  let utcGuess = localTs - offsetGuess * MS_PER_MINUTE;
  const second = zone.offset(utcGuess);

  if (offsetGuess === second) {
    return utcGuess;
  }

  utcGuess -= (second - offsetGuess) * MS_PER_MINUTE;
  const third = zone.offset(utcGuess);

  if (second === third) {
    return utcGuess;
  }

  return localTs - Math.min(second, third) * MS_PER_MINUTE;
};

/** A calendar day at UTC midnight; `Date.UTC` maps the years 0 to 99 to 19xx. */
const utcDay = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (year >= 0 && year < SHORT_YEAR_LIMIT) {
    date.setUTCFullYear(year, month - 1, day);
  }

  return date.getTime();
};

const weekdayOf = (year: number, month: number, day: number) =>
  new Date(utcDay(year, month, day)).getUTCDay() || DAYS_PER_WEEK;

const ordinalOf = (year: number, month: number, day: number) =>
  Math.round((utcDay(year, month, day) - utcDay(year, 1, 1)) / MS_PER_DAY) + 1;

const isoWeeksInYear = (year: number) => {
  const jan1 = new Date(utcDay(year, 1, 1)).getUTCDay();

  return jan1 === THURSDAY || (jan1 === WEDNESDAY && isLeapYear(year))
    ? LONG_ISO_YEAR_WEEKS
    : SHORT_ISO_YEAR_WEEKS;
};

const isoWeekParts = (fields: Fields): WeekParts => {
  const ordinal = ordinalOf(fields.year, fields.month, fields.day);
  const weekday = weekdayOf(fields.year, fields.month, fields.day);

  let weekNumber = Math.floor(
    (ordinal - weekday + ISO_WEEKDAY_OFFSET) / DAYS_PER_WEEK
  );

  let weekYear = fields.year;

  if (weekNumber < 1) {
    weekYear -= 1;
    weekNumber = isoWeeksInYear(weekYear);
  } else if (weekNumber > isoWeeksInYear(fields.year)) {
    weekYear += 1;
    weekNumber = 1;
  }

  return { ordinal, weekNumber, weekYear };
};

interface WeekInfo {
  firstDay: number;
  minimalDays: number;
}

/** Engines expose the week data as a method or a getter; the lib types lack both. */
type LocaleWithWeekInfo = Intl.Locale & {
  getWeekInfo?: () => Partial<WeekInfo>;
  weekInfo?: Partial<WeekInfo>;
};

/** Luxon's own fallback is Monday and four days when the engine has no data. */
const weekInfoOf = (locale: string): WeekInfo => {
  const intlLocale: LocaleWithWeekInfo = new Intl.Locale(locale);

  const info: Partial<WeekInfo> =
    intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo ?? {};

  const { firstDay = ISO_FIRST_DAY, minimalDays = ISO_MIN_DAYS_IN_FIRST_WEEK } =
    info;

  return { firstDay, minimalDays };
};

/** An ISO weekday counted from the week's first day, 1 to 7. */
const weekdayFrom = (isoWeekday: number, firstDay: number) =>
  ((isoWeekday - firstDay + DAYS_PER_WEEK) % DAYS_PER_WEEK) + 1;

const weekYearShift = (year: number, info: WeekInfo) =>
  -weekdayFrom(weekdayOf(year, 1, info.minimalDays), info.firstDay) +
  info.minimalDays -
  1;

/** The number of weeks in a week-year. */
const localWeeksInYear = (year: number, info: WeekInfo) =>
  ((isLeapYear(year) ? DAYS_IN_LEAP_YEAR : DAYS_IN_YEAR) -
    weekYearShift(year, info) +
    weekYearShift(year + 1, info)) /
  DAYS_PER_WEEK;

/** Week info with the locale's first day and minimal days. */
const localWeekParts = (fields: Fields, locale: string): WeekParts => {
  const info = weekInfoOf(locale);
  const ordinal = ordinalOf(fields.year, fields.month, fields.day);

  const weekday = weekdayFrom(
    weekdayOf(fields.year, fields.month, fields.day),
    info.firstDay
  );

  let weekNumber = Math.floor(
    (ordinal - weekday + 2 * DAYS_PER_WEEK - info.minimalDays) / DAYS_PER_WEEK
  );

  let weekYear = fields.year;

  if (weekNumber < 1) {
    weekYear -= 1;
    weekNumber = localWeeksInYear(weekYear, info);
  } else if (weekNumber > localWeeksInYear(fields.year, info)) {
    weekYear += 1;
    weekNumber = 1;
  }

  return { ordinal, weekNumber, weekYear };
};

/* ---------------------------------------------------------------- DateTime */

const UNIT_ORDER = [
  "year",
  "quarter",
  "month",
  "week",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
] as const satisfies readonly DateTimeUnit[];

const unitIndex = (unit: DateTimeUnit) => UNIT_ORDER.indexOf(unit);

const DURATION_KEY = {
  day: "days",
  hour: "hours",
  millisecond: "milliseconds",
  minute: "minutes",
  month: "months",
  quarter: "quarters",
  second: "seconds",
  week: "weeks",
  year: "years",
} as const satisfies Record<DateTimeUnit, keyof DurationLike>;

const DURATION_KEYS = Object.values(DURATION_KEY);

/** Luxon's default `toLocaleString` format, `DateTime.DATE_SHORT`. */
const DATE_SHORT = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
} as const satisfies Intl.DateTimeFormatOptions;

const negate = (duration: DurationLike): DurationLike => {
  const negated: DurationLike = {};

  for (const key of DURATION_KEYS) {
    const amount = duration[key];

    if (amount !== undefined) {
      negated[key] = -amount;
    }
  }

  return negated;
};

/** An instant with a zone and an optional locale. */
export class DateTime {
  readonly ts: number;

  readonly zone: Zone;

  readonly localeName: string | null;

  private cachedFields: Fields | undefined;

  private constructor(ts: number, zone: Zone, locale: string | null) {
    this.ts = ts;
    this.zone = zone;
    this.localeName = locale;
  }

  static now(): DateTime {
    return new DateTime(Date.now(), Zone.system, null);
  }

  static fromMillis(ms: number, options: DateTimeOptions = {}): DateTime {
    return new DateTime(ms, Zone.from(options.zone), options.locale ?? null);
  }

  static fromJSDate(date: Date, options: DateTimeOptions = {}): DateTime {
    return DateTime.fromMillis(date.getTime(), options);
  }

  static fromObject(
    fields: DateTimeFields,
    options: DateTimeOptions = {}
  ): DateTime {
    const zone = Zone.from(options.zone);

    const full: Fields = {
      day: fields.day ?? 1,
      hour: fields.hour ?? 0,
      millisecond: fields.millisecond ?? 0,
      minute: fields.minute ?? 0,
      month: fields.month ?? 1,
      second: fields.second ?? 0,
      year: fields.year,
    };

    const local = utcFromFields(full);

    return new DateTime(
      instantFromLocal(local, zone, zone.offset(local)),
      zone,
      options.locale ?? null
    );
  }

  static isDateTime(value: unknown): value is DateTime {
    return value instanceof DateTime;
  }

  private get fields(): Fields {
    this.cachedFields ??= fieldsFromUtc(
      this.ts + this.zone.offset(this.ts) * MS_PER_MINUTE
    );

    return this.cachedFields;
  }

  get isValid(): boolean {
    return !Number.isNaN(this.ts);
  }

  /** Luxon `locale`: the specified locale, else the system's. */
  get locale(): string {
    return Locale.create(this.localeName, false).locale;
  }

  get year(): number {
    return this.fields.year;
  }

  get month(): number {
    return this.fields.month;
  }

  get day(): number {
    return this.fields.day;
  }

  get hour(): number {
    return this.fields.hour;
  }

  get minute(): number {
    return this.fields.minute;
  }

  get second(): number {
    return this.fields.second;
  }

  get millisecond(): number {
    return this.fields.millisecond;
  }

  /** 1 (Monday) to 7 (Sunday). */
  get weekday(): number {
    return weekdayOf(this.year, this.month, this.day);
  }

  get daysInMonth(): number {
    return daysInMonthOf(this.year, this.month);
  }

  get zoneName(): string {
    return this.zone.zoneName;
  }

  get offset(): number {
    return this.zone.offset(this.ts);
  }

  toMillis(): number {
    return this.ts;
  }

  valueOf(): number {
    return this.ts;
  }

  toJSDate(): Date {
    return new Date(this.ts);
  }

  setLocale(locale: string | null): DateTime {
    return new DateTime(this.ts, this.zone, locale);
  }

  setZone(
    zone: Zone | string,
    { keepLocalTime = false }: { keepLocalTime?: boolean } = {}
  ): DateTime {
    const next = Zone.from(zone);

    if (next.equals(this.zone)) {
      return this;
    }

    if (keepLocalTime) {
      return DateTime.fromObject(this.fields, {
        locale: this.localeName,
        zone: next,
      });
    }

    return new DateTime(this.ts, next, this.localeName);
  }

  private withFields(fields: Fields): DateTime {
    return new DateTime(
      instantFromLocal(utcFromFields(fields), this.zone, this.offset),
      this.zone,
      this.localeName
    );
  }

  plus(duration: DurationLike): DateTime {
    const { fields } = this;

    const months =
      (duration.months ?? 0) + (duration.quarters ?? 0) * MONTHS_PER_QUARTER;

    const monthIndex = fields.month + months - 1;

    const year =
      fields.year +
      (duration.years ?? 0) +
      Math.floor(monthIndex / MONTHS_PER_YEAR);

    const month =
      (((monthIndex % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR) +
      1;

    const day =
      Math.min(daysInMonthOf(year, month), fields.day) +
      (duration.days ?? 0) +
      (duration.weeks ?? 0) * DAYS_PER_WEEK;

    const millisToAdd =
      (duration.hours ?? 0) * MS_PER_HOUR +
      (duration.minutes ?? 0) * MS_PER_MINUTE +
      (duration.seconds ?? 0) * MS_PER_SECOND +
      (duration.milliseconds ?? 0);

    const moved = this.withFields({ ...fields, day, month, year });

    return millisToAdd === 0
      ? moved
      : new DateTime(moved.ts + millisToAdd, this.zone, this.localeName);
  }

  minus(duration: DurationLike): DateTime {
    return this.plus(negate(duration));
  }

  startOf(unit: DateTimeUnit): DateTime {
    const index = unitIndex(unit);
    const fields = { ...this.fields };

    if (unit === "quarter") {
      fields.month =
        (Math.ceil(fields.month / MONTHS_PER_QUARTER) - 1) *
          MONTHS_PER_QUARTER +
        1;
    }

    if (unit === "year") {
      fields.month = 1;
    }

    if (index <= unitIndex("month")) {
      fields.day = 1;
    }

    if (index <= unitIndex("day")) {
      fields.hour = 0;
    }

    if (index <= unitIndex("hour")) {
      fields.minute = 0;
    }

    if (index <= unitIndex("minute")) {
      fields.second = 0;
    }

    if (index <= unitIndex("second")) {
      fields.millisecond = 0;
    }

    const base = this.withFields(fields);

    return unit === "week" ? base.minus({ days: this.weekday - 1 }) : base;
  }

  endOf(unit: DateTimeUnit): DateTime {
    return this.plus({ [DURATION_KEY[unit]]: 1 })
      .startOf(unit)
      .minus({ milliseconds: 1 });
  }

  /** Luxon `hasSame`: `other` falls in the same `unit` as this, in this zone. */
  hasSame(other: DateTime, unit: DateTimeUnit): boolean {
    const converted = this.setZone(other.zone, { keepLocalTime: true });

    return (
      converted.startOf(unit).ts <= other.ts &&
      other.ts <= converted.endOf(unit).ts
    );
  }

  /**
   * Luxon's `PolyDateFormatter`: Intl formats the instant in an
   * IANA zone or the system zone. A fixed offset uses `Etc/GMT` when Intl knows
   * that whole-hour zone. Otherwise the wall time is formatted as UTC and the
   * zone-name part is replaced by the fixed zone's own name ("UTC+5:30").
   */
  private formatIntlParts(
    intl: string,
    options: Intl.DateTimeFormatOptions
  ): Intl.DateTimeFormatPart[] {
    const plan: ZonePlan =
      options.timeZone === undefined
        ? this.zonePlan()
        : {
            instant: this,
            replacesZoneName: false,
            timeZone: options.timeZone,
          };

    const parts = cachedFormatter(intl, {
      ...options,
      timeZone: plan.timeZone,
    }).formatToParts(plan.instant.toJSDate());

    if (!plan.replacesZoneName) {
      return parts;
    }

    return parts.map((part) =>
      part.type === "timeZoneName"
        ? {
            ...part,
            value:
              this.zone.offsetName(
                plan.instant.ts,
                options.timeZoneName,
                intl
              ) ?? "",
          }
        : part
    );
  }

  /** Which instant and Intl zone `PolyDateFormatter` formats this DateTime in. */
  private zonePlan(): ZonePlan {
    if (this.zone.kind === "iana") {
      return {
        instant: this,
        replacesZoneName: false,
        timeZone: this.zone.name,
      };
    }

    if (this.zone.kind !== "fixed") {
      return { instant: this, replacesZoneName: false, timeZone: undefined };
    }

    const hours = -1 * (this.offset / MINUTES_PER_HOUR);
    const etc = hours >= 0 ? `Etc/GMT+${hours}` : `Etc/GMT${hours}`;

    if (this.offset !== 0 && isValidTimeZone(etc)) {
      return { instant: this, replacesZoneName: false, timeZone: etc };
    }

    return {
      instant:
        this.offset === 0
          ? this
          : this.setZone(Zone.utc).plus({ minutes: this.offset }),
      replacesZoneName: true,
      timeZone: "UTC",
    };
  }

  private formatIntl(
    intl: string,
    options: Intl.DateTimeFormatOptions
  ): string {
    return this.formatIntlParts(intl, options)
      .map(({ value }) => value)
      .join("");
  }

  /** Luxon `toLocaleString`: Intl formatting in this zone and locale. */
  toLocaleString(options?: Intl.DateTimeFormatOptions): string {
    return this.formatIntl(
      Locale.create(this.localeName, false).intl,
      options ?? DATE_SHORT
    );
  }

  private formatContext(): FormatContext {
    // Without a locale Luxon formats names in English (`redefaultToEN`), but
    // a macro token formats in the DateTime's own locale or the system's.
    const names = Locale.create(this.localeName, true);
    const system = Locale.create(this.localeName, false);
    const { fields } = this;

    return {
      day: fields.day,
      hasOtherCalendar: names.usesOtherCalendar,
      hour: fields.hour,
      isEnglish: names.usesEnglishNames,
      iso: isoWeekParts(fields),
      local: localWeekParts(fields, system.locale),
      macro: (options) => this.formatIntl(system.intl, options),
      millisecond: fields.millisecond,
      minute: fields.minute,
      month: fields.month,
      num: (value, padTo) => names.num(value, padTo),
      offset: (style) => this.zone.formatOffset(this.ts, style),
      offsetName: (style) => this.zone.offsetName(this.ts, style, names.locale),
      part: (options, type) =>
        this.formatIntlParts(names.intl, options).find(
          (entry) => entry.type.toLowerCase() === type.toLowerCase()
        )?.value ?? null,
      second: fields.second,
      ts: this.ts,
      weekday: this.weekday,
      year: fields.year,
      zoneName: this.zoneName,
    };
  }

  /** Luxon `toFormat`. */
  toFormat(format: string): string {
    return formatWithTokens(format, this.formatContext());
  }
}

/* ------------------------------------------------------------- picker helpers */

/** A DateTime or a JS Date becomes a DateTime; empty stays null. */
export const toDateTime = (
  value: DateTime | Date | null | undefined
): DateTime | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return DateTime.isDateTime(value) ? value : DateTime.fromJSDate(value);
};

/** Both fall on the same day. */
export const isSameDay = (a: DateTime, b: DateTime) => a.hasSame(b, "day");

/** The day is today in the value's zone. */
export const isToday = (value: DateTime) =>
  isSameDay(value, DateTime.now().setZone(value.zone));

/** `a` is strictly before `b`. */
export const isBefore = (a: DateTime, b: DateTime | undefined) =>
  a.toMillis() < (b?.toMillis() ?? Number.NaN);

/** The start of every day of the month of `value`. */
export const daysOfMonth = (value: DateTime): DateTime[] => {
  const start = value.startOf("month");

  return Array.from({ length: start.daysInMonth }, (_, index) =>
    start.plus({ days: index }).startOf("day")
  );
};

/** Chunks of `size`. */
export const chunk = <T>(items: readonly T[], size = DAYS_PER_WEEK): T[][] => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

/**
 * Luxon `Interval.fromDateTimes(start, end).contains(value)`: an interval whose
 * end is before its start is invalid and contains nothing. The end is
 * exclusive.
 */
export const intervalContains = (
  start: DateTime,
  end: DateTime,
  value: DateTime
) => end.ts >= start.ts && start.ts <= value.ts && end.ts > value.ts;

const SUNDAY_FIRST_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const SUNDAY_2024_01_07 = { day: 7, month: 1, year: 2024 } as const;

/** The weekday labels, Sunday first. */
export const weekdayLabels = (locale: string | undefined): string[] => {
  if (locale === undefined || locale === "") {
    return [...SUNDAY_FIRST_LABELS];
  }

  const sunday = DateTime.fromObject(SUNDAY_2024_01_07);

  return SUNDAY_FIRST_LABELS.map((_, index) =>
    sunday
      .plus({ days: index })
      .setLocale(locale)
      .toLocaleString({
        calendar: "gregory",
        weekday: locale.split("-")[0] === "ar" ? "narrow" : "short",
      })
  );
};

/** "MMMM yyyy" for the locale. */
export const monthLabel = (value: DateTime, locale: string | undefined) =>
  (locale === undefined || locale === ""
    ? value
    : value.setLocale(locale)
  ).toLocaleString({ calendar: "gregory", month: "long", year: "numeric" });

const QUOTED_TEXT = /'(?:[^']|'')*'/gu;

/** The Intl hour options for the hour tokens of a format. */
const hourOptions = (format: string): Intl.DateTimeFormatOptions => {
  if (format.includes("hh")) {
    return { hour: "2-digit", hour12: true };
  }

  if (format.includes("h")) {
    return { hour: "numeric", hour12: true };
  }

  if (format.includes("HH")) {
    return { hour: "2-digit", hour12: false };
  }

  return format.includes("H") ? { hour: "numeric", hour12: false } : {};
};

const monthOption = (format: string): Intl.DateTimeFormatOptions["month"] => {
  if (format.includes("MMMM")) {
    return "long";
  }

  if (format.includes("MMM")) {
    return "short";
  }

  if (format.includes("MM")) {
    return "2-digit";
  }

  return format.includes("M") ? "numeric" : undefined;
};

const numberOption = (
  format: string,
  two: string,
  one: string
): "2-digit" | "numeric" | undefined => {
  if (format.includes(two)) {
    return "2-digit";
  }

  return format.includes(one) ? "numeric" : undefined;
};

/** The Intl options that stand for a Luxon format string. */
const formatOptionsFor = (format: string): Intl.DateTimeFormatOptions => {
  const stripped = format.replaceAll(QUOTED_TEXT, "");

  const options: Intl.DateTimeFormatOptions = {
    calendar: "gregory",
    day: numberOption(stripped, "dd", "d"),
    minute: numberOption(stripped, "mm", "m"),
    month: monthOption(stripped),
    second: numberOption(stripped, "ss", "s"),
    ...hourOptions(stripped),
  };

  if (stripped.includes("y")) {
    options.year = stripped.includes("yyyy") ? "numeric" : "2-digit";
  }

  if (stripped.includes("a")) {
    options.hour12 = true;
  }

  if (stripped.includes("Z")) {
    options.timeZoneName = "shortOffset";
  }

  return options;
};

/** With a locale, Intl options; without, Luxon tokens. */
export const formatValue = (
  value: DateTime,
  format: string,
  locale: string | undefined
) =>
  locale === undefined || locale === ""
    ? value.toFormat(format)
    : value.setLocale(locale).toLocaleString(formatOptionsFor(format));
