import { pad, systemLocale } from "./zone";

/*
 * Luxon's `Locale`: the locale a DateTime was created with, the string handed to
 * Intl, whether names come from the English tables, and how numbers print.
 * Unspecified locales fall back to the system locale, or to en-US when the
 * formatter asks for `defaultToEN`.
 */

const ROUND_DIGITS = 3;

const resolvedOptionsCache = new Map<
  string,
  Intl.ResolvedDateTimeFormatOptions
>();

const resolvedOptions = (locale: string) => {
  let options = resolvedOptionsCache.get(locale);

  if (options === undefined) {
    options = new Intl.DateTimeFormat(locale).resolvedOptions();
    resolvedOptionsCache.set(locale, options);
  }

  return options;
};

interface ParsedLocale {
  calendar: string | null;
  locale: string;
  numberingSystem: string | null;
}

/** Drops `-x-` and reads the `-u-` extension through Intl. */
const parseLocaleString = (specifier: string): ParsedLocale => {
  const privateUse = specifier.indexOf("-x-");
  const base = privateUse === -1 ? specifier : specifier.slice(0, privateUse);
  const extension = base.indexOf("-u-");

  if (extension === -1) {
    return { calendar: null, locale: base, numberingSystem: null };
  }

  let options: Intl.ResolvedDateTimeFormatOptions;
  let locale = base;

  try {
    options = new Intl.DateTimeFormat(base).resolvedOptions();
  } catch {
    locale = base.slice(0, extension);
    options = new Intl.DateTimeFormat(locale).resolvedOptions();
  }

  return {
    calendar: options.calendar,
    locale,
    numberingSystem: options.numberingSystem,
  };
};

/** A set, non-empty string: what JavaScript's truthiness means for these. */
const isPresent = (value: string | null): value is string =>
  value !== null && value !== "";

const intlString = (
  locale: string,
  numberingSystem: string | null,
  calendar: string | null
) => {
  let intl = locale;

  if (isPresent(calendar) || isPresent(numberingSystem)) {
    if (!intl.includes("-u-")) {
      intl += "-u";
    }

    if (isPresent(calendar)) {
      intl += `-ca-${calendar}`;
    }

    if (isPresent(numberingSystem)) {
      intl += `-nu-${numberingSystem}`;
    }
  }

  return intl;
};

export class Locale {
  readonly calendar: string | null;

  /** The locale Intl is asked for, with any numbering and calendar. */
  readonly intl: string;

  readonly locale: string;

  readonly numberingSystem: string | null;

  /** The locale the DateTime was created with, if any. */
  readonly specified: string | null;

  private constructor(locale: string, specified: string | null) {
    const parsed = parseLocaleString(locale);

    this.locale = parsed.locale;
    this.numberingSystem = parsed.numberingSystem;
    this.calendar = parsed.calendar;
    this.specified = specified;
    this.intl = intlString(this.locale, this.numberingSystem, this.calendar);
  }

  static create(specified: string | null, defaultToEN: boolean): Locale {
    const named = isPresent(specified) ? specified : null;

    return new Locale(named ?? (defaultToEN ? "en-US" : systemLocale()), named);
  }

  /** Whether the locale is English, including a case-sensitive last test. */
  private get isEnglish(): boolean {
    return (
      this.locale === "en" ||
      this.locale.toLowerCase() === "en-us" ||
      resolvedOptions(this.intl).locale.startsWith("en-us")
    );
  }

  /** Names come from the English tables. */
  get usesEnglishNames(): boolean {
    return (
      this.isEnglish &&
      (this.numberingSystem === null || this.numberingSystem === "latn") &&
      (this.calendar === null || this.calendar === "gregory")
    );
  }

  /** An output calendar other than gregory. */
  get usesOtherCalendar(): boolean {
    return this.calendar !== null && this.calendar !== "gregory";
  }

  /** Plain Latin digits need no Intl.NumberFormat. */
  private get fastNumbers(): boolean {
    if (isPresent(this.numberingSystem) && this.numberingSystem !== "latn") {
      return false;
    }

    return (
      this.numberingSystem === "latn" ||
      this.locale === "" ||
      this.locale.startsWith("en") ||
      resolvedOptions(this.locale).numberingSystem === "latn"
    );
  }

  /** Number formatting, as `numberFormatter({ padTo }).format(value)`. */
  num(value: number | string, padTo = 0): string {
    if (this.fastNumbers) {
      const rounded =
        Math.round(Number(value) * 10 ** ROUND_DIGITS) / 10 ** ROUND_DIGITS;

      return pad(rounded, padTo);
    }

    return new Intl.NumberFormat(this.intl, {
      minimumIntegerDigits: padTo > 0 ? padTo : undefined,
      useGrouping: false,
    }).format(Number(value));
  }
}
