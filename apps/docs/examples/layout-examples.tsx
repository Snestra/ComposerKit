"use client";

import { Presence } from "composerkit/components/layout/motion";
import { PageSearchInput } from "composerkit/components/layout/page-search-input";
import type { PageSearchVariant } from "composerkit/components/layout/page-search-input";
import {
  ResizeObserverProvider,
  useResizeObserver,
} from "composerkit/components/layout/resize-observer";
import {
  SearchableHeaderShell,
  SearchableHeaderToolbar,
  SearchablePageLayout,
} from "composerkit/components/layout/searchable-page-layout";
import type {
  ContentWidth,
  HeaderVariant,
  SearchablePlacement,
} from "composerkit/components/layout/searchable-page-layout";
import {
  ScrollMaskHost,
  StickySection,
} from "composerkit/components/layout/sticky-section";
import { Button } from "composerkit/components/ui/button";
import {
  BulletSeparator,
  ContentGrid,
  ContentSection,
  DetailPage,
  detailPageSectionClassName,
  Layout,
  OnboardingPage,
  PageHeader,
  ToolbarBreadcrumb,
} from "composerkit/components/ui/layout";
import type { PageHeaderVariant } from "composerkit/components/ui/layout";
import { ReducedMotionProvider } from "composerkit/lib/reduced-motion";
import type { ReducedMotionPreference } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import Link from "next/link";
import { useId, useState } from "react";
import type { ReactNode } from "react";

const pageHeaderVariants = [
  "default",
  "page",
  "settings",
  "settingsCompact",
] as const satisfies readonly PageHeaderVariant[];

const contentWidths = [
  "default",
  "medium",
  "wide",
  "extraWide",
  "directory",
  "profile",
] as const satisfies readonly ContentWidth[];

const headerVariants = [
  "default",
  "inset",
  "compact",
  "hero",
  "catalog",
  "directory",
  "profile",
] as const satisfies readonly HeaderVariant[];

const reducedMotionPreferences = [
  "system",
  "on",
  "off",
] as const satisfies readonly ReducedMotionPreference[];

const pageSearchVariants = [
  "default",
  "settings",
  "toolbar",
  "toolbar-action",
  "toolbar-compact",
  "directory",
  "catalog-compact",
  "catalog",
  "catalog-filter",
  "discovery",
  "sidebar",
  "sidebar-header",
] as const satisfies readonly PageSearchVariant[];

const rows = Array.from({ length: 24 }, (_, index) => `row ${index + 1}`);

interface ChoiceProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}

const Choice = <T extends string>({
  label,
  onChange,
  options,
  value,
}: ChoiceProps<T>) => (
  <fieldset
    aria-label={label}
    className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
  >
    <span className="text-sm text-text-muted">{label}</span>
    {options.map((option) => (
      <Button
        key={option}
        aria-pressed={value === option}
        color={value === option ? "primary" : "outline"}
        size="pageAction"
        onClick={() => {
          onChange(option);
        }}
      >
        {option}
      </Button>
    ))}
  </fieldset>
);

interface ToggleProps {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}

const Toggle = ({ label, onChange, value }: ToggleProps) => (
  <Button
    aria-pressed={value}
    color={value ? "primary" : "outline"}
    size="pageAction"
    onClick={() => {
      onChange(!value);
    }}
  >
    {label}
  </Button>
);

const Section = ({ children, name }: { children: ReactNode; name: string }) => (
  <section
    aria-label={name}
    className="flex flex-col gap-4 border-t border-stroke-subtle pt-6"
  >
    <h2 className="text-title-sm font-semibold">{name}</h2>
    {children}
  </section>
);

interface GallerySearchProps {
  initialQuery?: string;
  isClearable?: boolean;
  trailingControl?: ReactNode;
  variant?: PageSearchVariant;
}

const GallerySearch = ({
  initialQuery = "",
  isClearable,
  trailingControl,
  variant,
}: GallerySearchProps) => {
  const id = useId();
  const [query, setQuery] = useState(initialQuery);

  return (
    <PageSearchInput
      id={id}
      isClearable={isClearable}
      label={variant ?? "search"}
      searchQuery={query}
      trailingControl={trailingControl}
      variant={variant}
      onSearchQueryChange={setQuery}
    />
  );
};

const Sample = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border border-stroke-subtle bg-panel-secondary p-3 text-sm",
      className
    )}
  >
    {children}
  </div>
);

const PageHeaderSection = () => (
  <Section name="layout-page-header-variants">
    {pageHeaderVariants.map((variant) => (
      <PageHeader
        key={variant}
        actions={
          <Button color="outline" size="pageAction">
            actions
          </Button>
        }
        asset={<Sample>asset</Sample>}
        subtitle="subtitle"
        title={variant}
        variant={variant}
      />
    ))}
  </Section>
);

const ContentSectionSection = () => (
  <Section name="layout-content-section-structure">
    <ContentSection
      actions={
        <Button color="outline" size="pageAction">
          actions
        </Button>
      }
      ariaLabel="title and actions"
      tabIndex={0}
      title="title"
    >
      <Sample>children</Sample>
    </ContentSection>
    <ContentSection compact>
      <Sample>compact, no title or actions</Sample>
    </ContentSection>
    <div className="flex h-40 flex-col gap-2 rounded-lg border border-dashed border-stroke-subtle p-2">
      <ContentSection title="flex-1">
        <Sample className="flex-1">flex-1</Sample>
      </ContentSection>
    </div>
  </Section>
);

const gridWidths = [
  { className: "w-80", width: 320 },
  { className: "w-150", width: 600 },
  { className: "w-200", width: 800 },
] as const;

const ContentGridSection = () => (
  <Section name="layout-content-grid-columns">
    {gridWidths.map(({ className, width }) => (
      <div
        key={width}
        className={cn(
          "@container rounded-lg border border-dashed border-stroke-subtle p-2",
          className
        )}
      >
        <span className="text-sm text-text-muted">{width}px</span>
        <ContentGrid>
          {[1, 2, 3, 4, 5, 6].map((cell) => (
            <Sample key={cell}>{cell}</Sample>
          ))}
        </ContentGrid>
      </div>
    ))}
    <div className="@container w-full max-w-4xl min-w-60 resize-x overflow-auto rounded-lg border border-dashed border-stroke-subtle p-2">
      <span className="text-sm text-text-muted">resize</span>
      <ContentGrid>
        {[1, 2, 3, 4, 5, 6].map((cell) => (
          <Sample key={cell}>{cell}</Sample>
        ))}
      </ContentGrid>
    </div>
  </Section>
);

const DetailPageSection = () => {
  const [unbounded, setUnbounded] = useState(false);

  return (
    <Section name="layout-detail-page-container">
      <Toggle
        label="--ck-chat-content-max-width: none"
        value={unbounded}
        onChange={setUnbounded}
      />
      <div
        className={cn(
          "w-full rounded-lg border border-dashed border-stroke-subtle",
          unbounded && "[--ck-chat-content-max-width:none]"
        )}
      >
        <DetailPage>
          <PageHeader subtitle="subtitle" title="DetailPage" variant="page" />
          <div className={detailPageSectionClassName}>
            <Sample>--ck-detail-page-section-gap</Sample>
            <Sample>--ck-detail-page-inline-inset</Sample>
          </div>
        </DetailPage>
      </div>
    </Section>
  );
};

const ShellScenario = ({
  collapse,
  expandSearch,
  fixedSearchWidth,
  name,
  wrapActions,
}: {
  collapse: boolean;
  expandSearch: boolean;
  fixedSearchWidth: boolean;
  name: string;
  wrapActions: boolean;
}) => {
  const [scrolled, setScrolled] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-text-muted">{name}</span>
      <div
        className="h-96 overflow-y-auto rounded-lg border border-stroke-subtle"
        onScroll={(event) => {
          setScrolled(event.currentTarget.scrollTop > 0);
        }}
      >
        <SearchableHeaderShell
          actions={
            <SearchableHeaderToolbar
              actions={
                <Button color="outline" size="pageAction">
                  pageActions
                </Button>
              }
              controls={
                <Button color="outline" size="pageAction">
                  viewControls
                </Button>
              }
              filterTags={
                <>
                  {["filterTags", "filterTags", "filterTags", "filterTags"].map(
                    (tag, index) => (
                      <Button
                        key={`${tag}-${index}`}
                        color="outline"
                        size="pageAction"
                      >
                        {tag}
                      </Button>
                    )
                  )}
                </>
              }
              fixedSearchWidth={fixedSearchWidth}
              search={<GallerySearch />}
            />
          }
          collapseOnScroll={collapse}
          expandSearchWhenWrapped={expandSearch}
          navigation={<span className="text-sm">navigation</span>}
          showDivider={scrolled}
          title={
            <>
              <h1 className="text-title-lg font-medium">title</h1>
              <div className="text-base text-text-muted">subtitle</div>
            </>
          }
          wrapActionsAtNarrowWidth={wrapActions}
        />
        <div className="flex flex-col gap-2 p-4">
          {rows.map((row) => (
            <Sample key={row}>{row}</Sample>
          ))}
        </div>
      </div>
    </div>
  );
};

const SearchableHeaderShellSection = () => (
  <Section name="layout-searchable-header-shell">
    <ShellScenario
      collapse={false}
      expandSearch={false}
      fixedSearchWidth={false}
      name="data-sticky"
      wrapActions={false}
    />
    <ShellScenario
      collapse
      expandSearch={false}
      fixedSearchWidth={false}
      name="data-ck-scroll-collapse, data-collapsible"
      wrapActions={false}
    />
    <ShellScenario
      collapse
      expandSearch
      fixedSearchWidth={false}
      name="data-ck-expand-search"
      wrapActions={false}
    />
    <ShellScenario
      collapse
      expandSearch={false}
      fixedSearchWidth
      name="data-ck-fixed-width"
      wrapActions={false}
    />
    <ShellScenario
      collapse={false}
      expandSearch={false}
      fixedSearchWidth={false}
      name="data-ck-wrap-actions"
      wrapActions
    />
  </Section>
);

const HeaderRegionsSection = () => (
  <Section name="layout-header-regions-size">
    <ShellScenario
      collapse={false}
      expandSearch={false}
      fixedSearchWidth={false}
      name="title, actions, navigation, toolbar, search and filterTags regions"
      wrapActions={false}
    />
    <div className="w-80 resize-x overflow-auto rounded-lg border border-dashed border-stroke-subtle">
      <SearchableHeaderShell
        actions={
          <SearchableHeaderToolbar
            actions={<span className="text-sm">pageActions</span>}
            controls={<span className="text-sm">viewControls</span>}
            filterTags={<span className="text-sm">filterTags</span>}
            search={<GallerySearch />}
          />
        }
        title={<h1 className="text-title-lg font-medium">title</h1>}
      />
    </div>
  </Section>
);

const ContentWidthSection = () => {
  const [width, setWidth] = useState<ContentWidth>("default");
  const [variant, setVariant] = useState<HeaderVariant>("default");

  return (
    <Section name="layout-content-width-variants">
      <Choice
        label="contentWidth"
        options={contentWidths}
        value={width}
        onChange={setWidth}
      />
      <Choice
        label="headerVariant"
        options={headerVariants}
        value={variant}
        onChange={setVariant}
      />
      <div className="h-[28rem] overflow-hidden rounded-lg border border-stroke-subtle">
        <SearchablePageLayout
          contentWidth={width}
          headerAction={
            <Button color="outline" size="pageAction">
              headerAction
            </Button>
          }
          headerVariant={variant}
          subtitle="subtitle"
          title={variant}
        >
          <Sample>{width}</Sample>
        </SearchablePageLayout>
      </div>
    </Section>
  );
};

const HeaderMotionSection = () => {
  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  const [placement, setPlacement] = useState<SearchablePlacement>("page");
  const [bottom, setBottom] = useState(false);
  const [withToolbarActions, setWithToolbarActions] = useState(false);
  const [withNavigation, setWithNavigation] = useState(false);
  const [slate, setSlate] = useState(false);
  const [present, setPresent] = useState(true);

  return (
    <Section name="layout-header-motion">
      <Choice
        label="reducedMotionPreference"
        options={reducedMotionPreferences}
        value={preference}
        onChange={setPreference}
      />
      <Choice
        label="headerPlacement"
        options={["page", "sticky", "inline", "toolbar", "scroll"] as const}
        value={placement}
        onChange={setPlacement}
      />
      <Choice
        label="searchPlacement"
        options={["sticky", "bottom-on-scroll"] as const}
        value={bottom ? "bottom-on-scroll" : "sticky"}
        onChange={(value) => {
          setBottom(value === "bottom-on-scroll");
        }}
      />
      <Toggle label="newSlateLayout" value={slate} onChange={setSlate} />
      <Toggle
        label="toolbarActions"
        value={withToolbarActions}
        onChange={setWithToolbarActions}
      />
      <Toggle
        label="navigation"
        value={withNavigation}
        onChange={setWithNavigation}
      />
      <ReducedMotionProvider preference={preference}>
        <div className="h-[28rem] overflow-hidden rounded-lg border border-stroke-subtle">
          <SearchablePageLayout
            collapseHeaderOnScroll={placement === "sticky"}
            headerAction={
              <Button color="outline" size="pageAction">
                headerAction
              </Button>
            }
            headerPlacement={placement}
            navigation={
              withNavigation ? (
                <span className="text-sm">navigation</span>
              ) : null
            }
            newSlateLayout={slate}
            searchContent={<GallerySearch />}
            searchPlacement={bottom ? "bottom-on-scroll" : "sticky"}
            subtitle="subtitle"
            title="title"
            toolbarActions={
              withToolbarActions ? (
                <Button color="outline" size="pageAction">
                  toolbarActions
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <Sample key={row}>{row}</Sample>
              ))}
            </div>
          </SearchablePageLayout>
        </div>
        <Toggle label="OnboardingPage" value={present} onChange={setPresent} />
        <Presence>
          {present ? (
            <OnboardingPage>
              <div className="flex flex-col items-center gap-2">
                <Sample>children</Sample>
                <Button color="outline" size="pageAction">
                  inert while not present
                </Button>
              </div>
            </OnboardingPage>
          ) : null}
        </Presence>
      </ReducedMotionProvider>
    </Section>
  );
};

const PageSearchSection = () => {
  const [clearable, setClearable] = useState(true);

  return (
    <Section name="layout-page-search">
      <Toggle label="isClearable" value={clearable} onChange={setClearable} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {pageSearchVariants.map((variant) => (
          <div key={variant} className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-text-muted">{variant}</span>
            <GallerySearch
              initialQuery="searchQuery"
              isClearable={clearable}
              variant={variant}
            />
          </div>
        ))}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-text-muted">trailingControl</span>
          <GallerySearch
            trailingControl={
              <Button color="outline" size="pageAction">
                trailingControl
              </Button>
            }
          />
        </div>
      </div>
    </Section>
  );
};

const BreadcrumbSection = () => {
  const [textSm, setTextSm] = useState(false);
  const [clicked, setClicked] = useState("");

  return (
    <Section name="layout-breadcrumb">
      <Toggle label="textSm" value={textSm} onChange={setTextSm} />
      <ToolbarBreadcrumb
        ancestors={[
          {
            id: "onClick",
            label: "onClick",
            onClick: () => {
              setClicked("onClick");
            },
          },
          { id: "to", label: "to", to: "/gallery/layout" },
          { content: <span className="px-2">content</span>, id: "content" },
          {
            id: "truncated",
            label:
              "truncated truncated truncated truncated truncated truncated truncated",
            onClick: () => {
              setClicked("truncated");
            },
          },
        ]}
        current="current"
        textSm={textSm}
      />
      <div className="w-56 overflow-hidden rounded-lg border border-dashed border-stroke-subtle p-2">
        <ToolbarBreadcrumb
          ancestors={[
            {
              id: "a",
              label: "ancestor ancestor ancestor",
              to: "/gallery/layout",
            },
          ]}
          current="current current current"
          textSm={textSm}
        />
      </div>
      <ToolbarBreadcrumb ancestors={[]} current="current" />
      <output className="text-sm text-text-muted">{clicked}</output>
      <div className="flex items-center gap-1 text-sm">
        {["a", "b", "c"].map((item) => (
          <span key={item} className="flex items-center gap-1">
            {item}
            <BulletSeparator />
          </span>
        ))}
      </div>
    </Section>
  );
};

const SizeReadout = ({ name }: { name: string }) => {
  const [size, setSize] = useState("");

  const ref = useResizeObserver((entry) => {
    setSize(
      `${Math.round(entry.contentRect.width)} x ${Math.round(entry.contentRect.height)}`
    );
  });

  return (
    <div
      ref={ref}
      className="h-24 w-64 min-w-32 resize overflow-auto rounded-lg border border-dashed border-stroke-subtle p-2 text-sm"
    >
      {name}
      <output className="block">{size}</output>
    </div>
  );
};

const SlotContextSection = () => {
  const [mounted, setMounted] = useState(true);
  const [custom, setCustom] = useState(false);

  return (
    <Section name="layout-layout-slot-context">
      <Toggle label="renderLayout" value={custom} onChange={setCustom} />
      <Layout
        content={<Sample>content</Sample>}
        header={<Sample>header</Sample>}
        headerPlacement="page"
        panels={<Sample>panels</Sample>}
        renderLayout={
          custom
            ? ({ content, header, headerPlacement, panels }) => (
                <div
                  className="flex flex-col gap-2"
                  data-header-placement={headerPlacement}
                >
                  {panels}
                  {content}
                  {header}
                </div>
              )
            : undefined
        }
      />
      <Toggle
        label="ResizeObserverProvider"
        value={mounted}
        onChange={setMounted}
      />
      {mounted ? (
        <ResizeObserverProvider>
          <div className="flex flex-wrap gap-4">
            <SizeReadout name="useResizeObserver" />
            <SizeReadout name="useResizeObserver" />
          </div>
        </ResizeObserverProvider>
      ) : null}
    </Section>
  );
};

const StickySectionSection = () => {
  const [withoutFooterFade, setWithoutFooterFade] = useState(false);
  const [stickyHeaders, setStickyHeaders] = useState(true);

  return (
    <Section name="layout-sticky-section-scroll-driven">
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="withoutFooterFade"
          value={withoutFooterFade}
          onChange={setWithoutFooterFade}
        />
        <Toggle
          label="stickyHeaders"
          value={stickyHeaders}
          onChange={setStickyHeaders}
        />
      </div>
      <div className="flex h-80 max-w-sm flex-col">
        <ScrollMaskHost
          className="gap-4 rounded-lg border border-stroke-subtle p-2"
          stickyHeaders={stickyHeaders}
          withoutFooterFade={withoutFooterFade}
        >
          {["section 1", "section 2", "section 3"].map((heading) => (
            <StickySection
              key={heading}
              heading={
                <span className="flex h-full items-center bg-panel px-2 text-sm font-medium">
                  {heading}
                </span>
              }
            >
              {rows.slice(0, 10).map((row) => (
                <div key={row} className="px-2 py-1 text-sm">
                  {row}
                </div>
              ))}
            </StickySection>
          ))}
        </ScrollMaskHost>
      </div>
    </Section>
  );
};

const LayoutGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-6 text-foreground">
    <header className="flex items-center gap-4">
      <Link className="underline" href="/gallery">
        gallery
      </Link>
      <h1 className="text-title-lg font-semibold">layout</h1>
    </header>
    <PageHeaderSection />
    <ContentSectionSection />
    <ContentGridSection />
    <DetailPageSection />
    <SearchableHeaderShellSection />
    <HeaderRegionsSection />
    <ContentWidthSection />
    <HeaderMotionSection />
    <PageSearchSection />
    <BreadcrumbSection />
    <SlotContextSection />
    <StickySectionSection />
  </main>
);

export { LayoutGalleryExample };
