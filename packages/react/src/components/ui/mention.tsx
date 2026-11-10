"use client";

/* oxlint-disable react/no-clone-element, shadcn/no-inline-styles -- InlineMention clones its icon element and the underline-scope child and merges the caller's style object into the mention colour variables. */

import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { cloneElement, createElement, isValidElement } from "react";
import type {
  ComponentProps,
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";

import styles from "@workspace/react/components/mention/mention.module.css";

type MentionAppearance = "inline-mention" | "pill" | "underlined-text";

type MentionFontWeight = "inherit" | "medium";

type MentionIconSizing = "authored" | "slot";

type MentionLayout =
  | "inline-flow"
  | "selection-pill"
  | "thumbnail"
  | "wrapped-label";

type MentionTone =
  | "accent"
  | "composer-reference"
  | "file-reference"
  | "neutral"
  | "subtle-accent";

type MentionIcon = ElementType | ReactElement<{ className?: string }>;

type DataAttributes = Readonly<Record<`data-${string}`, string | undefined>>;

type MentionStyle = CSSProperties & Record<`--${string}`, string | undefined>;

interface InlineMentionProps extends Omit<ComponentProps<"span">, "style"> {
  appearance?: MentionAppearance;
  brandColor?: string;
  dataAttributes?: DataAttributes;
  fontWeight?: MentionFontWeight;
  icon?: MentionIcon;
  iconClassName?: string;
  iconSizing?: MentionIconSizing;
  iconSlotProps?: ComponentProps<"span">;
  interactive?: boolean;
  labelClassName?: string;
  layout?: MentionLayout;
  style?: MentionStyle;
  tone?: MentionTone;
  underlineOnHover?: boolean;
}

/** A brand colour or a style colour moves into the two mention variables. */
const resolveStyle = (
  brandColor: string | undefined,
  style: MentionStyle | undefined
): MentionStyle | undefined => {
  if (brandColor === undefined && style?.color === undefined) {
    return style;
  }

  return {
    ...style,
    color: undefined,
    "--ck-mention-base-color": brandColor,
    "--ck-mention-color": style?.color,
  };
};

/** An element gains the icon classes, a component is rendered with them. */
function MentionGlyph({
  className,
  icon,
  iconSizing,
}: {
  className: string | undefined;
  icon: MentionIcon;
  iconSizing: MentionIconSizing;
}) {
  const glyphClass = cn(
    styles.Icon,
    iconSizing === "slot" && styles.SlotSizedIcon,
    className
  );

  if (isValidElement<{ className?: string }>(icon)) {
    return cloneElement(icon, {
      className: cn(glyphClass, icon.props.className),
    });
  }

  return createElement(icon, { className: glyphClass });
}

/** The inline mention span with an icon container and a label. */
function InlineMention({
  appearance = "inline-mention",
  brandColor,
  children,
  className,
  dataAttributes,
  fontWeight = "medium",
  icon,
  iconClassName,
  iconSizing = "slot",
  iconSlotProps,
  interactive = false,
  labelClassName,
  layout = "inline-flow",
  style,
  tone = "accent",
  underlineOnHover = interactive,
  ...props
}: InlineMentionProps) {
  const thumbnail = layout === "thumbnail";

  return (
    <span
      {...props}
      {...dataAttributes}
      className={cn(
        styles.Mention,
        thumbnail && "inline-flex px-1 py-0 align-middle",
        className
      )}
      data-appearance={appearance}
      data-ck-brand-color={brandColor === undefined ? undefined : ""}
      data-ck-font-weight={fontWeight}
      data-ck-inline-mention-interactive={interactive ? "" : undefined}
      data-interactive={interactive ? "" : undefined}
      data-layout={layout}
      data-tone={tone}
      data-underline-on-hover={underlineOnHover ? "" : undefined}
      style={resolveStyle(brandColor, style)}
    >
      {icon === undefined || icon === null ? null : (
        <span
          {...iconSlotProps}
          className={cn(
            styles.IconContainer,
            iconSizing === "slot" &&
              !thumbnail &&
              styles.SlotSizedIconContainer,
            thumbnail && "inline-flex size-8 overflow-hidden rounded-full"
          )}
        >
          <MentionGlyph
            className={iconClassName}
            icon={icon}
            iconSizing={iconSizing}
          />
        </span>
      )}
      <span className={cn(styles.Label, thumbnail && "hidden", labelClassName)}>
        {children}
      </span>
    </span>
  );
}

/** An underlined-text appearance marks its child with the underline scope. */
function UnderlinedMentionScope({
  appearance,
  children,
}: {
  appearance: MentionAppearance;
  children: ReactElement<{ className?: string }>;
}) {
  if (appearance !== "underlined-text") {
    return children;
  }

  return cloneElement(children, {
    className: cn(children.props.className, styles.UnderlinedText),
  });
}

/** Plain text that the underline scope underlines. */
function MentionText({ children }: { children?: ReactNode }) {
  return <span className={styles.Text}>{children}</span>;
}

interface MentionPillProps {
  ariaLabel?: string;
  brandColor?: string;
  className?: string;
  dataAttributes?: DataAttributes;
  icon?: MentionIcon;
  iconClassName?: string;
  interactive?: boolean;
  layout?: MentionLayout;
  role?: ComponentProps<"span">["role"];
  style?: MentionStyle;
  tabIndex?: number;
  text: ReactNode;
  textClassName?: string;
  tooltipBodyClassName?: string;
  tooltipText?: ReactNode;
}

/** An InlineMention that gains a tooltip when `tooltipText` is given. */
function MentionPill({
  ariaLabel,
  brandColor,
  className,
  dataAttributes,
  icon,
  iconClassName,
  interactive = false,
  layout,
  role,
  style,
  tabIndex,
  text,
  textClassName,
  tooltipBodyClassName,
  tooltipText,
}: MentionPillProps) {
  const mention = (
    <InlineMention
      aria-label={ariaLabel}
      brandColor={brandColor}
      className={className}
      dataAttributes={dataAttributes}
      icon={icon}
      iconClassName={iconClassName}
      interactive={interactive}
      labelClassName={textClassName}
      layout={layout}
      role={role}
      style={style}
      tabIndex={tabIndex}
    >
      {text}
    </InlineMention>
  );

  if (tooltipText === undefined || tooltipText === null) {
    return mention;
  }

  return (
    <TooltipHint
      cloneCustomTrigger
      content={tooltipText}
      tooltipBodyClassName={tooltipBodyClassName}
    >
      {mention}
    </TooltipHint>
  );
}

export { InlineMention, MentionPill, MentionText, UnderlinedMentionScope };

export type {
  InlineMentionProps,
  MentionAppearance,
  MentionIcon,
  MentionLayout,
  MentionPillProps,
  MentionTone,
};
