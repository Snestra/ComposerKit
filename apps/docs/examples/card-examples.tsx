"use client";

import { Button } from "@workspace/react/components/ui/button";
import {
  CardStatusIndicator,
  CardTile,
  CommentCard,
  CommentComposer,
  ContentReferenceCard,
  DocumentCard,
  SuggestionCard,
  WritingBlockSurface,
} from "@workspace/react/components/ui/card";
import type { CardTilePresentation } from "@workspace/react/components/ui/card";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import {
  BookOpen,
  Check,
  FileText,
  Folder,
  MoreHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
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

const Frame = ({
  children,
  label,
  testId,
}: {
  children: ReactNode;
  label: string;
  testId: string;
}) => (
  <figure className="flex min-w-0 flex-col gap-1" data-testid={testId}>
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    <div className="min-w-0 rounded-xl border bg-background p-2">
      {children}
    </div>
  </figure>
);

const ICON_CLASS = "size-5";

const presentations = [
  "card",
  "catalog",
  "featured",
  "ranked",
  "related",
  "row",
  "directory-row",
  "compact-row",
] as const satisfies readonly CardTilePresentation[];

const presentationExamples = {
  card: {
    description: "Border and padding of the default tile.",
    title: "Card",
  },
  catalog: {
    description: "A short description that wraps to at most three lines.",
    title: "Starter template",
  },
  "compact-row": {
    description: "One line description",
    title: "Compact row",
  },
  "directory-row": { description: "Rounded row", title: "Directory row" },
  featured: {
    description: "Larger padded surface variant.",
    title: "Featured item",
  },
  ranked: { description: "Ranked list entry", title: "Ranked item" },
  related: { description: "Related list entry", title: "Related item" },
  row: { description: "Pill row", title: "Row" },
} as const satisfies Record<
  CardTilePresentation,
  { description: string; title: string }
>;

// The row presentations show their hover background only on a tile with
// onClick (card-tile `isRow && onClick`), so those examples take a handler.
const ROW_PRESENTATIONS: ReadonlySet<CardTilePresentation> = new Set([
  "directory-row",
  "row",
]);

const PresentationExamples = () => {
  const [pressedRow, setPressedRow] = useState("No row pressed yet");

  return (
    <Section
      description="The eight presentations with an icon, a title and a description. Hover each to see its hover background, except compact-row, which has none. The row and directory-row examples have an onClick, which their hover background needs."
      id="presentations"
      title="Tile presentations"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {presentations.map((presentation) => (
          <Frame
            key={presentation}
            label={presentation}
            testId={`tile-${presentation}`}
          >
            <CardTile
              badges={presentation === "catalog" ? ["New"] : undefined}
              description={presentationExamples[presentation].description}
              icon={<FileText className={ICON_CLASS} />}
              presentation={presentation}
              title={presentationExamples[presentation].title}
              onClick={
                ROW_PRESENTATIONS.has(presentation)
                  ? () => {
                      setPressedRow(`Pressed ${presentation}`);
                    }
                  : undefined
              }
            />
          </Frame>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" data-testid="row-log">
        {pressedRow}
      </p>
    </Section>
  );
};

const InteractiveExamples = () => {
  const [count, setCount] = useState(0);
  const [log, setLog] = useState("No link event yet");

  return (
    <Section
      description="A tile with onClick is a button: Tab reaches it, Enter and Space on the tile itself click it, and a key pressed in a nested control does not. A disabled tile keeps role=button with aria-disabled and does nothing. A tile with `to` is covered by a link; the badge and the action button stay above it."
      id="interactive"
      title="Button, disabled and link tiles"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="onClick: button semantics" testId="tile-button">
          <CardTile
            description={`Clicked ${count} times`}
            icon={<Star className={ICON_CLASS} />}
            title="Clickable tile"
            onClick={() => {
              setCount((value) => value + 1);
            }}
          />
        </Frame>
        <Frame
          label="onClick with a nested action button"
          testId="tile-button-actions"
        >
          <CardTile
            actions={
              <Button
                aria-label="More"
                color="ghost"
                size="toolbar"
                onClick={(event) => {
                  event.stopPropagation();
                  setLog("Action pressed");
                }}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
            description={log}
            icon={<Folder className={ICON_CLASS} />}
            title="Tile with an action"
            onClick={() => {
              setLog("Tile pressed");
            }}
          />
        </Frame>
        <Frame label="disabled" testId="tile-disabled">
          <CardTile
            disabled
            description="Handlers are removed"
            icon={<FileText className={ICON_CLASS} />}
            title="Disabled tile"
            onClick={() => {
              setCount(100);
            }}
          />
        </Frame>
        <Frame label="Not interactive" testId="tile-static">
          <CardTile
            description="No onClick and not disabled: tabIndex -1, no role"
            icon={<FileText className={ICON_CLASS} />}
            title="Static tile"
          />
        </Frame>
        <Frame label="to: full-bleed link" testId="tile-link">
          <CardTile
            actions={
              <Button
                size="toolbar"
                onClick={() => {
                  setLog("Action above the link");
                }}
              >
                Open
              </Button>
            }
            badges={["Link"]}
            description={log}
            icon={<BookOpen className={ICON_CLASS} />}
            title="Linked tile"
            to="#tile-link"
            onClick={() => {
              setLog("Link onClick");
            }}
          />
        </Frame>
        <Frame label="to with disabled: no link" testId="tile-link-disabled">
          <CardTile
            disabled
            description="The overlay link is not rendered"
            icon={<BookOpen className={ICON_CLASS} />}
            title="Disabled linked tile"
            to="#tile-link-disabled"
          />
        </Frame>
        <Frame label="isHighlighted" testId="tile-highlighted">
          <CardTile
            isHighlighted
            description="Search result background and data-ck-search-result-active"
            icon={<Star className={ICON_CLASS} />}
            title="Highlighted tile"
          />
        </Frame>
        <Frame label="tooltip" testId="tile-tooltip">
          <TooltipProvider>
            <CardTile
              description="Hover or focus for the tooltip"
              icon={<Sparkles className={ICON_CLASS} />}
              title="Tile with a tooltip"
              tooltip="Tooltip content"
              onClick={() => {
                setLog("Tooltip tile pressed");
              }}
            />
          </TooltipProvider>
        </Frame>
      </div>
    </Section>
  );
};

const SlotExamples = () => (
  <Section
    description="Icon container variants and placements, description placement, action placement, badges that are strings or nodes, and the trailing slot."
    id="slots"
    title="Tile slots"
  >
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="iconContainerVariant: outline" testId="slot-outline">
        <CardTile
          description="Outlined icon container"
          icon={<FileText className={ICON_CLASS} />}
          iconContainerVariant="outline"
          title="Outline container"
        />
      </Frame>
      <Frame label="iconContainer: false" testId="slot-bare-icon">
        <CardTile
          description="The icon sits in a bare span"
          icon={<FileText className={ICON_CLASS} />}
          iconContainer={false}
          title="No container"
        />
      </Frame>
      <Frame label="iconPlacement: inline" testId="slot-icon-inline">
        <CardTile
          description="The icon moves into the title row"
          icon={<FileText className={ICON_CLASS} />}
          iconPlacement="inline"
          title="Inline icon"
        />
      </Frame>
      <Frame label="descriptionPlacement: inline" testId="slot-desc-inline">
        <CardTile
          description="The description is truncated beside the title column"
          descriptionPlacement="inline"
          icon={<FileText className={ICON_CLASS} />}
          title="Inline description"
        />
      </Frame>
      <Frame label="actionsPlacement: center" testId="slot-actions-center">
        <CardTile
          actions={<Button size="toolbar">Action</Button>}
          actionsPlacement="center"
          description="Actions sit right of the text block"
          icon={<FileText className={ICON_CLASS} />}
          title="Centered actions"
        />
      </Frame>
      <Frame
        label="actionsPlacement: top, badges and trailing"
        testId="slot-top"
      >
        <CardTile
          actions={<Button size="toolbar">Action</Button>}
          badges={["Beta", <Check className="size-4" key="check" />]}
          description="String badges are pills, nodes render as they are"
          icon={<FileText className={ICON_CLASS} />}
          title="Top actions"
          trailing={<span className="text-xs">Trailing</span>}
        />
      </Frame>
      <Frame label="descriptionClassName: no clamp" testId="slot-clamp">
        <CardTile
          description="A long description that would be clamped to three lines by default, but the override lets it show on every line of the text without a limit, however many that takes."
          // The demo passes the descriptionClassName override.
          // oxlint-disable-next-line shadcn/no-restyle
          descriptionClassName="line-clamp-none"
          icon={<FileText className={ICON_CLASS} />}
          title="Description override"
        />
      </Frame>
      <Frame label="Long title truncates" testId="slot-truncate">
        <CardTile
          description="The title is truncated to one line"
          icon={<FileText className={ICON_CLASS} />}
          title="A very long title that does not fit in the available width of the tile and is cut off"
        />
      </Frame>
      <Frame label="compact-row with actions" testId="slot-compact">
        <CardTile
          actions={<Button size="toolbar">Open</Button>}
          description="Single line description that is truncated"
          icon={<FileText className={ICON_CLASS} />}
          presentation="compact-row"
          title="A compact row title that wraps at word breaks when it is long"
        />
      </Frame>
    </div>
  </Section>
);

const SuggestionExamples = () => {
  const [picked, setPicked] = useState("None");

  return (
    <Section
      description="Suggestion cards are buttons named by their label and described by their description. The shortcut hint sits top right. A disabled card is dimmed."
      id="suggestions"
      title="Suggestion cards"
    >
      <p className="text-sm" data-testid="suggestion-picked">
        Picked: {picked}
      </p>
      <TooltipProvider>
        <div className="grid gap-3 md:grid-cols-3">
          <Frame label="compact" testId="suggestion-compact">
            <SuggestionCard
              description="Compact description"
              icon={<Sparkles />}
              label="Compact label"
              onClick={() => {
                setPicked("Compact");
              }}
            />
          </Frame>
          <Frame label="compact, no description" testId="suggestion-bare">
            <SuggestionCard
              icon={<Sparkles />}
              label="No description"
              onClick={() => {
                setPicked("No description");
              }}
            />
          </Frame>
          <Frame label="compact, disabled" testId="suggestion-disabled">
            <SuggestionCard
              disabled
              description="Native disabled attribute"
              icon={<Sparkles />}
              label="Disabled"
            />
          </Frame>
          <Frame label="illustrated" testId="suggestion-illustrated">
            <SuggestionCard
              description="Illustrated description"
              icon={<Sparkles />}
              label="Illustrated label"
              variant="illustrated"
              onClick={() => {
                setPicked("Illustrated");
              }}
            />
          </Frame>
          <Frame
            label="illustrated with a shortcut"
            testId="suggestion-shortcut"
          >
            <SuggestionCard
              description="Suggestion with shortcut"
              icon={<Sparkles />}
              keyboardShortcut="⌘K"
              label="Draft an outline"
              variant="illustrated"
              onClick={() => {
                setPicked("Shortcut");
              }}
            />
          </Frame>
          <Frame label="tooltipContent" testId="suggestion-tooltip">
            <SuggestionCard
              description="Hover or focus"
              icon={<Sparkles />}
              label="With a tooltip"
              tooltipContent="Tooltip content"
              onClick={() => {
                setPicked("Tooltip");
              }}
            />
          </Frame>
        </div>
      </TooltipProvider>
    </Section>
  );
};

const DocumentExamples = () => (
  <Section
    description="The document card header, the content reference card, the status indicator and the writing block surface."
    id="documents"
    title="Document, reference and status"
  >
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="DocumentCard with default icon" testId="document-default">
        <DocumentCard
          actions={<Button size="toolbar">Open</Button>}
          title="Document title"
        >
          <p className="px-4 pb-4 text-sm">Content below the header.</p>
        </DocumentCard>
      </Frame>
      <Frame
        label="DocumentCard with an icon and a long title"
        testId="document-icon"
      >
        <DocumentCard
          icon={<FileText className="size-5 text-text-notice" />}
          title="A very long document title that is cut off before it reaches the actions"
        >
          <p className="px-4 pb-4 text-sm">Content below the header.</p>
        </DocumentCard>
      </Frame>
      <Frame label="ContentReferenceCard with a title" testId="reference-title">
        <ContentReferenceCard title="Reference title">
          Reference content.
        </ContentReferenceCard>
      </Frame>
      <Frame
        label="ContentReferenceCard without a title"
        testId="reference-bare"
      >
        <ContentReferenceCard>Reference content.</ContentReferenceCard>
      </Frame>
      <Frame label="CardStatusIndicator" testId="status">
        <div className="flex items-center gap-2 text-sm">
          <CardStatusIndicator
            ariaLabel="Complete"
            icon={<Check className="size-4" />}
          />
          <span>Complete</span>
        </div>
      </Frame>
      <Frame label="WritingBlockSurface" testId="surface">
        <WritingBlockSurface>
          <p className="p-4 text-sm">
            Surface content with the border layer above it.
          </p>
        </WritingBlockSurface>
      </Frame>
    </div>
  </Section>
);

const CommentExamples = () => {
  const [log, setLog] = useState("No comment event yet");

  return (
    <Section
      description="Comment cards in the default and inline surfaces, with a clickable header, a body and a footer, and the composer in its inline and card layouts."
      id="comments"
      title="Comment card and composer"
    >
      <p className="text-sm" data-testid="comment-log">
        {log}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="default surface, header click" testId="comment-default">
          <CommentCard
            authorLabel="Author name"
            body={<div className="px-3 pb-2 text-sm">Comment body text.</div>}
            footer={<span>Footer</span>}
            headerAccessory={<span className="text-xs">12:00</span>}
            onHeaderClick={() => {
              setLog("Header clicked");
            }}
          />
        </Frame>
        <Frame label="inline surface" testId="comment-inline">
          <CommentCard
            authorLabel="Author name"
            body={<div className="px-3 pb-2 text-sm">Comment body text.</div>}
            surfaceVariant="inline"
          />
        </Frame>
        <Frame
          label="headerLayout: truncate, no body"
          testId="comment-truncate"
        >
          <CommentCard
            authorLabel="An author label that is long enough to be truncated in the header"
            headerAccessory={<span className="text-xs">12:00</span>}
            headerLayout="truncate"
          />
        </Frame>
        <Frame
          label="composer inline in the footer"
          testId="comment-composer-footer"
        >
          <CommentCard
            authorLabel="Author name"
            body={<div className="px-3 pb-2 text-sm">Reply below.</div>}
            footer={
              <div
                className="w-full text-sm"
                data-ck-composer-surface-variant="inline"
              >
                Footer with an inline composer surface
              </div>
            }
          />
        </Frame>
        <Frame label="CommentComposer inline" testId="composer-inline">
          <CommentComposer
            authorAvatar={<span className="size-6 rounded-full bg-border" />}
            submitLabel="Send"
            onSubmit={() => {
              setLog("Inline submitted");
            }}
          >
            <span className="text-sm">Write a comment</span>
          </CommentComposer>
        </Frame>
        <Frame label="CommentComposer card layout" testId="composer-card">
          <CommentComposer
            layout="card"
            submitLabel="Send"
            onSubmit={() => {
              setLog("Card submitted");
            }}
          >
            Write a comment
          </CommentComposer>
        </Frame>
        <Frame label="loading" testId="composer-loading">
          <CommentComposer loading submitLabel="Sending">
            <span className="text-sm">Sending</span>
          </CommentComposer>
        </Frame>
        <Frame label="disabled" testId="composer-disabled">
          <CommentComposer disabled submitLabel="Send">
            <span className="text-sm">Disabled</span>
          </CommentComposer>
        </Frame>
        <Frame
          label="showSubmit: false keeps the slot"
          testId="composer-nosubmit"
        >
          <CommentComposer showSubmit={false}>
            <span className="text-sm">No submit button</span>
          </CommentComposer>
        </Frame>
      </div>
    </Section>
  );
};

const RtlExample = () => (
  <Section
    description="The same tiles in a right-to-left container."
    id="rtl"
    title="Right to left"
  >
    <div className="grid gap-3 md:grid-cols-2" dir="rtl" lang="ar">
      <Frame label="Tile" testId="rtl-tile">
        <CardTile
          actions={<Button size="toolbar">فتح</Button>}
          badges={["جديد"]}
          description="وصف قصير يظهر في سطر واحد"
          icon={<FileText className={ICON_CLASS} />}
          title="عنوان البطاقة"
          onClick={() => {
            /* The tile is shown for layout only. */
          }}
        />
      </Frame>
      <Frame label="Suggestion" testId="rtl-suggestion">
        <SuggestionCard
          description="وصف الاقتراح"
          icon={<Sparkles />}
          keyboardShortcut="⌘K"
          label="اقتراح"
          variant="illustrated"
        />
      </Frame>
    </div>
  </Section>
);

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3">
    <Frame label="Tiles" testId={`${prefix}-tiles`}>
      <div className="flex flex-col gap-2">
        <CardTile
          badges={["New"]}
          description="A short description"
          icon={<FileText className={ICON_CLASS} />}
          presentation="catalog"
          title="Catalog"
          onClick={() => {
            /* The tile is shown for appearance only. */
          }}
        />
        <CardTile
          description="Featured surface"
          icon={<FileText className={ICON_CLASS} />}
          presentation="featured"
          title="Featured"
        />
        <CardTile
          disabled
          description="Disabled"
          icon={<FileText className={ICON_CLASS} />}
          title="Disabled"
        />
      </div>
    </Frame>
    <Frame label="Suggestion and document" testId={`${prefix}-others`}>
      <div className="flex flex-col gap-2">
        <SuggestionCard
          description="Illustrated description"
          icon={<Sparkles />}
          keyboardShortcut="⌘K"
          label="Suggestion"
          variant="illustrated"
        />
        <DocumentCard title="Document title">
          <p className="px-4 pb-4 text-sm">Content.</p>
        </DocumentCard>
        <ContentReferenceCard title="Reference">Content.</ContentReferenceCard>
        <CommentCard
          authorLabel="Author name"
          body={<div className="px-3 pb-2 text-sm">Comment body.</div>}
        />
      </div>
    </Frame>
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

const CardGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Card</h1>
      <AppearanceControl id="card-appearance" />
    </header>
    <PresentationExamples />
    <InteractiveExamples />
    <SlotExamples />
    <SuggestionExamples />
    <DocumentExamples />
    <CommentExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { CardGalleryExample };
