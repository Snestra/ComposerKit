"use client";

import { Button } from "@workspace/react/components/ui/button";
import type {
  ButtonColor,
  ButtonRadius,
} from "@workspace/react/components/ui/button";
import {
  BackForwardButtons,
  CloudSettingsToolbar,
  FindBar,
  handleFindKeyboard,
  Toolbar,
  ToolbarRow,
  ToolbarSizeControl,
} from "@workspace/react/components/ui/toolbar";
import type {
  FindBarSearchTarget,
  ToolbarVariant,
} from "@workspace/react/components/ui/toolbar";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import Link from "next/link";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

const sampleButtons = ["Bold", "Italic", "Underline"] as const;

const variants = [
  "compact",
  "imageTools",
  "playback",
  "embedded",
] as const satisfies readonly ToolbarVariant[];

const Section = ({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={id} className="flex flex-col gap-3">
    <h2 className="text-title-sm font-semibold" id={id}>
      {title}
    </h2>
    {children}
  </section>
);

const SampleButtons = () => (
  <>
    {sampleButtons.map((label) => (
      <Button color="ghost" key={label} size="toolbar">
        {label}
      </Button>
    ))}
  </>
);

const ToolbarRowExample = () => (
  <Section id="toolbar-row" title="requirement:toolbar-row">
    <div className="h-(--height-bar) border border-border">
      <ToolbarRow>
        <span>ToolbarRow</span>
        <SampleButtons />
      </ToolbarRow>
    </div>
    <div className="h-(--height-bar-sm) border border-border">
      <ToolbarRow className="justify-end">
        <span>className</span>
      </ToolbarRow>
    </div>
  </Section>
);

const PillVariantsExample = () => (
  <Section id="toolbar-pill-variants" title="requirement:toolbar-pill-variants">
    <div className="flex flex-col gap-4 bg-panel p-4">
      {variants.map((variant) => (
        <div className="flex items-center gap-4" key={variant}>
          <span className="w-24 shrink-0 text-sm">{variant}</span>
          <Toolbar variant={variant}>
            <SampleButtons />
          </Toolbar>
        </div>
      ))}
      <div className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm">className</span>
        <Toolbar className="max-w-40">
          <SampleButtons />
        </Toolbar>
      </div>
    </div>
  </Section>
);

const PillAriaExample = () => (
  <Section id="toolbar-pill-aria" title="requirement:toolbar-pill-aria">
    <div className="flex flex-col gap-4 bg-panel p-4">
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-sm">ariaLabel</span>
        <Toolbar ariaLabel="Formatting">
          <SampleButtons />
        </Toolbar>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-sm">embedded ariaLabel</span>
        <Toolbar ariaLabel="Formatting" variant="embedded">
          <SampleButtons />
        </Toolbar>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-sm">no ariaLabel</span>
        <Toolbar>
          <SampleButtons />
        </Toolbar>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-sm">embedded, no ariaLabel</span>
        <Toolbar variant="embedded">
          <SampleButtons />
        </Toolbar>
      </div>
    </div>
  </Section>
);

const colors = [
  "ghost",
  "primary",
  "outline",
] as const satisfies readonly ButtonColor[];

const radii = [
  "default",
  "full",
  "large",
] as const satisfies readonly ButtonRadius[];

const BackForwardExample = () => {
  const [color, setColor] = useState<ButtonColor>("ghost");
  const [radius, setRadius] = useState<ButtonRadius>("default");
  const [canGoBack, setCanGoBack] = useState(true);
  const [canGoForward, setCanGoForward] = useState(false);
  const [last, setLast] = useState("");

  return (
    <Section id="toolbar-back-forward" title="requirement:toolbar-back-forward">
      <TooltipProvider>
        <div className="flex flex-col gap-4 bg-panel p-4">
          <Toolbar ariaLabel="BackForwardButtons">
            <BackForwardButtons
              backLabel="Back"
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              color={color}
              forwardLabel="Forward"
              onBack={() => {
                setLast("onBack");
              }}
              onForward={() => {
                setLast("onForward");
              }}
              radius={radius === "default" ? undefined : radius}
            />
          </Toolbar>
          <output className="text-sm">{last}</output>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              aria-pressed={canGoBack}
              color="outline"
              onClick={() => {
                setCanGoBack(!canGoBack);
              }}
              size="toolbar"
            >
              canGoBack
            </Button>
            <Button
              aria-pressed={canGoForward}
              color="outline"
              onClick={() => {
                setCanGoForward(!canGoForward);
              }}
              size="toolbar"
            >
              canGoForward
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((value) => (
              <Button
                aria-pressed={color === value}
                color="outline"
                key={value}
                onClick={() => {
                  setColor(value);
                }}
                size="toolbar"
              >
                {`color ${value}`}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {radii.map((value) => (
              <Button
                aria-pressed={radius === value}
                color="outline"
                key={value}
                onClick={() => {
                  setRadius(value);
                }}
                size="toolbar"
              >
                {`radius ${value}`}
              </Button>
            ))}
          </div>
        </div>
      </TooltipProvider>
    </Section>
  );
};

const SAMPLE_LINES = Array.from(
  { length: 12 },
  (_, index) => `sample ${index + 1}`
);

const FindBarExample = ({
  initialQuery = "",
  searchTarget,
  title,
  id,
}: {
  id: string;
  initialQuery?: string;
  searchTarget: FindBarSearchTarget;
  title: string;
}) => {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [focusToken, setFocusToken] = useState(0);

  const matchingLines =
    query === ""
      ? []
      : SAMPLE_LINES.filter((line) =>
          line.toLowerCase().includes(query.toLowerCase())
        );

  const matches = matchingLines.length;

  const next = () => {
    setActive((value) => (matches === 0 ? 0 : (value + 1) % matches));
  };

  const previous = () => {
    setActive((value) => (matches === 0 ? 0 : (value - 1 + matches) % matches));
  };

  const surfaceKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    handleFindKeyboard(event, {
      enabled: true,
      onClose: () => {
        setOpen(false);
      },
      onNext: next,
      onOpen: () => {
        setOpen(true);
        setFocusToken((value) => value + 1);
      },
      onPrevious: previous,
      open,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium" id={id}>
        {title}
      </h3>
      {/* The surface owns the find shortcuts and receives focus back when the bar closes (data-ck-artifact-search-surface). */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        aria-labelledby={id}
        className="relative h-56 overflow-hidden border border-border bg-panel p-3 focus-visible:ring-2 focus-visible:ring-(--ck-palette-border-focus) focus-visible:outline-none"
        data-ck-artifact-search-surface=""
        onKeyDown={surfaceKeyDown}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="group"
        tabIndex={-1}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-pressed={open}
            color="outline"
            onClick={() => {
              setOpen(!open);
            }}
            size="toolbar"
          >
            open
          </Button>
          <Button
            color="outline"
            onClick={() => {
              setFocusToken((value) => value + 1);
            }}
            size="toolbar"
          >
            {`focusToken ${focusToken}`}
          </Button>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-1 text-sm">
          {SAMPLE_LINES.map((line) => (
            <li
              className={
                line === matchingLines[active]
                  ? "bg-fill-primary-transparent-hover"
                  : undefined
              }
              key={line}
            >
              {line}
            </li>
          ))}
        </ul>
        <FindBar
          activeResultIndex={active}
          focusToken={focusToken}
          onClose={() => {
            setOpen(false);
          }}
          onNavigateNext={next}
          onNavigatePrevious={previous}
          onQueryChange={(value) => {
            setQuery(value);
            setActive(0);
          }}
          open={open}
          query={query}
          resultCount={matches}
          searchTarget={searchTarget}
        />
      </div>
    </div>
  );
};

const FindBarExamples = () => (
  <>
    <Section
      id="toolbar-find-bar-keyboard"
      title="requirement:toolbar-find-bar-keyboard"
    >
      <FindBarExample
        id="find-bar-file"
        searchTarget="file"
        title="searchTarget file"
      />
      <FindBarExample
        id="find-bar-sheet"
        searchTarget="sheet"
        title="searchTarget sheet"
      />
    </Section>
    <Section
      id="toolbar-find-bar-contents"
      title="requirement:toolbar-find-bar-contents"
    >
      <FindBarExample
        id="find-bar-sample"
        initialQuery="sample"
        searchTarget="file"
        title="query sample"
      />
    </Section>
  </>
);

const SizesExample = () => (
  <Section id="toolbar-toolbar-sizes" title="requirement:toolbar-toolbar-sizes">
    <div className="grid gap-4 sm:grid-cols-2">
      {[undefined, "browser"].map((windowType) => (
        <div
          className="flex flex-col gap-3 bg-panel p-4"
          data-ui-window-kind={windowType}
          key={windowType ?? "default"}
        >
          <span className="text-sm font-medium">
            {windowType === undefined
              ? "default"
              : `data-ui-window-kind=${windowType}`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button color="outline" size="toolbar">
              size toolbar
            </Button>
            <Button color="outline" size="toolbarLabel">
              size toolbarLabel
            </Button>
          </div>
          <div className="flex h-(--height-bar) items-center border border-border px-2 text-sm">
            --height-bar
          </div>
          <div className="flex h-(--height-bar-sm) items-center border border-border px-2 text-sm">
            --height-bar-sm
          </div>
        </div>
      ))}
    </div>
  </Section>
);

const tabsWidths = [
  { className: "w-80", width: "20rem" },
  { className: "w-lg", width: "32rem" },
  { className: "w-3xl", width: "48rem" },
] as const;

const LayoutExample = () => {
  const [query, setQuery] = useState("");
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const search = {
    inputId: "toolbar-layout-search",
    label: "Find in file",
    onSearchQueryChange: setQuery,
    placeholder: "Find in file…",
    searchQuery: query,
  };

  const actions = (
    <>
      <Button color="outline" size="toolbar">
        Bold
      </Button>
      <Button color="outline" size="toolbar">
        Italic
      </Button>
    </>
  );

  return (
    <Section
      id="toolbar-toolbar-layout"
      title="requirement:toolbar-toolbar-layout"
    >
      <div className="flex flex-col gap-4 bg-panel p-4">
        <span className="text-sm font-medium">layout wrap</span>
        <div className="w-[36rem] max-w-full resize-x overflow-auto border border-border p-2">
          <CloudSettingsToolbar
            layout="wrap"
            navigation={<Toolbar ariaLabel="Formatting">{actions}</Toolbar>}
            search={search}
          >
            {actions}
          </CloudSettingsToolbar>
        </div>
        <span className="text-sm font-medium">layout tabs</span>
        {tabsWidths.map(({ className, width }) => (
          <div
            className={`max-w-full resize-x overflow-auto border border-border p-2 ${className}`}
            key={width}
          >
            <span className="text-xs">{width}</span>
            <CloudSettingsToolbar
              layout="tabs"
              navigation={<Toolbar ariaLabel="Formatting">{actions}</Toolbar>}
              search={{ ...search, inputId: `toolbar-layout-search-${width}` }}
            >
              {actions}
            </CloudSettingsToolbar>
          </div>
        ))}
        <span className="text-sm font-medium">ToolbarSizeControl</span>
        <div className="relative h-(--height-bar) border border-border">
          <ToolbarSizeControl zoom={1}>{actions}</ToolbarSizeControl>
        </div>
        <span className="text-sm font-medium">container</span>
        <div className="border border-border p-2" ref={setHost} />
        {host === null ? null : (
          <ToolbarSizeControl container={host}>{actions}</ToolbarSizeControl>
        )}
      </div>
    </Section>
  );
};

const ToolbarGalleryExample = () => (
  <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Toolbar</h1>
      <AppearanceControl id="toolbar-appearance" />
    </header>
    <ToolbarRowExample />
    <PillVariantsExample />
    <PillAriaExample />
    <BackForwardExample />
    <FindBarExamples />
    <SizesExample />
    <LayoutExample />
  </main>
);

export { ToolbarGalleryExample };
