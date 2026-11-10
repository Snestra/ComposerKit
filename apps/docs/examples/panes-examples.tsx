"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle, shadcn/no-inline-styles -- The demonstration sizes its containers with local state through custom properties and puts classes on Buttons. */

import { Button } from "@workspace/react/components/ui/button";
import { Menu, MenuItem } from "@workspace/react/components/ui/menu";
import { PanelResizer } from "@workspace/react/components/ui/panel-resizer";
import type { ResizerEdge } from "@workspace/react/components/ui/panel-resizer";
import {
  FloatingComposerInset,
  FloatingSurface,
  PanelHeader,
  SidePanel,
} from "@workspace/react/components/ui/panes";
import type {
  FloatingSurfaceVariant,
  SidePanelSide,
} from "@workspace/react/components/ui/panes";
import {
  PreviewComposer,
  PreviewLayout,
} from "@workspace/react/components/ui/preview-layout";
import type { ComposerPresentation } from "@workspace/react/components/ui/preview-layout";
import {
  SplitView,
  useSplitView,
} from "@workspace/react/components/ui/split-view";
import {
  ExpandableList,
  SummaryRow,
  SummarySection,
} from "@workspace/react/components/ui/summary-list";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface DemoItem {
  id: string;
  preview: string;
  trailing: string;
}

const demoItems = (count: number): DemoItem[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `item-${index + 1}`;

    return { id, preview: `${id} `.repeat(14), trailing: String(index + 1) };
  });

const manyItems = demoItems(9);
const fewItems = demoItems(3);

interface DemoSectionProps {
  children: ReactNode;
  names: readonly string[];
}

const DemoSection = ({ children, names }: DemoSectionProps) => {
  const heading = names.join(", ");

  return (
    <section aria-label={heading} className="flex flex-col gap-3">
      <h2 className="text-title-sm font-semibold">{heading}</h2>
      {children}
    </section>
  );
};

const ToggleButton = ({
  label,
  onClick,
  pressed,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) => (
  <Button
    aria-pressed={pressed}
    color="outline"
    onClick={onClick}
    size="pageAction"
  >
    {label}
  </Button>
);

const demoWidth = (size: number) =>
  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the one key is a `--name` custom property with a string value, which React accepts in a style object.
  ({ "--demo-size": `${size}px` }) as CSSProperties;

const Pane = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full flex-col gap-2 overflow-auto bg-panel p-3 text-sm">
    {children}
  </div>
);

const SideControls = ({ side }: { side: "left" | "right" }) => {
  const { collapse, expand, isLeftOpen, isResizing, isRightOpen, toggle } =
    useSplitView();

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleButton
        label={`collapse(${side})`}
        onClick={() => {
          collapse(side);
        }}
      />
      <ToggleButton
        label={`expand(${side})`}
        onClick={() => {
          expand(side);
        }}
      />
      <ToggleButton
        label={`toggle(${side})`}
        onClick={() => {
          toggle(side);
        }}
      />
      <output className="text-xs">
        {`isLeftOpen=${isLeftOpen} isRightOpen=${isRightOpen} isResizing=${isResizing}`}
      </output>
    </div>
  );
};

interface SplitDemoProps {
  defaultLeftPercent?: number;
  id: string;
  widthClass: string;
}

const SplitDemo = ({ defaultLeftPercent, id, widthClass }: SplitDemoProps) => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <ToggleButton
          label={`isLeftOpen=${leftOpen}`}
          onClick={() => {
            setLeftOpen(!leftOpen);
          }}
          pressed={leftOpen}
        />
        <ToggleButton
          label={`isRightOpen=${rightOpen}`}
          onClick={() => {
            setRightOpen(!rightOpen);
          }}
          pressed={rightOpen}
        />
      </div>
      <div className="overflow-x-auto">
        <div
          className={`h-56 overflow-hidden rounded-lg border border-border ${widthClass}`}
        >
          <SplitView
            defaultLeftPercent={defaultLeftPercent}
            id={id}
            isLeftOpen={leftOpen}
            isRightOpen={rightOpen}
            left={
              <Pane>
                <span>left</span>
                <SideControls side="left" />
              </Pane>
            }
            onLeftOpenChange={setLeftOpen}
            onRightOpenChange={setRightOpen}
            right={
              <Pane>
                <span>right</span>
                <SideControls side="right" />
              </Pane>
            }
          />
        </div>
      </div>
    </div>
  );
};

const floatingVariants = [
  "default",
  "single-line",
  "notice",
  "canvas",
  "island",
  "viewer",
] as const satisfies readonly FloatingSurfaceVariant[];

const FloatingSurfaceDemo = () => (
  <div className="grid grid-cols-1 gap-6 bg-panel-tertiary p-6 sm:grid-cols-2">
    {floatingVariants.map((variant) => (
      <FloatingSurface className="p-4 text-sm" key={variant} variant={variant}>
        {`variant=${variant}`}
      </FloatingSurface>
    ))}
    <FloatingSurface className="p-4 text-sm" radius="composer">
      radius=composer
    </FloatingSurface>
    <FloatingSurface className="text-sm" variant="default">
      <FloatingComposerInset className="pt-4">
        FloatingComposerInset
      </FloatingComposerInset>
    </FloatingSurface>
  </div>
);

const versionHistoryTitle = "Version history";
const versionHistoryClose = "Close version history";

const PanelHeaderDemo = () => {
  const [closes, setCloses] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <FloatingSurface className="w-80" variant="viewer">
        <PanelHeader
          actions={
            <Button
              aria-label="Resize panels"
              color="ghost"
              size="toolbar"
              uniform
            >
              <GripVertical />
            </Button>
          }
          closeLabel={versionHistoryClose}
          leading={<GripVertical aria-hidden className="size-4" />}
          onClose={() => {
            setCloses(closes + 1);
          }}
          title={versionHistoryTitle}
          titleId="panes-panel-header-title"
        />
      </FloatingSurface>
      <FloatingSurface className="w-80" variant="viewer">
        <PanelHeader
          closeDisabled
          closeLabel={versionHistoryClose}
          onClose={() => {
            setCloses(closes + 1);
          }}
          title="closeDisabled"
        />
      </FloatingSurface>
      <output className="text-xs">{`onClose called ${closes}`}</output>
    </div>
  );
};

const SidePanelBody = ({ onClose }: { onClose: () => void }) => (
  <>
    <PanelHeader
      closeLabel={versionHistoryClose}
      onClose={onClose}
      title={versionHistoryTitle}
    />
    <div className="px-3 pb-3">
      <SummarySection items={fewItems} title="item-1">
        {(item) => <SummaryRow label={item.id} trailing={item.trailing} />}
      </SummarySection>
    </div>
  </>
);

const SidePanelDemo = () => {
  const [open, setOpen] = useState(true);
  const [side, setSide] = useState<SidePanelSide>("end");
  const [compact, setCompact] = useState(false);
  const [content, setContent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preserve, setPreserve] = useState(false);
  const [exits, setExits] = useState(0);
  const [initialOpen, setInitialOpen] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ToggleButton
          label={`open=${open}`}
          onClick={() => {
            setOpen(!open);
          }}
          pressed={open}
        />
        <ToggleButton
          label={`side=${side}`}
          onClick={() => {
            setSide(side === "end" ? "start" : "end");
          }}
        />
        <ToggleButton
          label={`size=${compact ? "compact" : "default"}`}
          onClick={() => {
            setCompact(!compact);
          }}
        />
        <ToggleButton
          label={`height=${content ? "content" : "full"}`}
          onClick={() => {
            setContent(!content);
          }}
        />
        <ToggleButton
          label={`busy=${busy}`}
          onClick={() => {
            setBusy(!busy);
          }}
          pressed={busy}
        />
        <ToggleButton
          label={`preserveContent=${preserve}`}
          onClick={() => {
            setPreserve(!preserve);
          }}
          pressed={preserve}
        />
        <output className="text-xs">{`onExitComplete called ${exits}`}</output>
      </div>
      <div
        className={`grid h-96 overflow-hidden rounded-lg border border-border bg-panel-tertiary ${
          side === "end" ? "justify-items-end" : "justify-items-start"
        }`}
      >
        <SidePanel
          busy={busy}
          height={content ? "content" : "full"}
          label={versionHistoryTitle}
          onExitComplete={() => {
            setExits((count) => count + 1);
          }}
          open={open}
          preserveContent={preserve}
          side={side}
          size={compact ? "compact" : "default"}
        >
          <SidePanelBody
            onClose={() => {
              setOpen(false);
            }}
          />
        </SidePanel>
      </div>
      <div className="grid h-40 overflow-hidden rounded-lg border border-border bg-panel-tertiary">
        <SidePanel
          initial={false}
          label={versionHistoryTitle}
          open={initialOpen}
          preserveContent
        >
          <PanelHeader
            closeLabel={versionHistoryClose}
            onClose={() => {
              setInitialOpen(false);
            }}
            title="initial=false"
          />
        </SidePanel>
      </div>
    </div>
  );
};

const presentations: ComposerPresentation[] = ["footer", "inline", "overlay"];

const PreviewDemo = () => {
  const [open, setOpen] = useState(false);

  const [presentation, setPresentation] =
    useState<ComposerPresentation>("footer");

  const [document, setDocument] = useState(false);
  const [ownsHeader, setOwnsHeader] = useState(false);
  const [closes, setCloses] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ToggleButton
          label="PreviewLayout"
          onClick={() => {
            setOpen(!open);
          }}
          pressed={open}
        />
        {presentations.map((value) => (
          <ToggleButton
            key={value}
            label={`composerPresentation=${value}`}
            onClick={() => {
              setPresentation(value);
            }}
            pressed={presentation === value}
          />
        ))}
        <ToggleButton
          label={`headerVariant=${document ? "document" : "none"}`}
          onClick={() => {
            setDocument(!document);
          }}
          pressed={document}
        />
        <ToggleButton
          label={`contentOwnsHeader=${ownsHeader}`}
          onClick={() => {
            setOwnsHeader(!ownsHeader);
          }}
          pressed={ownsHeader}
        />
        <output className="text-xs">{`onClose called ${closes}`}</output>
      </div>
      {open ? (
        <div className="h-96 max-w-xl overflow-hidden rounded-lg border border-border">
          <PreviewLayout
            assetName="item-1"
            bottomContent={
              <PreviewComposer presentation={presentation}>
                <FloatingSurface className="p-3 text-sm" variant="single-line">
                  PreviewComposer
                </FloatingSurface>
              </PreviewComposer>
            }
            composerPresentation={presentation}
            contentOwnsHeader={ownsHeader}
            endContent={<span className="text-xs">endContent</span>}
            headerVariant={document ? "document" : undefined}
            onClose={() => {
              setCloses((count) => count + 1);
              setOpen(false);
            }}
            titleEndContent={<span className="text-xs">titleEndContent</span>}
          >
            <Pane>
              <span>children</span>
            </Pane>
          </PreviewLayout>
        </div>
      ) : null}
    </div>
  );
};

const SummaryListDemo = () => {
  const [selected, setSelected] = useState("none");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <output className="text-xs">{`onSelect ${selected}`}</output>
      <SummarySection items={manyItems} title="select">
        {(item) => (
          <SummaryRow
            action={{
              onSelect: () => {
                setSelected(item.id);
              },
              type: "select",
            }}
            label={item.id}
            preview={item.preview}
            previewLineCount={2}
            trailing={item.trailing}
          />
        )}
      </SummarySection>
      <SummarySection items={fewItems} title="link">
        {(item) => (
          <SummaryRow
            action={{ href: `#${item.id}`, type: "link" }}
            label={item.id}
            preview={item.preview}
            trailing={item.trailing}
          />
        )}
      </SummarySection>
      <SummarySection items={fewItems} title="none">
        {(item) => <SummaryRow label={item.id} trailing={item.trailing} />}
      </SummarySection>
      <SummarySection emptyState="emptyState" items={[]} title="emptyState">
        {() => null}
      </SummarySection>
      <section aria-label="ExpandableList" className="flex flex-col gap-2">
        <ToggleButton
          label={`isLoadingMore=${loading}`}
          onClick={() => {
            setLoading(!loading);
          }}
          pressed={loading}
        />
        <ExpandableList
          getKey={(item: DemoItem) => item.id}
          isLoadingMore={loading}
          items={manyItems}
          listAriaLabel="listAriaLabel"
          listClassName="flex flex-col gap-1"
          visibleItemLimit={4}
        >
          {(item: DemoItem) => (
            <SummaryRow label={item.id} trailing={item.trailing} />
          )}
        </ExpandableList>
      </section>
    </div>
  );
};

const resizerEdges: readonly {
  containerClass: string;
  edge: ResizerEdge;
  panelClass: string;
}[] = [
  {
    containerClass: "flex",
    edge: "right",
    panelClass: "h-full w-(--demo-size)",
  },
  {
    containerClass: "flex justify-end",
    edge: "left",
    panelClass: "h-full w-(--demo-size)",
  },
  {
    containerClass: "flex flex-col",
    edge: "bottom",
    panelClass: "h-(--demo-size) w-full",
  },
  {
    containerClass: "flex flex-col justify-end",
    edge: "top",
    panelClass: "h-(--demo-size) w-full",
  },
];

interface ResizerDemoProps {
  action?: boolean;
  edge: ResizerEdge;
  indicator?: "gradient" | "inset-solid" | "solid";
  keyboard: boolean;
  topLayer?: boolean;
}

const ResizerDemo = ({
  action = false,
  edge,
  indicator,
  keyboard,
  topLayer = false,
}: ResizerDemoProps) => {
  const [size, setSize] = useState(160);
  const [resizing, setResizing] = useState(false);
  const layout = resizerEdges.find((entry) => entry.edge === edge);

  return (
    <div className="flex flex-col gap-1">
      <output className="text-xs">
        {`edge=${edge} size=${Math.round(size)} resizing=${resizing}`}
      </output>
      {topLayer && (
        <Menu
          triggerButton={
            <Button color="outline" size="dialog">
              Open menu
            </Button>
          }
        >
          <MenuItem
            onSelect={() => {
              setSize(160);
            }}
          >
            Resize panels
          </MenuItem>
        </Menu>
      )}
      <div
        className={`h-48 overflow-hidden rounded-lg border border-border ${layout?.containerClass ?? ""}`}
      >
        <div
          className={`relative bg-panel-secondary ${layout?.panelClass ?? ""}`}
          style={demoWidth(size)}
        >
          <PanelResizer
            action={
              action ? (
                <Button
                  aria-label="Resize panels"
                  color="secondary"
                  radius="full"
                  size="toolbar"
                  uniform
                >
                  <GripVertical />
                </Button>
              ) : undefined
            }
            ariaLabel={keyboard ? "Resize panels" : undefined}
            defaultSize={160}
            edge={edge}
            getCurrentSize={() => size}
            indicator={indicator}
            maximumSize={keyboard ? 320 : undefined}
            minimumSize={keyboard ? 80 : undefined}
            onResizingChange={setResizing}
            renderInTopLayer={topLayer}
            setSize={setSize}
          />
        </div>
      </div>
    </div>
  );
};

const PanelResizerDemo = () => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <ResizerDemo edge="right" keyboard />
    <ResizerDemo edge="left" keyboard={false} />
    <ResizerDemo edge="bottom" indicator="inset-solid" keyboard />
    <ResizerDemo edge="top" indicator="solid" keyboard={false} />
    <ResizerDemo action edge="right" keyboard topLayer />
  </div>
);

const PanesGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-10 bg-background p-6 text-foreground">
    <header className="flex items-center gap-4">
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Panes</h1>
    </header>
    <DemoSection
      names={[
        "panes-split-resize-handle",
        "panes-split-handle-appearance",
        "panes-split-collapse-state",
        "panes-split-motion",
      ]}
    >
      <SplitDemo id="panes-gallery-handle" widthClass="w-225" />
    </DemoSection>
    <DemoSection names={["panes-split-sizes"]}>
      <SplitDemo
        defaultLeftPercent={30}
        id="panes-gallery-sizes"
        widthClass="w-225"
      />
      <SplitDemo id="panes-gallery-drawer" widthClass="w-150" />
    </DemoSection>
    <DemoSection names={["panes-floating-surface-variants"]}>
      <FloatingSurfaceDemo />
    </DemoSection>
    <DemoSection names={["panes-panel-header"]}>
      <PanelHeaderDemo />
    </DemoSection>
    <DemoSection names={["panes-side-panel"]}>
      <SidePanelDemo />
    </DemoSection>
    <DemoSection names={["panes-preview-layout"]}>
      <PreviewDemo />
    </DemoSection>
    <DemoSection names={["panes-summary-list"]}>
      <SummaryListDemo />
    </DemoSection>
    <DemoSection
      names={["panes-panel-resizer-a11y", "panes-panel-resizer-appearance"]}
    >
      <PanelResizerDemo />
    </DemoSection>
  </main>
);

export { PanesGalleryExample };
