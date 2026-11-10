import { cn } from "composerkit/lib/utils";
import type { ComponentProps } from "react";

import styles from "composerkit/components/typography/typography.module.css";

/*
 * The heading, body and small-caps classes, the truncation utilities the
 * components use, and
 * MiddleTruncatedBranchLabel.
 */

const headingClasses = {
  "2xl": styles.heading2xl,
  "3xl": styles.heading3xl,
  "4xl": styles.heading4xl,
  base: styles.headingBase,
  dialog: styles.headingDialog,
  lg: styles.headingLg,
  md: styles.headingMd,
  sm: styles.headingSm,
  subsection: styles.headingSubsection,
  xl: styles.headingXl,
  xs: styles.headingXs,
} as const;

type HeadingVariant = keyof typeof headingClasses;

type HeadingProps = ComponentProps<"h2"> & {
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  variant?: HeadingVariant;
};

const Heading = ({
  as: Element = "h2",
  className,
  variant = "base",
  ...props
}: HeadingProps) => (
  <Element
    className={cn(headingClasses[variant], className)}
    data-variant={variant}
    {...props}
  />
);

const textClasses = {
  "body-md": styles.bodyMd,
  "body-sm": styles.bodySm,
  "small-caps-lg": styles.smallCapsLg,
  "small-caps-md": styles.smallCapsMd,
} as const;

const clampClasses = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  truncate: "truncate",
} as const;

type TextVariant = keyof typeof textClasses;

type TextProps = ComponentProps<"span"> & {
  balance?: boolean;
  breakWords?: boolean;
  clamp?: keyof typeof clampClasses;
  tabularNums?: boolean;
  variant?: TextVariant;
  wrapAnywhere?: boolean;
};

const Text = ({
  balance = false,
  breakWords = false,
  className,
  clamp,
  tabularNums = false,
  variant = "body-md",
  wrapAnywhere = false,
  ...props
}: TextProps) => (
  <span
    className={cn(
      textClasses[variant],
      clamp !== undefined && clampClasses[clamp],
      balance && "text-balance",
      breakWords && "break-words",
      wrapAnywhere && "wrap-anywhere",
      tabularNums && "tabular-nums",
      className
    )}
    data-variant={variant}
    {...props}
  />
);

const MiddleTruncatedBranchLabel = ({
  branchName,
  suffixCharacterCount,
}: {
  branchName: string;
  suffixCharacterCount: number;
}) => {
  if (branchName.length <= suffixCharacterCount) {
    return (
      <span className="block min-w-0 truncate" data-ck-tooltip-overflow-target>
        {branchName}
      </span>
    );
  }

  const split = branchName.length - suffixCharacterCount;

  return (
    <span className="flex min-w-0 overflow-hidden">
      <span className="min-w-0 truncate" data-ck-tooltip-overflow-target>
        {branchName.slice(0, split)}
      </span>
      <span className="max-w-full shrink-0 truncate">
        {branchName.slice(split)}
      </span>
    </span>
  );
};

export { Heading, MiddleTruncatedBranchLabel, Text };
