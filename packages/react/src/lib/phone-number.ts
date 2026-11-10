/*
 * Phone number parsing and formatting of the phone input, based on
 * libphonenumber-js: the metadata model, number extraction, parsing,
 * formatting and the PhoneNumber class. The metadata object is in
 * lib/phone-metadata.ts and the as-you-type formatter in
 * lib/phone-as-you-type.ts. Only the code the phone input reaches is included:
 * PhoneNumber.formatNational, parsing with the library defaults, and what the
 * as-you-type formatter calls. Non-geographic "001" countries are left out, and the metadata is version 4.
 *
 * libphonenumber-js is distributed under this licence:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 @catamphetamine <purecatamphetamine@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/* oxlint-disable max-classes-per-file, complexity, prefer-named-capture-group, unicorn/prefer-string-slice -- The module keeps the classes and the long functions of libphonenumber-js, its capture groups are read by number, and substring swaps its arguments where slice does not, as the library relies on. */
/* oxlint-disable require-unicode-regexp -- libphonenumber-js compiles every pattern without the u flag, and the metadata patterns are not valid in unicode mode. */
/* oxlint-disable typescript/strict-boolean-expressions, typescript/prefer-nullish-coalescing, unicorn/no-useless-undefined -- The code relies on JavaScript truthiness (undefined, null and the empty string all mean "no value") and on explicit undefined results; rewriting those tests would risk changing behaviour. */
import { phoneMetadata } from "./phone-metadata";
import type {
  MetadataCell,
  MetadataRow,
  PhoneMetadata,
} from "./phone-metadata";

/* ------------------------------------------------------------------ */
/* Character sets.                              */
/* ------------------------------------------------------------------ */

const VALID_DIGITS = "0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9";
const DASHES = "-\u2010-\u2015\u2212\u30FC\uFF0D";
const SLASHES = "\uFF0F/";
const DOTS = "\uFF0E.";
const WHITESPACE = " \u00A0\u00AD\u200B\u2060\u3000";
const BRACKETS = "()\uFF08\uFF09\uFF3B\uFF3D\\[\\]";
const TILDES = "~\u2053\u223C\uFF5E";
const VALID_PUNCTUATION = `${DASHES}${SLASHES}${DOTS}${WHITESPACE}${BRACKETS}${TILDES}`;
const PLUS_CHARS = "+\uFF0B";

// The digits of other scripts and the digit they stand for.
const DIGIT_RANGE_STARTS = [0x30, 0xff_10, 0x6_60, 0x6_f0];
const DIGIT_VALUES = new Map<string, string>();

for (const start of DIGIT_RANGE_STARTS) {
  for (let digit = 0; digit < 10; digit += 1) {
    DIGIT_VALUES.set(String.fromCodePoint(start + digit), String(digit));
  }
}

const parseDigit = (character: string) => DIGIT_VALUES.get(character);

const parseDigits = (text: string) => {
  let digits = "";

  for (const character of text.split("")) {
    digits += parseDigit(character) ?? "";
  }

  return digits;
};

// A plus sign is kept only before everything else; a later one ends the
// number, and the callback learns that.
const parsePhoneNumberCharacter = (
  character: string,
  previousParsed: string,
  onEnd?: (event: "end") => void
) => {
  if (character === "+") {
    if (previousParsed) {
      onEnd?.("end");

      return undefined;
    }

    return "+";
  }

  return parseDigit(character);
};

const parseIncompletePhoneNumber = (text: string) => {
  let parsed = "";

  for (const character of text.split("")) {
    parsed += parsePhoneNumberCharacter(character, parsed) ?? "";
  }

  return parsed;
};

/* ------------------------------------------------------------------ */
/* Metadata model.                  */
/* ------------------------------------------------------------------ */

// Metadata cells are JSON: a cell is a string, a number (0 stands for "none")
// or a list.
const stringAt = (row: MetadataRow | undefined, index: number) => {
  const cell = row?.[index];

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The metadata is JSON: a cell is a string, a number or a list.
  return typeof cell === "string" && cell !== "" ? cell : undefined;
};

const isRow = (cell: MetadataCell | undefined): cell is MetadataRow =>
  Array.isArray(cell);

const rowAt = (row: MetadataRow | undefined, index: number) => {
  const cell = row?.[index];

  return isRow(cell) ? cell : undefined;
};

const rowsAt = (row: MetadataRow | undefined, index: number) =>
  rowAt(row, index)?.filter((cell): cell is MetadataRow => isRow(cell));

const numbersAt = (row: MetadataRow | undefined, index: number) =>
  rowAt(row, index)?.filter(
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The metadata is JSON: a cell is a string, a number or a list.
    (cell): cell is number => typeof cell === "number"
  );

const FIRST_GROUP_ONLY = /^\(?\$1\)?$/;

// One number format of a numbering plan.
class NumberFormat {
  private readonly row: MetadataRow;
  private readonly plan: NumberingPlan;

  constructor(row: MetadataRow, plan: NumberingPlan) {
    this.row = row;
    this.plan = plan;
  }

  pattern() {
    return stringAt(this.row, 0) ?? "";
  }

  format() {
    return stringAt(this.row, 1) ?? "";
  }

  leadingDigitsPatterns() {
    return (rowAt(this.row, 2) ?? []).filter(
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The metadata is JSON: a cell is a string, a number or a list.
      (cell): cell is string => typeof cell === "string"
    );
  }

  nationalPrefixFormattingRule() {
    return stringAt(this.row, 3) ?? this.plan.nationalPrefixFormattingRule();
  }

  nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
    return (
      Boolean(this.row[4]) ||
      this.plan.nationalPrefixIsOptionalWhenFormattingInNationalFormat()
    );
  }

  nationalPrefixIsMandatoryWhenFormattingInNationalFormat() {
    return (
      this.usesNationalPrefix() &&
      !this.nationalPrefixIsOptionalWhenFormattingInNationalFormat()
    );
  }

  usesNationalPrefix() {
    const rule = this.nationalPrefixFormattingRule();

    return !(!rule || FIRST_GROUP_ONLY.test(rule));
  }

  internationalFormat() {
    return stringAt(this.row, 5) ?? this.format();
  }
}

// The pattern of one number type.
class NumberType {
  private readonly row: MetadataRow;
  private readonly plan: NumberingPlan;

  constructor(row: MetadataRow, plan: NumberingPlan) {
    this.row = row;
    this.plan = plan;
  }

  pattern() {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The metadata is JSON: a cell is a string, a number or a list.
    return typeof this.row[0] === "string" ? this.row[0] : undefined;
  }

  possibleLengths() {
    return numbersAt(this.row, 1) ?? this.plan.possibleLengths();
  }
}

// The positions of the number types in a type list.
const NUMBER_TYPE_INDEX = new Map([
  ["FIXED_LINE", 0],
  ["MOBILE", 1],
  ["PAGER", 7],
  ["PERSONAL_NUMBER", 4],
  ["PREMIUM_RATE", 3],
  ["SHARED_COST", 9],
  ["TOLL_FREE", 2],
  ["UAN", 6],
  ["VOICEMAIL", 5],
  ["VOIP", 8],
]);

const DEFAULT_EXTENSION_PREFIX = " ext. ";

// One numbering plan, a country or a non-geographic calling code.
class NumberingPlan {
  private readonly row: MetadataRow;
  private readonly owner: Metadata;

  constructor(row: MetadataRow, owner: Metadata) {
    this.row = row;
    this.owner = owner;
  }

  callingCode() {
    return stringAt(this.row, 0) ?? "";
  }

  private defaultRow() {
    return this.owner.getNumberingPlanMetadata(this.callingCode());
  }

  IDDPrefix() {
    return this.row[1];
  }

  nationalNumberPattern() {
    return stringAt(this.row, 2);
  }

  possibleLengths() {
    return numbersAt(this.row, 3);
  }

  formats() {
    const rows = rowsAt(this.row, 4) ?? rowsAt(this.defaultRow(), 4) ?? [];

    return rows.map((row) => new NumberFormat(row, this));
  }

  nationalPrefix() {
    return stringAt(this.row, 5);
  }

  nationalPrefixFormattingRule() {
    return stringAt(this.row, 6) ?? stringAt(this.defaultRow(), 6);
  }

  _nationalPrefixForParsing() {
    return stringAt(this.row, 7);
  }

  nationalPrefixForParsing() {
    return this._nationalPrefixForParsing() ?? this.nationalPrefix();
  }

  nationalPrefixTransformRule() {
    return stringAt(this.row, 8);
  }

  nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
    return Boolean(this.row[9]) || Boolean(this.defaultRow()?.[9]);
  }

  leadingDigits() {
    return stringAt(this.row, 10);
  }

  private types() {
    return rowAt(this.row, 11);
  }

  hasTypes() {
    const types = this.types();

    return types !== undefined && types.length > 0;
  }

  type(name: string) {
    const index = NUMBER_TYPE_INDEX.get(name);
    const entry = this.hasTypes() ? this.types()?.[index ?? -1] : undefined;

    return isRow(entry) ? new NumberType(entry, this) : undefined;
  }

  ext() {
    return stringAt(this.row, 13) ?? DEFAULT_EXTENSION_PREFIX;
  }
}

const IS_DIGITS = /^\d+$/;

// The metadata object with the selected numbering plan.
class Metadata {
  readonly metadata: PhoneMetadata;
  numberingPlan: NumberingPlan | undefined;

  constructor(metadata: PhoneMetadata) {
    this.metadata = metadata;
  }

  getCountries() {
    return Object.keys(this.metadata.countries).filter(
      (country) => country !== "001"
    );
  }

  getCountryMetadata(country: string) {
    return Object.hasOwn(this.metadata.countries, country)
      ? this.metadata.countries[country]
      : undefined;
  }

  nonGeographic() {
    return this.metadata.nonGeographic;
  }

  hasCountry(country: string) {
    return this.getCountryMetadata(country) !== undefined;
  }

  hasCallingCode(callingCode: string) {
    return (
      this.getCountryCodesForCallingCode(callingCode) !== undefined ||
      Boolean(this.nonGeographic()[callingCode])
    );
  }

  isNonGeographicCallingCode(callingCode: string) {
    return Boolean(this.nonGeographic()[callingCode]);
  }

  selectNumberingPlan(countryOrCallingCode: string) {
    let country: string | undefined;
    let callingCode: string | undefined;

    if (countryOrCallingCode) {
      if (IS_DIGITS.test(countryOrCallingCode)) {
        callingCode = countryOrCallingCode;
      } else {
        country = countryOrCallingCode;
      }
    }

    if (country && country !== "001") {
      const row = this.getCountryMetadata(country);

      if (!row) {
        throw new Error(`Unknown country: ${country}`);
      }

      this.numberingPlan = new NumberingPlan(row, this);
    } else if (callingCode) {
      if (!this.hasCallingCode(callingCode)) {
        throw new Error(`Unknown calling code: ${callingCode}`);
      }

      const row = this.getNumberingPlanMetadata(callingCode);

      if (!row) {
        throw new Error(`Unknown calling code: ${callingCode}`);
      }

      this.numberingPlan = new NumberingPlan(row, this);
    } else {
      this.numberingPlan = undefined;
    }

    return this;
  }

  getCountryCodesForCallingCode(callingCode: string) {
    const countries = this.countryCallingCodes()[callingCode];

    if (countries) {
      return countries.length === 1 && countries[0]?.length === 3
        ? undefined
        : countries;
    }

    return undefined;
  }

  getCountryCodeForCallingCode(callingCode: string) {
    return this.getCountryCodesForCallingCode(callingCode)?.[0];
  }

  getNumberingPlanMetadata(callingCode: string) {
    const country = this.getCountryCodeForCallingCode(callingCode);

    if (country) {
      return this.getCountryMetadata(country);
    }

    return this.nonGeographic()[callingCode];
  }

  countryCallingCodes() {
    return this.metadata.country_calling_codes;
  }

  hasSelectedNumberingPlan() {
    return this.numberingPlan !== undefined;
  }

  // The selected plan; libphonenumber-js throws a TypeError without one.
  plan() {
    if (!this.numberingPlan) {
      throw new TypeError("No numbering plan is selected");
    }

    return this.numberingPlan;
  }

  countryCallingCode() {
    return this.plan().callingCode();
  }

  nationalNumberPattern() {
    return this.plan().nationalNumberPattern();
  }

  possibleLengths() {
    return this.plan().possibleLengths();
  }

  formats() {
    return this.plan().formats();
  }

  nationalPrefixTransformRule() {
    return this.plan().nationalPrefixTransformRule();
  }

  leadingDigits() {
    return this.plan().leadingDigits();
  }

  type(name: string) {
    return this.plan().type(name);
  }

  hasTypes() {
    return this.plan().hasTypes();
  }

  ext() {
    return this.plan().ext();
  }
}

const getCountryCallingCode = (country: string, data: PhoneMetadata) => {
  const metadata = new Metadata(data);

  if (metadata.hasCountry(country)) {
    return metadata.selectNumberingPlan(country).countryCallingCode();
  }

  throw new Error(`Unknown country: ${country}`);
};

const isSupportedCountry = (country: string, data: PhoneMetadata) =>
  Object.hasOwn(data.countries, country);

/* ------------------------------------------------------------------ */
/* Number lengths and types.                                           */
/* ------------------------------------------------------------------ */

const matchesEntirely = (
  text: string | undefined,
  pattern: string | undefined
) => new RegExp(`^(?:${pattern})$`).test(text ?? "");

type NumberLengthStatus =
  | "INVALID_LENGTH"
  | "IS_POSSIBLE"
  | "TOO_LONG"
  | "TOO_SHORT";

// How the length of a national number fits the possible lengths of
// the country (or of the selected numbering plan).
const checkNumberLength = (
  nationalNumber: string,
  country: string | undefined,
  metadata: Metadata
): NumberLengthStatus => {
  let selected = metadata;

  if (country) {
    selected = new Metadata(metadata.metadata);
    selected.selectNumberingPlan(country);
  }

  const possibleLengths = selected.possibleLengths();

  if (!possibleLengths) {
    return "IS_POSSIBLE";
  }

  const { length } = nationalNumber;
  const [shortest] = possibleLengths;

  if (shortest === length) {
    return "IS_POSSIBLE";
  }

  if (shortest !== undefined && shortest > length) {
    return "TOO_SHORT";
  }

  const longest = possibleLengths.at(-1);

  if (longest !== undefined && longest < length) {
    return "TOO_LONG";
  }

  return possibleLengths.includes(length, 1) ? "IS_POSSIBLE" : "INVALID_LENGTH";
};

// The number fits the pattern of the type.
const matchesNumberType = (
  nationalNumber: string,
  typeName: string,
  metadata: Metadata
) => {
  const type = metadata.type(typeName);

  if (!type?.pattern()) {
    return false;
  }

  const lengths = type.possibleLengths();

  if (lengths && !lengths.includes(nationalNumber.length)) {
    return false;
  }

  return matchesEntirely(nationalNumber, type.pattern());
};

// The order in which the types other than fixed line are tried.
const NUMBER_TYPES_AFTER_FIXED_LINE = [
  "MOBILE",
  "PREMIUM_RATE",
  "TOLL_FREE",
  "SHARED_COST",
  "VOIP",
  "PERSONAL_NUMBER",
  "PAGER",
  "UAN",
  "VOICEMAIL",
];

// The type of a national number of a country, undefined when none fits.
const getNumberType = (
  nationalNumber: string,
  country: string,
  data: PhoneMetadata
) => {
  const metadata = new Metadata(data);

  metadata.selectNumberingPlan(country);

  if (!matchesEntirely(nationalNumber, metadata.nationalNumberPattern())) {
    return undefined;
  }

  if (matchesNumberType(nationalNumber, "FIXED_LINE", metadata)) {
    const mobile = metadata.type("MOBILE");

    return !mobile ||
      mobile.pattern() === "" ||
      matchesNumberType(nationalNumber, "MOBILE", metadata)
      ? "FIXED_LINE_OR_MOBILE"
      : "FIXED_LINE";
  }

  for (const typeName of NUMBER_TYPES_AFTER_FIXED_LINE) {
    if (matchesNumberType(nationalNumber, typeName, metadata)) {
      return typeName;
    }
  }

  return undefined;
};

// Of the countries that share a calling code, the one whose leading
// digits or number type patterns fit the national number.
const getCountryByNationalNumber = (
  nationalNumber: string,
  countries: readonly string[],
  data: PhoneMetadata
) => {
  const metadata = new Metadata(data);

  for (const country of countries) {
    metadata.selectNumberingPlan(country);

    const leadingDigits = metadata.leadingDigits();

    if (leadingDigits) {
      if (nationalNumber && nationalNumber.search(leadingDigits) === 0) {
        return country;
      }
    } else if (getNumberType(nationalNumber, country, data)) {
      return country;
    }
  }

  return undefined;
};

const getCountryByCallingCode = (
  callingCode: string,
  nationalNumber: string,
  metadata: Metadata
) => {
  const countries = metadata.getCountryCodesForCallingCode(callingCode);

  if (countries) {
    return countries.length === 1
      ? countries[0]
      : getCountryByNationalNumber(
          nationalNumber,
          countries,
          metadata.metadata
        );
  }

  return undefined;
};

/* ------------------------------------------------------------------ */
/* National number extraction.                                         */
/* ------------------------------------------------------------------ */

const extractNationalNumberFromPossiblyIncompleteNumber = (
  number: string,
  metadata: Metadata
) => {
  const plan = number ? metadata.plan() : undefined;
  const prefixForParsing = plan?.nationalPrefixForParsing();

  if (plan && number && prefixForParsing) {
    const pattern = new RegExp(`^(?:${prefixForParsing})`);
    const match = pattern.exec(number);

    if (match) {
      let nationalNumber: string;
      let carrierCode: string | undefined;
      let nationalPrefix: string | undefined;
      const lastGroup = match.length - 1;
      const hasCapturedGroup = lastGroup > 0 && Boolean(match[lastGroup]);
      const transformRule = metadata.nationalPrefixTransformRule();

      if (transformRule && hasCapturedGroup) {
        nationalNumber = number.replace(pattern, transformRule);

        if (lastGroup > 1) {
          [, carrierCode] = match;
        }
      } else {
        nationalNumber = number.slice((match[0] ?? "").length);

        if (hasCapturedGroup) {
          [, carrierCode] = match;
        }
      }

      if (hasCapturedGroup) {
        const groupIndex = number.indexOf(String(match.at(1)));

        if (number.slice(0, groupIndex) === plan.nationalPrefix()) {
          nationalPrefix = plan.nationalPrefix();
        }
      } else {
        [nationalPrefix] = match;
      }

      return { carrierCode, nationalNumber, nationalPrefix };
    }
  }

  return { nationalNumber: number };
};

const keepsNationalNumberValid = (
  number: string,
  nationalNumber: string,
  metadata: Metadata
) =>
  !(
    matchesEntirely(number, metadata.nationalNumberPattern()) &&
    !matchesEntirely(nationalNumber, metadata.nationalNumberPattern())
  );

const isLongEnough = (
  nationalNumber: string,
  country: string | undefined,
  metadata: Metadata
) => {
  const status = checkNumberLength(nationalNumber, country, metadata);

  return status !== "TOO_SHORT" && status !== "INVALID_LENGTH";
};

// The national number without the national prefix, when stripping it keeps
// a valid number.
const extractNationalNumber = (number: string, metadata: Metadata) => {
  const { carrierCode, nationalNumber } =
    extractNationalNumberFromPossiblyIncompleteNumber(number, metadata);

  if (nationalNumber !== number) {
    if (!keepsNationalNumberValid(number, nationalNumber, metadata)) {
      return { nationalNumber: number };
    }

    if (metadata.plan().possibleLengths()) {
      const country = getCountryByCallingCode(
        metadata.plan().callingCode(),
        nationalNumber,
        metadata
      );

      if (!isLongEnough(nationalNumber, country, metadata)) {
        return { nationalNumber: number };
      }
    }
  }

  return { carrierCode, nationalNumber };
};

/* ------------------------------------------------------------------ */
/* Country calling code extraction.                                    */
/* ------------------------------------------------------------------ */

const FIRST_DIGIT = new RegExp(`([${VALID_DIGITS}])`);

// The number without its international call prefix.
const stripIddPrefix = (
  number: string,
  country: string | undefined,
  data: PhoneMetadata
) => {
  if (country) {
    const metadata = new Metadata(data);

    metadata.selectNumberingPlan(country);

    const iddPrefix = new RegExp(String(metadata.plan().IDDPrefix()));

    if (number.search(iddPrefix) === 0) {
      const rest = number.slice((number.match(iddPrefix)?.[0] ?? "").length);
      const firstDigit = rest.match(FIRST_DIGIT)?.[1];

      if (!(firstDigit && firstDigit.length > 0 && firstDigit === "0")) {
        return rest;
      }
    }
  }

  return undefined;
};

// A calling code typed without a plus sign.
const extractCountryCallingCodeFromInternationalNumberWithoutPlusSign = (
  number: string,
  country: string | undefined,
  defaultCountry: string | undefined,
  defaultCallingCode: string | undefined,
  data: PhoneMetadata
) => {
  if (!(country || defaultCountry || defaultCallingCode)) {
    return { number };
  }

  const selected = country || defaultCountry;

  const callingCode = selected
    ? getCountryCallingCode(selected, data)
    : defaultCallingCode;

  if (callingCode && number.startsWith(callingCode)) {
    const metadata = new Metadata(data);

    metadata.selectNumberingPlan(selected || callingCode);

    const withoutCode = number.slice(callingCode.length);

    const nationalNumberWithoutCode = extractNationalNumber(
      withoutCode,
      metadata
    ).nationalNumber;

    const nationalNumberWithCode = extractNationalNumber(
      number,
      metadata
    ).nationalNumber;

    if (
      (!matchesEntirely(
        nationalNumberWithCode,
        metadata.nationalNumberPattern()
      ) &&
        matchesEntirely(
          nationalNumberWithoutCode,
          metadata.nationalNumberPattern()
        )) ||
      checkNumberLength(nationalNumberWithCode, undefined, metadata) ===
        "TOO_LONG"
    ) {
      return { countryCallingCode: callingCode, number: withoutCode };
    }
  }

  return { number };
};

const extractCountryCallingCode = (
  numberText: string,
  country: string | undefined,
  defaultCountry: string | undefined,
  defaultCallingCode: string | undefined,
  data: PhoneMetadata
) => {
  let number = numberText;

  if (!number) {
    return {};
  }

  let viaIdd: boolean | undefined;

  if (!number.startsWith("+")) {
    const withoutIdd = stripIddPrefix(number, country || defaultCountry, data);

    if (withoutIdd && withoutIdd !== number) {
      viaIdd = true;
      number = `+${withoutIdd}`;
    } else {
      if (country || defaultCountry || defaultCallingCode) {
        const result =
          extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(
            number,
            country,
            defaultCountry,
            defaultCallingCode,
            data
          );

        if (result.countryCallingCode) {
          return {
            countryCallingCode: result.countryCallingCode,
            countryCallingCodeSource: "FROM_NUMBER_WITHOUT_PLUS_SIGN",
            number: result.number,
          };
        }
      }

      return { number };
    }
  }

  if (number[1] === "0") {
    return {};
  }

  const metadata = new Metadata(data);

  for (let end = 2; end - 1 <= 3 && end <= number.length; end += 1) {
    const code = number.slice(1, end);

    if (metadata.hasCallingCode(code)) {
      metadata.selectNumberingPlan(code);

      return {
        countryCallingCode: code,
        countryCallingCodeSource: viaIdd
          ? "FROM_NUMBER_WITH_IDD"
          : "FROM_NUMBER_WITH_PLUS_SIGN",
        number: number.slice(end),
      };
    }
  }

  return {};
};

/* ------------------------------------------------------------------ */
/* Formatting.                                                         */
/* ------------------------------------------------------------------ */

const applyInternationalSeparatorStyle = (formattedNumber: string) =>
  formattedNumber
    .replaceAll(new RegExp(`[${VALID_PUNCTUATION}]+`, "g"), " ")
    .trim();

const FIRST_GROUP = /(\$\d)/;

const formatNationalNumberUsingFormat = (
  number: string,
  format: NumberFormat,
  options: { useInternationalFormat: boolean; withNationalPrefix: boolean }
) => {
  const { useInternationalFormat, withNationalPrefix } = options;
  const rule = format.nationalPrefixFormattingRule();

  let replacement = format.format();

  if (useInternationalFormat) {
    replacement = format.internationalFormat();
  } else if (withNationalPrefix && rule) {
    replacement = format.format().replace(FIRST_GROUP, rule);
  }

  const formatted = number.replace(new RegExp(format.pattern()), replacement);

  return useInternationalFormat
    ? applyInternationalSeparatorStyle(formatted)
    : formatted;
};

// The format whose leading digits and pattern fit the national number.
const chooseFormatForNumber = (
  availableFormats: readonly NumberFormat[],
  nationalNumber: string
) =>
  availableFormats.find((format) => {
    const patterns = format.leadingDigitsPatterns();

    const last = patterns.at(-1);

    if (last !== undefined && nationalNumber.search(last) !== 0) {
      return false;
    }

    return matchesEntirely(nationalNumber, format.pattern());
  });

const formatNationalNumber = (nationalNumber: string, metadata: Metadata) => {
  const format = chooseFormatForNumber(metadata.formats(), nationalNumber);

  return format
    ? formatNationalNumberUsingFormat(nationalNumber, format, {
        useInternationalFormat: false,
        withNationalPrefix: true,
      })
    : nationalNumber;
};

/* ------------------------------------------------------------------ */
/* PhoneNumber.                                                   */
/* ------------------------------------------------------------------ */

const COUNTRY_CODE = /^[A-Z]{2}$/;

class PhoneNumber {
  country: string | undefined;
  readonly countryCallingCode: string;
  readonly nationalNumber: string;
  readonly number: string;
  ext: string | undefined;
  private readonly data: PhoneMetadata;

  // The first argument is a country or a calling code.
  constructor(
    countryOrCallingCode: string,
    nationalNumber: string,
    data: PhoneMetadata
  ) {
    if (!countryOrCallingCode) {
      throw new TypeError("First argument is required");
    }

    if (!nationalNumber) {
      throw new TypeError("`nationalNumber` argument is required");
    }

    if (COUNTRY_CODE.test(countryOrCallingCode)) {
      const metadata = new Metadata(data);

      metadata.selectNumberingPlan(countryOrCallingCode);
      this.country = countryOrCallingCode;
      this.countryCallingCode = metadata.countryCallingCode();
    } else {
      this.country = undefined;
      this.countryCallingCode = countryOrCallingCode;
    }

    this.nationalNumber = nationalNumber;
    this.number = `+${this.countryCallingCode}${this.nationalNumber}`;
    this.data = data;
  }

  formatNational() {
    const metadata = new Metadata(this.data);

    if (this.country && this.country !== "001") {
      if (!metadata.hasCountry(this.country)) {
        throw new Error(`Unknown country: ${this.country}`);
      }

      metadata.selectNumberingPlan(this.country);
    } else {
      metadata.selectNumberingPlan(this.countryCallingCode);
    }

    if (!this.nationalNumber) {
      return "";
    }

    const formatted = formatNationalNumber(this.nationalNumber, metadata);

    return this.ext ? `${formatted}${metadata.ext()}${this.ext}` : formatted;
  }
}

/* ------------------------------------------------------------------ */
/* Parsing a whole number.                                    */
/* ------------------------------------------------------------------ */

const MAX_INPUT_STRING_LENGTH = 250;
const MAX_LENGTH_FOR_NSN = 17;

// A ParseError of libphonenumber-js turns into undefined.
const START_OF_NUMBER = new RegExp(`[${PLUS_CHARS}${VALID_DIGITS}]`);

const AFTER_NUMBER = new RegExp(`[^${VALID_DIGITS}#]+$`);

const captureDigits = (maxLength: string) =>
  `([${VALID_DIGITS}]{1,${maxLength}})`;

// The patterns of an extension.
const createExtensionPattern = () => {
  const rfc3966 = `;ext=${captureDigits("20")}`;
  const commaOrSpace = "[ \u00A0\\t,]*";
  const afterMarker = "[:\\.\uFF0E]?[ \u00A0\\t,-]*";

  const extensionWords =
    "(?:e?xt(?:ensi(?:o\u0301?|\u00F3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|\u0434\u043E\u0431|anexo)";

  const shortMarkers = "(?:[x\uFF58#\uFF03~\uFF5E]|int|\uFF49\uFF4E\uFF54)";
  const commas = "(?:,{2}|;)";
  const spaces = "[ \u00A0\\t]*";

  return [
    rfc3966,
    `${commaOrSpace}${extensionWords}${afterMarker}${captureDigits("20")}#?`,
    `${commaOrSpace}${shortMarkers}${afterMarker}${captureDigits("9")}#?`,
    `[- ]+${captureDigits("6")}#`,
    `${spaces}${commas}${afterMarker}${captureDigits("15")}#?`,
    `${spaces}(?:,)+${afterMarker}${captureDigits("9")}#?`,
  ].join("|");
};

const EXTENSION_PATTERN = createExtensionPattern();

const VALID_PHONE_NUMBER = `[${PLUS_CHARS}]{0,1}(?:[${VALID_PUNCTUATION}]*[${VALID_DIGITS}]){3,}[${VALID_PUNCTUATION}${VALID_DIGITS}]*`;

const VALID_PHONE_NUMBER_WITH_EXTENSION = `${VALID_PHONE_NUMBER}(?:${EXTENSION_PATTERN})?`;

const VIABLE_PHONE_NUMBER = new RegExp(
  `^[${VALID_DIGITS}]{2}$|^${VALID_PHONE_NUMBER_WITH_EXTENSION}$`,
  "i"
);

const EXTENSION_AT_END = new RegExp(`(?:${EXTENSION_PATTERN})$`, "i");

const isViablePhoneNumber = (text: string) =>
  text.length >= 2 && VIABLE_PHONE_NUMBER.test(text);

const extractExtension = (text: string) => {
  const match = EXTENSION_AT_END.exec(text);

  if (!match) {
    return {};
  }

  const ext = match.slice(1).find(Boolean);

  return ext === undefined
    ? undefined
    : { ext, number: text.slice(0, match.index) };
};

// The phone-context parameter of an RFC 3966 number. The two
// patterns are global, so test keeps its position between calls, as in
// libphonenumber-js.
const PHONE_CONTEXT_PREFIX = ";phone-context=";
const RFC3966_PREFIX = "tel:";
const RFC3966_ISDN_SUBADDRESS = ";isub=";
const PHONE_CONTEXT_DIGITS = `([${VALID_DIGITS}]|[\\-\\.\\(\\)]?)`;

const PHONE_CONTEXT_NUMBER = new RegExp(
  `^\\+${PHONE_CONTEXT_DIGITS}*[${VALID_DIGITS}]${PHONE_CONTEXT_DIGITS}*$`,
  "g"
);

const PHONE_CONTEXT_DOMAIN_LABEL = `[${VALID_DIGITS}]+((\\-)*[${VALID_DIGITS}])*`;
const PHONE_CONTEXT_TOP_LABEL = `[a-zA-Z]+((\\-)*[${VALID_DIGITS}])*`;

const PHONE_CONTEXT_DOMAINNAME = new RegExp(
  `^(${PHONE_CONTEXT_DOMAIN_LABEL}\\.)*${PHONE_CONTEXT_TOP_LABEL}\\.?$`,
  "g"
);

const getPhoneContext = (text: string) => {
  const index = text.indexOf(PHONE_CONTEXT_PREFIX);

  if (index === -1) {
    return null;
  }

  const start = index + PHONE_CONTEXT_PREFIX.length;

  if (start >= text.length) {
    return "";
  }

  const end = text.indexOf(";", start);

  return end === -1 ? text.substring(start) : text.substring(start, end);
};

const isPhoneContextValid = (phoneContext: string | null) => {
  if (phoneContext === null) {
    return true;
  }

  if (phoneContext.length === 0) {
    return false;
  }

  return (
    PHONE_CONTEXT_NUMBER.test(phoneContext) ||
    PHONE_CONTEXT_DOMAINNAME.test(phoneContext)
  );
};

const extractFormattedPhoneNumber = (text: string) => {
  if (text) {
    if (text.length > MAX_INPUT_STRING_LENGTH) {
      return undefined;
    }

    const start = text.search(START_OF_NUMBER);

    if (!(start < 0)) {
      return text.slice(start).replace(AFTER_NUMBER, "");
    }
  }

  return undefined;
};

const extractFormattedPhoneNumberFromPossibleRfc3966NumberUri = (
  text: string
) => {
  const phoneContext = getPhoneContext(text);

  if (!isPhoneContextValid(phoneContext)) {
    return undefined;
  }

  let number: string;

  if (phoneContext === null) {
    number = extractFormattedPhoneNumber(text) || "";
  } else {
    number = "";

    if (phoneContext.startsWith("+")) {
      number += phoneContext;
    }

    const prefixIndex = text.indexOf(RFC3966_PREFIX);
    const start = prefixIndex === -1 ? 0 : prefixIndex + RFC3966_PREFIX.length;
    const end = text.indexOf(PHONE_CONTEXT_PREFIX);

    number += text.substring(start, end);
  }

  const subaddressIndex = number.indexOf(RFC3966_ISDN_SUBADDRESS);

  if (subaddressIndex > 0) {
    number = number.substring(0, subaddressIndex);
  }

  return number === "" ? undefined : number;
};

// The country calling code and the national number of a text.
const parseInput = (text: string, metadata: Metadata) => {
  const { countryCallingCode, number } = extractCountryCallingCode(
    parseIncompletePhoneNumber(text),
    undefined,
    undefined,
    undefined,
    metadata.metadata
  );

  if (!countryCallingCode) {
    return undefined;
  }

  metadata.selectNumberingPlan(countryCallingCode);

  if (!number) {
    return undefined;
  }

  const { nationalNumber } = extractNationalNumber(
    parseIncompletePhoneNumber(number),
    metadata
  );

  const country = getCountryByCallingCode(
    countryCallingCode,
    nationalNumber,
    metadata
  );

  if (country) {
    metadata.selectNumberingPlan(country);
  }

  return { country, countryCallingCode, nationalNumber };
};

// Called with the text and the metadata only: undefined when the text is
// not a number (libphonenumber-js throws a ParseError, caught here).
const parsePhoneNumber = (
  text: string,
  data: PhoneMetadata = phoneMetadata
) => {
  const metadata = new Metadata(data);

  const formatted =
    extractFormattedPhoneNumberFromPossibleRfc3966NumberUri(text);

  if (!formatted || !isViablePhoneNumber(formatted)) {
    return undefined;
  }

  const withExtension = extractExtension(formatted);
  const number = withExtension?.ext ? withExtension.number : formatted;
  const ext = withExtension?.ext;

  if (!number) {
    return undefined;
  }

  const parsed = parseInput(number, metadata);

  if (!parsed || !metadata.hasSelectedNumberingPlan()) {
    return undefined;
  }

  const { country, countryCallingCode, nationalNumber } = parsed;

  if (!nationalNumber || nationalNumber.length < 2) {
    return undefined;
  }

  if (nationalNumber.length > MAX_LENGTH_FOR_NSN) {
    return undefined;
  }

  const phoneNumber = new PhoneNumber(
    countryCallingCode,
    nationalNumber,
    metadata.metadata
  );

  if (ext) {
    phoneNumber.ext = ext;
  }

  if (country) {
    phoneNumber.country = country;
  }

  return phoneNumber;
};

export {
  Metadata,
  PhoneNumber,
  PLUS_CHARS,
  VALID_DIGITS,
  VALID_PUNCTUATION,
  applyInternationalSeparatorStyle,
  checkNumberLength,
  extractCountryCallingCode,
  extractCountryCallingCodeFromInternationalNumberWithoutPlusSign,
  extractNationalNumberFromPossiblyIncompleteNumber,
  formatNationalNumberUsingFormat,
  getCountryByCallingCode,
  getCountryByNationalNumber,
  getCountryCallingCode,
  isSupportedCountry,
  parseDigits,
  parseIncompletePhoneNumber,
  parsePhoneNumber,
  parsePhoneNumberCharacter,
  stripIddPrefix,
};

export type { NumberFormat, NumberingPlan };
