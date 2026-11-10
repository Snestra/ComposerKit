"use client";

/* oxlint-disable shadcn/no-unknown-classes -- pdfPreviewPage, textLayer, annotationLayer and popcorn-paged-annotation-layer are hook classes kept as styling targets. */

import { ChevronDown16Icon } from "@workspace/react/components/composer/icons";
import { MarkdownProse } from "@workspace/react/components/markdown/prose";
import { Button } from "@workspace/react/components/ui/button";
import { cn } from "@workspace/react/lib/utils";
import { useState } from "react";
import type { ComponentProps, ReactNode, SyntheticEvent } from "react";

import { VideoPlayIcon } from "./video-control-icons";

/* ------------------------------------------------------------------ PDF --- */

/** One PDF page: a bordered, white, shadow-sm box (pdf-preview-panel pdfPreviewPage markup). */
export const PdfPreviewPage = ({
  annotationLayer,
  children,
  className,
  textLayer,
  ...props
}: ComponentProps<"div"> & {
  annotationLayer?: ReactNode;
  textLayer?: ReactNode;
}) => (
  <div
    {...props}
    className={cn(
      "pdfPreviewPage relative shrink-0 overflow-hidden border border-border bg-white shadow-sm",
      className
    )}
  >
    {children}
    {textLayer === undefined ? null : (
      <div className="textLayer">{textLayer}</div>
    )}
    {annotationLayer === undefined ? null : (
      <div className="annotationLayer popcorn-paged-annotation-layer">
        {annotationLayer}
      </div>
    )}
  </div>
);

/** The loading placeholder of a page: aspect 3/4 on surface-secondary. */
export const PdfPagePlaceholder = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn("relative aspect-3/4 w-full bg-panel-secondary", className)}
  />
);

/** The PDF panel: a column on the artifact preview background with centred pages. */
export const PdfPreviewPanel = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "relative flex h-full min-h-0 flex-col bg-fill-artifact-preview outline-none",
      className
    )}
  >
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex min-h-full w-max min-w-full flex-col items-center gap-6">
        {children}
      </div>
    </div>
  </div>
);

/* ----------------------------------------------------------- annotations --- */

export interface AnnotationCommentLabels {
  /** The accessible name of the comment field. */
  input: string;
  /** The failure text. */
  submitError: string;
}

export const pdfAnnotationLabels = {
  input: "PDF annotation comment",
  submitError: "Unable to submit annotation",
} as const satisfies AnnotationCommentLabels;

export const docxAnnotationLabels = {
  input: "Document annotation comment",
  submitError: "Could not save annotation",
} as const satisfies AnnotationCommentLabels;

/**
 * The annotation comment form ("Ask for change", placeholder "Describe a
 * change or ask a question"). A failed submit shows the failure text and Retry.
 * Ctrl or Cmd+Enter submits, and Escape calls onEscape.
 */
export const AnnotationComment = ({
  labels,
  onEscape,
  onSubmit,
}: {
  labels: AnnotationCommentLabels;
  onEscape?: () => void;
  onSubmit: (comment: string) => Promise<void>;
}) => {
  const [comment, setComment] = useState("");
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    setFailed(false);

    try {
      await onSubmit(comment);
    } catch {
      setFailed(true);
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit();
      }}
    >
      <textarea
        aria-label={labels.input}
        className="rounded-md border border-border bg-panel p-2 text-sm text-text"
        placeholder="Describe a change or ask a question"
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.defaultPrevented || event.nativeEvent.isComposing) {
            return;
          }

          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submit();
          } else if (event.key === "Escape" && onEscape !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            onEscape();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button color="primary" type="submit">
          Ask for change
        </Button>
        {failed ? (
          <>
            <span className="text-sm" role="alert">
              {labels.submitError}
            </span>
            <Button
              color="outline"
              onClick={() => {
                void submit();
              }}
            >
              Retry
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
};

/* ----------------------------------------------------------------- DOCX --- */

/** One DOCX page: aspect 3/4 on white (docx-preview-panel). */
export const DocxPreviewPage = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "relative aspect-3/4 w-full overflow-hidden bg-white",
      className
    )}
  />
);

/** The DOCX panel with its "Show redlines" and "Hide redlines" toggle. */
export const DocxPreviewPanel = ({
  children,
  defaultShowRedlines = false,
  onShowRedlinesChange,
  renderPages,
}: {
  children?: ReactNode;
  defaultShowRedlines?: boolean;
  onShowRedlinesChange?: (show: boolean) => void;
  /** Renders the pages for the redline state. */
  renderPages?: (showRedlines: boolean) => ReactNode;
}) => {
  const [show, setShow] = useState(defaultShowRedlines);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-fill-artifact-preview">
      <div className="flex shrink-0 items-center justify-end p-2">
        <Button
          aria-pressed={show}
          color="outline"
          onClick={() => {
            setShow(!show);
            onShowRedlinesChange?.(!show);
          }}
        >
          {show ? "Hide redlines" : "Show redlines"}
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto">
        {renderPages?.(show)}
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- notebook --- */

export type NotebookCellType = "code" | "markdown" | "raw" | "unknown";

export type NotebookOutput =
  | { readonly kind: "error"; readonly message: string; readonly name: string }
  | { readonly kind: "image"; readonly src: string }
  | { readonly kind: "text"; readonly text: string };

export interface NotebookCell {
  readonly cellType: NotebookCellType;
  readonly executionCount?: number | null;
  readonly id?: string;
  readonly outputs?: readonly NotebookOutput[];
  readonly source: string;
}

const emptyCellText: Readonly<Record<NotebookCellType, string>> = {
  code: "Empty code cell",
  markdown: "Empty Markdown cell",
  raw: "Empty raw cell",
  unknown: "Empty notebook cell",
};

// The names only these three cell types. An unknown type has no title.
const cellTitle = (type: NotebookCellType, number: number) => {
  if (type === "markdown") {
    return `Markdown cell ${number}`;
  }

  if (type === "code") {
    return `Code cell ${number}`;
  }

  return type === "raw" ? `Raw cell ${number}` : null;
};

const EmptyCell = ({ type }: { type: NotebookCellType }) => (
  <div className="rounded-md border border-stroke-subtle px-3 py-2 text-sm text-text-subtle">
    {emptyCellText[type]}
  </div>
);

const Chevron = ({ className }: { className: string }) => (
  <ChevronDown16Icon aria-hidden className={className} />
);

const CodeBlock = ({ label, source }: { label: string; source: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-text-subtle">{label}</span>
    <pre className="overflow-auto rounded-md bg-panel/40 p-3 text-size-chat">
      {source}
    </pre>
  </div>
);

const OutputView = ({
  number,
  output,
}: {
  number: number;
  output: NotebookOutput;
}) => {
  if (output.kind === "error") {
    return (
      <div className="rounded-md border border-chart-red/30 bg-chart-red/5 p-3">
        <span className="text-sm font-medium text-chart-red">
          {`${output.name}: ${output.message}`}
        </span>
      </div>
    );
  }

  if (output.kind === "image") {
    return (
      // The component shows the output image from its own data URL.
      // oxlint-disable-next-line nextjs/no-img-element
      <img
        alt={`Notebook output ${number}`}
        className="max-h-[640px] max-w-full"
        src={output.src}
      />
    );
  }

  return (
    <details className="group/code">
      <summary className="cursor-(--ck-action-cursor) text-xs font-medium text-text-subtle marker:text-text-subtle">
        Raw output
      </summary>
      <pre className="mt-2 overflow-auto rounded-md bg-panel/40 p-2 text-size-chat">
        {output.text}
      </pre>
    </details>
  );
};

const CellBody = ({ cell }: { cell: NotebookCell }) => {
  const empty = cell.source.trim().length === 0;

  if (cell.cellType === "markdown") {
    return (
      <div className="px-4 py-3">
        {empty ? (
          <EmptyCell type="markdown" />
        ) : (
          <MarkdownProse allowBasicHtml className="text-size-chat">
            {cell.source}
          </MarkdownProse>
        )}
      </div>
    );
  }

  const isCode = cell.cellType === "code";

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {empty ? (
        <EmptyCell type={cell.cellType} />
      ) : (
        <details className="group/code" open>
          <summary className="flex cursor-(--ck-action-cursor) list-none items-center gap-2 rounded-md py-1 text-start text-xs font-medium text-text-subtle transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-text-subtle [&::-webkit-details-marker]:hidden">
            <Chevron className="size-3 shrink-0 -rotate-90 transition-transform duration-(--motion-duration-slow) group-open/code:rotate-0" />
            Code
          </summary>
          <div className="mt-2">
            <CodeBlock label={isCode ? "Python" : "Raw"} source={cell.source} />
          </div>
        </details>
      )}
      {(cell.outputs ?? []).map((output, index) => (
        <OutputView
          key={`${output.kind}:${index}`}
          number={index + 1}
          output={output}
        />
      ))}
    </div>
  );
};

const NotebookCellView = ({
  cell,
  cellNumber,
  totalCellCount,
}: {
  cell: NotebookCell;
  cellNumber: number;
  totalCellCount: number;
}) => {
  const title = cellTitle(cell.cellType, cellNumber);

  return (
    <details
      className="group/notebook-cell overflow-hidden rounded-lg border border-stroke-subtle bg-panel"
      open
    >
      <summary className="flex cursor-(--ck-action-cursor) list-none items-center justify-between gap-3 border-b border-stroke-subtle px-4 py-2 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Chevron className="size-3 shrink-0 -rotate-90 text-text-subtle transition-transform duration-(--motion-duration-slow) group-open/notebook-cell:rotate-0" />
          {title === null ? null : (
            <div
              className="min-w-0 truncate text-sm font-medium text-text"
              title={title}
            >
              {title}
            </div>
          )}
          <span className="shrink-0 text-xs text-text-subtle">
            {`Cell ${cellNumber} of ${totalCellCount}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-text-subtle">
          {cell.cellType === "code" &&
          cell.executionCount !== null &&
          cell.executionCount !== undefined ? (
            <span className="tabular-nums">{`Run ${cell.executionCount}`}</span>
          ) : null}
          {cell.cellType === "code" ? (
            <span
              aria-hidden
              className="pointer-events-none inline-flex opacity-0 transition-opacity duration-(--motion-duration-fast) group-focus-within/notebook-cell:opacity-60 group-hover/notebook-cell:opacity-60"
              title="Running is disabled in read-only preview"
            >
              <VideoPlayIcon className="size-3" />
            </span>
          ) : null}
        </div>
      </summary>
      <CellBody cell={cell} />
    </details>
  );
};

/** The read-only notebook panel: a centred column of collapsible cells. */
export const NotebookPreviewPanel = ({
  cells,
  insetForSharedHeader = false,
}: {
  cells: readonly NotebookCell[];
  insetForSharedHeader?: boolean;
}) => {
  if (cells.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-text-muted">
        This notebook does not contain any cells
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto bg-panel-secondary px-4 pb-4 sm:px-6 sm:pb-5",
        insetForSharedHeader ? "pt-20" : "pt-4 sm:pt-5"
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {cells.map((cell, index) => (
          <NotebookCellView
            key={cell.id ?? index}
            cell={cell}
            cellNumber={index + 1}
            totalCellCount={cells.length}
          />
        ))}
      </div>
    </div>
  );
};
