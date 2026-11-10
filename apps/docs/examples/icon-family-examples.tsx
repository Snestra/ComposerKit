"use client";

import { StatusBadgeIcon } from "@workspace/react/components/icon";
import {
  ArrowIcon,
  CheckIcon,
  CircleIcon,
  DocumentIcon,
  FolderIcon,
  SquareOnSquareIcon,
} from "@workspace/react/components/icon/assets";
import { CopyButton } from "@workspace/react/components/icon/copy-button";
import {
  CheckGlyph,
  ChevronDownGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  CopyGlyph,
  SharedCheckIcon,
  SharedChevronRightIcon,
  SharedCloseIcon,
  XGlyph,
} from "@workspace/react/components/icon/glyphs";
import { NamedIcon } from "@workspace/react/components/icon/registry";
import {
  CompactIcon,
  ResponsiveIcon,
} from "@workspace/react/components/icon/responsive-icon";
import type { IconComponent } from "@workspace/react/components/icon/responsive-icon";
import {
  knownAppIcon,
  knownAppImage,
} from "@workspace/react/components/settings/known-apps";
import { Button } from "@workspace/react/components/ui/button";
import { cn } from "@workspace/react/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

const ABSENT = "(absent)";

const noop = () => {
  // The demonstration writes nothing to the clipboard.
};

const copyValue = () => "icon";

type Reader = (root: HTMLElement) => string;

interface Column {
  label: string;
  read: Reader;
}

const firstSvg = (root: HTMLElement) => root.querySelector("svg");

const attribute =
  (name: string): Reader =>
  (root) =>
    firstSvg(root)?.getAttribute(name) ?? ABSENT;

const strokeWidth: Reader = (root) =>
  firstSvg(root)
    ?.querySelector("[stroke-width]")
    ?.getAttribute("stroke-width") ?? ABSENT;

const ids: Reader = (root) => {
  const found = [...(firstSvg(root)?.querySelectorAll("[id]") ?? [])].map(
    (element) => element.id
  );

  return found.length === 0 ? ABSENT : found.join(" ");
};

const size = (svg: SVGSVGElement) => {
  const { height, width } = svg.getBoundingClientRect();

  return `${width} × ${height}`;
};

const renderedSize: Reader = (root) => {
  const svg = firstSvg(root);

  return svg ? size(svg) : ABSENT;
};

const everyRenderedSize: Reader = (root) => {
  const svgs = [...root.querySelectorAll("svg")];

  return svgs.length === 0 ? ABSENT : svgs.map(size).join(" | ");
};

const svgCount: Reader = (root) => String(root.querySelectorAll("svg").length);

const sourceDisplay =
  (index: number): Reader =>
  (root) => {
    const span = root.querySelectorAll("span:has(> svg)")[index];

    return span instanceof HTMLSpanElement
      ? getComputedStyle(span).display
      : ABSENT;
  };

const computed =
  (
    property: "opacity" | "rotate" | "transform" | "transitionProperty"
  ): Reader =>
  (root) => {
    const svg = firstSvg(root);

    return svg ? getComputedStyle(svg)[property] : ABSENT;
  };

const swapItem =
  (name: string, property: "opacity" | "transform"): Reader =>
  (root) => {
    const item = root.querySelector(`[data-icon="${name}"]`);

    return item ? getComputedStyle(item)[property] : ABSENT;
  };

const column = (label: string, read: Reader): Column => ({ label, read });

/** Reads the facts of one row again whenever its markup or a transition changes. */
const FactsRow = ({
  children,
  columns,
  label,
}: {
  children: ReactNode;
  columns: readonly Column[];
  label: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [facts, setFacts] = useState<string[]>([]);

  useEffect(() => {
    const root = ref.current;

    if (!root) {
      return noop;
    }

    const update = () => {
      const next = columns.map((entry) => entry.read(root));

      setFacts((previous) =>
        previous.join("\u0000") === next.join("\u0000") ? previous : next
      );
    };

    update();

    const observer = new MutationObserver(update);

    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    root.addEventListener("transitionend", update);

    return () => {
      observer.disconnect();
      root.removeEventListener("transitionend", update);
    };
  }, [columns]);

  return (
    <tr className="border-b align-middle">
      <th className="py-2 pe-3 text-start font-medium" scope="row">
        {label}
      </th>
      <td className="py-2 pe-3">
        <div className="inline-flex items-center gap-1" ref={ref}>
          {children}
        </div>
      </td>
      {columns.map((entry, index) => (
        <td className="py-2 pe-3 break-all" key={entry.label}>
          {facts[index]}
        </td>
      ))}
    </tr>
  );
};

const FactsTable = ({
  children,
  columns,
}: {
  children: ReactNode;
  columns: readonly Column[];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-2xl border-collapse text-xs">
      <thead>
        <tr className="border-b text-muted-foreground">
          <td aria-hidden className="py-2 pe-3" colSpan={2} />
          {columns.map((entry) => (
            <th
              className="py-2 pe-3 text-start font-medium"
              key={entry.label}
              scope="col"
            >
              {entry.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Section = ({ children, id }: { children: ReactNode; id: string }) => (
  <section
    aria-labelledby={id}
    className="flex flex-col gap-3"
    data-testid={id}
  >
    <h2 className="text-title-md font-semibold" id={id}>
      {id}
    </h2>
    {children}
  </section>
);

const { 16: Arrow16, 20: Arrow20 } = ArrowIcon;

const { 16: Circle16, 20: Circle20 } = CircleIcon;

const { 20: SquareOnSquare20 } = SquareOnSquareIcon;

const { 20: Document20 } = DocumentIcon;

const contractColumns = [
  column("width", attribute("width")),
  column("height", attribute("height")),
  column("viewBox", attribute("viewBox")),
  column("fill", attribute("fill")),
  column("stroke-width", strokeWidth),
  column("focusable", attribute("focusable")),
  column("rendered size", renderedSize),
] as const;

const SvgContractSection = () => (
  <Section id="icon-svg-contract">
    <FactsTable columns={contractColumns}>
      <FactsRow columns={contractColumns} label="CheckGlyph">
        <span className="text-2xl">
          <CheckGlyph />
        </span>
      </FactsRow>
      <FactsRow columns={contractColumns} label="CopyGlyph">
        <span className="text-2xl">
          <CopyGlyph />
        </span>
      </FactsRow>
      <FactsRow columns={contractColumns} label="XGlyph">
        <span className="text-2xl">
          <XGlyph />
        </span>
      </FactsRow>
      <FactsRow columns={contractColumns} label="ChevronLeftGlyph">
        <span className="text-2xl">
          <ChevronLeftGlyph />
        </span>
      </FactsRow>
      <FactsRow columns={contractColumns} label="ChevronRightGlyph">
        <span className="text-2xl">
          <ChevronRightGlyph />
        </span>
      </FactsRow>
      <FactsRow columns={contractColumns} label="SharedCheckIcon">
        <SharedCheckIcon />
      </FactsRow>
      <FactsRow columns={contractColumns} label="SharedChevronRightIcon">
        <SharedChevronRightIcon />
      </FactsRow>
      <FactsRow columns={contractColumns} label="SharedCloseIcon">
        <SharedCloseIcon />
      </FactsRow>
      <FactsRow columns={contractColumns} label="arrow-shape-16">
        <Arrow16 />
      </FactsRow>
      <FactsRow columns={contractColumns} label="arrow-shape-20">
        <Arrow20 />
      </FactsRow>
      <FactsRow columns={contractColumns} label="circle-shape-16">
        <Circle16 />
      </FactsRow>
      <FactsRow columns={contractColumns} label="circle-shape-20">
        <Circle20 />
      </FactsRow>
    </FactsTable>
    <div
      className="flex items-center gap-4 text-2xl"
      data-testid="currentColor"
    >
      <span className="text-foreground">
        <CheckGlyph />
      </span>
      <span className="text-muted-foreground">
        <CheckGlyph />
      </span>
      <span className="text-destructive">
        <CheckGlyph />
      </span>
    </div>
  </Section>
);

const a11yColumns = [
  column("aria-hidden", attribute("aria-hidden")),
  column("role", attribute("role")),
  column("aria-label", attribute("aria-label")),
  column("aria-labelledby", attribute("aria-labelledby")),
  column("data-icon-p3", attribute("data-icon-p3")),
  column("ids", ids),
] as const;

const { 16: CheckmarkMd16 } = CheckIcon;

const StatusBadge = StatusBadgeIcon;

const A11ySection = () => (
  <Section id="icon-a11y">
    <FactsTable columns={a11yColumns}>
      <FactsRow columns={a11yColumns} label="decorative">
        <CheckmarkMd16 />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="aria-label">
        <CheckmarkMd16 aria-label="check-16" />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="aria-labelledby">
        <CheckmarkMd16 aria-labelledby="icon-a11y" />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="label">
        <CheckmarkMd16 label="check-16" />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="aria-hidden">
        <CheckmarkMd16 aria-hidden={false} aria-label="check-16" />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="role">
        <CheckmarkMd16 label="check-16" role="presentation" />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="multicolor, first">
        <StatusBadge />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="multicolor, second">
        <StatusBadge />
      </FactsRow>
      <FactsRow columns={a11yColumns} label="idPrefix">
        <StatusBadge idPrefix="icon-a11y-prefix" />
      </FactsRow>
    </FactsTable>
  </Section>
);

const sizeColumns = [
  column("class", attribute("class")),
  column("rendered size", renderedSize),
] as const;

const sizeClasses = [
  "icon-3xs",
  "icon-xxs",
  "icon-2xs",
  "icon-xs",
  "icon-sm",
  "icon-base",
  "icon-md",
  "icon-lg",
  "icon-leading",
  "icon-disclosure",
] as const;

const variableOverrides = [
  { className: "icon-xs", variable: "--icon-size" },
  { className: "icon-2xs", variable: "--icon-detail-size" },
  { className: "icon-leading", variable: "--icon-start-size" },
  { className: "icon-disclosure", variable: "--icon-chevron-size" },
] as const;

const overrideValue = {
  "--icon-chevron-size": "[--icon-chevron-size:calc(var(--spacing)*3)]",
  "--icon-start-size": "[--icon-start-size:calc(var(--spacing)*5)]",
  "--icon-detail-size": "[--icon-detail-size:calc(var(--spacing)*4)]",
  "--icon-size": "[--icon-size:calc(var(--spacing)*5)]",
} as const;

const SizeScaleSection = () => (
  <Section id="icon-size-scale">
    <FactsTable columns={sizeColumns}>
      {sizeClasses.map((className) => (
        <FactsRow columns={sizeColumns} key={className} label={className}>
          <CheckmarkMd16 className={className} />
        </FactsRow>
      ))}
      {variableOverrides.map(({ className, variable }) => (
        <FactsRow
          columns={sizeColumns}
          key={variable}
          label={`${className} ${variable}`}
        >
          <span className={cn("inline-flex", overrideValue[variable])}>
            <CheckmarkMd16 className={className} />
          </span>
        </FactsRow>
      ))}
      <FactsRow columns={sizeColumns} label="default, leading">
        <ResponsiveIcon icon={CheckGlyph} />
      </FactsRow>
      <FactsRow columns={sizeColumns} label="default, compact">
        <CompactIcon icon16={CheckGlyph} legacyIcon={CheckGlyph} />
      </FactsRow>
      <FactsRow columns={sizeColumns} label="flex-shrink 0">
        <span className="flex w-4">
          <CheckmarkMd16 className="icon-md" />
        </span>
      </FactsRow>
    </FactsTable>
  </Section>
);

const responsiveColumns = [
  column("svg count", svgCount),
  column("--icon-compact-display", sourceDisplay(0)),
  column("--icon-start-display", sourceDisplay(1)),
  column("rendered size", everyRenderedSize),
] as const;

const compactVisible =
  "[--icon-compact-display:contents] [--icon-start-display:none]";

const leadingVisible =
  "[--icon-compact-display:none] [--icon-start-display:contents]";

const ResponsiveSection = () => (
  <Section id="icon-responsive">
    <FactsTable columns={responsiveColumns}>
      <FactsRow columns={responsiveColumns} label="assets, leading">
        <ResponsiveIcon icon={{ assets: FolderIcon }} />
      </FactsRow>
      <FactsRow
        columns={responsiveColumns}
        label="assets, leading, --icon-start-display: contents"
      >
        <span className={cn("contents", leadingVisible)}>
          <ResponsiveIcon icon={{ assets: FolderIcon }} />
        </span>
      </FactsRow>
      <FactsRow columns={responsiveColumns} label="assets, inline">
        <ResponsiveIcon icon={{ assets: FolderIcon }} size="inline" />
      </FactsRow>
      <FactsRow columns={responsiveColumns} label="assets, secondary">
        <ResponsiveIcon icon={{ assets: FolderIcon }} size="secondary" />
      </FactsRow>
      <FactsRow columns={responsiveColumns} label="16 and 20, leading">
        <ResponsiveIcon icon={FolderIcon} />
      </FactsRow>
      <FactsRow
        columns={responsiveColumns}
        label="16 and 20, --icon-start-display: contents"
      >
        <span className={cn("contents", leadingVisible)}>
          <ResponsiveIcon icon={FolderIcon} />
        </span>
      </FactsRow>
      <FactsRow columns={responsiveColumns} label="16 and 20, inline">
        <ResponsiveIcon icon={FolderIcon} size="inline" />
      </FactsRow>
      <FactsRow columns={responsiveColumns} label="CompactIcon">
        <span className={cn("contents", compactVisible)}>
          <CompactIcon
            asset16={FolderIcon[16]}
            icon16={FolderIcon[16]}
            legacyIcon={CheckGlyph}
          />
        </span>
      </FactsRow>
    </FactsTable>
  </Section>
);

const LightMark: IconComponent = (props) => (
  <SquareOnSquare20 data-variant="light" {...props} />
);

const DarkMark: IconComponent = (props) => (
  <Document20 data-variant="dark" {...props} />
);

const themeColumns = [
  column("data-variant", attribute("data-variant")),
  column("class", attribute("class")),
  column("data-icon-p3", attribute("data-icon-p3")),
] as const;

const subscribeNever = () => noop;
const readTrue = () => true;
const readFalse = () => false;

const ThemeControls = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNever, readTrue, readFalse);

  const current = mounted ? resolvedTheme : undefined;

  return (
    <div className="flex items-center gap-2">
      <Button
        aria-pressed={current === "light"}
        color="outline"
        onClick={() => {
          setTheme("light");
        }}
        size="pageAction"
      >
        light
      </Button>
      <Button
        aria-pressed={current === "dark"}
        color="outline"
        onClick={() => {
          setTheme("dark");
        }}
        size="pageAction"
      >
        dark
      </Button>
      <output data-testid="icon-theme">{current}</output>
    </div>
  );
};

const ThemeVariantsSection = () => (
  <Section id="icon-theme-variants">
    <ThemeControls />
    <FactsTable columns={themeColumns}>
      <FactsRow columns={themeColumns} label="artwork, leading">
        <ResponsiveIcon
          icon={{ artwork: { dark: DarkMark, light: LightMark } }}
        />
      </FactsRow>
      <FactsRow columns={themeColumns} label="artwork, inline">
        <ResponsiveIcon
          icon={{ artwork: { dark: DarkMark, light: LightMark } }}
          size="inline"
        />
      </FactsRow>
      <FactsRow columns={themeColumns} label="artwork, light only">
        <ResponsiveIcon icon={{ artwork: { light: LightMark } }} />
      </FactsRow>
      <FactsRow columns={themeColumns} label="multicolor">
        <StatusBadge aria-label="multicolor" />
      </FactsRow>
    </FactsTable>
    <div className="flex items-center gap-4 text-2xl">
      <span className="text-foreground">
        <CheckGlyph />
      </span>
      <span className="text-destructive">
        <CheckGlyph />
      </span>
    </div>
  </Section>
);

const chevronColumns = [
  column("class", attribute("class")),
  column("rotate", computed("rotate")),
  column("transition-property", computed("transitionProperty")),
] as const;

const swapColumns = [
  column("copy-icon opacity", swapItem("copy-icon", "opacity")),
  column("copy-icon transform", swapItem("copy-icon", "transform")),
  column("copied-icon opacity", swapItem("copied-icon", "opacity")),
  column("copied-icon transform", swapItem("copied-icon", "transform")),
] as const;

const MotionSection = () => {
  const [open, setOpen] = useState(false);

  return (
    <Section id="icon-motion">
      <FactsTable columns={chevronColumns}>
        <FactsRow columns={chevronColumns} label="transition-transform">
          <button
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(!open);
            }}
            type="button"
          >
            <span>{open ? "Show less" : "Show more"}</span>
            <ChevronDownGlyph
              className={cn(
                "icon-2xs transition-transform",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </button>
        </FactsRow>
      </FactsTable>
      <FactsTable columns={swapColumns}>
        <FactsRow columns={swapColumns} label="copy-icon, copied-icon">
          <span className="inline-flex [--ck-action-icon-size:20px]">
            <CopyButton
              aria-labelledby="icon-motion"
              color="outline"
              copy={noop}
              copyValue={copyValue}
              size="icon"
            />
          </span>
        </FactsRow>
      </FactsTable>
    </Section>
  );
};

const registryColumns = [
  column("svg count", svgCount),
  column("viewBox", attribute("viewBox")),
  column("width", attribute("width")),
  column("rendered size", renderedSize),
] as const;

const registryNames = [
  "check",
  "copy",
  "x",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "file",
  "folder",
  "search",
  "settings",
  "lucide:check",
  "lucide:folder",
  "lucide:not-an-icon",
  "vendor:evernote:bell",
  "vendor:evernote:pin",
  "vendor:evernote:tag",
  "vendor:evernote:not-an-icon",
  "vendor:not-a-vendor:bell",
  "not-an-icon",
] as const;

const knownAppNames = [
  "figma",
  "connector-slack-mcp-server",
  "google-drive",
  "not-a-known-app",
] as const;

const KnownAppIcon = ({ name }: { name: string }) => {
  const icon = knownAppIcon(name);

  return icon ? createElement(icon, { "aria-hidden": true }) : null;
};

const knownImageNames = ["visualize", "write-like-me"] as const;

const RegistrySection = () => (
  <Section id="icon-registry">
    <FactsTable columns={registryColumns}>
      {registryNames.map((name) => (
        <FactsRow columns={registryColumns} key={name} label={name}>
          <span className="text-2xl">
            <NamedIcon name={name} />
          </span>
        </FactsRow>
      ))}
      {knownAppNames.map((name) => (
        <FactsRow
          columns={registryColumns}
          key={name}
          label={`knownAppIcon ${name}`}
        >
          <KnownAppIcon name={name} />
        </FactsRow>
      ))}
      {knownImageNames.map((name) => {
        const src = knownAppImage(name);

        return (
          <FactsRow
            columns={registryColumns}
            key={name}
            label={`knownAppImage ${name}`}
          >
            {src === null ? null : (
              <Image alt="" height={24} src={src} unoptimized width={24} />
            )}
          </FactsRow>
        );
      })}
      <FactsRow columns={registryColumns} label="search, light">
        <span className="text-2xl">
          <NamedIcon name="search" weight="light" />
        </span>
      </FactsRow>
    </FactsTable>
  </Section>
);

const IconFamilyGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-10 bg-background p-6 text-foreground">
    <header>
      <Link className="underline" href="/gallery">
        gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Icon</h1>
    </header>
    <SvgContractSection />
    <A11ySection />
    <SizeScaleSection />
    <ResponsiveSection />
    <ThemeVariantsSection />
    <MotionSection />
    <RegistrySection />
  </main>
);

export { IconFamilyGalleryExample };
