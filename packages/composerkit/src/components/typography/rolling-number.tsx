import type { ComponentProps, CSSProperties } from "react";

import styles from "./typography.module.css";

/*
 * RollingNumber and its digit columns. Digit keys count from the right, so a
 * changing digit keeps its identity.
 */

type RollingNumberVariant = "diff-stat" | "inline";

type RollingNumberProps = Omit<ComponentProps<"span">, "children"> & {
  locale?: string;
  value: number;
  variant?: RollingNumberVariant;
};

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const isDigit = (character: string) => character >= "0" && character <= "9";

const DigitColumn = ({
  digit,
  variant,
}: {
  digit: string;
  variant: RollingNumberVariant;
}) => {
  const stackStyle: CSSProperties & { "--digit": string } = {
    "--digit": digit,
  };

  return (
    <span
      aria-hidden="true"
      className={styles.digitColumn}
      data-variant={variant}
    >
      <span className={styles.digitClip}>
        <span className={styles.digitStack} style={stackStyle}>
          {DIGITS.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </span>
      </span>
    </span>
  );
};

const RollingNumber = ({
  locale = "en-US",
  value,
  variant = "diff-stat",
  ...props
}: RollingNumberProps) => {
  const formatted = new Intl.NumberFormat(locale).format(value);
  // oxlint-disable-next-line typescript/no-misused-spread -- the component splits with Array.from
  const characters = [...formatted];
  let digitsLeft = characters.filter(isDigit).length;

  return (
    <span {...props} aria-label={formatted} className={styles.rolling}>
      {characters.map((character, index) => {
        if (isDigit(character)) {
          digitsLeft -= 1;

          return (
            <DigitColumn
              key={`digit-${digitsLeft}`}
              digit={character}
              variant={variant}
            />
          );
        }

        return (
          <span
            // oxlint-disable-next-line react/no-array-index-key -- the component keys a separator by its position
            key={`separator-${index}`}
            aria-hidden="true"
            className={styles.separator}
          >
            {character}
          </span>
        );
      })}
    </span>
  );
};

export { RollingNumber };
