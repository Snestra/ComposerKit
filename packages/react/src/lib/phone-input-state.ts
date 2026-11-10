/*
 * State rules of the phone input: the helpers of react-phone-number-input.
 *
 * The helpers that read a phone number
 * are libphonenumber-js code in lib/phone-number.ts and
 * lib/phone-as-you-type.ts. Options the wrapper never sets are left out:
 * limitMaxLength is always on and
 * countryCallingCodeEditable is always on.
 *
 * react-phone-number-input is distributed under this licence:
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
/* oxlint-disable complexity -- getDigitsChange and getDerivedState keep the branches of libphonenumber-js. */
/* oxlint-disable typescript/strict-boolean-expressions, typescript/prefer-nullish-coalescing, unicorn/no-useless-undefined -- The code relies on JavaScript truthiness (undefined, null and the empty string all mean "no value") and on explicit undefined results; rewriting those tests would risk changing behaviour. */
import { AsYouType } from "./phone-as-you-type";
import { phoneMetadata } from "./phone-metadata";
import {
  Metadata,
  getCountryCallingCode as getCallingCodeOf,
  isSupportedCountry as isCountryInMetadata,
  parsePhoneNumber,
} from "./phone-number";
import type { PhoneNumber } from "./phone-number";

interface PhoneState {
  country: string | undefined;
  hasUserSelectedACountry: boolean | undefined;
  latestCountrySelectedByUser: string | undefined;
  phoneDigits: string | undefined;
  value: string | undefined;
}

const getCountries = () => new Metadata(phoneMetadata).getCountries();

const getCountryCallingCode = (country: string) =>
  getCallingCodeOf(country, phoneMetadata);

const getPlusCallingCode = (country: string) =>
  `+${getCountryCallingCode(country)}`;

const isSupportedCountry = (country: string) =>
  isCountryInMetadata(country, phoneMetadata);

const isCountrySupportedWithError = (country: string) => {
  if (isSupportedCountry(country)) {
    return true;
  }

  // oxlint-disable-next-line no-console -- libphonenumber-js reports the unknown country.
  console.error(`Country not found: ${country}`);

  return false;
};

const filterSupportedCountries = (countries: readonly string[] | undefined) => {
  if (countries) {
    const supported = countries.filter((country) =>
      isCountrySupportedWithError(country)
    );

    return supported.length === 0 ? undefined : supported;
  }

  return countries;
};

const ORDER_MARKERS = new Set(["🌐", "|", "...", "…"]);

const filterCountryOptionsOrder = (order: readonly string[] | undefined) => {
  if (order) {
    const supported = order.filter((entry) =>
      ORDER_MARKERS.has(entry) ? true : isCountrySupportedWithError(entry)
    );

    if (supported.length > 0) {
      return supported;
    }
  }

  return undefined;
};

// The value is an E.164 number, a plus sign and digits.
const isE164Number = (value: string) => {
  if (value.length < 2 || !value.startsWith("+")) {
    return false;
  }

  for (let index = 1; index < value.length; index += 1) {
    const code = value.codePointAt(index) ?? 0;

    if (!(code >= 48 && code <= 57)) {
      return false;
    }
  }

  return true;
};

const checkInitialValue = (value: string) => {
  if (!isE164Number(value)) {
    // oxlint-disable-next-line no-console -- libphonenumber-js reports a value that is not an E.164 number.
    console.error(
      "[react-phone-number-input] Expected the initial `value` to be a E.164 phone number. Got",
      value
    );
  }
};

const parseValue = (value: string | undefined) =>
  parsePhoneNumber(value || "", phoneMetadata);

const getNationalDigits = (phoneNumber: PhoneNumber) =>
  phoneNumber.formatNational().replaceAll(/\D/gu, "");

// The text starts like the calling code of the country, or the calling code
// starts like the text.
const couldNumberBelongToCountry = (text: string, country: string) => {
  const code = getPlusCallingCode(country);

  for (let index = 0; index < text.length && index < code.length; index += 1) {
    if (text[index] !== code[index]) {
      return false;
    }
  }

  return true;
};

const getNationalNumberOfDigits = (digits: string, country: string) => {
  const parser = new AsYouType(country, phoneMetadata);

  parser.input(digits);

  return parser.getNumber()?.nationalNumber;
};

const getCountryOfDigits = (digits: string) => {
  const parser = new AsYouType(null, phoneMetadata);

  parser.input(digits);

  return parser.getCountry();
};

// The value (an E.164 number) of phone digits.
const getPhoneValue = (
  phoneDigits: string | undefined,
  country: string | undefined
) => {
  if (phoneDigits) {
    if (phoneDigits.startsWith("+")) {
      if (phoneDigits === "+") {
        return undefined;
      }

      const parser = new AsYouType(country, phoneMetadata);

      parser.input(phoneDigits);

      return parser.getNumberValue();
    }

    if (country) {
      const national = getNationalNumberOfDigits(phoneDigits, country);

      return `+${getCountryCallingCode(country)}${national || ""}`;
    }
  }

  return undefined;
};

// The longest possible national number of the country.
const getLongestPossibleLength = (country: string) => {
  const metadata = new Metadata(phoneMetadata);

  metadata.selectNumberingPlan(country);

  const lengths = metadata.plan().possibleLengths();

  return lengths?.at(-1) ?? 0;
};

// The digits cut to the longest possible national number.
const limitMaxLength = (digits: string, country: string) => {
  const national = getNationalNumberOfDigits(digits, country);

  if (national) {
    const excess = national.length - getLongestPossibleLength(country);

    if (excess > 0) {
      return digits.slice(0, digits.length - excess);
    }
  }

  return digits;
};

// The national digits of international phone digits.
const toNationalDigits = (digits: string, country: string) => {
  if (digits.startsWith(getPlusCallingCode(country))) {
    const parser = new AsYouType(country, phoneMetadata);

    parser.input(digits);

    const phoneNumber = parser.getNumber();

    return phoneNumber ? getNationalDigits(phoneNumber) : "";
  }

  return digits.replaceAll(/\D/gu, "");
};

// The national part of international phone digits.
const getNationalPart = (digits: string, country: string) => {
  if (country) {
    const code = getPlusCallingCode(country);

    if (digits.length < code.length) {
      if (code.startsWith(digits)) {
        return "";
      }
    } else if (digits.startsWith(code)) {
      return digits.slice(code.length);
    }
  }

  for (const code of Object.keys(phoneMetadata.country_calling_codes)) {
    if (digits.indexOf(code) === 1) {
      return digits.slice(1 + code.length);
    }
  }

  return "";
};

interface CountryForTextOptions {
  countries: readonly string[] | undefined;
  country: string | undefined;
  defaultCountry?: string | undefined;
  latestCountrySelectedByUser?: string | undefined;
  required?: boolean;
}

// The country of a phone number as it is typed, given the country it had.
const getCountryForPartialE164Number = (
  value: string,
  {
    countries,
    country,
    defaultCountry,
    latestCountrySelectedByUser,
    required,
  }: CountryForTextOptions
) => {
  if (value === "+") {
    return country;
  }

  const detected = getCountryOfDigits(value);

  if (detected) {
    return !countries || countries.includes(detected) ? detected : undefined;
  }

  if (country) {
    if (couldNumberBelongToCountry(value, country)) {
      if (
        latestCountrySelectedByUser &&
        couldNumberBelongToCountry(value, latestCountrySelectedByUser)
      ) {
        return latestCountrySelectedByUser;
      }

      if (defaultCountry && couldNumberBelongToCountry(value, defaultCountry)) {
        return defaultCountry;
      }

      if (!required) {
        return undefined;
      }
    } else if (!required) {
      return undefined;
    }
  }

  return country;
};

interface DigitsChangeOptions {
  countries: readonly string[] | undefined;
  country: string | undefined;
  countryRequired: boolean;
  defaultCountry: string | undefined;
  getAnyCountry: () => string | undefined;
  international: boolean | undefined;
  latestCountrySelectedByUser: string | undefined;
  previousDigits: string | undefined;
}

interface DigitsChange {
  country: string | undefined;
  phoneDigits: string | undefined;
  value: string | undefined;
}

// The state after the phone digits changed.
const getDigitsChange = (
  typed: string,
  options: DigitsChangeOptions
): DigitsChange => {
  const { defaultCountry, international, previousDigits } = options;
  let { country } = options;
  let digits: string | undefined = typed;

  if (international === false && country && digits && digits.startsWith("+")) {
    digits = toNationalDigits(digits, country);
  }

  if (digits && country) {
    digits = limitMaxLength(digits, country);
  }

  if (digits && !digits.startsWith("+") && (!country || international)) {
    digits = `+${digits}`;
  }

  if (!digits && previousDigits && previousDigits.startsWith("+")) {
    country = international ? undefined : defaultCountry;
  }

  if (
    digits === "+" &&
    previousDigits &&
    previousDigits.startsWith("+") &&
    previousDigits.length > 1
  ) {
    country = undefined;
  }

  let value: string | undefined;

  if (digits) {
    value =
      digits.startsWith("+") &&
      (digits === "+" ||
        (country && getPlusCallingCode(country).startsWith(digits)))
        ? undefined
        : getPhoneValue(digits, country);
  }

  if (value) {
    country = getCountryForPartialE164Number(value, {
      countries: options.countries,
      country,
      defaultCountry,
      latestCountrySelectedByUser: options.latestCountrySelectedByUser,
      required: false,
    });

    if (
      international === false &&
      country &&
      digits &&
      digits.startsWith("+")
    ) {
      digits = toNationalDigits(digits, country);
      value = getPhoneValue(digits, country);
    }
  }

  if (!country && options.countryRequired) {
    country = defaultCountry || options.getAnyCountry();
  }

  return { country, phoneDigits: digits, value };
};

// The phone digits after the country changed.
const getDigitsForNewCountry = (
  digits: string | undefined,
  {
    newCountry,
    previousCountry,
    useNationalFormat,
  }: {
    newCountry: string | undefined;
    previousCountry: string | undefined;
    useNationalFormat: boolean;
  }
) => {
  if (previousCountry === newCountry) {
    return digits;
  }

  if (!digits) {
    if (useNationalFormat) {
      return "";
    }

    return newCountry ? getPlusCallingCode(newCountry) : "";
  }

  if (newCountry) {
    if (digits.startsWith("+")) {
      if (useNationalFormat) {
        return digits.startsWith(`+${getCountryCallingCode(newCountry)}`)
          ? getNationalPart(digits, newCountry)
          : "";
      }

      const code = getPlusCallingCode(newCountry);

      return digits.startsWith(code) ? digits : code;
    }
  } else if (!digits.startsWith("+")) {
    return getPhoneValue(digits, previousCountry) || "";
  }

  return digits;
};

interface InitialCountryOptions {
  countries: readonly string[] | undefined;
  defaultCountry: string | undefined;
  getAnyCountry: () => string | undefined;
  phoneNumber: PhoneNumber | undefined;
  required: boolean;
  value: string | undefined;
}

// The first country.
const getInitialCountry = ({
  countries,
  defaultCountry,
  getAnyCountry,
  phoneNumber,
  required,
  value,
}: InitialCountryOptions) => {
  let country: string | undefined;

  if (phoneNumber?.country) {
    ({ country } = phoneNumber);
  } else if (
    defaultCountry &&
    (!value || couldNumberBelongToCountry(value, defaultCountry))
  ) {
    country = defaultCountry;
  }

  if (country !== undefined && countries && !countries.includes(country)) {
    country = undefined;
  }

  if (!country && required && countries && countries.length > 0) {
    country = getAnyCountry();
  }

  return country;
};

// The phone digits that show a value.
const getPhoneDigitsForValue = ({
  defaultCountry,
  international,
  phoneNumber,
  useNationalFormat,
  value,
}: {
  defaultCountry: string | undefined;
  international: boolean | undefined;
  phoneNumber?: PhoneNumber | undefined;
  useNationalFormat: boolean;
  value: string | undefined;
}) => {
  if ((international === false || useNationalFormat) && phoneNumber?.country) {
    return getNationalDigits(phoneNumber);
  }

  if (!value && international && defaultCountry) {
    return getPlusCallingCode(defaultCountry);
  }

  return value;
};

// Undefined and null are the same value.
const isSameValue = (first: string | undefined, second: string | undefined) =>
  (first ?? undefined) === (second ?? undefined);

interface DerivedStateProps {
  countries: readonly string[] | undefined;
  defaultCountry: string | undefined;
  displayInitialValueAsLocalNumber: boolean | undefined;
  initialValueFormat: "national" | undefined;
  international: boolean | undefined;
  reset: unknown;
  value: string | undefined;
}

interface DerivedStatePrevious {
  defaultCountry: string | undefined;
  reset: unknown;
  value: string | undefined;
}

// The state that follows a change of the props. The result has only the
// fields that change, or is undefined when none does.
const getDerivedState = (
  props: DerivedStateProps,
  previous: DerivedStatePrevious,
  state: PhoneState
): Partial<PhoneState> | undefined => {
  const { defaultCountry, international, reset, value } = props;

  const digitsOf = (options: {
    defaultCountry: string | undefined;
    phoneNumber?: PhoneNumber | undefined;
    value: string | undefined;
  }) =>
    getPhoneDigitsForValue({
      ...options,
      international,
      useNationalFormat:
        Boolean(props.displayInitialValueAsLocalNumber) ||
        props.initialValueFormat === "national",
    });

  if (reset !== previous.reset) {
    return {
      country: defaultCountry,
      hasUserSelectedACountry: undefined,
      latestCountrySelectedByUser: undefined,
      phoneDigits: digitsOf({ defaultCountry, value: undefined }),
      value: undefined,
    };
  }

  if (defaultCountry !== previous.defaultCountry) {
    const isSupported =
      !defaultCountry || isCountrySupportedWithError(defaultCountry);

    const isUntouched =
      !state.value ||
      (international &&
        state.value ===
          digitsOf({
            defaultCountry: previous.defaultCountry,
            value: undefined,
          }));

    if (
      !state.hasUserSelectedACountry &&
      isSupported &&
      !value &&
      isUntouched
    ) {
      return {
        country: defaultCountry,
        phoneDigits: digitsOf({ defaultCountry, value: undefined }),
        value: undefined,
      };
    }
  }

  if (!isSameValue(value, previous.value) && !isSameValue(value, state.value)) {
    let phoneNumber: PhoneNumber | undefined;
    let country: string | undefined;

    if (value) {
      checkInitialValue(value);
      phoneNumber = parseValue(value);

      const countries = filterSupportedCountries(props.countries);

      if (phoneNumber?.country) {
        if (!countries || countries.includes(phoneNumber.country)) {
          ({ country } = phoneNumber);
        }
      } else {
        country = getCountryForPartialE164Number(value, {
          countries,
          country: undefined,
        });

        if (
          !country &&
          defaultCountry &&
          value.startsWith(getPlusCallingCode(defaultCountry))
        ) {
          country = defaultCountry;
        }
      }
    }

    let latest: Partial<PhoneState> | undefined;
    const latestCountry = state.latestCountrySelectedByUser;

    if (value) {
      if (latestCountry) {
        const sameCountry = country
          ? latestCountry === country
          : couldNumberBelongToCountry(value, latestCountry);

        if (sameCountry) {
          country ||= latestCountry;
        } else {
          latest = { latestCountrySelectedByUser: undefined };
        }
      }
    } else {
      latest = {
        hasUserSelectedACountry: undefined,
        latestCountrySelectedByUser: undefined,
      };
    }

    return {
      ...latest,
      country: value ? country : defaultCountry,
      phoneDigits: digitsOf({ defaultCountry, phoneNumber, value }),
      value,
    };
  }

  return undefined;
};

export {
  checkInitialValue,
  couldNumberBelongToCountry,
  filterCountryOptionsOrder,
  filterSupportedCountries,
  getCountries,
  getCountryCallingCode,
  getDerivedState,
  getDigitsChange,
  getDigitsForNewCountry,
  getInitialCountry,
  getPhoneDigitsForValue,
  getPhoneValue,
  isCountrySupportedWithError,
  isSupportedCountry,
  parseValue,
};

export type { PhoneState };
