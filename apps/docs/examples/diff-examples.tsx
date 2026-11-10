"use client";

import { Button } from "@workspace/react/components/ui/button";
import {
  CodeDiff,
  DiffActionButton,
  DiffPagePreview,
  DiffPreviewTooltip,
  DiffStats,
  DiffView,
  InlineFileDiffReview,
  createFileDiff,
  parseUnifiedPatch,
  toCodeDiffData,
} from "@workspace/react/components/ui/diff";
import type {
  AnnotationSide,
  CodeDiffData,
  CodeThemeName,
  DiffFile,
  DiffLineAnnotation,
  DiffOpenTargets,
  FileDiffMetadata,
  InlineReviewAction,
  SelectedLineRange,
} from "@workspace/react/components/ui/diff";
import type { MenuContextItem } from "@workspace/react/components/ui/menu";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

/* ------------------------------------------------------------------ */
/* Example data (neutral sample code)                                  */
/* ------------------------------------------------------------------ */

const LINE_COUNT = 60;

const baseLines = Array.from(
  { length: LINE_COUNT },
  (_, index) => `const value${index + 1} = compute(${index + 1});`
);

const changedLines = [...baseLines];

changedLines[4] = "const value5 = compute(5, { cache: true });";

changedLines.splice(29, 1);

changedLines[29] = "const value31 = recompute(31);";

changedLines.splice(52, 0, "const inserted = value52 + value53;");

const oldFile: DiffFile = {
  contents: `${baseLines.join("\n")}\n`,
  name: "src/example.ts",
};

const newFile: DiffFile = {
  contents: `${changedLines.join("\n")}\n`,
  name: "src/example.ts",
};

const unchangedLines = ["first line", "second line", "third line"];

const smallOld: DiffFile = {
  contents: `${unchangedLines.join("\n")}\n`,
  name: "notes.txt",
};

const smallNew: DiffFile = {
  contents: `${["first line", "second line, edited", "third line", "fourth line"].join("\n")}\n`,
  name: "notes.txt",
};

const oneLineOld: DiffFile = {
  contents: "const size = 12;\n",
  name: "size.ts",
};

const oneLineNew: DiffFile = {
  contents: "const size = 13;\n",
  name: "size.ts",
};

const noNewlineOld: DiffFile = {
  contents: "alpha\nbeta",
  name: "no-newline.txt",
};

const noNewlineNew: DiffFile = {
  contents: "alpha\nbeta changed",
  name: "no-newline.txt",
};

const wordOld: DiffFile = {
  contents:
    "const total = items.reduce((sum, item) => sum + item.price, 0);\nreturn total;\n",
  name: "word.ts",
};

const wordNew: DiffFile = {
  contents:
    "const total = items.reduce((sum, item) => sum + item.price * item.count, 0);\nreturn total.toFixed(2);\n",
  name: "word.ts",
};

const toPatch = (diff: FileDiffMetadata) => {
  const lines = [`--- a/${diff.prevName ?? diff.name}`, `+++ b/${diff.name}`];

  for (const hunk of diff.hunks) {
    lines.push(hunk.hunkSpecs ?? "");

    for (const part of hunk.hunkContent) {
      if (part.type === "context") {
        for (let step = 0; step < part.lines; step += 1) {
          lines.push(
            ` ${(diff.additionLines[part.additionLineIndex + step] ?? "").replace(/\n$/u, "")}`
          );
        }
      } else {
        for (let step = 0; step < part.deletions; step += 1) {
          lines.push(
            `-${(diff.deletionLines[part.deletionLineIndex + step] ?? "").replace(/\n$/u, "")}`
          );
        }

        for (let step = 0; step < part.additions; step += 1) {
          lines.push(
            `+${(diff.additionLines[part.additionLineIndex + step] ?? "").replace(/\n$/u, "")}`
          );
        }
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const fullDiff = createFileDiff(oldFile, newFile);
const patchText = toPatch(fullDiff);

const makeDiff = (
  from: DiffFile | null,
  to: DiffFile | null,
  extra?: Partial<Pick<CodeDiffData, "isBinary">>
) => toCodeDiffData(createFileDiff(from, to), extra);

const makeRename = (): CodeDiffData =>
  toCodeDiffData(
    createFileDiff(
      { contents: smallOld.contents, name: "notes.txt" },
      { contents: smallOld.contents, name: "docs/notes-renamed.txt" }
    )
  );

/** Old file of 100 lines against a new file of 16,100 lines: 16,200 changed lines, over the 15,000 limit. */
const wideOld: DiffFile = {
  contents: `${Array.from({ length: 100 }, (_, index) => `old ${index}`).join("\n")}\n`,
  name: "generated.txt",
};

const wideNew: DiffFile = {
  contents: `${Array.from({ length: 16_100 }, (_, index) => `new ${index}`).join("\n")}\n`,
  name: "generated.txt",
};

const longPath =
  "packages/example-application/src/features/review/components/very-long-directory-name/file-with-a-long-name.tsx";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

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

const Choice = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) => (
  <div
    aria-label={label}
    className="flex flex-wrap items-center gap-1"
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a labelled group of toggle buttons; a fieldset would add the browser's border and padding to the demo controls.
    role="group"
  >
    <span className="me-1 text-xs text-muted-foreground">{label}</span>
    {options.map((option) => (
      <Button
        aria-pressed={value === option}
        color={value === option ? "secondary" : "outline"}
        key={option}
        onClick={() => {
          onChange(option);
        }}
        size="toolbar"
      >
        {option}
      </Button>
    ))}
  </div>
);

const Toggle = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) => (
  <Button
    aria-pressed={value}
    color={value ? "secondary" : "outline"}
    onClick={() => {
      onChange(!value);
    }}
    size="toolbar"
  >
    {label}
  </Button>
);

/* ------------------------------------------------------------------ */
/* View modes and appearance                                           */
/* ------------------------------------------------------------------ */

type DiffStyleChoice = "split" | "unified";

type IndicatorChoice = "bars" | "classic" | "none";

type OverflowChoice = "scroll" | "wrap";

type SeparatorChoice = "line-info" | "line-info-basic" | "metadata" | "simple";

type WordChoice = "char" | "none" | "word" | "word-alt";

type SyntaxChoice = "astro" | "svelte" | "typescript" | "vue";

const syntaxSamples: Record<Exclude<SyntaxChoice, "typescript">, DiffFile> = {
  astro: {
    contents: `---\nconst title = "Hello";\n---\n<h1>{title}</h1>\n<style>h1 { color: rebeccapurple; }</style>\n`,
    name: "src/Example.astro",
  },
  svelte: {
    contents: `<script>let count = 1;</script>\n<button>{count}</button>\n<style>button { color: green; }</style>\n`,
    name: "src/Example.svelte",
  },
  vue: {
    contents: `<script setup>const count = 1;</script>\n<template><strong>{{ count }}</strong></template>\n<style>strong { color: green; }</style>\n`,
    name: "src/Example.vue",
  },
};

const lightCodeThemeOptions = [
  "Developer Light",
  "github-light-default",
  "one-light",
  "solarized-light",
] as const satisfies readonly CodeThemeName[];

const darkCodeThemeOptions = [
  "Developer Dark",
  "ayu-dark",
  "dracula",
  "one-dark-pro",
] as const satisfies readonly CodeThemeName[];

const ViewModeExamples = () => {
  const [diffStyle, setDiffStyle] = useState<DiffStyleChoice>("split");
  const [indicators, setIndicators] = useState<IndicatorChoice>("bars");
  const [overflow, setOverflow] = useState<OverflowChoice>("scroll");
  const [separators, setSeparators] = useState<SeparatorChoice>("line-info");
  const [lineDiffType, setLineDiffType] = useState<WordChoice>("word-alt");
  const [expandUnchanged, setExpandUnchanged] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);

  const [syntaxLanguage, setSyntaxLanguage] =
    useState<SyntaxChoice>("typescript");

  const [lightCodeTheme, setLightCodeTheme] =
    useState<CodeThemeName>("Developer Light");

  const [darkCodeTheme, setDarkCodeTheme] =
    useState<CodeThemeName>("Developer Dark");

  const [themeType, setThemeType] = useState<
    "light" | "scope" | "system" | "dark"
  >("scope");

  const wordDiff = useMemo(() => createFileDiff(wordOld, wordNew), []);

  const configurableDiff = useMemo(() => {
    if (syntaxLanguage === "typescript") {
      return fullDiff;
    }

    const file = syntaxSamples[syntaxLanguage];

    return createFileDiff(file, {
      ...file,
      contents: file.contents
        .replaceAll("count", "total")
        .replace("Hello", "Welcome"),
    });
  }, [syntaxLanguage]);

  return (
    <Section
      description="Unified or split, indicator style, overflow, hunk separators, intra-line highlighting and the theme type. The defaults are the library's: bars, line-info separators, scroll and word-alt."
      id="view-modes"
      title="View modes"
    >
      <div className="flex flex-col gap-2">
        <Choice
          label="Style"
          onChange={setDiffStyle}
          options={["split", "unified"] as const}
          value={diffStyle}
        />
        <Choice
          label="Indicators"
          onChange={setIndicators}
          options={["bars", "classic", "none"] as const}
          value={indicators}
        />
        <Choice
          label="Overflow"
          onChange={setOverflow}
          options={["scroll", "wrap"] as const}
          value={overflow}
        />
        <Choice
          label="Separators"
          onChange={setSeparators}
          options={
            ["line-info", "line-info-basic", "metadata", "simple"] as const
          }
          value={separators}
        />
        <Choice
          label="Line diff"
          onChange={setLineDiffType}
          options={["word-alt", "word", "char", "none"] as const}
          value={lineDiffType}
        />
        <Choice
          label="Language"
          onChange={setSyntaxLanguage}
          options={["typescript", "vue", "svelte", "astro"] as const}
          value={syntaxLanguage}
        />
        <Choice
          label="Code themes light"
          onChange={setLightCodeTheme}
          options={lightCodeThemeOptions}
          value={lightCodeTheme}
        />
        <Choice
          label="Code themes dark"
          onChange={setDarkCodeTheme}
          options={darkCodeThemeOptions}
          value={darkCodeTheme}
        />
        <Choice
          label="Theme type"
          onChange={setThemeType}
          options={["scope", "light", "dark", "system"] as const}
          value={themeType}
        />
        <div className="flex flex-wrap gap-1">
          <Toggle
            label="Expand unchanged"
            onChange={setExpandUnchanged}
            value={expandUnchanged}
          />
          <Toggle
            label="Line numbers"
            onChange={setLineNumbers}
            value={lineNumbers}
          />
        </div>
      </div>
      <Frame label="Configurable diff" testId="diff-view-modes">
        <DiffView
          codeThemes={{ dark: darkCodeTheme, light: lightCodeTheme }}
          diffIndicators={indicators}
          diffStyle={diffStyle}
          disableLineNumbers={!lineNumbers}
          expandUnchanged={expandUnchanged}
          fileDiff={configurableDiff}
          hunkSeparators={separators}
          lineDiffType={lineDiffType === "none" ? "none" : lineDiffType}
          overflow={overflow}
          themeType={themeType === "scope" ? undefined : themeType}
        />
      </Frame>
      <Frame label="Word-level highlighting (word-alt)" testId="diff-word">
        <DiffView
          diffStyle="split"
          fileDiff={wordDiff}
          hunkSeparators="simple"
          lineDiffType="word-alt"
        />
      </Frame>
      <Frame
        label="Sizes: library default (12px, 1.8x) and a consumer's 13px with the roomy line height of a one-line hunk"
        testId="diff-typography"
      >
        <div className="flex flex-col gap-2">
          <DiffView
            diffStyle="unified"
            fileDiff={createFileDiff(oneLineOld, oneLineNew)}
            hunkSeparators="simple"
          />
          <DiffView
            className="[--diffs-font-size:13px] [--diffs-line-height:max(--spacing(8),calc(var(--diffs-font-size)*1.8))]"
            diffStyle="unified"
            fileDiff={createFileDiff(oneLineOld, oneLineNew)}
            hunkSeparators="simple"
          />
        </div>
      </Frame>
      <Frame label="No newline at end of file" testId="diff-no-newline">
        <DiffView
          diffStyle="unified"
          fileDiff={createFileDiff(noNewlineOld, noNewlineNew)}
          hunkSeparators="simple"
        />
      </Frame>
      <Frame
        label="Split with an added and a deleted file"
        testId="diff-new-deleted"
      >
        <div className="flex flex-col gap-2">
          <DiffView
            diffStyle="split"
            fileDiff={parseUnifiedPatch(
              `diff --git a/notes.txt b/notes.txt\nnew file mode 100644\n--- /dev/null\n+++ b/notes.txt\n@@ -0,0 +1,4 @@\n+first line\n+second line, edited\n+third line\n+fourth line\n`
            )}
            hunkSeparators="simple"
          />
          <DiffView
            diffStyle="split"
            fileDiff={parseUnifiedPatch(
              `diff --git a/notes.txt b/notes.txt\ndeleted file mode 100644\n--- a/notes.txt\n+++ /dev/null\n@@ -1,3 +0,0 @@\n-first line\n-second line\n-third line\n`
            )}
            hunkSeparators="simple"
          />
        </div>
      </Frame>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Context expansion                                                   */
/* ------------------------------------------------------------------ */

const LOAD_DELAY_MS = 1500;

const wait = async (ms: number) => {
  // oxlint-disable-next-line promise/avoid-new -- setTimeout has no promise form; the demo loaders wait on it to show the loading state.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const ContextExamples = () => {
  const [open, setOpen] = useState(true);
  const [failOnce, setFailOnce] = useState(true);
  const attempts = useRef(0);

  const partialDiff = useMemo(
    () => toCodeDiffData(parseUnifiedPatch(patchText, "src/example.ts")),
    []
  );

  const successLoader = useMemo(
    () => async () => {
      await wait(LOAD_DELAY_MS);

      return { newFile, oldFile };
    },
    []
  );

  const failingLoader = useMemo(
    () => async () => {
      await wait(LOAD_DELAY_MS);
      attempts.current += 1;

      if (failOnce && attempts.current < 2) {
        throw new Error("Could not load");
      }

      return { newFile, oldFile };
    },
    [failOnce]
  );

  const [failKey, setFailKey] = useState(0);

  return (
    <Section
      description="Collapsed unchanged lines have expander buttons: up, down, both and expand all (chunked above 20 lines in a code diff, 100 in a bare view). Shift-click expands everything. The partial diffs below load their files first; the loader takes 1.5 seconds, so the spinner and the loading label show."
      id="context"
      title="Context expansion"
    >
      <Frame
        label="Full diff, bare view (100 line chunks)"
        testId="diff-context-full"
      >
        <DiffView diffStyle="unified" fileDiff={fullDiff} />
      </Frame>
      <Frame
        label="Partial diff, loader succeeds after 1.5s"
        testId="diff-context-partial"
      >
        <TooltipProvider>
          <CodeDiff
            diff={partialDiff}
            hunkSeparators="line-info"
            loadDiffFiles={successLoader}
            onOpenChange={setOpen}
            open={open}
            viewType="unified"
          />
        </TooltipProvider>
      </Frame>
      <Frame
        label="Partial diff, first load fails, retry works"
        testId="diff-context-error"
      >
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              attempts.current = 0;
              setFailOnce(true);
              setFailKey((key) => key + 1);
            }}
            size="toolbar"
          >
            Reset loader
          </Button>
          <TooltipProvider>
            <CodeDiff
              diff={partialDiff}
              hunkSeparators="line-info"
              key={failKey}
              loadDiffFiles={failingLoader}
              onOpenChange={() => {
                /* empty */
              }}
              open
              viewType="unified"
            />
          </TooltipProvider>
        </div>
      </Frame>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* File header and actions                                             */
/* ------------------------------------------------------------------ */

const HeaderExamples = () => {
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(false);
  const [openC, setOpenC] = useState(true);
  const [openD, setOpenD] = useState(true);
  const [log, setLog] = useState("No action yet");

  const renamed = useMemo(
    () =>
      toCodeDiffData(
        createFileDiff(
          { contents: smallOld.contents, name: "src/old-name.txt" },
          { contents: smallNew.contents, name: "src/new-name.txt" }
        )
      ),
    []
  );

  const small = useMemo(() => makeDiff(smallOld, smallNew), []);
  const full = useMemo(() => toCodeDiffData(fullDiff), []);

  return (
    <Section
      description="The header toggles the file body (the chevron button has the label 'Toggle file diff'); Alt-click toggles every diff in the same scope. The trailing group shows the line counts, the file actions on hover, the open button and the toggle. The long path truncates and shows a tooltip after 200ms when it overflows. The full-review header adds a file actions menu."
      id="header"
      title="File header"
    >
      <p className="text-sm" data-testid="diff-log">
        {log}
      </p>
      <Frame
        label="Default header, scope 'gallery' (Alt-click toggles A and B together)"
        testId="diff-header-default"
      >
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <CodeDiff
              canOpenFile
              diff={small}
              expandScope="gallery"
              onHunkAction={(event) => {
                setLog(JSON.stringify(event));
              }}
              onOpenChange={setOpenA}
              onOpenInEditor={(line) => {
                setLog(`open in editor at line ${line}`);
              }}
              open={openA}
              showFileActions
              showHunkActions
              viewType="unified"
              workspaceRelativePath="notes.txt"
            />
            <CodeDiff
              diff={renamed}
              expandScope="gallery"
              onOpenChange={setOpenB}
              open={openB}
              viewType="unified"
            />
          </TooltipProvider>
        </div>
      </Frame>
      <Frame
        label="Narrow container with a long path"
        testId="diff-header-narrow"
      >
        <div className="w-72 max-w-full">
          <TooltipProvider>
            <CodeDiff
              canOpenFile
              diff={toCodeDiffData(
                createFileDiff(
                  { contents: smallOld.contents, name: longPath },
                  { contents: smallNew.contents, name: longPath }
                )
              )}
              onOpenChange={setOpenC}
              open={openC}
              viewType="unified"
              workspaceRelativePath={longPath}
            />
          </TooltipProvider>
        </div>
      </Frame>
      <Frame
        label="Full-review header with the actions menu and hunk actions"
        testId="diff-header-review"
      >
        <TooltipProvider>
          <CodeDiff
            canOpenFile
            diff={full}
            headerOpenAction={{
              ariaLabel: "Open file",
              onClick: (line) => {
                setLog(`header open action ${line ?? ""}`);
              },
            }}
            headerVariant="full-review"
            hunkSeparators="line-info"
            onCopyPath={(path) => {
              setLog(`copy path ${path}`);
            }}
            onDeleteFile={() => {
              setLog("delete file");
            }}
            onHunkAction={(event) => {
              setLog(JSON.stringify(event));
            }}
            onOpenChange={setOpenD}
            onOpenInEditor={(line) => {
              setLog(`open in editor at line ${line}`);
            }}
            open={openD}
            showFileActions
            showHunkActions
            viewType="auto"
            workspaceRelativePath="src/example.ts"
          />
        </TooltipProvider>
      </Frame>
      <Frame
        label="Action buttons: file, hunk and section scopes"
        testId="diff-actions"
      >
        <TooltipProvider>
          <div className="flex flex-col gap-2">
            {(["file", "hunk", "section"] as const).map((scope) => (
              <div className="flex items-center gap-1" key={scope}>
                <span className="w-16 text-xs text-muted-foreground">
                  {scope}
                </span>
                {(["revert", "stage", "unstage"] as const).map((action) => (
                  <DiffActionButton
                    action={action}
                    key={action}
                    onClick={() => {
                      setLog(`${scope} ${action}`);
                    }}
                    scope={scope}
                  />
                ))}
                <DiffActionButton action="stage" disabled scope={scope} />
              </div>
            ))}
            <DiffStats linesAdded={12} linesRemoved={3} />
            <DiffStats linesAdded={12} linesRemoved={3} variant="monochrome" />
          </div>
        </TooltipProvider>
      </Frame>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Annotations, hover and selection                                    */
/* ------------------------------------------------------------------ */

type SideChoice = "additions" | "both" | "deletions";

type HoverChoice = "both" | "disabled" | "line" | "number";

const rangeText = (range: SelectedLineRange | null) =>
  range === null
    ? "none"
    : `${range.side ?? "-"}:${range.start}..${range.endSide ?? range.side ?? "-"}:${range.end}`;

const SelectionFrame = ({
  controlled,
  diffStyle,
  lineHoverHighlight,
  lineNumberOnly,
  note,
  side,
}: {
  controlled: boolean;
  diffStyle: "split" | "unified";
  lineHoverHighlight: HoverChoice;
  lineNumberOnly: boolean;
  note: (message: string) => void;
  side: SideChoice;
}) => {
  const [selected, setSelected] = useState<SelectedLineRange | null>(null);
  const [log, setLog] = useState("No line interaction yet");

  const annotations: DiffLineAnnotation<string>[] = [
    { lineNumber: 5, metadata: "Added line comment", side: "additions" },
    { lineNumber: 30, metadata: "Deleted line comment", side: "deletions" },
  ];

  const tag = `${controlled ? "controlled" : "free"} ${diffStyle}`;

  return (
    <Frame
      label={`${diffStyle}, ${controlled ? "selectedLines prop" : "no selectedLines prop"}`}
      testId={`diff-interaction-${controlled ? "" : "free-"}${diffStyle}`}
    >
      <div className="flex flex-col gap-2">
        <p
          className="text-xs"
          data-testid={`diff-interaction-${controlled ? "" : "free-"}${diffStyle}-log`}
        >
          {log}
        </p>
        {controlled ? (
          <div className="flex flex-wrap gap-1">
            <Button
              onClick={() => {
                setSelected({ end: 8, side: "additions", start: 5 });
              }}
              size="toolbar"
            >
              Select additions 5-8
            </Button>
            <Button
              onClick={() => {
                setSelected({
                  end: 33,
                  endSide: "additions",
                  side: "deletions",
                  start: 28,
                });
              }}
              size="toolbar"
            >
              Select across sides
            </Button>
            <Button
              onClick={() => {
                setSelected(null);
              }}
              size="toolbar"
            >
              Clear
            </Button>
          </div>
        ) : null}
        <DiffView<string>
          diffStyle={diffStyle}
          enableGutterUtility
          enableLineSelection
          expandUnchanged={false}
          fileDiff={fullDiff}
          hunkSeparators="simple"
          lineAnnotations={annotations}
          lineHoverHighlight={lineHoverHighlight}
          onGutterUtilityClick={(range) => {
            setLog(`gutter button ${rangeText(range)}`);
            note(`${tag} gutter-utility ${rangeText(range)}`);
          }}
          onLineClick={(props) => {
            setLog(`line click ${props.annotationSide} ${props.lineNumber}`);
          }}
          onLineNumberClick={(props) => {
            setLog(`number click ${props.annotationSide} ${props.lineNumber}`);
          }}
          onLineSelected={(range) => {
            setSelected(range);
            setLog(`selected ${rangeText(range)}`);
            note(`${tag} committed ${rangeText(range)}`);
          }}
          onLineSelectionChange={(range) => {
            setSelected(range);
            note(`${tag} change ${rangeText(range)}`);
          }}
          onLineSelectionEnd={(range) => {
            note(`${tag} end ${rangeText(range)}`);
          }}
          onLineSelectionStart={(range) => {
            note(`${tag} start ${rangeText(range)}`);
          }}
          renderAnnotation={(annotation) => (
            <div className="px-3 py-2 font-sans text-sm">
              {annotation.metadata}
            </div>
          )}
          selectedLines={controlled ? selected : undefined}
          selectedLinesOptions={{
            activeLineSide:
              side === "both" ? undefined : (side satisfies AnnotationSide),
            lineNumberOnly,
          }}
        />
      </div>
    </Frame>
  );
};

const InteractionExamples = () => {
  const [events, setEvents] = useState<string[]>([]);
  const [hoverMode, setHoverMode] = useState<HoverChoice>("both");
  const [lineNumberOnly, setLineNumberOnly] = useState(false);
  const [side, setSide] = useState<SideChoice>("both");

  const note = (message: string) => {
    setEvents((previous) => [...previous.slice(-39), message]);
  };

  return (
    <Section
      description="Hover highlights a line and shows the gutter button. A press on a line number starts a selection and a drag over line numbers or line text extends it; Shift-press extends the selected range; pressing the only selected line and releasing unselects it; a drag from the gutter button selects and calls onGutterUtilityClick. A touch press first shows the button on the pressed number. selectedLinesOptions sets the highlighted column and number-only highlighting."
      id="interaction"
      title="Annotations, hover and selection"
    >
      <div className="flex flex-col gap-2">
        <Choice
          label="Hover highlight"
          onChange={setHoverMode}
          options={["both", "line", "number", "disabled"] as const}
          value={hoverMode}
        />
        <Choice
          label="Highlight column (selectedLinesOptions.activeLineSide)"
          onChange={setSide}
          options={["both", "additions", "deletions"] as const}
          value={side}
        />
        <div className="flex flex-wrap gap-1">
          <Toggle
            label="Line numbers only (selectedLinesOptions.lineNumberOnly)"
            onChange={setLineNumberOnly}
            value={lineNumberOnly}
          />
        </div>
      </div>
      {(["unified", "split"] as const).map((style) => (
        <SelectionFrame
          controlled
          diffStyle={style}
          key={style}
          lineHoverHighlight={hoverMode}
          lineNumberOnly={lineNumberOnly}
          note={note}
          side={side}
        />
      ))}
      <SelectionFrame
        controlled={false}
        diffStyle="split"
        lineHoverHighlight={hoverMode}
        lineNumberOnly={lineNumberOnly}
        note={note}
        side={side}
      />
      <pre
        className="max-h-48 overflow-auto rounded-lg border p-2 text-xs"
        data-testid="diff-selection-events"
      >
        {events.join("\n")}
      </pre>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Large files                                                         */
/* ------------------------------------------------------------------ */

const LARGE_LINES = 50_000;
const EDIT_EVERY = 20;

interface LargeFiles {
  next: DiffFile;
  previous: DiffFile;
}

/** 50,000 lines with every 20th line rewritten: 2,500 changed lines, 5,000 edits. */
const makeLargeFiles = (): LargeFiles => {
  const lines = Array.from(
    { length: LARGE_LINES },
    (_, index) => `line ${index} of a generated module`
  );

  const edited = [...lines];

  for (let index = 0; index < LARGE_LINES; index += EDIT_EVERY) {
    edited[index] = `line ${index} was rewritten`;
  }

  return {
    next: { contents: `${edited.join("\n")}\n`, name: "generated/large.txt" },
    previous: {
      contents: `${lines.join("\n")}\n`,
      name: "generated/large.txt",
    },
  };
};

interface LargeResult {
  additions: number;
  deletions: number;
  diff: CodeDiffData;
  hunks: number;
  label: string;
  milliseconds: number;
  oldLines: number;
}

const LargeFileExamples = () => {
  const [open, setOpen] = useState(false);
  const [selectable, setSelectable] = useState(false);
  const [result, setResult] = useState<LargeResult | null>(null);

  const run = (label: string, previous: DiffFile, next: DiffFile) => {
    const started = performance.now();
    const metadata = createFileDiff(previous, next);
    const milliseconds = performance.now() - started;
    const diff = toCodeDiffData(metadata);

    setResult({
      additions: diff.additions,
      deletions: diff.deletions,
      diff,
      hunks: metadata.hunks.length,
      label,
      milliseconds,
      oldLines: metadata.deletionLines.length,
    });
  };

  return (
    <Section
      description="The line diff has no edit-distance cap (a cap of 4,000 edits would show the first example as one replaced block of 50,000 lines, over the limit): the Myers search runs to the shortest edit script, as the source's diff library does when it is given no maxEditLength or timeout. The panel limits are the source's own: over 15,000 changed lines, 3,145,728 changed characters or a changed line over 1,048,576 characters show 'This file is too large to display here.', and over 2,000 changed lines the word-level highlight is off."
      id="large-files"
      title="Large files"
    >
      <div className="flex flex-wrap gap-1">
        <Button
          onClick={() => {
            const { next, previous } = makeLargeFiles();

            run("50,000 lines, every 20th line rewritten", previous, next);
          }}
          size="toolbar"
        >
          Diff 50,000 lines with 5,000 edits
        </Button>
        <Button
          onClick={() => {
            run("100 lines against 16,100 lines", wideOld, wideNew);
          }}
          size="toolbar"
        >
          Diff over the 15,000-line limit
        </Button>
      </div>
      {result === null ? (
        <p className="text-sm text-muted-foreground">No large diff yet</p>
      ) : (
        <>
          <p className="text-sm" data-testid="diff-large-stats">
            {`${result.label}: +${result.additions} -${result.deletions}, ${result.hunks} hunk(s), ${Math.round(result.milliseconds)} ms`}
          </p>
          <Frame label={result.label} testId="diff-large">
            <TooltipProvider>
              <CodeDiff
                canOpenFile
                diff={result.diff}
                onOpenChange={setOpen}
                open={open}
                viewType="unified"
                workspaceRelativePath="generated/large.txt"
              />
            </TooltipProvider>
          </Frame>
          <Toggle
            label="Line selection on this diff"
            onChange={setSelectable}
            value={selectable}
          />
          {selectable ? (
            <Frame
              label="The same diff with line selection"
              testId="diff-large-selectable"
            >
              <DiffView
                diffStyle="unified"
                enableLineSelection
                fileDiff={result.diff.metadata}
                hunkSeparators="simple"
              />
            </Frame>
          ) : null}
        </>
      )}
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Context menu                                                        */
/* ------------------------------------------------------------------ */

interface BridgeCall {
  point: { x: number; y: number };
  template: unknown;
}

const openTargets: DiffOpenTargets = {
  availableTargets: ["vscode", "fileManager"],
  mode: "editor",
  preferredTarget: "vscode",
  targets: [
    {
      appPath: null,
      id: "vscode-id",
      kind: "editor",
      label: "VS Code",
      target: "vscode",
    },
    {
      appPath: null,
      hidden: true,
      id: "files-id",
      kind: "native",
      label: "File manager",
      target: "fileManager",
    },
    {
      appPath: null,
      id: "absent-id",
      kind: "editor",
      label: "Not installed",
      target: "absent",
    },
  ],
};

const ContextMenuExamples = () => {
  const [installed, setInstalled] = useState(false);
  const [answer, setAnswer] = useState("open-primary");
  const [calls, setCalls] = useState<BridgeCall[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const answerRef = useRef(answer);
  const small = useMemo(() => makeDiff(smallOld, smallNew), []);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(
    () => () => {
      delete window.electronBridge;
    },
    []
  );

  const note = (message: string) => {
    setLog((previous) => [...previous.slice(-39), message]);
  };

  // The desktop shell has the bridge before the page renders, so the stub is installed in the
  // handler, ahead of the re-render that reads it.
  const install = (on: boolean) => {
    if (on) {
      window.electronBridge = {
        showContextMenu: async (template, point) => {
          setCalls((previous) => [...previous, { point, template }]);
          // oxlint-disable-next-line promise/avoid-new -- The stub answers after a short delay, as the operating system does once the user chooses.
          await new Promise((resolve) => {
            setTimeout(resolve, 300);
          });

          return answerRef.current === ""
            ? undefined
            : { id: answerRef.current };
        },
      };
    } else {
      delete window.electronBridge;
    }

    setInstalled(on);
  };

  const common = {
    canOpenFile: true,
    diff: small,
    githubFileLookup: async () => {
      await wait(150);

      return "https://github.com/example/project/blob/main/notes.txt";
    },
    loadNewTabIcon: async () => {
      await wait(50);

      return null;
    },
    loadOpenTargets: async () => {
      await wait(250);

      return openTargets;
    },
    onCopyPath: (path: string) => {
      note(`copy path ${path}`);
    },
    onOpenChange: setOpen,
    onOpenGitHub: (href: string) => {
      note(`open github ${href}`);
    },
    onOpenInNewTab: (line: number) => {
      note(`new tab at line ${line}`);
    },
    onOpenInTarget: (request: {
      appPath: string | undefined;
      line: number;
      openPath: string;
      persistPreferred: boolean;
      target: string;
    }) => {
      note(`open in ${JSON.stringify(request)}`);
    },
    onRequestChanges: (
      line: { lineNumber: number; side: AnnotationSide } | null
    ) => {
      note(`request changes ${JSON.stringify(line)}`);
    },
    onToggleWrap: () => {
      note("toggle wrap");
    },
    open,
    viewType: "unified" as const,
    workspaceRelativePath: "notes.txt",
  };

  const additional = (): MenuContextItem[] => [
    {
      id: "language-hover",
      message: { defaultMessage: "Go to definition", id: "gallery.language" },
      onSelect: () => {
        note("language item");
      },
    },
  ];

  return (
    <Section
      description="A right click, the ContextMenu key or Shift+F10 on a diff opens the menu: Request changes, Open in the preferred app, Open with (New tab and the apps), Open in GitHub, Copy selection (enabled with selected text), Copy path, Copy relative path and Toggle line wrap. With window.electronBridge the template goes to the shell and the operating system draws the menu; without it the in-page menu is used."
      id="context-menu"
      title="Context menu"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            checked={installed}
            id="diff-native-bridge"
            onChange={(event) => {
              install(event.target.checked);
            }}
            type="checkbox"
          />
          window.electronBridge stub
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          Stub answers
          <select
            className="rounded-md border bg-transparent px-1 py-0.5"
            id="diff-native-answer"
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
            value={answer}
          >
            {[
              ["open-primary", "Open in VS Code"],
              ["request-changes", "Request changes"],
              ["copy-path", "Copy path"],
              ["toggle-wrap", "Toggle line wrap"],
              ["open-in-github", "Open in GitHub"],
              ["", "Dismiss"],
            ].map(([id, label]) => (
              <option key={label} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Frame label="Context menu on a diff" testId="diff-context-menu">
        <TooltipProvider>
          <CodeDiff {...common} getAdditionalContextMenuItems={additional} />
        </TooltipProvider>
      </Frame>
      <Frame
        label="disableNativeContextMenu: always the in-page menu"
        testId="diff-context-menu-in-page"
      >
        <TooltipProvider>
          <CodeDiff
            {...common}
            disableNativeContextMenu
            headerOpenAction={{
              onClick: (line) => {
                note(`header open action at ${line ?? "start"}`);
              },
            }}
          />
        </TooltipProvider>
      </Frame>
      <pre
        className="max-h-48 overflow-auto rounded-lg border p-2 text-xs"
        data-testid="diff-native-calls"
      >
        {JSON.stringify(calls, null, 1)}
      </pre>
      <pre
        className="max-h-32 overflow-auto rounded-lg border p-2 text-xs"
        data-testid="diff-context-log"
      >
        {log.join("\n")}
      </pre>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* File-type icons                                                     */
/* ------------------------------------------------------------------ */

const iconPaths = [
  "src/app.ts",
  "src/App.tsx",
  "src/index.js",
  "src/component.jsx",
  "scripts/build.py",
  "src/lib.rs",
  "cmd/main.go",
  "README.md",
  "package.json",
  "Dockerfile",
  "styles/app.css",
  "styles/app.scss",
  "public/index.html",
  "scripts/deploy.sh",
  "data/export.csv",
  "assets/logo.svg",
  "assets/photo.png",
  "dist/archive.zip",
  "vite.config.ts",
  ".gitignore",
  "notes/unknown.xyz",
];

const FileIconExamples = () => {
  const [open, setOpen] = useState(false);

  const diffs = useMemo(
    () =>
      iconPaths.map((path) =>
        toCodeDiffData(
          createFileDiff(
            { contents: smallOld.contents, name: path },
            { contents: smallNew.contents, name: path }
          )
        )
      ),
    []
  );

  return (
    <Section
      description="The full-review header starts with the icon of the file type: the resolver reads the base name, then the name table, the react and sass variants, the extension table and falls back to the default glyph. The glyph takes the color of its token as a light and dark pair."
      id="file-icons"
      title="File-type icons"
    >
      <div className="grid gap-2 md:grid-cols-2" data-testid="diff-file-icons">
        <TooltipProvider>
          {diffs.map((diff) => (
            <CodeDiff
              diff={diff}
              headerVariant="full-review"
              key={diff.metadata.name}
              onOpenChange={setOpen}
              open={open}
              viewType="unified"
            />
          ))}
        </TooltipProvider>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Non-diff states                                                     */
/* ------------------------------------------------------------------ */

const StateExamples = () => {
  const [open, setOpen] = useState(true);
  const [armed, setArmed] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [retries, setRetries] = useState(0);
  const small = useMemo(() => makeDiff(smallOld, smallNew), []);

  const rendererDiff = useMemo(
    () =>
      makeDiff(
        { contents: "const oldValue = 1;\n", name: "src/render.ts" },
        {
          contents: `const newValue = ${recovered ? 3 : 2};\n`,
          name: "src/render.ts",
        }
      ),
    [recovered]
  );

  const binary = useMemo(
    () => makeDiff(smallOld, smallNew, { isBinary: true }),
    []
  );

  const empty = useMemo(() => makeDiff(smallOld, smallOld), []);
  const renamedOnly = useMemo(() => makeRename(), []);
  const tooLarge = useMemo(() => makeDiff(wideOld, wideNew), []);

  const renderProps = {
    onOpenChange: setOpen,
    open,
    viewType: "unified" as const,
  };

  return (
    <Section
      description="Loading placeholder, load failure with Retry, partial-content failure, binary, rename without changes, empty, too large (over 15,000 changed lines, here with an Open in editor button) and a renderer crash."
      id="states"
      title="Empty, error and loading states"
    >
      <p className="text-sm" data-testid="diff-states-log">
        Retries pressed: {retries}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <TooltipProvider>
          <Frame label="Loading" testId="diff-state-loading">
            <CodeDiff diff={small} isLoading {...renderProps} />
          </Frame>
          <Frame
            label="Failed to load after retrying"
            testId="diff-state-load-error"
          >
            <CodeDiff
              diff={small}
              onLoadRetry={() => {
                setRetries((count) => count + 1);
              }}
              showLoadError
              {...renderProps}
            />
          </Frame>
          <Frame
            label="Full file content failed to load"
            testId="diff-state-full-content"
          >
            <CodeDiff
              diff={small}
              fullContentLoadFailed
              onFullContentRetry={() => {
                setRetries((count) => count + 1);
              }}
              {...renderProps}
            />
          </Frame>
          <Frame label="Binary file" testId="diff-state-binary">
            <CodeDiff diff={binary} {...renderProps} />
          </Frame>
          <Frame label="Renamed without changes" testId="diff-state-rename">
            <CodeDiff diff={renamedOnly} {...renderProps} />
          </Frame>
          <Frame label="No content" testId="diff-state-empty">
            <CodeDiff diff={empty} {...renderProps} />
          </Frame>
          <Frame
            label="Too large, can open in editor"
            testId="diff-state-too-large"
          >
            <CodeDiff
              canOpenFile
              diff={tooLarge}
              workspaceRelativePath="generated.txt"
              {...renderProps}
            />
          </Frame>
          <Frame label="Renderer crash" testId="diff-state-render-failed">
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  if (armed) {
                    setRecovered(true);
                  } else {
                    setArmed(true);
                  }
                }}
                size="toolbar"
              >
                {armed ? "Change file content" : "Crash the renderer"}
              </Button>
              <CodeDiff
                {...renderProps}
                diff={rendererDiff}
                lineAnnotations={[
                  {
                    lineNumber: 1,
                    metadata: "Renderer annotation",
                    side: "additions",
                  },
                ]}
                renderAnnotation={(annotation) => {
                  if (armed && !recovered) {
                    throw new Error("Render failure");
                  }

                  return annotation.metadata;
                }}
              />
            </div>
          </Frame>
        </TooltipProvider>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Inline review                                                       */
/* ------------------------------------------------------------------ */

const InlineReviewExamples = () => {
  const [log, setLog] = useState("No review action yet");

  const onAction = (action: InlineReviewAction) => {
    setLog(`action ${action}`);
  };

  const huge: DiffFile = {
    contents: "x".repeat(262_145),
    name: "huge.txt",
  };

  return (
    <Section
      description="Inline review: a unified diff with a footer of word wrap, Edit, Reject and Accept. Compact shows the old and new text as blocks. Accept and Edit can be disabled, and a change over 262,144 characters or 5,000 lines is refused."
      id="inline-review"
      title="Inline review"
    >
      <p className="text-sm" data-testid="diff-inline-log">
        {log}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <TooltipProvider>
          <Frame label="Full" testId="diff-inline-full">
            <div className="h-72">
              <InlineFileDiffReview
                canEdit
                newFile={newFile}
                oldFile={oldFile}
                onAction={onAction}
              />
            </div>
          </Frame>
          <Frame label="Compact" testId="diff-inline-compact">
            <InlineFileDiffReview
              canEdit
              compact
              newFile={smallNew}
              oldFile={smallOld}
              onAction={onAction}
            />
          </Frame>
          <Frame label="Accept and Edit disabled" testId="diff-inline-disabled">
            <div className="h-56">
              <InlineFileDiffReview
                canAccept={false}
                canEdit={false}
                newFile={smallNew}
                oldFile={smallOld}
                onAction={onAction}
              />
            </div>
          </Frame>
          <Frame label="Too large to preview" testId="diff-inline-too-large">
            <div className="h-40">
              <InlineFileDiffReview
                canEdit
                newFile={huge}
                oldFile={smallOld}
                onAction={onAction}
              />
            </div>
          </Frame>
        </TooltipProvider>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Hover preview and page preview                                      */
/* ------------------------------------------------------------------ */

const PreviewExamples = () => {
  const [log, setLog] = useState("Preview not opened");
  const small = useMemo(() => makeDiff(smallOld, smallNew), []);

  return (
    <Section
      description="Hovering a reference opens an interactive tooltip above it after 800ms (a second reference opens at once while the first was just open). The preview scrolls, and Enter or Space on it opens the file."
      id="preview"
      title="Hover preview"
    >
      <p className="text-sm" data-testid="diff-preview-log">
        {log}
      </p>
      <TooltipProvider>
        <div
          className="flex flex-col gap-3 pt-96"
          data-testid="diff-preview-triggers"
        >
          <DiffPreviewTooltip
            diff={small}
            displayPath="notes.txt"
            linesAdded={small.additions}
            linesRemoved={small.deletions}
            onOpen={() => {
              setLog("preview opened notes.txt");
            }}
          >
            <Button
              className="w-[32rem] max-w-full justify-start"
              data-testid="diff-preview-trigger"
              size="toolbar"
            >
              notes.txt
            </Button>
          </DiffPreviewTooltip>
          <DiffPreviewTooltip
            diff={toCodeDiffData(fullDiff)}
            displayPath="src/example.ts"
            linesAdded={toCodeDiffData(fullDiff).additions}
            linesRemoved={toCodeDiffData(fullDiff).deletions}
          >
            <Button
              className="w-[32rem] max-w-full justify-start"
              data-testid="diff-preview-trigger-second"
              size="toolbar"
            >
              src/example.ts
            </Button>
          </DiffPreviewTooltip>
          <DiffPreviewTooltip
            diff={small}
            disabled
            displayPath="notes.txt"
            linesAdded={1}
            linesRemoved={1}
          >
            <Button
              className="w-[32rem] max-w-full justify-start"
              data-testid="diff-preview-trigger-disabled"
              size="toolbar"
            >
              Disabled preview
            </Button>
          </DiffPreviewTooltip>
        </div>
      </TooltipProvider>
      <Frame
        label="Page code-block preview (word wrap)"
        testId="diff-page-preview"
      >
        <DiffPagePreview
          files={[fullDiff, createFileDiff(smallOld, smallNew)]}
          wordWrap
        />
      </Frame>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Appearance and RTL                                                  */
/* ------------------------------------------------------------------ */

const PanelContent = ({ prefix }: { prefix: string }) => {
  const [open, setOpen] = useState(true);
  const small = useMemo(() => makeDiff(smallOld, smallNew), []);

  return (
    <TooltipProvider>
      <div
        className="flex min-w-0 flex-col gap-2"
        data-testid={`${prefix}-content`}
      >
        <CodeDiff
          diff={small}
          onOpenChange={setOpen}
          open={open}
          viewType="unified"
        />
        <DiffView
          diffStyle="split"
          fileDiff={fullDiff}
          hunkSeparators="simple"
        />
      </div>
    </TooltipProvider>
  );
};

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
    description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested diffs follow the nearest scope."
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

const RtlExample = () => {
  const [open, setOpen] = useState(true);

  const small = useMemo(
    () =>
      toCodeDiffData(
        createFileDiff(
          { contents: smallOld.contents, name: "src/ملف.ts" },
          { contents: smallNew.contents, name: "src/ملف.ts" }
        )
      ),
    []
  );

  return (
    <Section
      description="In a right-to-left container the header mirrors, and the path keeps its left-to-right text direction (the button uses direction: rtl for truncation and the spans restore ltr)."
      id="rtl"
      title="Right to left"
    >
      <div dir="rtl" data-testid="diff-rtl">
        <TooltipProvider>
          <CodeDiff
            canOpenFile
            diff={small}
            headerVariant="full-review"
            onOpenChange={setOpen}
            open={open}
            viewType="unified"
            workspaceRelativePath="src/ملف.ts"
          />
        </TooltipProvider>
      </div>
    </Section>
  );
};

const DiffGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Diff</h1>
      <AppearanceControl id="diff-appearance" />
    </header>
    <ViewModeExamples />
    <ContextExamples />
    <HeaderExamples />
    <FileIconExamples />
    <InteractionExamples />
    <ContextMenuExamples />
    <LargeFileExamples />
    <StateExamples />
    <InlineReviewExamples />
    <PreviewExamples />
    <AppearanceExamples />
    <RtlExample />
  </main>
);

export { DiffGalleryExample };
