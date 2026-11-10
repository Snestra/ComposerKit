"use client";

import type { NavigationRailOutput } from "@workspace/react/components/navigation-rail/output-chips";
import {
  NavigationRail,
  NavigationRailCard,
  NavigationRailMarker,
  NavigationRailPreview,
} from "@workspace/react/components/ui/navigation-rail";
import type { NavigationRailItem } from "@workspace/react/components/ui/navigation-rail";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ITEM_COUNT = 30;
const BOOKMARKED_EVERY = 7;
const LOADING_INDEX = 2;
const UNAVAILABLE_INDEX = 3;
const EMPTY_INDEX = 4;
const HEARTBEAT_INDEX = 5;
const HEARTBEAT_LOADING_INDEX = 6;
const OUTPUTS_INDEX = 7;
const CODE_INDEX = 8;

const allOutputs: readonly NavigationRailOutput[] = [
  { label: "example-app", type: "app" },
  { label: "a1b2c3d", type: "commit" },
  { label: "report.pdf", type: "file" },
  { label: "Quarterly figures", type: "google-drive" },
  { label: null, type: "image" },
  { label: null, type: "pull-request" },
  { label: null, type: "review" },
  { label: null, type: "website" },
];

const fileOutputs: readonly NavigationRailOutput[] = [
  "main.ts",
  "view.tsx",
  "script.py",
  "notes.md",
  "data.json",
  "photo.png",
  "build/",
  "archive.zip",
  "Makefile",
  "unknown.zzz",
].map((label) => ({ label, type: "file" }));

const buildItems = (): NavigationRailItem[] =>
  Array.from({ length: ITEM_COUNT }, (_, index) => {
    const position = index + 1;
    let previewState: NavigationRailItem["previewState"] = "loaded";

    if (index === LOADING_INDEX || index === HEARTBEAT_LOADING_INDEX) {
      previewState = "loading";
    } else if (index === UNAVAILABLE_INDEX) {
      previewState = "unavailable";
    }

    let response = `Response **${position}** [main.ts](https://example.com) \`notes.md\` ![photo.png](https://example.com/photo.png)`;

    if (index === OUTPUTS_INDEX) {
      response =
        "| main.ts | notes.md |\n| --- | --- |\n| report.pdf | photo.png |";
    } else if (index === CODE_INDEX) {
      response = "```ts\nconst position = 9;\n```";
    }

    return {
      bookmarkId: `bookmark-${position}`,
      id: `message-${position}`,
      isBookmarked: index % BOOKMARKED_EVERY === 0,
      isHeartbeat:
        index === HEARTBEAT_INDEX || index === HEARTBEAT_LOADING_INDEX,
      label: index === EMPTY_INDEX ? "" : `User message ${position}`,
      outputs: index === OUTPUTS_INDEX ? allOutputs : undefined,
      previewState,
      response,
    };
  });

const exampleItems = buildItems();

const noop = (): void => undefined;

const Section = ({ children, name }: { children: ReactNode; name: string }) => (
  <section aria-label={name} className="flex flex-col gap-3">
    <h2 className="font-mono text-sm">{name}</h2>
    {children}
  </section>
);

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const MarkerSizeColumn = ({ progress }: { progress: number }) => {
  const style: CustomStyle = {
    "--ck-nav-audio-level": String(progress),
  };

  return (
    <div className="flex flex-col gap-3" style={style}>
      <span className="font-mono text-xs">progress {progress}</span>
      <NavigationRailMarker />
      <NavigationRailMarker bookmarked />
      {([1, 2, 3] as const).map((level) => (
        <NavigationRailMarker hierarchyLevel={level} key={level} />
      ))}
      {([1, 2, 3] as const).map((level) => (
        <NavigationRailMarker
          bookmarked
          hierarchyLevel={level}
          key={`bookmarked-${level}`}
        />
      ))}
    </div>
  );
};

const MarkerSizes = () => (
  <div className="flex flex-wrap gap-8 text-text">
    <MarkerSizeColumn progress={0} />
    <MarkerSizeColumn progress={1} />
  </div>
);

interface ColorRow {
  bookmarked?: boolean;
  current?: boolean;
  name: string;
  neighborDistance?: number;
  scrubTarget?: boolean;
}

const restingRows: readonly ColorRow[] = [
  { name: "inactive" },
  { bookmarked: true, name: "inactive, bookmarked" },
  { current: true, name: "aria-current" },
  { bookmarked: true, current: true, name: "aria-current, bookmarked" },
];

const scrubbingRows: readonly ColorRow[] = [
  { current: true, name: "aria-current" },
  { name: "data-ck-scrub-target", scrubTarget: true },
  { name: "neighbour distance 1", neighborDistance: 1 },
  { name: "neighbour distance 2", neighborDistance: 2 },
  { name: "neighbour distance 3", neighborDistance: 3 },
];

const ColorList = ({
  name,
  rows,
  scrubbing,
}: {
  name: string;
  rows: readonly ColorRow[];
  scrubbing: boolean;
}) => (
  <fieldset
    aria-label={name}
    className="m-0 flex w-fit min-w-0 flex-col border-0 p-0 text-text"
    data-ck-floating-navigation-rail-list
    data-scrubbing={scrubbing ? true : undefined}
  >
    {rows.map((row) => (
      <div className="flex items-center gap-4" key={row.name}>
        <button
          aria-current={row.current === true ? "true" : undefined}
          aria-label={row.name}
          className="flex h-5 w-9 shrink-0 items-center outline-none"
          data-ck-scrub-target={row.scrubTarget === true ? true : undefined}
          type="button"
        >
          <NavigationRailMarker
            bookmarked={row.bookmarked}
            neighborDistance={row.neighborDistance}
          />
        </button>
        <span className="font-mono text-xs">{row.name}</span>
      </div>
    ))}
  </fieldset>
);

const MarkerColors = () => (
  <div className="flex flex-wrap gap-8">
    <ColorList name="resting" rows={restingRows} scrubbing={false} />
    <ColorList name="data-scrubbing" rows={scrubbingRows} scrubbing />
  </div>
);

const PreviewStates = () => {
  const [bookmarked, setBookmarked] = useState(false);

  const states = [
    { item: { ...exampleItems[0], isBookmarked: bookmarked }, name: "loaded" },
    { item: exampleItems[LOADING_INDEX], name: "loading" },
    { item: exampleItems[UNAVAILABLE_INDEX], name: "unavailable" },
    { item: exampleItems[EMPTY_INDEX], name: "empty" },
    { item: exampleItems[HEARTBEAT_INDEX], name: "heartbeat, loaded" },
    { item: exampleItems[HEARTBEAT_LOADING_INDEX], name: "heartbeat, loading" },
    {
      item: { ...exampleItems[0], outputs: allOutputs.slice(0, 1) },
      name: "outputs: 1",
    },
    {
      item: { ...exampleItems[0], outputs: allOutputs.slice(0, 2) },
      name: "outputs: 2",
    },
    {
      item: { ...exampleItems[OUTPUTS_INDEX], outputs: allOutputs.slice(0, 5) },
      name: "outputs: 5 (+3)",
    },
    {
      item: { ...exampleItems[0], outputs: allOutputs.slice(5) },
      name: "outputs: fallback labels (+1)",
    },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {states.map(({ item, name }) => (
        <div className="flex flex-col gap-2" key={name}>
          <span className="font-mono text-xs">{name}</span>
          <NavigationRailPreview
            item={item}
            onBookmarkChange={(_, next) => {
              setBookmarked(next);
            }}
          />
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs">NavigationRailCard</span>
        <NavigationRailCard>User message 1</NavigationRailCard>
      </div>
    </div>
  );
};

const FileOutputIcons = () => (
  <div className="flex flex-wrap gap-4">
    {fileOutputs.map((output) => (
      <div className="flex flex-col gap-2" key={output.label}>
        <span className="font-mono text-xs">{output.label}</span>
        <NavigationRailPreview
          item={{
            ...exampleItems[0],
            label: output.label ?? "",
            outputs: [output],
          }}
          onBookmarkChange={undefined}
        />
      </div>
    ))}
  </div>
);

const PLACEMENT_ITEMS = exampleItems.slice(0, 6);

const PlacementFrame = ({
  electron,
  name,
}: {
  electron: boolean;
  name: string;
}) => (
  <div
    className="flex flex-col gap-2"
    data-ui-window-kind={electron ? "electron" : undefined}
    data-testid={`placement-${electron ? "electron" : "default"}`}
  >
    <span className="font-mono text-xs">{name}</span>
    <div className="relative h-48 w-64 overflow-hidden rounded-xl border border-border">
      <NavigationRail items={PLACEMENT_ITEMS} onNavigate={noop} />
    </div>
  </div>
);

const RailPlacement = () => (
  <div className="flex flex-wrap gap-8">
    <PlacementFrame electron={false} name="default: left-3 (12px)" />
    <PlacementFrame
      electron
      name="data-ui-window-kind=electron: left-4 (16px)"
    />
  </div>
);

const RailInThread = () => {
  const [active, setActive] = useState<ReadonlySet<string>>(
    new Set([exampleItems.at(-1)?.id ?? ""])
  );

  const [bookmarks, setBookmarks] = useState<ReadonlySet<string>>(
    new Set(
      exampleItems
        .filter((item) => item.isBookmarked === true)
        .map((item) => item.id)
    )
  );

  const [requested, setRequested] = useState<readonly string[]>([]);
  const [navigated, setNavigated] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  const railItems = exampleItems.map((item) => ({
    ...item,
    isBookmarked: bookmarks.has(item.id),
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-96 overflow-hidden rounded-xl border border-border">
        <div className="h-full overflow-y-auto py-4 ps-24 pe-4" ref={threadRef}>
          {exampleItems.map((item) => (
            <p
              className="py-6"
              data-content-search-unit-key={item.id}
              key={item.id}
            >
              {item.label || "(No content)"}
            </p>
          ))}
        </div>
        <NavigationRail
          activeItemIds={active}
          items={railItems}
          onBookmarkChange={(item, next) => {
            setBookmarks((current) => {
              const copy = new Set(current);

              if (next) {
                copy.add(item.id);
              } else {
                copy.delete(item.id);
              }

              return copy;
            });
          }}
          onNavigate={(item, behavior) => {
            setActive(new Set([item.id]));
            setNavigated(`${item.id} ${behavior}`);

            threadRef.current
              ?.querySelector(`[data-content-search-unit-key="${item.id}"]`)
              ?.scrollIntoView({ behavior, block: "start" });
          }}
          onPreviewItem={(item) => {
            setRequested((current) => [...current, item.id]);

            return true;
          }}
        />
      </div>
      <p className="font-mono text-xs" data-testid="navigated">
        onNavigate: {navigated}
      </p>
      <p className="font-mono text-xs">onPreviewItem: {requested.join(" ")}</p>
    </div>
  );
};

const RoomCheck = () => {
  const [room, setRoom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const getScrollElement = useCallback(() => scrollRef.current, []);

  return (
    <div className="flex flex-col gap-2">
      <button
        aria-pressed={room}
        className="w-fit rounded-md border border-border px-2 py-1 font-mono text-sm"
        type="button"
        onClick={() => {
          setRoom(!room);
        }}
      >
        hasRoomForRail
      </button>
      <div className="relative h-72 rounded-xl border border-border">
        <div className="h-full overflow-y-auto" ref={scrollRef}>
          <div
            className={room ? "ms-16 py-4" : "ms-0 py-4"}
            data-user-message-navigation-content
          >
            {exampleItems.map((item) => (
              <p className="py-6" key={item.id}>
                {item.label || "(No content)"}
              </p>
            ))}
          </div>
        </div>
        <NavigationRail
          getScrollElement={getScrollElement}
          items={exampleItems}
          onNavigate={noop}
        />
      </div>
    </div>
  );
};

const NavigationRailGalleryExample = () => (
  <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
    <header className="flex items-center gap-4">
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">sidebar</h1>
    </header>
    <Section name="sidebar-rail-container">
      <RailInThread />
    </Section>
    <Section name="sidebar-marker-size">
      <MarkerSizes />
    </Section>
    <Section name="sidebar-marker-colors">
      <MarkerColors />
    </Section>
    <Section name="sidebar-rail-placement">
      <RailPlacement />
    </Section>
    <Section name="sidebar-popover-card">
      <PreviewStates />
    </Section>
    <Section name="sidebar-preview-file-icons">
      <FileOutputIcons />
    </Section>
    <Section name="sidebar-rail-room-check">
      <RoomCheck />
    </Section>
  </main>
);

export { NavigationRailGalleryExample };
