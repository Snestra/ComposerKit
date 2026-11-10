/*
 * Text rules of the phone input field: the parts of react-phone-number-input
 * and input-format that turn typed text into phone digits and back.
 *
 * react-phone-number-input and input-format are distributed under this
 * licence:
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
/* oxlint-disable typescript/strict-boolean-expressions, typescript/prefer-nullish-coalescing, unicorn/no-useless-undefined -- The code relies on JavaScript truthiness (undefined, null and the empty string all mean "no value") and on explicit undefined results; rewriting those tests would risk changing behaviour. */
import { AsYouType } from "./phone-as-you-type";
import { phoneMetadata } from "./phone-metadata";
import { parsePhoneNumberCharacter } from "./phone-number";

// A character of typed text as phone digits. The first plus sign after
// other characters ends the number: the rest of the text is ignored (the
// context keeps that between the characters of one text).
interface ParseContext {
  ignoreRest?: boolean;
}

const parseInputCharacter = (
  character: string,
  parsed: string,
  context: ParseContext
) => {
  if (context.ignoreRest) {
    return undefined;
  }

  return parsePhoneNumberCharacter(character, parsed, (event) => {
    if (event === "end") {
      context.ignoreRest = true;
    }
  });
};

// The phone digits of typed text and the caret in them. A null caret (an
// input without a selection) stays outside the text.
const parseWithCaret = (text: string, caret: number | null | undefined) => {
  const context: ParseContext = {};
  let value = "";
  let parsedCaret = 0;

  for (let index = 0; index < text.length; index += 1) {
    const parsed = parseInputCharacter(text[index] ?? "", value, context);

    if (parsed !== undefined) {
      value += parsed;

      if (caret !== undefined) {
        if (caret === index) {
          parsedCaret = value.length - 1;
        } else if (caret !== null && caret > index) {
          parsedCaret = value.length;
        }
      }
    }
  }

  if (caret === undefined) {
    parsedCaret = value.length;
  }

  return { caret: parsedCaret, value };
};

// The edit that Backspace or Delete makes in the phone digits.
const applyEditKey = (
  value: string,
  caret: number,
  key: "Backspace" | "Delete" | undefined
) => {
  if (key === "Backspace") {
    return caret > 0
      ? {
          caret: caret - 1,
          value: value.slice(0, caret - 1) + value.slice(caret),
        }
      : { caret, value };
  }

  if (key === "Delete") {
    return { caret, value: value.slice(0, caret) + value.slice(caret + 1) };
  }

  return { caret, value };
};

// The phone digits as text and the matching input template.
const formatPhoneInputText = (digits: string, country: string | undefined) => {
  const parser = new AsYouType(country, phoneMetadata);
  const text = parser.input(digits);

  return { template: parser.getTemplate(), text };
};

// The text of phone digits and the caret in it. The caret counts the
// placeholders of the template that the digits before it fill.
const getFormattedTextAndCaret = (
  digits: string,
  caret: number | undefined,
  country: string | undefined
) => {
  const { template, text } = formatPhoneInputText(digits, country);
  let formattedCaret = caret;

  if (template) {
    if (formattedCaret === undefined) {
      formattedCaret = text.length;
    } else {
      let index = 0;
      let isPlaced = false;
      let lastPlaceholder = -1;

      while (index < text.length && index < template.length) {
        if (text[index] !== template[index]) {
          if (formattedCaret === 0) {
            isPlaced = true;
            formattedCaret = index;
            break;
          }

          lastPlaceholder = index;
          formattedCaret -= 1;
        }

        index += 1;
      }

      if (!isPlaced) {
        formattedCaret = lastPlaceholder + 1;
      }
    }
  }

  return { caret: formattedCaret, text };
};

export {
  applyEditKey,
  formatPhoneInputText,
  getFormattedTextAndCaret,
  parseWithCaret,
};
