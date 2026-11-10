/*
 * The compact age the sidebar prints in its hover cards: 48 minutes is "48m", 90 minutes "1h", 5 hours "5h",
 * 33 hours "1d", 8 days "1w" and 41 days "1mo". Each unit is floored.
 * Under a minute (and any future time) reads "just now". The week to month
 * step happens at 30 days.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const UNITS = [
  { size: YEAR, suffix: "y" },
  { size: MONTH, suffix: "mo" },
  { size: WEEK, suffix: "w" },
  { size: DAY, suffix: "d" },
  { size: HOUR, suffix: "h" },
  { size: MINUTE, suffix: "m" },
] as const;

/** `updatedAt` and `now` are epoch milliseconds. */
const formatRelativeTime = (updatedAt: number, now: number): string => {
  const age = now - updatedAt;
  const unit = UNITS.find(({ size }) => age >= size);

  return unit === undefined
    ? "just now"
    : `${Math.floor(age / unit.size)}${unit.suffix}`;
};

export { formatRelativeTime };
