"use client";

import {
  Alert,
  AlertBox,
  Banner,
  ComposerAttachedNotice,
  EyebrowNotice,
  RecoveryBannerPlacementContext,
  useBannerCtaDensity,
} from "composerkit/components/ui/banner";
import type {
  AlertLevel,
  AlertVariant,
  BannerDensity,
  BannerLayout,
  BannerProps,
  BannerType,
  BannerVariant,
} from "composerkit/components/ui/banner";
import { Button } from "composerkit/components/ui/button";
import { CircleCheck, Info, Sparkles, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const Caption = ({ children }: { children: ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

/** A container query context of a chosen width, so the narrow rules show. */
const Frame = ({
  children,
  testId,
  width,
}: {
  children: ReactNode;
  testId?: string;
  width?: number;
}) => (
  <div
    className="flex max-w-full flex-col gap-2"
    data-testid={testId}
    // The width is the demo input of the container-query examples.
    // oxlint-disable-next-line shadcn/no-inline-styles
    style={{ width }}
  >
    {children}
  </div>
);

/** Reads the call-to-action context that the Banner provides to its buttons. */
const CtaDensityProbe = ({ testId }: { testId: string }) => (
  <span className="text-xs" data-testid={testId}>
    context: {useBannerCtaDensity()}
  </span>
);

const TYPES: BannerType[] = [
  "normal",
  "error",
  "success",
  "warning",
  "caution",
  "infoAccent",
];

const typeIcon = (type: BannerType) => {
  if (type === "error" || type === "warning" || type === "caution") {
    return TriangleAlert;
  }

  return type === "success" ? CircleCheck : Info;
};

// ---------------------------------------------------------------------------
// Types, with live handlers
// ---------------------------------------------------------------------------

const TypeExamples = () => {
  const [last, setLast] = useState("Nothing clicked yet");
  const [dismissed, setDismissed] = useState<BannerType[]>([]);

  return (
    <Section
      description="Each type with a primary and secondary button and a dismiss button. Clicking reports in the line below."
      id="types"
      title="Types"
    >
      <p aria-live="polite" className="text-sm" data-testid="types-last">
        {last}
      </p>
      <div className="flex flex-col gap-3">
        {TYPES.map((type) => {
          if (dismissed.includes(type)) {
            return null;
          }

          return (
            <div data-testid={`type-${type}`} key={type}>
              <Banner
                content="A new version is ready to install."
                Icon={typeIcon(type)}
                onPrimaryCtaClick={() => {
                  setLast(`${type}: Update`);
                }}
                onSecondaryCtaClick={() => {
                  setLast(`${type}: Later`);
                }}
                primaryCtaText="Update"
                secondaryCtaText="Later"
                title={`Update available (${type})`}
                trailingAction={
                  <Button
                    aria-label="Dismiss"
                    color="ghost"
                    onClick={() => {
                      setDismissed((value) => [...value, type]);
                    }}
                    size="composerSm"
                    uniform
                  >
                    <X className="size-3.5" />
                  </Button>
                }
                type={type}
              />
            </div>
          );
        })}
      </div>
      {dismissed.length > 0 ? (
        <Button
          onClick={() => {
            setDismissed([]);
          }}
          size="compact"
        >
          Show dismissed banners
        </Button>
      ) : null}
    </Section>
  );
};

// ---------------------------------------------------------------------------
// CTA states
// ---------------------------------------------------------------------------

const CtaStates = () => (
  <Section
    description="Disabled primary, secondary and danger buttons, the danger button, an error notice with a retry button, and the primary and secondary color options."
    id="cta"
    title="Buttons"
  >
    <div className="flex flex-col gap-3">
      <div data-testid="cta-disabled">
        <Banner
          content="All three buttons are disabled."
          dangerCtaText="Delete"
          isDangerCtaDisabled
          isPrimaryCtaDisabled
          isSecondaryCtaDisabled
          primaryCtaText="Update"
          secondaryCtaText="Later"
          title="Disabled"
        />
      </div>
      <div data-testid="cta-danger">
        <Banner
          content="Primary, secondary and danger buttons together."
          dangerCtaText="Delete"
          primaryCtaColor="primary"
          primaryCtaText="Keep"
          secondaryCtaColor="outline"
          secondaryCtaText="Cancel"
          title="Danger button"
        />
      </div>
      <div data-testid="cta-error">
        <Banner
          content="Something went wrong"
          density="compact"
          primaryCtaText="Retry"
          role="alert"
          type="error"
        />
      </div>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const VARIANTS: {
  note?: string;
  props?: BannerProps;
  variant: BannerVariant;
}[] = [
  { variant: "default" },
  { variant: "callout" },
  { variant: "announcement" },
  { variant: "announcementInset" },
  { variant: "catalog" },
  { variant: "settings" },
  { variant: "embedded" },
  { variant: "status" },
  { variant: "informationNotice" },
  { variant: "insetNotice" },
  { variant: "privacyNotice" },
  { variant: "pageNotice" },
  { variant: "page" },
  { variant: "strip" },
  { props: { type: "error" }, variant: "strip" },
  { variant: "promotion" },
  { variant: "browserNotice" },
  { variant: "composerContext" },
  { variant: "beacon" },
  { variant: "authUpsell" },
];

const VariantExample = ({
  props,
  variant,
}: {
  props?: BannerProps;
  variant: BannerVariant;
}) => (
  <div
    className="flex flex-col gap-1"
    data-testid={`variant-${variant}${props?.type === "error" ? "-error" : ""}`}
  >
    <Caption>
      {variant}
      {props?.type === undefined ? "" : `, type ${props.type}`}
    </Caption>
    <Banner
      content="A new version is ready to install."
      Icon={Info}
      primaryCtaText="Update"
      secondaryCtaText="Later"
      title="Update available"
      trailingAction={
        variant === "promotion" ? (
          <Button aria-label="Dismiss" color="ghost" size="composerSm" uniform>
            <X className="size-3.5" />
          </Button>
        ) : undefined
      }
      variant={variant}
      {...props}
    />
  </div>
);

const VariantExamples = () => (
  <Section
    description="Every variant of the source Banner, each with a title, content, an icon and two buttons where the variant shows them."
    id="variants"
    title="Variants"
  >
    <div className="flex flex-col gap-4">
      {VARIANTS.map(({ props, variant }) => (
        <VariantExample
          key={`${variant}-${props?.type ?? ""}`}
          props={props}
          variant={variant}
        />
      ))}
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Layouts and density
// ---------------------------------------------------------------------------

const LAYOUTS: BannerLayout[] = [
  "horizontal",
  "inline",
  "vertical",
  "verticalIcon",
  "warningCallout",
];

const LayoutExamples = () => (
  <Section
    description="The five layouts, then the compact density, then the callout and settings variants in the icon layouts."
    id="layouts"
    title="Layouts and density"
  >
    <div className="flex flex-col gap-4">
      {LAYOUTS.map((layout) => (
        <div data-testid={`layout-${layout}`} key={layout}>
          <Caption>{layout}</Caption>
          <Banner
            content="A new version is ready to install."
            Icon={Info}
            layout={layout}
            primaryCtaText="Update"
            secondaryCtaText="Later"
            title="Update available"
            type={layout === "warningCallout" ? "warning" : "normal"}
          />
        </div>
      ))}
      {(["default", "compact"] satisfies BannerDensity[]).map((density) => (
        <div data-testid={`density-${density}`} key={density}>
          <Caption>density {density}</Caption>
          <Banner
            content="A new version is ready to install."
            density={density}
            primaryCtaText="Update"
            title="Update available"
          />
        </div>
      ))}
      <div data-testid="layout-callout-verticalIcon">
        <Caption>callout, verticalIcon</Caption>
        <Banner
          content="A new version is ready to install."
          Icon={Info}
          layout="verticalIcon"
          title="Update available"
          variant="callout"
        />
      </div>
      <div data-testid="layout-settings-verticalIcon">
        <Caption>settings, verticalIcon</Caption>
        <Banner
          content="A new version is ready to install."
          Icon={Info}
          layout="verticalIcon"
          title="Update available"
          variant="settings"
        />
      </div>
      <div data-testid="layout-warningCallout-compact">
        <Caption>warningCallout, compact density, no separator</Caption>
        <Banner
          content="Your plan changes soon."
          density="compact"
          layout="warningCallout"
          primaryCtaText="Review"
          showCtaSeparator={false}
          title="Plan change"
          type="warning"
        />
      </div>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Responsive buttons
// ---------------------------------------------------------------------------

const WIDTHS = [360, 640] as const;

const ResponsiveExamples = () => {
  const [width, setWidth] = useState<number>(360);

  return (
    <Section
      description="With stackOnNarrow the buttons wrap to their own row below 560px (400px when attached to the composer). Pick a container width."
      id="responsive"
      title="Narrow and wide containers"
    >
      <fieldset className="flex gap-2">
        <legend className="sr-only">Container width</legend>
        {WIDTHS.map((value) => (
          <Button
            aria-pressed={width === value}
            color={width === value ? "primary" : "outline"}
            key={value}
            onClick={() => {
              setWidth(value);
            }}
            size="compact"
          >
            {value}px
          </Button>
        ))}
      </fieldset>
      <Frame testId="responsive-frame" width={width}>
        <Banner
          content="A new version is ready to install."
          primaryCtaText="Update"
          secondaryCtaText="Later"
          stackOnNarrow
          title="Update available"
        />
        <Banner
          content="Your plan changes soon."
          layout="warningCallout"
          primaryCtaText="Review"
          secondaryCtaText="Later"
          stackOnNarrow
          title="Plan change"
          type="warning"
        />
        <Banner
          content="Wrapping buttons stay on their own row."
          primaryCtaText="Update"
          secondaryCtaText="Later"
          stackOnNarrow
          trailingAction={
            <Button
              aria-label="Dismiss"
              color="ghost"
              size="composerSm"
              uniform
            >
              <X className="size-3.5" />
            </Button>
          }
          variant="callout"
        />
      </Frame>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Attached to the composer
// ---------------------------------------------------------------------------

const ComposerMock = () => (
  <div className="relative z-10 rounded-3xl border bg-panel px-4 py-3 text-sm text-muted-foreground shadow-sm">
    Ask for follow-up changes
  </div>
);

const ComposerExamples = () => (
  <Section
    description="The banner tucks 36px under the composer. The compact form is the small variant of the same option."
    id="composer"
    title="Attached to the composer"
  >
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col" data-testid="attached-true">
        <Caption>attachedToComposer</Caption>
        <Banner
          attachedToComposer
          content="A new version is ready to install."
          customCtas={
            <>
              <CtaDensityProbe testId="cta-context-attached" />
              <Button color="outline">Update</Button>
              <Button color="ghost">Later</Button>
            </>
          }
          stackOnNarrow
          title="Update available"
        />
        <ComposerMock />
      </div>
      <div className="flex flex-col" data-testid="attached-compact">
        <Caption>attachedToComposer=&quot;compact&quot;</Caption>
        <Banner
          attachedToComposer="compact"
          content="A new version is ready to install."
          customCtas={
            <>
              <CtaDensityProbe testId="cta-context-compact" />
              <Button color="outline">Update</Button>
            </>
          }
          stackOnNarrow
          title="Update available"
        />
        <ComposerMock />
      </div>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Recovery placement
// ---------------------------------------------------------------------------

const RecoveryExample = () => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [footer, setFooter] = useState(false);

  return (
    <Section
      description="The recovery card enters with a short fade and slide. With the footer placement it moves into the footer slot below and keeps focus."
      id="recovery"
      title="Recovery card"
    >
      <Button
        aria-pressed={footer}
        onClick={() => {
          setFooter((value) => !value);
        }}
        size="compact"
      >
        {footer ? "Show in place" : "Move to footer"}
      </Button>
      <RecoveryBannerPlacementContext
        value={{ homeBannerPlacement: footer ? "footer" : "inline", target }}
      >
        <div data-testid="recovery-inline">
          <Banner
            content="Reconnect to keep working."
            customCtas={
              <>
                <CtaDensityProbe testId="cta-context-recovery" />
                <Button color="outline" size="dialog">
                  Reconnect
                </Button>
              </>
            }
            icon={<Sparkles className="size-4" />}
            title="Connection lost"
            variant="recovery"
          />
        </div>
      </RecoveryBannerPlacementContext>
      <div
        className="rounded-xl border border-dashed p-3"
        data-testid="recovery-footer"
      >
        <Caption>Footer slot</Caption>
        <div ref={setTarget} />
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

const ALERT_LEVELS: AlertLevel[] = ["info", "success", "warning", "danger"];

const SOLID_ALERT_VARIANTS: AlertVariant[] = [
  "successNeutral",
  "successSolid",
  "dangerSolid",
];

const AlertExamples = () => {
  const [closed, setClosed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("Nothing clicked yet");

  return (
    <Section
      description="Alert is the content shared with the toast family. Every level, every variant, actions with a loading state, an inline action and a close button."
      id="alert"
      title="Alert"
    >
      <div className="flex flex-col gap-3">
        {ALERT_LEVELS.map((level) => (
          <div data-testid={`alert-${level}`} key={level}>
            <Alert
              description="A short line that says more."
              level={level}
              title={`The ${level} alert`}
            />
          </div>
        ))}
        {SOLID_ALERT_VARIANTS.map((variant) => (
          <div data-testid={`alert-variant-${variant}`} key={variant}>
            <Alert
              description="A short line that says more."
              level={variant === "dangerSolid" ? "danger" : "success"}
              primaryAction={{
                label: "Undo",
                onClick: () => {
                  setLog(`${variant}: Undo`);
                },
              }}
              title={variant}
              variant={variant}
            />
          </div>
        ))}
        <div data-testid="alert-actions">
          <Alert
            description="Two actions below the text."
            level="info"
            onClose={() => {
              setClosed((value) => [...value, "actions"]);
            }}
            primaryAction={{
              label: loading ? "Saving" : "Save",
              loading,
              onClick: () => {
                setLoading(true);
                window.setTimeout(() => {
                  setLoading(false);
                }, 1500);
              },
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => {
                setLog("Cancel");
              },
            }}
            title="With actions"
          />
        </div>
        <div data-testid="alert-inline">
          <Alert
            actionPlacement="inline"
            level="warning"
            onClose={() => {
              setClosed((value) => [...value, "inline"]);
            }}
            primaryAction={{
              label: "Review",
              onClick: () => {
                setLog("Review");
              },
            }}
            title="Inline action"
          />
        </div>
        <div data-testid="alert-box">
          <AlertBox announce level="danger" richColors>
            Plain alert box with a role alert
          </AlertBox>
        </div>
      </div>
      <p aria-live="polite" className="text-sm" data-testid="alert-closed">
        Closed: {closed.length === 0 ? "none" : closed.join(", ")}
      </p>
      <p aria-live="polite" className="text-sm" data-testid="alert-last">
        {log}
      </p>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Eyebrow and composer-attached notices
// ---------------------------------------------------------------------------

const NoticeExamples = () => {
  const [last, setLast] = useState("Nothing clicked yet");

  return (
    <Section
      description="The eyebrow notice sits above the composer and the composer overlaps it. The composer-attached notice has a default and a beacon form, with the actions beside, below, or below on narrow."
      id="notices"
      title="Eyebrow and composer notices"
    >
      <p aria-live="polite" className="text-sm" data-testid="notices-last">
        {last}
      </p>
      <div className="flex flex-col" data-testid="eyebrow">
        <EyebrowNotice
          actions={
            <Button
              color="outline"
              onClick={() => {
                setLast("Eyebrow: Upgrade");
              }}
              size="dialog"
            >
              Upgrade
            </Button>
          }
          content="Try again later or upgrade to add more."
          title="You've reached the limit for file attachments"
        />
        <ComposerMock />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div data-testid="notice-default">
          <Caption>default</Caption>
          <ComposerAttachedNotice
            description="This conversation will switch to the new model."
            dismissAction={{
              ariaLabel: "Dismiss notice",
              icon: X,
              onClick: () => {
                setLast("Notice default: dismissed");
              },
            }}
            primaryAction={{
              label: "Switch now",
              onClick: () => {
                setLast("Notice default: Switch now");
              },
            }}
            secondaryAction={{ label: "Later" }}
            title="Model update"
          />
        </div>
        <div data-testid="notice-badge">
          <Caption>badge, actions in the body</Caption>
          <ComposerAttachedNotice
            actionsPlacement="body"
            badge="New"
            description="This conversation will switch to the new model."
            primaryAction={{ label: "Switch now" }}
            title="Model update"
          />
        </div>
        <div data-testid="notice-narrow">
          <Caption>actions in the body on narrow</Caption>
          <Frame width={340}>
            <ComposerAttachedNotice
              actionsPlacement="bodyOnNarrow"
              description="This conversation will switch to the new model."
              primaryAction={{ label: "Switch now" }}
              title="Model update"
            />
          </Frame>
        </div>
        <div data-testid="notice-loading">
          <Caption>loading and disabled actions</Caption>
          <ComposerAttachedNotice
            description="This conversation will switch to the new model."
            primaryAction={{ label: "Switching", loading: true }}
            secondaryAction={{ disabled: true, label: "Later" }}
            title="Model update"
          />
        </div>
        <div data-testid="notice-beacon">
          <Caption>beacon</Caption>
          <ComposerAttachedNotice
            description="Your new daily driver for complex coding."
            dismissAction={{
              ariaLabel: "Dismiss notice",
              onClick: () => {
                setLast("Notice beacon: dismissed");
              },
            }}
            leadingVisual={<Sparkles className="size-5" />}
            primaryAction={{
              label: "Switch now",
              onClick: () => {
                setLast("Notice beacon: Switch now");
              },
            }}
            title="Meet the new model"
            variant="beacon"
          />
        </div>
        <div data-testid="notice-beacon-narrow">
          <Caption>beacon, narrow</Caption>
          <Frame width={340}>
            <ComposerAttachedNotice
              description="Your new daily driver for complex coding."
              dismissAction={{ ariaLabel: "Dismiss notice" }}
              primaryAction={{ label: "Switch now" }}
              secondaryAction={{ label: "Later" }}
              title="Meet the new model"
              variant="beacon"
            />
          </Frame>
        </div>
        <div data-testid="notice-beacon-attached">
          <Caption>beacon attached to the composer</Caption>
          <ComposerAttachedNotice
            attachedToComposer
            description="Your new daily driver for complex coding."
            dismissAction={{ ariaLabel: "Dismiss notice" }}
            primaryAction={{ label: "Switch now" }}
            title="Meet the new model"
            variant="beacon"
          />
          <ComposerMock />
        </div>
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// RTL
// ---------------------------------------------------------------------------

const RtlExample = () => (
  <Section
    description="Logical padding, margins and borders flip. The wash and the warning bar sit on the start side."
    id="rtl"
    title="Right to left"
  >
    <div className="flex flex-col gap-3" dir="rtl" lang="ar">
      <div data-testid="rtl-default">
        <Banner
          content="إصدار جديد جاهز للتثبيت."
          Icon={Info}
          primaryCtaText="تحديث"
          secondaryCtaText="لاحقًا"
          stackOnNarrow
          title="تحديث متاح"
        />
      </div>
      <div data-testid="rtl-warning-callout">
        <Banner
          content="تتغير خطتك قريبًا."
          layout="warningCallout"
          primaryCtaText="مراجعة"
          title="تغيير الخطة"
          type="warning"
        />
      </div>
      <div data-testid="rtl-alert">
        <Alert
          description="سطر قصير يضيف المزيد."
          level="info"
          onClose={(event) => {
            event.currentTarget.blur();
          }}
          title="تنبيه"
        />
      </div>
      <div data-testid="rtl-eyebrow">
        <EyebrowNotice
          actions={<Button size="dialog">ترقية</Button>}
          content="حاول مرة أخرى لاحقًا."
          title="وصلت إلى الحد"
        />
        <ComposerMock />
      </div>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3" data-testid={`${prefix}-content`}>
    {TYPES.map((type) => (
      <Banner
        content="A new version is ready to install."
        Icon={typeIcon(type)}
        key={type}
        primaryCtaText="Update"
        title={`Update available (${type})`}
        type={type}
      />
    ))}
    <Banner
      content="Your plan changes soon."
      layout="warningCallout"
      primaryCtaText="Review"
      title="Plan change"
      type="warning"
    />
    <Banner content="You are offline." variant="strip" />
    <Banner content="Something went wrong" type="error" variant="strip" />
    <Banner
      content="A new version is ready to install."
      title="Update available"
      variant="informationNotice"
    />
    {(["info", "success", "warning", "danger"] as const).map((level) => (
      <Alert
        description="A short line that says more."
        key={level}
        level={level}
        title={`The ${level} alert`}
      />
    ))}
    <Alert level="success" title="Saved" variant="successNeutral" />
    <Alert level="danger" title="Failed" variant="dangerSolid" />
    <EyebrowNotice
      actions={<Button size="dialog">Upgrade</Button>}
      content="Try again later or upgrade to add more."
      title="You've reached the limit"
    />
    <ComposerMock />
  </div>
);

// A theme scope sets color-scheme, so every theme-dependent value inside
// resolves at its nearest scope, at any depth.
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
    <PanelContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const AppearanceExamples = () => (
  <Section
    description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested parts follow the nearest scope."
    id="appearance"
    title="Light and dark"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <AppearancePanel id="appearance-light" scope="light" />
      <AppearancePanel id="appearance-dark" scope="dark" />
      <AppearancePanel id="appearance-dark-light" nested="light" scope="dark" />
      <AppearancePanel id="appearance-light-dark" nested="dark" scope="light" />
    </div>
  </Section>
);

const BannerGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Banner and Alert</h1>
      <AppearanceControl id="banner-appearance" />
    </header>
    <TypeExamples />
    <CtaStates />
    <VariantExamples />
    <LayoutExamples />
    <ResponsiveExamples />
    <ComposerExamples />
    <RecoveryExample />
    <AlertExamples />
    <NoticeExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { BannerGalleryExample };
