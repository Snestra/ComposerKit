/*
 * The as-you-type phone number formatter of the phone input, based on
 * libphonenumber-js AsYouType: the state, the pattern parser and matcher, the
 * formatter, the input parser and AsYouType. The number logic it calls is in lib/phone-number.ts.
 * The two constants of libphonenumber-js are folded: the reduced template
 * support is on and non-geographic "001" countries are off.
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
/* oxlint-disable max-classes-per-file, complexity, class-methods-use-this, prefer-named-capture-group -- The module keeps the classes, the long functions and the methods of libphonenumber-js, and its capture groups are read by number. */
/* oxlint-disable require-unicode-regexp -- libphonenumber-js compiles every pattern without the u flag, and the metadata patterns are not valid in unicode mode. */
/* oxlint-disable typescript/strict-boolean-expressions, typescript/prefer-nullish-coalescing, unicorn/no-useless-undefined -- The code relies on JavaScript truthiness (undefined, null and the empty string all mean "no value") and on explicit undefined results; rewriting those tests would risk changing behaviour. */
import { phoneMetadata } from "./phone-metadata";
import type { PhoneMetadata } from "./phone-metadata";
import {
  Metadata,
  PLUS_CHARS,
  PhoneNumber,
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
  parseDigits,
  stripIddPrefix,
} from "./phone-number";
import type { NumberFormat, NumberingPlan } from "./phone-number";

const repeat = (text: string, count: number) =>
  count < 1 ? "" : text.repeat(count);

/* ------------------------------------------------------------------ */
/* State.                                                          */
/* ------------------------------------------------------------------ */

interface StatePatch {
  IDDPrefix?: string | undefined;
  carrierCode?: string | undefined;
  missingPlus?: boolean;
  nationalPrefix?: string | undefined;
  nationalSignificantNumber?: string;
  nationalSignificantNumberIsModified?: boolean;
  prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix?:
    | string
    | undefined;
}

class AsYouTypeState {
  IDDPrefix: string | undefined;
  callingCode: string | undefined;
  carrierCode: string | undefined;
  country: string | undefined;
  digits = "";
  international = false;
  missingPlus = false;
  nationalPrefix: string | undefined;
  nationalSignificantNumber = "";
  nationalSignificantNumberIsModified = false;
  prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix:
    | string
    | undefined;

  private readonly onCountryChange: (country: string | undefined) => void;
  private readonly onCallingCodeChange: (
    callingCode: string | undefined,
    country: string | undefined
  ) => void;

  constructor(callbacks: {
    onCallingCodeChange: (
      callingCode: string | undefined,
      country: string | undefined
    ) => void;
    onCountryChange: (country: string | undefined) => void;
  }) {
    this.onCountryChange = callbacks.onCountryChange;
    this.onCallingCodeChange = callbacks.onCallingCodeChange;
  }

  reset({
    callingCode,
    country,
  }: {
    callingCode: string | undefined;
    country: string | undefined;
  }) {
    this.international = false;
    this.missingPlus = false;
    this.IDDPrefix = undefined;
    this.callingCode = undefined;
    this.digits = "";
    this.resetNationalSignificantNumber();
    this.initCountryAndCallingCode(country, callingCode);
  }

  resetNationalSignificantNumber() {
    this.nationalSignificantNumber = this.getNationalDigits();
    this.nationalSignificantNumberIsModified = false;
    this.nationalPrefix = undefined;
    this.carrierCode = undefined;
    this.prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix =
      undefined;
  }

  update(patch: StatePatch) {
    Object.assign(this, patch);
  }

  initCountryAndCallingCode(
    country: string | undefined,
    callingCode: string | undefined
  ) {
    this.setCountry(country);
    this.setCallingCode(callingCode);
  }

  setCountry(country: string | undefined) {
    this.country = country;
    this.onCountryChange(country);
  }

  setCallingCode(callingCode: string | undefined) {
    this.callingCode = callingCode;
    this.onCallingCodeChange(callingCode, this.country);
  }

  startInternationalNumber(
    country: string | undefined,
    callingCode: string | undefined
  ) {
    this.international = true;
    this.initCountryAndCallingCode(country, callingCode);
  }

  appendDigits(digits: string) {
    this.digits += digits;
  }

  appendNationalSignificantNumberDigits(digits: string) {
    this.nationalSignificantNumber += digits;
  }

  getNationalDigits() {
    return this.international
      ? this.digits.slice(
          (this.IDDPrefix ? this.IDDPrefix.length : 0) +
            (this.callingCode ? this.callingCode.length : 0)
        )
      : this.digits;
  }

  getDigitsWithoutInternationalPrefix() {
    return this.international && this.IDDPrefix
      ? this.digits.slice(this.IDDPrefix.length)
      : this.digits;
  }
}

/* ------------------------------------------------------------------ */
/* Leading digits pattern parser and matcher.                */
/* ------------------------------------------------------------------ */

type PatternTree =
  | string
  | readonly PatternTree[]
  | { args: readonly PatternTree[]; op: "|" }
  | { args: readonly string[]; op: "[]" };

interface PatternContext {
  branches?: PatternTree[];
  instructions?: PatternTree[];
  oneOfSet?: boolean;
  or?: boolean;
}

// The characters of a one-of set such as 2-9.
const parseOneOfSet = (set: string) => {
  const characters: string[] = [];

  for (let index = 0; index < set.length; index += 1) {
    if (set[index] === "-") {
      if (index === 0 || index === set.length - 1) {
        throw new Error(`Couldn't parse a one-of set pattern: ${set}`);
      }

      const first = (set[index - 1] ?? "").codePointAt(0) ?? Number.NaN;
      const last = (set[index + 1] ?? "").codePointAt(0) ?? Number.NaN;

      for (let code = first + 1; code <= last - 1; code += 1) {
        characters.push(String.fromCodePoint(code));
      }
    } else {
      characters.push(set[index] ?? "");
    }
  }

  return characters;
};

const unwrapSingle = (instructions: PatternTree[]): PatternTree =>
  instructions.length === 1 ? (instructions[0] ?? "") : instructions;

const PATTERN_OPERATORS = /[()[\]?:|]/;

const NEXT_PATTERN_OPERATOR = /(\||\(\?:|\)|\[|\])/;

class PatternParser {
  private context: PatternContext[] = [];

  parse(pattern: string): PatternTree {
    this.context = [{ instructions: [], or: true }];
    this.parsePattern(pattern);

    if (this.context.length !== 1) {
      throw new Error("Non-finalized contexts left when pattern parse ended");
    }

    const [root] = this.context;
    const branches = root?.branches;
    const instructions = root?.instructions ?? [];

    if (branches) {
      return { args: [...branches, unwrapSingle(instructions)], op: "|" };
    }

    if (instructions.length === 0) {
      throw new Error("Pattern is required");
    }

    return unwrapSingle(instructions);
  }

  private startContext(context: PatternContext) {
    this.context.push(context);
  }

  private endContext() {
    this.context.pop();
  }

  private getContext(): PatternContext {
    const context = this.context.at(-1);

    if (!context) {
      throw new Error("No pattern context");
    }

    return context;
  }

  private instructionsOfContext() {
    const context = this.getContext();

    context.instructions ??= [];

    return context.instructions;
  }

  private parsePattern(pattern: string) {
    if (!pattern) {
      throw new Error("Pattern is required");
    }

    const match = NEXT_PATTERN_OPERATOR.exec(pattern);

    if (!match) {
      if (PATTERN_OPERATORS.test(pattern)) {
        throw new Error(`Illegal characters found in a pattern: ${pattern}`);
      }

      this.getContext().instructions = [
        ...this.instructionsOfContext(),
        ...pattern.split(""),
      ];

      return;
    }

    const operator = match[1] ?? "";
    const before = pattern.slice(0, match.index);
    const after = pattern.slice((match.index ?? 0) + operator.length);

    switch (operator) {
      case "(?:": {
        if (before) {
          this.parsePattern(before);
        }

        this.startContext({ branches: [], instructions: [], or: true });
        break;
      }

      case ")": {
        if (!this.getContext().or) {
          throw new Error('")" operator must be preceded by "(?:" operator');
        }

        if (before) {
          this.parsePattern(before);
        }

        if (this.instructionsOfContext().length === 0) {
          throw new Error(
            'No instructions found after "|" operator in an "or" group'
          );
        }

        const branches = this.getContext().branches ?? [];

        branches.push(unwrapSingle(this.instructionsOfContext()));
        this.endContext();
        this.instructionsOfContext().push({ args: branches, op: "|" });
        break;
      }

      case "|": {
        if (!this.getContext().or) {
          throw new Error('"|" operator can only be used inside "or" groups');
        }

        if (before) {
          this.parsePattern(before);
        }

        if (!this.getContext().branches) {
          if (this.context.length === 1) {
            this.getContext().branches = [];
          } else {
            throw new Error('"branches" not found in an "or" group context');
          }
        }

        this.getContext().branches?.push(
          unwrapSingle(this.instructionsOfContext())
        );
        this.getContext().instructions = [];
        break;
      }

      case "[": {
        if (before) {
          this.parsePattern(before);
        }

        this.startContext({ oneOfSet: true });
        break;
      }

      case "]": {
        if (!this.getContext().oneOfSet) {
          throw new Error('"]" operator must be preceded by "[" operator');
        }

        this.endContext();
        this.instructionsOfContext().push({
          args: parseOneOfSet(before),
          op: "[]",
        });
        break;
      }

      default: {
        throw new Error(`Unknown operator: ${operator}`);
      }
    }

    if (after) {
      this.parsePattern(after);
    }
  }
}

type MatchResult =
  | { kind: "match"; matchedChars: string[] }
  | { kind: "overflow" }
  | { kind: "partial" };

const isTreeList = (tree: PatternTree): tree is readonly PatternTree[] =>
  Array.isArray(tree);

const matchTree = (
  characters: string[],
  tree: PatternTree,
  allowOverflow: boolean
): MatchResult | undefined => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- A pattern tree node is a text, a list or an operator object.
  if (typeof tree === "string") {
    const text = characters.join("");

    if (tree.startsWith(text)) {
      return characters.length === tree.length
        ? { kind: "match", matchedChars: characters }
        : { kind: "partial" };
    }

    if (text.startsWith(tree)) {
      return allowOverflow && characters.length > tree.length
        ? { kind: "overflow" }
        : { kind: "match", matchedChars: characters.slice(0, tree.length) };
    }

    return undefined;
  }

  if (isTreeList(tree)) {
    let rest = [...characters];

    for (let index = 0; index < tree.length; index += 1) {
      const result = matchTree(
        rest,
        tree[index] ?? "",
        allowOverflow && index === tree.length - 1
      );

      if (!result) {
        return undefined;
      }

      if (result.kind === "overflow") {
        return result;
      }

      if (result.kind === "match") {
        rest = rest.slice(result.matchedChars.length);

        if (rest.length === 0) {
          return index === tree.length - 1
            ? { kind: "match", matchedChars: characters }
            : { kind: "partial" };
        }
      } else {
        return { kind: "partial" };
      }
    }

    return allowOverflow
      ? { kind: "overflow" }
      : {
          kind: "match",
          matchedChars: characters.slice(0, characters.length - rest.length),
        };
  }

  if ("op" in tree && tree.op === "|") {
    let isPartial = false;

    for (const branch of tree.args) {
      const result = matchTree(characters, branch, allowOverflow);

      if (result) {
        if (result.kind === "overflow") {
          return result;
        }

        if (result.kind === "match") {
          return { kind: "match", matchedChars: result.matchedChars };
        }

        isPartial = true;
      }
    }

    return isPartial ? { kind: "partial" } : undefined;
  }

  if ("op" in tree && tree.op === "[]") {
    for (const option of tree.args) {
      if (characters[0] === option) {
        if (characters.length === 1) {
          return { kind: "match", matchedChars: characters };
        }

        return allowOverflow
          ? { kind: "overflow" }
          : { kind: "match", matchedChars: [option] };
      }
    }

    return undefined;
  }

  throw new Error(`Unsupported instruction tree: ${JSON.stringify(tree)}`);
};

class PatternMatcher {
  private readonly matchTree: PatternTree;

  constructor(pattern: string) {
    this.matchTree = new PatternParser().parse(pattern);
  }

  match(text: string, options: { allowOverflow?: boolean } = {}) {
    if (!text) {
      throw new Error("String is required");
    }

    const result = matchTree(text.split(""), this.matchTree, true);

    if (result?.kind === "overflow" && !options.allowOverflow) {
      return undefined;
    }

    return result;
  }
}

/* ------------------------------------------------------------------ */
/* Formatter.                                                     */
/* ------------------------------------------------------------------ */

const NINE = "9";

const NINES = repeat(NINE, 15);

const SEPARATOR_AFTER_PREFIX = /[- ]/;

const FIRST_GROUP = /(\$\d)/;

const MIN_LEADING_DIGITS_LENGTH = 3;

const ONE_OF_SET = /\[([^[\]])*\]/g;

const DIGIT_BEFORE_TWO_CHARACTERS = /\d(?=[^,}][^,}])/g;

const NON_ALTERING_FORMAT = new RegExp(
  `[${VALID_PUNCTUATION}]*\\$1[${VALID_PUNCTUATION}]*(\\$\\d[${VALID_PUNCTUATION}]*)*$`
);

const TEMPLATE_PLACEHOLDER = /x/;

// The template without the parentheses that are not paired.
const stripNonPairedParens = (template: string) => {
  const opened: number[] = [];

  for (let index = 0; index < template.length; index += 1) {
    if (template[index] === "(") {
      opened.push(index);
    } else if (template[index] === ")") {
      opened.pop();
    }
  }

  let start = 0;
  let result = "";

  opened.push(template.length);

  for (const end of opened) {
    result += template.slice(start, end);
    start = end + 1;
  }

  return result;
};

// The template cut after the last placeholder, keeping a closing
// parenthesis that follows it.
const cutAndStripNonPairedParens = (template: string, cutBefore: number) => {
  let cut = cutBefore;

  if (template[cut] === ")") {
    cut += 1;
  }

  return stripNonPairedParens(template.slice(0, cut));
};

// The digits put into the first placeholders.
const populateTemplateWithDigits = (
  template: string,
  position: number,
  digits: string
): [string, number] | undefined => {
  let populated = template;
  let nextPosition = position;

  for (const digit of digits.split("")) {
    if (populated.slice(nextPosition + 1).search(TEMPLATE_PLACEHOLDER) < 0) {
      return undefined;
    }

    nextPosition = populated.search(TEMPLATE_PLACEHOLDER);
    populated = populated.replace(TEMPLATE_PLACEHOLDER, digit);
  }

  return [populated, nextPosition];
};

const isFormattedLike = (formatted: string, state: AsYouTypeState) =>
  parseDigits(formatted) === state.getNationalDigits();

interface FormatCallbacks {
  getSeparatorAfterNationalPrefix: (format: NumberFormat) => string;
  shouldTryNationalPrefixFormattingRule: (
    format: NumberFormat
  ) => boolean | undefined;
}

const formatWithPrefixRule = (
  state: AsYouTypeState,
  format: NumberFormat,
  useNationalPrefixFormattingRule: boolean,
  callbacks: FormatCallbacks
) => {
  let formatted = formatNationalNumberUsingFormat(
    state.nationalSignificantNumber,
    format,
    {
      useInternationalFormat: state.international,
      withNationalPrefix: useNationalPrefixFormattingRule,
    }
  );

  if (!useNationalPrefixFormattingRule) {
    if (state.nationalPrefix) {
      formatted = `${state.nationalPrefix}${callbacks.getSeparatorAfterNationalPrefix(format)}${formatted}`;
    } else if (
      state.prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix
    ) {
      formatted = `${state.prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix} ${formatted}`;
    }
  }

  return isFormattedLike(formatted, state) ? formatted : undefined;
};

const formatNumberWithFormat = (
  state: AsYouTypeState,
  format: NumberFormat,
  callbacks: FormatCallbacks
) => {
  if (
    !new RegExp(`^(?:${format.pattern()})$`).test(
      state.nationalSignificantNumber
    )
  ) {
    return undefined;
  }

  if (callbacks.shouldTryNationalPrefixFormattingRule(format)) {
    const formatted = formatWithPrefixRule(state, format, true, callbacks);

    if (formatted) {
      return formatted;
    }
  }

  return formatWithPrefixRule(state, format, false, callbacks);
};

class AsYouTypeFormatter {
  chosenFormat: NumberFormat | undefined;
  isNANP: boolean | undefined;
  matchingFormats: NumberFormat[] = [];
  nationalNumberTemplate: string | undefined;
  populatedNationalNumberTemplate: string | undefined;
  populatedNationalNumberTemplatePosition = -1;
  template: string | undefined;
  private readonly metadata: Metadata;

  constructor(metadata: Metadata) {
    this.metadata = metadata;
    this.resetFormat();
  }

  resetFormat() {
    this.chosenFormat = undefined;
    this.template = undefined;
    this.nationalNumberTemplate = undefined;
    this.populatedNationalNumberTemplate = undefined;
    this.populatedNationalNumberTemplatePosition = -1;
  }

  reset(plan: NumberingPlan | undefined, state: AsYouTypeState) {
    this.resetFormat();

    if (plan) {
      this.isNANP = plan.callingCode() === "1";
      this.matchingFormats = plan.formats();

      if (state.nationalSignificantNumber) {
        this.narrowDownMatchingFormats(state);
      }
    } else {
      this.isNANP = undefined;
      this.matchingFormats = [];
    }
  }

  format(nextDigits: string, state: AsYouTypeState) {
    if (
      checkNumberLength(
        state.nationalSignificantNumber,
        undefined,
        this.metadata
      ) === "IS_POSSIBLE"
    ) {
      for (const format of this.matchingFormats) {
        const formatted = formatNumberWithFormat(state, format, {
          getSeparatorAfterNationalPrefix: (candidate) =>
            this.getSeparatorAfterNationalPrefix(candidate),
          shouldTryNationalPrefixFormattingRule: (candidate) =>
            this.shouldTryNationalPrefixFormattingRule(candidate, {
              international: state.international,
              nationalPrefix: state.nationalPrefix,
            }),
        });

        if (formatted) {
          this.resetFormat();
          this.chosenFormat = format;
          this.setNationalNumberTemplate(
            formatted.replaceAll(/\d/g, "x"),
            state
          );
          this.populatedNationalNumberTemplate = formatted;
          this.populatedNationalNumberTemplatePosition =
            this.template?.lastIndexOf("x") ?? -1;

          return formatted;
        }
      }
    }

    return this.formatNationalNumberWithNextDigits(nextDigits, state);
  }

  formatNationalNumberWithNextDigits(
    nextDigits: string,
    state: AsYouTypeState
  ) {
    const previousFormat = this.chosenFormat;
    const format = this.chooseFormat(state);

    if (format) {
      return format === previousFormat
        ? this.formatNextNationalNumberDigits(nextDigits)
        : this.formatNextNationalNumberDigits(state.getNationalDigits());
    }

    return undefined;
  }

  narrowDownMatchingFormats(state: AsYouTypeState) {
    const { international, nationalPrefix, nationalSignificantNumber } = state;

    let leadingDigitsLength =
      nationalSignificantNumber.length - MIN_LEADING_DIGITS_LENGTH;

    if (leadingDigitsLength < 0) {
      leadingDigitsLength = 0;
    }

    this.matchingFormats = this.matchingFormats.filter(
      (format) =>
        this.formatSuits(format, international, nationalPrefix) &&
        this.formatMatches(
          format,
          nationalSignificantNumber,
          leadingDigitsLength
        )
    );

    if (
      this.chosenFormat &&
      !this.matchingFormats.includes(this.chosenFormat)
    ) {
      this.resetFormat();
    }
  }

  formatSuits(
    format: NumberFormat,
    international: boolean,
    nationalPrefix: string | undefined
  ) {
    return !(
      (nationalPrefix &&
        !format.usesNationalPrefix() &&
        !format.nationalPrefixIsOptionalWhenFormattingInNationalFormat()) ||
      (!international &&
        !nationalPrefix &&
        format.nationalPrefixIsMandatoryWhenFormattingInNationalFormat())
    );
  }

  formatMatches(
    format: NumberFormat,
    nationalSignificantNumber: string,
    leadingDigitsLength: number
  ) {
    const patterns = format.leadingDigitsPatterns();
    const count = patterns.length;

    if (count === 0) {
      return true;
    }

    const pattern = patterns[Math.min(leadingDigitsLength, count - 1)] ?? "";

    if (nationalSignificantNumber.length < MIN_LEADING_DIGITS_LENGTH) {
      try {
        return (
          new PatternMatcher(pattern).match(nationalSignificantNumber, {
            allowOverflow: true,
          }) !== undefined
        );
      } catch (error) {
        // oxlint-disable-next-line no-console -- libphonenumber-js reports the error and then keeps the format.
        console.error(error);

        return true;
      }
    }

    return new RegExp(`^(${pattern})`).test(nationalSignificantNumber);
  }

  getFormatFormat(format: NumberFormat, international: boolean) {
    return international ? format.internationalFormat() : format.format();
  }

  chooseFormat(state: AsYouTypeState) {
    for (const format of this.matchingFormats) {
      if (this.chosenFormat === format) {
        break;
      }

      if (
        NON_ALTERING_FORMAT.test(
          this.getFormatFormat(format, state.international)
        )
      ) {
        if (this.createTemplateForFormat(format, state)) {
          this.chosenFormat = format;
          break;
        }

        this.matchingFormats = this.matchingFormats.filter(
          (candidate) => candidate !== format
        );
      }
    }

    if (!this.chosenFormat) {
      this.resetFormat();
    }

    return this.chosenFormat;
  }

  createTemplateForFormat(format: NumberFormat, state: AsYouTypeState) {
    if (!format.pattern().includes("|")) {
      const template = this.getTemplateForFormat(format, state);

      if (template) {
        this.setNationalNumberTemplate(template, state);

        return true;
      }
    }

    return undefined;
  }

  getSeparatorAfterNationalPrefix(format: NumberFormat | undefined) {
    const rule = format?.nationalPrefixFormattingRule();

    return this.isNANP || (rule && SEPARATOR_AFTER_PREFIX.test(rule))
      ? " "
      : "";
  }

  getInternationalPrefixBeforeCountryCallingCode(
    state: { IDDPrefix: string | undefined; missingPlus: boolean },
    options?: { spacing: boolean }
  ) {
    const { IDDPrefix, missingPlus } = state;

    if (IDDPrefix) {
      return options && !options.spacing ? IDDPrefix : `${IDDPrefix} `;
    }

    return missingPlus ? "" : "+";
  }

  getTemplate(state: AsYouTypeState) {
    if (this.template) {
      let position = -1;
      let count = 0;

      const prefix = state.international
        ? this.getInternationalPrefixBeforeCountryCallingCode(state, {
            spacing: false,
          })
        : "";

      while (
        count <
        prefix.length + state.getDigitsWithoutInternationalPrefix().length
      ) {
        position = this.template.indexOf("x", position + 1);
        count += 1;
      }

      return cutAndStripNonPairedParens(this.template, position + 1);
    }

    return undefined;
  }

  setNationalNumberTemplate(template: string, state: AsYouTypeState) {
    this.nationalNumberTemplate = template;
    this.populatedNationalNumberTemplate = template;
    this.populatedNationalNumberTemplatePosition = -1;
    this.template = state.international
      ? `${this.getInternationalPrefixBeforeCountryCallingCode(state).replaceAll(/[\d+]/g, "x")}${repeat("x", (state.callingCode ?? "").length)} ${template}`
      : template;
  }

  getTemplateForFormat(format: NumberFormat, state: AsYouTypeState) {
    const {
      international,
      nationalPrefix,
      nationalSignificantNumber,
      prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix,
    } = state;

    const pattern = format
      .pattern()
      .replaceAll(ONE_OF_SET, "\\d")
      .replaceAll(DIGIT_BEFORE_TWO_CHARACTERS, "\\d");

    const nines = new RegExp(pattern).exec(NINES);

    if (!nines) {
      throw new TypeError("Cannot read properties of null (reading '0')");
    }

    let [sample] = nines;

    if (nationalSignificantNumber.length > sample.length) {
      return undefined;
    }

    const anchored = new RegExp(`^${pattern}$`);
    const maskedNumber = nationalSignificantNumber.replaceAll(/\d/g, NINE);

    if (anchored.test(maskedNumber)) {
      sample = maskedNumber;
    }

    let formatFormat = this.getFormatFormat(format, international);
    let usesPrefixRule: boolean | undefined;

    if (
      this.shouldTryNationalPrefixFormattingRule(format, {
        international,
        nationalPrefix,
      })
    ) {
      const rule = format.nationalPrefixFormattingRule() ?? "";
      const withRule = formatFormat.replace(FIRST_GROUP, rule);

      if (parseDigits(rule) === (nationalPrefix || "") + parseDigits("$1")) {
        formatFormat = withRule;
        usesPrefixRule = true;

        if (nationalPrefix) {
          for (let left = nationalPrefix.length; left > 0; left -= 1) {
            formatFormat = formatFormat.replace(/\d/, "x");
          }
        }
      }
    }

    let template = sample
      .replace(new RegExp(pattern), formatFormat)
      .replaceAll(new RegExp(NINE, "g"), "x");

    if (!usesPrefixRule) {
      if (prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix) {
        template = `${repeat("x", prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix.length)} ${template}`;
      } else if (nationalPrefix) {
        template = `${repeat("x", nationalPrefix.length)}${this.getSeparatorAfterNationalPrefix(format)}${template}`;
      }
    }

    if (international) {
      template = applyInternationalSeparatorStyle(template);
    }

    return template;
  }

  formatNextNationalNumberDigits(digits: string) {
    const populated = populateTemplateWithDigits(
      this.populatedNationalNumberTemplate ?? "",
      this.populatedNationalNumberTemplatePosition,
      digits
    );

    if (!populated) {
      this.resetFormat();

      return undefined;
    }

    [
      this.populatedNationalNumberTemplate,
      this.populatedNationalNumberTemplatePosition,
    ] = populated;

    return cutAndStripNonPairedParens(
      populated[0],
      this.populatedNationalNumberTemplatePosition + 1
    );
  }

  shouldTryNationalPrefixFormattingRule(
    format: NumberFormat,
    options: { international: boolean; nationalPrefix: string | undefined }
  ) {
    if (format.nationalPrefixFormattingRule()) {
      const usesNationalPrefix = format.usesNationalPrefix();

      if (
        (usesNationalPrefix && options.nationalPrefix) ||
        (!usesNationalPrefix && !options.international)
      ) {
        return true;
      }
    }

    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Input parser.                                                  */
/* ------------------------------------------------------------------ */

const VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART = `[${VALID_PUNCTUATION}${VALID_DIGITS}]+`;

const VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_PATTERN = new RegExp(
  `^${VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART}$`,
  "i"
);

const VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_START = new RegExp(
  `(?:[${PLUS_CHARS}][${VALID_PUNCTUATION}${VALID_DIGITS}]*|[${VALID_PUNCTUATION}${VALID_DIGITS}]+)`
);

const AFTER_DIGITS = new RegExp(`[^${VALID_PUNCTUATION}${VALID_DIGITS}]+.*$`);

const NOT_DIGIT_OR_BRACKET = /[^\d[\]]/;

const extractFormattedDigitsAndPlus = (text: string) => {
  const start = text.search(VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_START);

  if (!(start < 0)) {
    let rest = text.slice(start);
    let hasPlus: boolean | undefined;

    if (rest.startsWith("+")) {
      hasPlus = true;
      rest = rest.slice(1);
    }

    rest = rest.replace(AFTER_DIGITS, "");

    if (hasPlus) {
      rest = `+${rest}`;
    }

    return rest;
  }

  return undefined;
};

const extractFormattedDigitsAndPlusSign = (text: string): [string, boolean] => {
  let digits = extractFormattedDigitsAndPlus(text) ?? "";
  let hasPlus = false;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
    hasPlus = true;
  }

  if (!VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_PATTERN.test(digits)) {
    digits = "";
  }

  return [digits, hasPlus];
};

class AsYouTypeParser {
  hasExtractedNationalSignificantNumber: boolean | undefined;
  hasSelectedNumberingPlan: boolean | undefined;
  couldPossiblyExtractAnotherNationalSignificantNumber:
    | boolean
    | string
    | undefined;
  private readonly defaultCountry: string | undefined;
  private readonly defaultCallingCode: string | undefined;
  private readonly metadata: Metadata;
  private readonly onNationalSignificantNumberChange: () => void;

  constructor(options: {
    defaultCallingCode: string | undefined;
    defaultCountry: string | undefined;
    metadata: Metadata;
    onNationalSignificantNumberChange: () => void;
  }) {
    this.defaultCountry = options.defaultCountry;
    this.defaultCallingCode = options.defaultCallingCode;
    this.metadata = options.metadata;
    this.onNationalSignificantNumberChange =
      options.onNationalSignificantNumberChange;
  }

  input(text: string, state: AsYouTypeState) {
    const [formattedDigits, hasPlus] = extractFormattedDigitsAndPlusSign(text);
    const digits = parseDigits(formattedDigits);
    let justLeadingPlus: boolean | undefined;

    if (hasPlus && !state.digits) {
      state.startInternationalNumber(undefined, undefined);

      if (!digits) {
        justLeadingPlus = true;
      }
    }

    if (digits) {
      this.inputDigits(digits, state);
    }

    return { digits, justLeadingPlus };
  }

  inputDigits(digits: string, state: AsYouTypeState) {
    const previousDigits = state.digits;

    const reachesIddLength =
      previousDigits.length < 3 && previousDigits.length + digits.length >= 3;

    state.appendDigits(digits);

    if (reachesIddLength) {
      this.extractIddPrefix(state);
    }

    if (this.isWaitingForCountryCallingCode(state)) {
      if (!this.extractCountryCallingCode(state)) {
        return;
      }
    } else {
      state.appendNationalSignificantNumberDigits(digits);
    }

    if (!(state.international || this.hasExtractedNationalSignificantNumber)) {
      this.extractNationalSignificantNumber(
        state.getNationalDigits(),
        (patch) => {
          state.update(patch);
        }
      );
    }
  }

  isWaitingForCountryCallingCode(state: AsYouTypeState) {
    return state.international && !state.callingCode;
  }

  extractCountryCallingCode(state: AsYouTypeState) {
    const { countryCallingCode, number } = extractCountryCallingCode(
      `+${state.getDigitsWithoutInternationalPrefix()}`,
      state.country,
      this.defaultCountry,
      this.defaultCallingCode,
      this.metadata.metadata
    );

    if (countryCallingCode) {
      state.setCallingCode(countryCallingCode);
      state.update({ nationalSignificantNumber: number });

      return true;
    }

    return undefined;
  }

  reset(plan: NumberingPlan | undefined) {
    if (plan) {
      this.hasSelectedNumberingPlan = true;

      const prefixForParsing = plan._nationalPrefixForParsing();

      this.couldPossiblyExtractAnotherNationalSignificantNumber =
        prefixForParsing && NOT_DIGIT_OR_BRACKET.test(prefixForParsing);
    } else {
      this.hasSelectedNumberingPlan = undefined;
      this.couldPossiblyExtractAnotherNationalSignificantNumber = undefined;
    }
  }

  extractNationalSignificantNumber(
    nationalDigits: string,
    setState: (patch: StatePatch) => void
  ) {
    if (this.hasSelectedNumberingPlan) {
      const { carrierCode, nationalNumber, nationalPrefix } =
        extractNationalNumberFromPossiblyIncompleteNumber(
          nationalDigits,
          this.metadata
        );

      if (nationalNumber !== nationalDigits) {
        this.onExtractedNationalNumber(
          nationalPrefix,
          carrierCode,
          nationalNumber,
          nationalDigits,
          setState
        );

        return true;
      }
    }

    return undefined;
  }

  extractAnotherNationalSignificantNumber(
    nationalDigits: string,
    nationalSignificantNumber: string,
    setState: (patch: StatePatch) => void
  ) {
    if (!this.hasExtractedNationalSignificantNumber) {
      return this.extractNationalSignificantNumber(nationalDigits, setState);
    }

    if (this.couldPossiblyExtractAnotherNationalSignificantNumber) {
      const { carrierCode, nationalNumber, nationalPrefix } =
        extractNationalNumberFromPossiblyIncompleteNumber(
          nationalDigits,
          this.metadata
        );

      if (nationalNumber !== nationalSignificantNumber) {
        this.onExtractedNationalNumber(
          nationalPrefix,
          carrierCode,
          nationalNumber,
          nationalDigits,
          setState
        );

        return true;
      }
    }

    return undefined;
  }

  onExtractedNationalNumber(
    nationalPrefix: string | undefined,
    carrierCode: string | undefined,
    nationalSignificantNumber: string,
    nationalDigits: string,
    setState: (patch: StatePatch) => void
  ) {
    let nationalSignificantNumberIsModified = false;
    let prefixBefore: string | undefined;
    const index = nationalDigits.lastIndexOf(nationalSignificantNumber);

    if (
      index === -1 ||
      index !== nationalDigits.length - nationalSignificantNumber.length
    ) {
      nationalSignificantNumberIsModified = true;
    } else {
      const prefix = nationalDigits.slice(0, index);

      if (prefix && prefix !== nationalPrefix) {
        prefixBefore = prefix;
      }
    }

    setState({
      carrierCode,
      nationalPrefix,
      nationalSignificantNumber,
      nationalSignificantNumberIsModified,
      prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix:
        prefixBefore,
    });
    this.hasExtractedNationalSignificantNumber = true;
    this.onNationalSignificantNumberChange();
  }

  reExtractNationalSignificantNumber(state: AsYouTypeState) {
    if (
      this.extractAnotherNationalSignificantNumber(
        state.getNationalDigits(),
        state.nationalSignificantNumber,
        (patch) => {
          state.update(patch);
        }
      )
    ) {
      return true;
    }

    if (this.extractIddPrefix(state) || this.fixMissingPlus(state)) {
      this.extractCallingCodeAndNationalSignificantNumber(state);

      return true;
    }

    return undefined;
  }

  extractIddPrefix(state: AsYouTypeState) {
    const { digits, IDDPrefix, international } = state;

    if (!(international || IDDPrefix)) {
      const withoutPrefix = stripIddPrefix(
        digits,
        this.defaultCountry,
        this.metadata.metadata
      );

      if (withoutPrefix !== undefined && withoutPrefix !== digits) {
        state.update({
          IDDPrefix: digits.slice(0, digits.length - withoutPrefix.length),
        });
        this.startInternationalNumber(state, {
          callingCode: undefined,
          country: undefined,
        });

        return true;
      }
    }

    return undefined;
  }

  fixMissingPlus(state: AsYouTypeState) {
    if (!state.international) {
      const { countryCallingCode } =
        extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(
          state.digits,
          state.country,
          this.defaultCountry,
          this.defaultCallingCode,
          this.metadata.metadata
        );

      if (countryCallingCode) {
        state.update({ missingPlus: true });
        this.startInternationalNumber(state, {
          callingCode: countryCallingCode,
          country: state.country,
        });

        return true;
      }
    }

    return undefined;
  }

  startInternationalNumber(
    state: AsYouTypeState,
    {
      callingCode,
      country,
    }: { callingCode: string | undefined; country: string | undefined }
  ) {
    state.startInternationalNumber(country, callingCode);

    if (state.nationalSignificantNumber) {
      state.resetNationalSignificantNumber();
      this.onNationalSignificantNumberChange();
      this.hasExtractedNationalSignificantNumber = undefined;
    }
  }

  extractCallingCodeAndNationalSignificantNumber(state: AsYouTypeState) {
    if (this.extractCountryCallingCode(state)) {
      this.extractNationalSignificantNumber(
        state.getNationalDigits(),
        (patch) => {
          state.update(patch);
        }
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* AsYouType.                                                      */
/* ------------------------------------------------------------------ */

const getCountryOfAmbiguousCallingCode = (
  callingCode: string,
  nationalNumber: string,
  metadata: Metadata
) => {
  const countries = metadata.getCountryCodesForCallingCode(callingCode);

  if (countries && countries.length > 1) {
    return getCountryByNationalNumber(
      nationalNumber,
      countries,
      metadata.metadata
    );
  }

  return undefined;
};

class AsYouType {
  country: string | undefined;
  private readonly metadata: Metadata;
  private readonly defaultCountry: string | undefined;
  private readonly defaultCallingCode: string | undefined;
  private state!: AsYouTypeState;
  private formatter!: AsYouTypeFormatter;
  private parser!: AsYouTypeParser;
  private formattedOutput = "";

  constructor(
    defaultCountry: string | null | undefined,
    data: PhoneMetadata = phoneMetadata
  ) {
    this.metadata = new Metadata(data);

    // A default country the metadata does not know is dropped.
    this.defaultCountry =
      defaultCountry && this.metadata.hasCountry(defaultCountry)
        ? defaultCountry
        : undefined;
    this.defaultCallingCode = undefined;
    this.reset();
  }

  input(text: string) {
    const { digits, justLeadingPlus } = this.parser.input(text, this.state);

    if (justLeadingPlus) {
      this.formattedOutput = "+";
    } else if (digits) {
      this.determineTheCountryIfNeeded();

      if (this.state.nationalSignificantNumber) {
        this.formatter.narrowDownMatchingFormats(this.state);
      }

      let formatted: string | undefined;

      if (this.metadata.hasSelectedNumberingPlan()) {
        formatted = this.formatter.format(digits, this.state);
      }

      if (
        formatted === undefined &&
        this.parser.reExtractNationalSignificantNumber(this.state)
      ) {
        this.determineTheCountryIfNeeded();

        const nationalDigits = this.state.getNationalDigits();

        if (nationalDigits) {
          formatted = this.formatter.format(nationalDigits, this.state);
        }
      }

      this.formattedOutput = formatted
        ? this.getFullNumber(formatted)
        : this.getNonFormattedNumber();
    }

    return this.formattedOutput;
  }

  reset() {
    this.state = new AsYouTypeState({
      onCallingCodeChange: (callingCode, country) => {
        this.metadata.selectNumberingPlan(country || callingCode || "");
        this.formatter.reset(this.metadata.numberingPlan, this.state);
        this.parser.reset(this.metadata.numberingPlan);
      },
      onCountryChange: (country) => {
        this.country = country;
      },
    });
    this.formatter = new AsYouTypeFormatter(this.metadata);
    this.parser = new AsYouTypeParser({
      defaultCallingCode: this.defaultCallingCode,
      defaultCountry: this.defaultCountry,
      metadata: this.metadata,
      onNationalSignificantNumberChange: () => {
        this.determineTheCountryIfNeeded();
        this.formatter.reset(this.metadata.numberingPlan, this.state);
      },
    });
    this.state.reset({
      callingCode: this.defaultCallingCode,
      country: this.defaultCountry,
    });
    this.formattedOutput = "";

    return this;
  }

  isInternational() {
    return this.state.international;
  }

  getCountry() {
    if (this.state.digits) {
      return this.country;
    }

    return undefined;
  }

  determineTheCountryIfNeeded() {
    if (!this.state.country || this.isCountryCallingCodeAmbiguous()) {
      this.determineTheCountry();
    }
  }

  getFullNumber(formattedNationalNumber: string) {
    if (this.isInternational()) {
      const prefixed = (text: string) =>
        this.formatter.getInternationalPrefixBeforeCountryCallingCode(
          this.state,
          { spacing: Boolean(text) }
        ) + text;

      const { callingCode } = this.state;

      let withCallingCode = callingCode ?? "";

      if (callingCode && formattedNationalNumber) {
        withCallingCode = `${callingCode} ${formattedNationalNumber}`;
      }

      return prefixed(
        callingCode
          ? withCallingCode
          : this.state.getDigitsWithoutInternationalPrefix()
      );
    }

    return formattedNationalNumber;
  }

  getNonFormattedNationalNumberWithPrefix() {
    const {
      nationalPrefix,
      nationalSignificantNumber,
      prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix,
    } = this.state;

    let number = nationalSignificantNumber;

    const prefix =
      prefixBeforeNationalSignificantNumberThatIsNotNationalPrefix ||
      nationalPrefix;

    if (prefix) {
      number = prefix + number;
    }

    return number;
  }

  getNonFormattedNumber() {
    const { nationalSignificantNumberIsModified } = this.state;

    return this.getFullNumber(
      nationalSignificantNumberIsModified
        ? this.state.getNationalDigits()
        : this.getNonFormattedNationalNumberWithPrefix()
    );
  }

  getNonFormattedTemplate() {
    const number = this.getNonFormattedNumber();

    if (number) {
      return number.replaceAll(/[+\d]/g, "x");
    }

    return undefined;
  }

  isCountryCallingCodeAmbiguous() {
    const { callingCode } = this.state;

    const countries =
      callingCode === undefined
        ? undefined
        : this.metadata.getCountryCodesForCallingCode(callingCode);

    return Boolean(countries && countries.length > 1);
  }

  determineTheCountry() {
    const callingCode = this.isInternational()
      ? this.state.callingCode
      : this.defaultCallingCode;

    const country =
      callingCode === undefined
        ? undefined
        : getCountryByCallingCode(
            callingCode,
            this.state.nationalSignificantNumber,
            this.metadata
          );

    if (country !== this.state.country) {
      this.state.setCountry(country);

      if (country) {
        this.metadata.selectNumberingPlan(country);
      }
    }
  }

  getNumberValue() {
    const { callingCode, country, digits, nationalSignificantNumber } =
      this.state;

    if (digits) {
      if (this.isInternational()) {
        return callingCode
          ? `+${callingCode}${nationalSignificantNumber}`
          : `+${digits}`;
      }

      if (country || callingCode) {
        return `+${country ? this.metadata.countryCallingCode() : callingCode}${nationalSignificantNumber}`;
      }
    }

    return undefined;
  }

  getNumber() {
    const { callingCode, nationalSignificantNumber } = this.state;

    if (nationalSignificantNumber) {
      let { country } = this;

      if (country || callingCode) {
        if (country && country === this.defaultCountry) {
          const other = getCountryOfAmbiguousCallingCode(
            this.metadata.plan().callingCode(),
            nationalSignificantNumber,
            this.metadata
          );

          if (other) {
            country = other;
          }
        }

        return new PhoneNumber(
          country || callingCode || "",
          nationalSignificantNumber,
          this.metadata.metadata
        );
      }
    }

    return undefined;
  }

  getTemplate() {
    return (
      this.formatter.getTemplate(this.state) ||
      this.getNonFormattedTemplate() ||
      ""
    );
  }
}

// The text formatted as it is typed.
const formatIncompletePhoneNumber = (
  text: string,
  defaultCountry?: string | null,
  data: PhoneMetadata = phoneMetadata
) => new AsYouType(defaultCountry, data).input(text);

export { AsYouType, formatIncompletePhoneNumber };
