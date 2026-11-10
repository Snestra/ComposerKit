import type { OffsetStyle } from "./zone";

/*
 * Luxon's `Formatter.formatDateTimeFromString` as a table of tokens, and `Formatter.parseFormat`. A format string
 * splits into quoted or whitespace literals and runs of one letter; a run that
 * names no token is a macro token (`D`, `tt`, `ffff`, ...) or stays as typed.
 * `toFormat` never prints `Z` for UTC (that is `allowZ`, which only `toISO`
 * sets), and a name Intl cannot find prints as the text "null", as Luxon's
 * string concatenation does.
 */

const TWO_DIGITS = 2;
const THREE_DIGITS = 3;
const FOUR_DIGITS = 4;
const SIX_DIGITS = 6;
const MS_PER_SECOND = 1000;
const TEN_MS = 10;
const HUNDRED_MS = 100;
const MONTHS_PER_QUARTER = 3;
const TWELVE = 12;

type NameStyle = "long" | "narrow" | "short";

export interface WeekParts {
  ordinal: number;
  weekNumber: number;
  weekYear: number;
}

/** What a token reads from the DateTime being formatted. */
export interface FormatContext {
  /** The calendar fields in the DateTime's zone. */
  day: number;
  /** The locale's output calendar is not gregory (`outputCalendar`). */
  hasOtherCalendar: boolean;
  hour: number;
  iso: WeekParts;
  /** Names come from the English tables (`listingMode === "en"`). */
  isEnglish: boolean;
  local: WeekParts;
  /** Formats the macro token's Intl options in the system-default locale. */
  macro: (options: Intl.DateTimeFormatOptions) => string;
  millisecond: number;
  minute: number;
  month: number;
  /** Prints a number in the formatting locale, padded to `padTo` digits. */
  num: (value: number | string, padTo?: number) => string;
  offset: (style: OffsetStyle) => string;
  /** The zone's name in the formatting locale (`zone.offsetName`). */
  offsetName: (style: "long" | "short") => string | null;
  /** One Intl part of the DateTime in the formatting locale. */
  part: (
    options: Intl.DateTimeFormatOptions,
    type: Intl.DateTimeFormatPartTypes
  ) => string | null;
  second: number;
  ts: number;
  weekday: number;
  year: number;
  zoneName: string;
}

type TokenFormatter = (context: FormatContext) => string;

const MONTH_NAMES: Record<NameStyle, readonly string[]> = {
  long: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  short: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
};

const WEEKDAY_NAMES: Record<NameStyle, readonly string[]> = {
  long: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
  narrow: ["M", "T", "W", "T", "F", "S", "S"],
  short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const ERA_NAMES: Record<NameStyle, readonly [string, string]> = {
  long: ["Before Christ", "Anno Domini"],
  narrow: ["B", "A"],
  short: ["BC", "AD"],
};

const lastTwo = (value: number) => String(value).slice(-TWO_DIGITS);

const hour12 = (context: FormatContext) =>
  context.hour % TWELVE === 0 ? TWELVE : context.hour % TWELVE;

interface CalendarField {
  options: Intl.DateTimeFormatOptions;
  type: Intl.DateTimeFormatPartTypes;
}

/**
 * A number token. In a locale whose calendar is not gregory, the day, month
 * and year tokens ask Intl for the field instead.
 */
const digits =
  (
    read: (context: FormatContext) => number | string,
    width = 0,
    calendar?: CalendarField
  ): TokenFormatter =>
  (context) =>
    calendar && context.hasOtherCalendar
      ? String(context.part(calendar.options, calendar.type))
      : context.num(read(context), width);

const month =
  (style: NameStyle, standalone: boolean): TokenFormatter =>
  (context) =>
    context.isEnglish
      ? (MONTH_NAMES[style][context.month - 1] ?? "")
      : String(
          context.part(
            standalone ? { month: style } : { day: "numeric", month: style },
            "month"
          )
        );

const weekday =
  (style: NameStyle, standalone: boolean): TokenFormatter =>
  (context) =>
    context.isEnglish
      ? (WEEKDAY_NAMES[style][context.weekday - 1] ?? "")
      : String(
          context.part(
            standalone
              ? { weekday: style }
              : { day: "numeric", month: "long", weekday: style },
            "weekday"
          )
        );

const era =
  (style: NameStyle): TokenFormatter =>
  (context) =>
    context.isEnglish
      ? ERA_NAMES[style][context.year < 0 ? 0 : 1]
      : String(context.part({ era: style }, "era"));

const dayPeriod: TokenFormatter = (context) =>
  context.isEnglish
    ? (["AM", "PM"][context.hour < TWELVE ? 0 : 1] ?? "")
    : String(context.part({ hour: "numeric", hourCycle: "h12" }, "dayPeriod"));

const zoneOffset =
  (style: OffsetStyle): TokenFormatter =>
  (context) =>
    context.offset(style);

const zoneName =
  (style: "long" | "short"): TokenFormatter =>
  (context) =>
    String(context.offsetName(style));

const DAY: CalendarField = { options: { day: "numeric" }, type: "day" };
const DAY_2: CalendarField = { options: { day: "2-digit" }, type: "day" };

const MONTH_ONLY: CalendarField = {
  options: { month: "numeric" },
  type: "month",
};

const MONTH_2: CalendarField = {
  options: { month: "2-digit" },
  type: "month",
};

const MONTH_DAY: CalendarField = {
  options: { day: "numeric", month: "numeric" },
  type: "month",
};

const MONTH_2_DAY: CalendarField = {
  options: { day: "numeric", month: "2-digit" },
  type: "month",
};

const YEAR: CalendarField = { options: { year: "numeric" }, type: "year" };
const YEAR_2: CalendarField = { options: { year: "2-digit" }, type: "year" };

const TOKENS = new Map<string, TokenFormatter>([
  ["S", digits((c) => c.millisecond)],
  ["u", digits((c) => c.millisecond, THREE_DIGITS)],
  ["SSS", digits((c) => c.millisecond, THREE_DIGITS)],
  ["s", digits((c) => c.second)],
  ["ss", digits((c) => c.second, TWO_DIGITS)],
  ["uu", digits((c) => Math.floor(c.millisecond / TEN_MS), TWO_DIGITS)],
  ["uuu", digits((c) => Math.floor(c.millisecond / HUNDRED_MS))],
  ["m", digits((c) => c.minute)],
  ["mm", digits((c) => c.minute, TWO_DIGITS)],
  ["h", digits(hour12)],
  ["hh", digits(hour12, TWO_DIGITS)],
  ["H", digits((c) => c.hour)],
  ["HH", digits((c) => c.hour, TWO_DIGITS)],
  ["Z", zoneOffset("narrow")],
  ["ZZ", zoneOffset("short")],
  ["ZZZ", zoneOffset("techie")],
  ["ZZZZ", zoneName("short")],
  ["ZZZZZ", zoneName("long")],
  ["z", (c) => c.zoneName],
  ["a", dayPeriod],
  ["d", digits((c) => c.day, 0, DAY)],
  ["dd", digits((c) => c.day, TWO_DIGITS, DAY_2)],
  ["c", digits((c) => c.weekday)],
  ["ccc", weekday("short", true)],
  ["cccc", weekday("long", true)],
  ["ccccc", weekday("narrow", true)],
  ["E", digits((c) => c.weekday)],
  ["EEE", weekday("short", false)],
  ["EEEE", weekday("long", false)],
  ["EEEEE", weekday("narrow", false)],
  ["L", digits((c) => c.month, 0, MONTH_DAY)],
  ["LL", digits((c) => c.month, TWO_DIGITS, MONTH_2_DAY)],
  ["LLL", month("short", true)],
  ["LLLL", month("long", true)],
  ["LLLLL", month("narrow", true)],
  ["M", digits((c) => c.month, 0, MONTH_ONLY)],
  ["MM", digits((c) => c.month, TWO_DIGITS, MONTH_2)],
  ["MMM", month("short", false)],
  ["MMMM", month("long", false)],
  ["MMMMM", month("narrow", false)],
  ["y", digits((c) => c.year, 0, YEAR)],
  ["yy", digits((c) => lastTwo(c.year), TWO_DIGITS, YEAR_2)],
  ["yyyy", digits((c) => c.year, FOUR_DIGITS, YEAR)],
  ["yyyyyy", digits((c) => c.year, SIX_DIGITS, YEAR)],
  ["G", era("short")],
  ["GG", era("long")],
  ["GGGGG", era("narrow")],
  ["kk", digits((c) => lastTwo(c.iso.weekYear), TWO_DIGITS)],
  ["kkkk", digits((c) => c.iso.weekYear, FOUR_DIGITS)],
  ["W", digits((c) => c.iso.weekNumber)],
  ["WW", digits((c) => c.iso.weekNumber, TWO_DIGITS)],
  ["n", digits((c) => c.local.weekNumber)],
  ["nn", digits((c) => c.local.weekNumber, TWO_DIGITS)],
  ["ii", digits((c) => lastTwo(c.local.weekYear), TWO_DIGITS)],
  ["iiii", digits((c) => c.local.weekYear, FOUR_DIGITS)],
  ["o", digits((c) => c.iso.ordinal)],
  ["ooo", digits((c) => c.iso.ordinal, THREE_DIGITS)],
  ["q", digits((c) => Math.ceil(c.month / MONTHS_PER_QUARTER))],
  ["qq", digits((c) => Math.ceil(c.month / MONTHS_PER_QUARTER), TWO_DIGITS)],
  ["X", digits((c) => Math.floor(c.ts / MS_PER_SECOND))],
  ["x", digits((c) => c.ts)],
]);

const DATE_SHORT = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
} as const;

const DATE_MED = { day: "numeric", month: "short", year: "numeric" } as const;
const DATE_FULL = { day: "numeric", month: "long", year: "numeric" } as const;

const DATE_HUGE = {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
} as const;

const TIME_SIMPLE = { hour: "numeric", minute: "numeric" } as const;
const TIME_SECONDS = { ...TIME_SIMPLE, second: "numeric" } as const;
const TIME_SHORT_OFFSET = { ...TIME_SECONDS, timeZoneName: "short" } as const;
const TIME_LONG_OFFSET = { ...TIME_SECONDS, timeZoneName: "long" } as const;
const H23 = { hourCycle: "h23" } as const;

/** Luxon's macro tokens (`Formatter.macroTokenToFormatOpts`). */
const MACRO_TOKENS = new Map<string, Intl.DateTimeFormatOptions>([
  ["D", DATE_SHORT],
  ["DD", DATE_MED],
  ["DDD", DATE_FULL],
  ["DDDD", DATE_HUGE],
  ["F", { ...DATE_SHORT, ...TIME_SECONDS }],
  ["FF", { ...DATE_MED, ...TIME_SECONDS }],
  ["FFF", { ...DATE_FULL, ...TIME_SHORT_OFFSET }],
  ["FFFF", { ...DATE_HUGE, ...TIME_LONG_OFFSET }],
  ["T", { ...TIME_SIMPLE, ...H23 }],
  ["TT", { ...TIME_SECONDS, ...H23 }],
  ["TTT", { ...TIME_SHORT_OFFSET, ...H23 }],
  ["TTTT", { ...TIME_LONG_OFFSET, ...H23 }],
  ["f", { ...DATE_SHORT, ...TIME_SIMPLE }],
  ["ff", { ...DATE_MED, ...TIME_SIMPLE }],
  ["fff", { ...DATE_FULL, ...TIME_SIMPLE, timeZoneName: "short" }],
  ["ffff", { ...DATE_HUGE, ...TIME_SIMPLE, timeZoneName: "long" }],
  ["t", TIME_SIMPLE],
  ["tt", TIME_SECONDS],
  ["ttt", TIME_SHORT_OFFSET],
  ["tttt", TIME_LONG_OFFSET],
]);

interface FormatPiece {
  literal: boolean;
  val: string;
}

const WHITESPACE_ONLY = /^\s+$/u;

/** Luxon `Formatter.parseFormat`: quoted text and whitespace are literals. */
const parseFormat = (format: string): FormatPiece[] => {
  const pieces: FormatPiece[] = [];
  let current: string | null = null;
  let currentFull = "";
  let bracketed = false;

  for (const char of format) {
    if (char === "'") {
      if (currentFull.length > 0 || bracketed) {
        pieces.push({
          literal: bracketed || WHITESPACE_ONLY.test(currentFull),
          val: currentFull === "" ? "'" : currentFull,
        });
      }

      current = null;
      currentFull = "";
      bracketed = !bracketed;
    } else if (bracketed || char === current) {
      currentFull += char;
    } else {
      if (currentFull.length > 0) {
        pieces.push({
          literal: WHITESPACE_ONLY.test(currentFull),
          val: currentFull,
        });
      }

      currentFull = char;
      current = char;
    }
  }

  if (currentFull.length > 0) {
    pieces.push({
      literal: bracketed || WHITESPACE_ONLY.test(currentFull),
      val: currentFull,
    });
  }

  return pieces;
};

const formatToken = (token: string, context: FormatContext): string => {
  const formatter = TOKENS.get(token);

  if (formatter) {
    return formatter(context);
  }

  const macro = MACRO_TOKENS.get(token);

  return macro ? context.macro(macro) : token;
};

/** Luxon `toFormat`. */
export const formatWithTokens = (format: string, context: FormatContext) =>
  parseFormat(format)
    .map((piece) =>
      piece.literal ? piece.val : formatToken(piece.val, context)
    )
    .join("");
