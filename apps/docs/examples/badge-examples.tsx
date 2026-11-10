"use client";

import { LoadingIndicator } from "composerkit/components/button/data-button";
import { Badge, WebBadge } from "composerkit/components/ui/badge";
import type {
  BadgeColor,
  BadgeProps,
  BadgeSize,
  BadgeVariant,
} from "composerkit/components/ui/badge";
import { Button } from "composerkit/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const GalleryBadge = ({
  children,
  "data-testid": testId,
  ...props
}: BadgeProps & { "data-testid": string }) => (
  <span data-testid={testId}>
    <Badge {...props}>{children}</Badge>
  </span>
);

const variants = [
  "soft",
  "solid",
  "outline",
] as const satisfies readonly BadgeVariant[];

const colors = [
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "discovery",
] as const satisfies readonly BadgeColor[];

const sizes = ["sm", "md", "lg"] as const satisfies readonly BadgeSize[];

const colorLabels = {
  danger: "Failed",
  discovery: "New",
  info: "Info",
  secondary: "Draft",
  success: "Live",
  warning: "Needs review",
} as const satisfies Record<BadgeColor, string>;

const Matrix = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-2">
    {variants.map((variant) =>
      colors.map((color) => (
        <div
          className="flex flex-wrap items-center gap-2"
          key={`${variant}-${color}`}
        >
          <span className="w-32 text-xs text-text-muted">
            {variant}, {color}
          </span>
          {sizes.map((size) => (
            <GalleryBadge
              color={color}
              data-testid={`${prefix}-${variant}-${color}-${size}`}
              key={size}
              size={size}
              variant={variant}
            >
              {colorLabels[color]}
            </GalleryBadge>
          ))}
        </div>
      ))
    )}
  </div>
);

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

// A theme scope sets color-scheme, so every badge color inside resolves at its
// nearest scope, at any depth.
const AppearancePanel = ({
  id,
  nested,
  scope,
}: {
  id: string;
  nested?: Scope;
  scope: Scope;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-semibold" id={`${id}-heading`}>
      {scopeTitle(scope)}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <Matrix prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <Matrix prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const PillExample = () => (
  <section aria-labelledby="pill-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="pill-heading">
      Pill
    </h2>
    <p className="text-sm text-muted-foreground">
      Pill is on by default. It rounds the ends fully and widens the side
      padding by 1.33. Turn it off with pill=false for the size radius.
    </p>
    <div className="flex flex-col gap-2">
      {sizes.map((size) => (
        <div className="flex flex-wrap items-center gap-2" key={size}>
          <span className="w-32 text-xs text-text-muted">{size}</span>
          <GalleryBadge data-testid={`pill-on-${size}`} size={size}>
            Pill default
          </GalleryBadge>
          <GalleryBadge
            data-testid={`pill-off-${size}`}
            pill={false}
            size={size}
          >
            Pill off
          </GalleryBadge>
          <GalleryBadge
            color="info"
            data-testid={`pill-solid-${size}`}
            size={size}
            variant="solid"
          >
            Pill default
          </GalleryBadge>
          <GalleryBadge
            color="info"
            data-testid={`pill-solid-off-${size}`}
            pill={false}
            size={size}
            variant="solid"
          >
            Pill off
          </GalleryBadge>
        </div>
      ))}
    </div>
  </section>
);

const IconExample = () => (
  <section aria-labelledby="icon-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="icon-heading">
      Icons
    </h2>
    <p className="text-sm text-muted-foreground">
      An svg takes the size icon size, and the first or last svg sits 1px
      outside the padding unless it is the only child. data-ck-no-autosize keeps
      an svg at its own size.
    </p>
    <div className="flex flex-col gap-2">
      {sizes.map((size) => (
        <div className="flex flex-wrap items-center gap-2" key={size}>
          <span className="w-32 text-xs text-text-muted">{size}</span>
          <GalleryBadge
            color="success"
            data-testid={`icon-leading-${size}`}
            size={size}
          >
            <Check aria-hidden="true" height="1em" width="1em" />
            Live
          </GalleryBadge>
          <GalleryBadge
            color="info"
            data-testid={`icon-trailing-${size}`}
            size={size}
            variant="outline"
          >
            Open
            <ArrowRight aria-hidden="true" height="1em" width="1em" />
          </GalleryBadge>
          <GalleryBadge
            color="discovery"
            data-testid={`icon-only-${size}`}
            size={size}
            variant="solid"
          >
            <Check aria-label="Done" height="1em" width="1em" />
          </GalleryBadge>
          <GalleryBadge
            color="warning"
            data-testid={`icon-both-${size}`}
            size={size}
          >
            <Check aria-hidden="true" height="1em" width="1em" />
            Both
            <ArrowRight aria-hidden="true" height="1em" width="1em" />
          </GalleryBadge>
          <GalleryBadge
            color="danger"
            data-testid={`icon-no-autosize-${size}`}
            size={size}
          >
            <Check
              aria-hidden="true"
              data-ck-no-autosize=""
              height="12"
              width="12"
            />
            Fixed 12px
          </GalleryBadge>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <GalleryBadge data-testid="icon-nested">
        <span>
          <Check height="1em" width="1em" />
          Nested
        </span>
      </GalleryBadge>
      <GalleryBadge data-testid="icon-class-override">
        <Check className="ml-2" height="1em" width="1em" />
        Override
      </GalleryBadge>
    </div>
    <div className="flex items-center gap-2">
      <span className="w-32 text-xs text-text-muted">
        --ck-pill-icon-offset: 4px
      </span>
      <GalleryBadge
        className="[--ck-pill-icon-offset:4px]"
        color="success"
        data-testid="icon-offset"
      >
        <Check aria-hidden="true" height="1em" width="1em" />
        Live
      </GalleryBadge>
    </div>
  </section>
);

const StructureBadge = ({
  children,
  id,
}: {
  children: ReactNode;
  id: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    setMarkup(ref.current?.firstElementChild?.innerHTML ?? "");
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span data-testid={id} ref={ref}>
        <Badge>{children}</Badge>
      </span>
      <code className="text-xs text-text-muted" data-testid={`${id}-html`}>
        {markup}
      </code>
    </div>
  );
};

const TextExample = () => (
  <section aria-labelledby="text-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="text-heading">
      Text children
    </h2>
    <p className="text-sm text-muted-foreground">
      Adjacent text and numbers merge into one string. A string with siblings is
      wrapped in a span, a lone string is not, and blank strings are left alone.
      The markup of each badge is shown beside it.
    </p>
    <StructureBadge id="text-lone">Draft</StructureBadge>
    <StructureBadge id="text-merged">Version {2} beta</StructureBadge>
    <StructureBadge id="text-siblings">
      Draft
      <Check aria-hidden="true" height="1em" width="1em" />
    </StructureBadge>
    <StructureBadge id="text-blank">
      {" "}
      <Check height="1em" width="1em" />
    </StructureBadge>
    <StructureBadge id="text-nested">
      <em>
        Nested
        <strong>bold</strong>
      </em>
    </StructureBadge>
  </section>
);

// The recommendation row
// and its [--ck-pill-radius-sm:var(--radius-md)] utility, written as classes that define the tokens on an ancestor.
const recommendationClass =
  "[--ck-pill-gutter-sm:7px] [--ck-pill-radius-sm:var(--radius-sm)] [--ck-pill-size-sm:24px] [--ck-pill-tracking-sm:normal] leading-4.5";

const iconClass =
  "[--ck-pill-icon-font-size-sm:1.25rem] [--ck-pill-radius-sm:var(--radius-md)]";

const TokenExample = () => (
  <section aria-labelledby="token-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="token-heading">
      Token overrides and indicator size
    </h2>
    <p className="text-sm text-muted-foreground">
      A badge reads its size, gutter, radius, tracking and icon tokens from the
      nearest ancestor that defines them. The first row sets the source&apos;s
      recommendation tokens (24px, 7px gutter, radius-sm, normal tracking). The
      second row sets a larger icon and radius. The dot in each row follows
      --progress-ring-size, which each size sets.
    </p>
    <div
      className={`${recommendationClass} flex flex-wrap items-center gap-2`}
      data-testid="token-recommendation"
    >
      <GalleryBadge
        color="info"
        data-testid="token-recommendation-badge"
        pill={false}
      >
        Recommended
      </GalleryBadge>
    </div>
    <div
      className={`${iconClass} flex flex-wrap items-center gap-2`}
      data-testid="token-icon"
    >
      <GalleryBadge color="success" data-testid="token-icon-badge" pill={false}>
        <Check aria-hidden="true" height="1em" width="1em" />
        Live
      </GalleryBadge>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {sizes.map((size) => (
        <GalleryBadge
          color="warning"
          data-testid={`indicator-${size}`}
          key={size}
          size={size}
        >
          <LoadingIndicator
            aria-hidden="true"
            data-testid={`indicator-dot-${size}`}
          />
          {size}
        </GalleryBadge>
      ))}
      <GalleryBadge color="warning" data-testid="indicator-explicit" size="sm">
        <LoadingIndicator aria-hidden="true" size="18px" />
        Explicit size
      </GalleryBadge>
    </div>
  </section>
);

const SemanticsExample = () => {
  const [clicks, setClicks] = useState(0);

  return (
    <section
      aria-labelledby="semantics-heading"
      className="flex flex-col gap-3"
    >
      <h2 className="text-title-md font-semibold" id="semantics-heading">
        Semantics and extra props
      </h2>
      <p className="text-sm text-muted-foreground">
        The desktop badge drops extra props and defaults to a pill. The web
        badge forwards extra props and defaults to a non-pill shape.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-md border px-2 py-1 text-sm"
          data-testid="semantics-before"
          type="button"
        >
          Button before
        </button>
        <WebBadge
          aria-label="Draft status"
          className="ms-2"
          color="secondary"
          data-testid="semantics-badge"
          id="semantics-badge"
          onClick={() => {
            setClicks((count) => count + 1);
          }}
          title="Draft"
        >
          Draft
        </WebBadge>
        <button
          className="rounded-md border px-2 py-1 text-sm"
          data-testid="semantics-after"
          type="button"
        >
          Button after
        </button>
      </div>
      <div data-testid="desktop-default">
        <Badge {...{ "aria-label": "Ignored", title: "Ignored" }}>
          Desktop default
        </Badge>
      </div>
      <div data-testid="web-default">
        <WebBadge>Web default</WebBadge>
      </div>
      <div data-testid="web-children">
        <WebBadge>
          Version {2}
          <Check height="1em" width="1em" />
        </WebBadge>
      </div>
      <div data-testid="web-overrides">
        <WebBadge
          {...{
            "data-color": "danger",
            "data-size": "lg",
            "data-variant": "solid",
          }}
        >
          Overridden data
        </WebBadge>
      </div>
      <div className="[--spacing:initial]">
        <div data-testid="desktop-no-spacing">
          <Badge>Desktop spacing</Badge>
        </div>
        <div data-testid="web-no-spacing">
          <WebBadge>Web spacing</WebBadge>
        </div>
      </div>
      <p className="text-sm" data-testid="semantics-readout">
        Clicks on the badge: {clicks}
      </p>
    </section>
  );
};

const MotionExample = () => {
  const [step, setStep] = useState(0);
  const variant = variants[step % variants.length] ?? "soft";
  const color = colors[step % colors.length] ?? "secondary";
  const size = sizes[step % sizes.length] ?? "sm";

  return (
    <section aria-labelledby="motion-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="motion-heading">
        Changing props
      </h2>
      <p className="text-sm text-muted-foreground">
        The badge has no transition or animation, so a new variant, color or
        size shows at once, with no fade or resize in between. This holds with
        reduced motion on or off.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <GalleryBadge
          color={color}
          data-testid="motion-badge"
          size={size}
          variant={variant}
        >
          {colorLabels[color]}
        </GalleryBadge>
        <Button
          onClick={() => {
            setStep((current) => current + 1);
          }}
          color="outline"
          size="pageAction"
        >
          Change variant, color and size
        </Button>
        <span className="text-sm" data-testid="motion-readout">
          {variant}, {color}, {size}
        </span>
      </div>
    </section>
  );
};

const RtlExample = () => (
  <section aria-labelledby="rtl-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="rtl-heading">
      Right to left
    </h2>
    <p className="text-sm text-muted-foreground">
      The icon offset uses physical left and right margins, so the first svg
      keeps its 1px outward shift on the left in both directions.
    </p>
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="rtl-panel"
      dir="rtl"
      lang="ar"
    >
      <GalleryBadge color="success" data-testid="rtl-leading">
        <Check aria-hidden="true" height="1em" width="1em" />
        جاهز
      </GalleryBadge>
      <GalleryBadge color="info" data-testid="rtl-trailing" variant="outline">
        مفتوح
        <ArrowRight aria-hidden="true" height="1em" width="1em" />
      </GalleryBadge>
      <GalleryBadge
        color="danger"
        data-testid="rtl-solid"
        size="lg"
        variant="solid"
      >
        فشل
      </GalleryBadge>
    </div>
  </section>
);

const BadgeGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Badge</h1>
      <AppearanceControl id="badge-appearance" />
    </header>

    <section aria-labelledby="matrix-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="matrix-heading">
        Variants, colors and sizes in light and dark
      </h2>
      <p className="text-sm text-muted-foreground">
        Each panel sets its own theme scope, so the appearance control above
        does not change them. The two lower panels nest the opposite theme
        inside, and the nested badges follow the nearest scope.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AppearancePanel id="appearance-light" scope="light" />
        <AppearancePanel id="appearance-dark" scope="dark" />
        <AppearancePanel
          id="appearance-dark-light"
          nested="light"
          scope="dark"
        />
        <AppearancePanel
          id="appearance-light-dark"
          nested="dark"
          scope="light"
        />
      </div>
    </section>

    <PillExample />
    <IconExample />
    <TextExample />
    <TokenExample />
    <SemanticsExample />
    <MotionExample />
    <RtlExample />
  </main>
);

export { BadgeGalleryExample };
