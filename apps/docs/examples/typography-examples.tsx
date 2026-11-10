"use client";

import { FilenameMiddleEllipsis } from "composerkit/components/typography/filename-middle-ellipsis";
import { HeaderTitleChip } from "composerkit/components/typography/header-title-chip";
import { Marquee } from "composerkit/components/typography/marquee";
import { RollingNumber } from "composerkit/components/typography/rolling-number";
import { Button } from "composerkit/components/ui/button";
import {
  TooltipHint,
  TooltipProvider,
} from "composerkit/components/ui/tooltip";
import {
  Heading,
  MiddleTruncatedBranchLabel,
  Text,
} from "composerkit/components/ui/typography";
import { ReducedMotionProvider } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const sample = "Sample text";

const longText =
  "A long line of sample text that is wider than the box that holds it";

const sizeTokens = [
  "--text-xs",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
  "--text-4xl",
  "--text-reading",
  "--text-hint-description",
  "--text-title-sm",
  "--text-title-md",
  "--text-title-lg",
  "--text-title-app",
] as const;

const headingVariants = [
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "dialog",
  "subsection",
] as const;

const headingTokens = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

const bodyTokens = ["3xs", "2xs", "xs", "sm", "md", "lg"] as const;

const textVariants = [
  "body-sm",
  "body-md",
  "small-caps-md",
  "small-caps-lg",
] as const;

const families = [
  ["--font-sans", "font-sans"],
  ["--font-content", "font-content"],
  ["--font-mono", "font-mono"],
  ["--font-serif", "font-serif"],
] as const;

const weights = [
  ["light", "font-light"],
  ["normal", "font-normal"],
  ["medium", "font-medium"],
  ["semibold", "font-semibold"],
  ["bold", "font-bold"],
] as const;

const colourRoles = [
  ["text-default", "text-text"],
  ["text-secondary", "text-text-muted"],
  ["text-tertiary", "text-text-subtle"],
  ["text-info", "text-text-notice"],
  ["text-danger", "text-text-error"],
  ["text-warning", "text-text-alert"],
  ["text-success", "text-text-positive"],
  ["--color-description", "text-description"],
] as const;

const branchNames = [
  "main",
  "feature/a-long-branch-name-with-a-suffix",
  "release/2026.11.03-candidate",
] as const;

const fileNames = [
  "a-long-file-name-for-the-example.test.tsx",
  "no-extension-in-a-very-long-file-name-example",
  ".hidden-file-with-a-long-name-example",
  "name with spaces. and a long tail",
] as const;

const Section = ({ children, name }: { children: ReactNode; name: string }) => (
  <section
    aria-label={name}
    className="flex flex-col gap-3"
    data-section={name}
  >
    <h2 className="text-title-sm font-semibold">{name}</h2>
    {children}
  </section>
);

const Panel = ({
  children,
  scheme,
}: {
  children: ReactNode;
  scheme: "dark" | "light";
}) => (
  <div
    className={cn(
      scheme,
      "flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-foreground"
    )}
    data-scheme={scheme}
  >
    {children}
  </div>
);

const ThemeScopes = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Panel scheme="light">
      <span>light</span>
      {children}
      <Panel scheme="dark">
        <span>dark</span>
        {children}
      </Panel>
    </Panel>
    <Panel scheme="dark">
      <span>dark</span>
      {children}
      <Panel scheme="light">
        <span>light</span>
        {children}
      </Panel>
    </Panel>
  </div>
);

type VarStyle = CSSProperties & Record<`--${string}`, string>;

const TokenSample = ({
  leading,
  size,
  tracking,
  weight,
}: {
  leading: string;
  size: string;
  tracking?: string;
  weight?: string;
}) => {
  const style: VarStyle = {
    "--token-leading": leading,
    "--token-size": size,
    "--token-tracking": tracking ?? "normal",
    "--token-weight": weight ?? "normal",
  };

  return (
    <span
      className="text-(length:--token-size) leading-(--token-leading) font-(weight:--token-weight) tracking-(--token-tracking)"
      style={style}
    >
      {sample}
    </span>
  );
};

const Box = ({
  children,
  className,
  width,
}: {
  children: ReactNode;
  className?: string;
  width: number;
}) => {
  const style: VarStyle = { "--width": `${width}px` };

  return (
    <div className={cn("w-(--width)", className)} style={style}>
      {children}
    </div>
  );
};

const WidthControl = ({
  max,
  onChange,
  value,
}: {
  max: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <input
    aria-label="width"
    max={max}
    min={0}
    type="range"
    value={value}
    onChange={(event) => {
      onChange(Number(event.target.value));
    }}
  />
);

const SizeScale = () => (
  <Section name="typography-size-scale">
    <div className="flex flex-col gap-1">
      {sizeTokens.map((token) => (
        <div key={token} className="flex items-baseline gap-4">
          <code className="w-64 shrink-0 text-xs text-text-muted">{token}</code>
          <TokenSample
            leading={`var(${token}--line-height)`}
            size={`var(${token})`}
          />
        </div>
      ))}
    </div>
  </Section>
);

const HeadingScale = () => (
  <Section name="typography-heading-scale">
    <div className="flex flex-col gap-2">
      {headingVariants.map((variant) => (
        <div key={variant} className="flex items-baseline gap-4">
          <code className="w-32 shrink-0 text-xs text-text-muted">
            heading-{variant}
          </code>
          <Heading as="div" variant={variant}>
            {sample}
          </Heading>
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-2">
      {headingTokens.map((token) => (
        <div key={token} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">
            --ck-type-heading-{token}
          </code>
          <TokenSample
            leading={`var(--ck-type-heading-${token}-line-height)`}
            size={`var(--ck-type-heading-${token}-size)`}
            tracking={`var(--ck-type-heading-${token}-tracking)`}
            weight={`var(--ck-type-heading-${token}-weight)`}
          />
        </div>
      ))}
    </div>
  </Section>
);

const BodyScale = () => (
  <Section name="typography-body-scale">
    <div className="flex flex-col gap-2">
      {bodyTokens.map((token) => (
        <div key={token} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">
            --ck-type-body-{token}
          </code>
          <TokenSample
            leading={`var(--ck-type-body-${token}-line-height)`}
            size={`var(--ck-type-body-${token}-size)`}
            tracking={`var(--ck-type-body-${token}-tracking)`}
            weight={`var(--ck-type-body-${token}-weight)`}
          />
        </div>
      ))}
      {textVariants.map((variant) => (
        <div key={variant} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">
            {variant}
          </code>
          <Text variant={variant}>{sample}</Text>
        </div>
      ))}
    </div>
  </Section>
);

const FontFamilies = () => (
  <Section name="typography-font-families">
    <div className="flex flex-col gap-1">
      {families.map(([token, utility]) => (
        <div key={token} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">{token}</code>
          <span className={utility}>{sample}</span>
        </div>
      ))}
      <div
        className="flex items-baseline gap-4 [--ck-interface-font:Georgia]"
        data-font-ui-family="Georgia"
      >
        <code className="w-48 shrink-0 text-xs text-text-muted">
          --ck-interface-font
        </code>
        <span className="font-sans">{sample}</span>
      </div>
      {weights.map(([name, utility]) => (
        <div key={name} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">
            --font-weight-{name}
          </code>
          <span className={utility}>{sample}</span>
        </div>
      ))}
      {(
        [
          ["tight", "tracking-tight"],
          ["normal", "tracking-normal"],
        ] as const
      ).map(([name, utility]) => (
        <div key={name} className="flex items-baseline gap-4">
          <code className="w-48 shrink-0 text-xs text-text-muted">
            --tracking-{name}
          </code>
          <span className={utility}>{sample}</span>
        </div>
      ))}
    </div>
  </Section>
);

const TextColourRoles = () => (
  <Section name="typography-text-colour-roles">
    <ThemeScopes>
      <div className="flex flex-col gap-1">
        {colourRoles.map(([role, utility]) => (
          <span key={role} className={utility}>
            {role}
          </span>
        ))}
      </div>
    </ThemeScopes>
  </Section>
);

const MiddleTruncation = () => {
  const [width, setWidth] = useState(160);
  const [count, setCount] = useState(8);

  return (
    <Section name="typography-middle-truncation">
      <div className="flex items-center gap-4">
        <WidthControl max={400} value={width} onChange={setWidth} />
        <input
          aria-label="suffixCharacterCount"
          max={40}
          min={0}
          type="number"
          value={count}
          onChange={(event) => {
            setCount(Number(event.target.value));
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {branchNames.map((name) => (
          <Box key={name} className="border border-stroke-subtle" width={width}>
            <TooltipHint
              content={name}
              openWhen="trigger-overflows"
              side="bottom"
            >
              <span className="block min-w-0">
                <MiddleTruncatedBranchLabel
                  branchName={name}
                  suffixCharacterCount={count}
                />
              </span>
            </TooltipHint>
          </Box>
        ))}
      </div>
    </Section>
  );
};

const TitleChip = () => (
  <Section name="typography-title-chip">
    <ThemeScopes>
      <div className="flex flex-col items-start gap-2">
        <HeaderTitleChip title={sample} />
        <HeaderTitleChip
          icon={<FileText className="size-4" />}
          title={sample}
        />
        <HeaderTitleChip title={longText} />
        <HeaderTitleChip showTooltip={false} title={longText} />
        <div data-ck-viewer-density="compact">
          <HeaderTitleChip title={sample} />
        </div>
      </div>
    </ThemeScopes>
  </Section>
);

const TruncationClamps = () => (
  <Section name="typography-truncation-clamps">
    <div className="flex flex-col gap-3">
      <div className="w-64 border border-stroke-subtle">
        <Text clamp="truncate" className="block">
          {longText}
        </Text>
      </div>
      {([1, 2, 3] as const).map((lines) => (
        <div key={lines} className="w-64 border border-stroke-subtle">
          <Text clamp={lines}>
            {longText} {longText} {longText}
          </Text>
        </div>
      ))}
      <div className="w-64 border border-stroke-subtle">
        <Text balance className="block">
          {longText}
        </Text>
      </div>
      <div className="w-64 border border-stroke-subtle">
        <Text breakWords className="block">
          {"unbrokenvalue".repeat(8)}
        </Text>
      </div>
      <div className="w-64 border border-stroke-subtle">
        <Text wrapAnywhere className="block">
          {"unbrokenvalue".repeat(8)}
        </Text>
      </div>
      <Text tabularNums className="flex flex-col">
        <span>1111</span>
        <span>8888</span>
      </Text>
    </div>
  </Section>
);

const MarqueeRow = ({
  children,
  label,
  width = 160,
}: {
  children: ReactNode;
  label: string;
  width?: number;
}) => (
  <div className="flex items-center gap-4">
    <code className="w-56 shrink-0 text-xs text-text-muted">{label}</code>
    <Box className="border border-stroke-subtle text-sm" width={width}>
      {children}
    </Box>
  </div>
);

const MarqueeAppearance = ({ width }: { width: number }) => (
  <Section name="typography-marquee-appearance">
    <MarqueeRow label="loop" width={width}>
      <Marquee animate scrollMode="loop">
        {longText}
      </Marquee>
    </MarqueeRow>
    <MarqueeRow label="animateOnGroupHover" width={width}>
      <div className="group">
        <Marquee animateOnGroupHover>{longText}</Marquee>
      </div>
    </MarqueeRow>
    <MarqueeRow label="stop-at-end" width={width}>
      <Marquee animate>{longText}</Marquee>
    </MarqueeRow>
    <MarqueeRow label="lang ar" width={width}>
      <div dir="rtl" lang="ar">
        <Marquee animate scrollMode="loop">
          {longText}
        </Marquee>
      </div>
    </MarqueeRow>
  </Section>
);

const MarqueeSection = () => {
  const [width, setWidth] = useState(160);

  return (
    <>
      <Section name="typography-marquee-measure">
        <WidthControl max={800} value={width} onChange={setWidth} />
        <MarqueeRow label="stop-at-end" width={width}>
          <Marquee animate>{longText}</Marquee>
        </MarqueeRow>
        <MarqueeRow label="static" width={width}>
          <Marquee animate>{sample}</Marquee>
        </MarqueeRow>
        <MarqueeRow label="not animated" width={width}>
          <Marquee>{longText}</Marquee>
        </MarqueeRow>
        <MarqueeRow label="reducedMotionPreference on" width={width}>
          <ReducedMotionProvider preference="on">
            <Marquee animate scrollMode="loop">
              {longText}
            </Marquee>
          </ReducedMotionProvider>
        </MarqueeRow>
      </Section>
      <Section name="typography-marquee-zoom">
        {([1, 2] as const).map((zoom) => {
          const style: VarStyle = { "--zoom": String(zoom) };

          return (
            <div key={zoom} className="[zoom:var(--zoom)]" style={style}>
              <MarqueeRow label={`zoom ${zoom} stop-at-end`} width={width}>
                <Marquee animate>{longText}</Marquee>
              </MarqueeRow>
              <MarqueeRow label={`zoom ${zoom} loop`} width={width}>
                <Marquee animate scrollMode="loop">
                  {longText}
                </Marquee>
              </MarqueeRow>
            </div>
          );
        })}
      </Section>
      <MarqueeAppearance width={width} />
    </>
  );
};

const RollingNumbers = () => {
  const [value, setValue] = useState(1234);

  return (
    <>
      <Section name="typography-rolling-number">
        <div className="flex items-center gap-2">
          <input
            aria-label="value"
            type="number"
            value={value}
            onChange={(event) => {
              setValue(Number(event.target.value));
            }}
          />
        </div>
        <div className="flex items-baseline gap-4">
          <code className="w-32 shrink-0 text-xs text-text-muted">
            diff-stat
          </code>
          <span className="text-title-lg">
            <RollingNumber value={value} />
          </span>
        </div>
      </Section>
      <Section name="typography-rolling-number-motion">
        <div className="flex items-center gap-2">
          <Button
            color="outline"
            size="pageAction"
            onClick={() => {
              setValue(value + 1);
            }}
          >
            +1
          </Button>
          <Button
            color="outline"
            size="pageAction"
            onClick={() => {
              setValue(value - 1);
            }}
          >
            -1
          </Button>
          <Button
            color="outline"
            size="pageAction"
            onClick={() => {
              setValue(value * 10);
            }}
          >
            x10
          </Button>
        </div>
        {(["diff-stat", "inline"] as const).map((variant) => (
          <div key={variant} className="flex items-baseline gap-4">
            <code className="w-32 shrink-0 text-xs text-text-muted">
              {variant}
            </code>
            <span className="text-title-lg">
              <RollingNumber value={value} variant={variant} />
            </span>
          </div>
        ))}
      </Section>
    </>
  );
};

const FilenameEllipsis = () => {
  const [width, setWidth] = useState(200);

  return (
    <Section name="typography-filename-middle-ellipsis">
      <WidthControl max={500} value={width} onChange={setWidth} />
      <div className="flex flex-col gap-2">
        {fileNames.map((name) => (
          <Box
            key={name}
            className="border border-stroke-subtle text-sm"
            width={width}
          >
            <FilenameMiddleEllipsis>{name}</FilenameMiddleEllipsis>
          </Box>
        ))}
      </div>
    </Section>
  );
};

const TypographyGalleryExample = () => (
  <TooltipProvider>
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
      <header>
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">Typography</h1>
      </header>
      <SizeScale />
      <HeadingScale />
      <BodyScale />
      <FontFamilies />
      <TextColourRoles />
      <MiddleTruncation />
      <TitleChip />
      <TruncationClamps />
      <MarqueeSection />
      <RollingNumbers />
      <FilenameEllipsis />
    </main>
  </TooltipProvider>
);

export { TypographyGalleryExample };
