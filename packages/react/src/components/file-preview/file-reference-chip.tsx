"use client";

/* oxlint-disable eslint/complexity, shadcn/no-inline-styles, shadcn/no-arbitrary-values -- The chip's icon box is an inline style object and its link uses decoration-[1px] and underline-offset-[2px]. */

import { ViewerDownloadIcon } from "@workspace/react/components/carousel/icons";
import { Button, Spinner } from "@workspace/react/components/ui/button";
import { useToast } from "@workspace/react/components/ui/toast";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { useCallback, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { fileExtension } from "./file-classification";
import { FileTypeIcon } from "./file-type-icon";
import type { FileTypeIconProps } from "./file-type-icon";

export type FileReferencePresentation = "artifact-row" | "file-tile" | "inline";

/** `opening` opens the preview or downloads, `saving` saves to a chosen location. */
export type FileReferenceAction = "opening" | "saving";

export interface FileReferenceChipProps extends Pick<
  FileTypeIconProps,
  "fileExtension" | "libraryProvider" | "mimeType" | "sourceUrl"
> {
  /** The host is already opening or downloading the file. */
  busy?: boolean;
  /** The file was opened from a connected provider (`Open {fileName}`). */
  connected?: boolean;
  fileName: string;
  /** Inline text. Defaults to the file name. */
  label?: ReactNode;
  /** Runs the action. A pending promise is the busy state and a rejection shows the failure message. */
  onAction?: (action: FileReferenceAction) => Promise<void> | void;
  presentation?: FileReferencePresentation;
  /** The file opens in the preview panel and not as a download. */
  preview?: boolean;
  /** Shows the save-as control (the download control of a row). */
  saveable?: boolean;
  /** Type label under the file name in rows and tiles. */
  typeLabel?: ReactNode;
  /** Blocked: aria-disabled and disabled, with the "unavailable in lockdown mode" label. */
  unavailable?: boolean;
}

const FAILURE_MESSAGE = "Failed to download file. Please try again later.";

const inlineClassName =
  "inline cursor-(--ck-action-cursor) px-1 text-start align-baseline text-inherit underline decoration-text-subtle decoration-dotted decoration-[1px] underline-offset-[2px] hover:text-text-notice hover:decoration-inherit disabled:cursor-wait";

const overlayRowClassName =
  "absolute inset-0 cursor-(--ck-action-cursor) bg-transparent hover:bg-text/5 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:cursor-wait";

const overlayTileClassName =
  "absolute inset-0 cursor-(--ck-action-cursor) bg-transparent hover:bg-fill-primary-transparent-hover/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:cursor-wait";

const rowTrailingClassName =
  "pointer-events-none relative z-20 opacity-0 group-focus-within/resource-row:pointer-events-auto group-focus-within/resource-row:opacity-100 group-hover/resource-row:pointer-events-auto group-hover/resource-row:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

const tileTrailingClassName =
  "pointer-events-none absolute end-1.5 top-1.5 z-20 opacity-0 group-focus-within/resource-row:pointer-events-auto group-focus-within/resource-row:opacity-100 group-hover/resource-row:pointer-events-auto group-hover/resource-row:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

// The 16px icon box that sits on the text baseline.
const iconBox: CSSProperties = {
  display: "inline-block",
  height: "1lh",
  marginInlineEnd: 3,
  position: "relative",
  verticalAlign: "bottom",
  width: 16,
};

const iconBoxInner: CSSProperties = {
  height: 16,
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 16,
};

interface LabelInput {
  busy: boolean;
  connected: boolean;
  fileName: string;
  preview: boolean;
  unavailable: boolean;
}

/** The aria-label patterns of the file reference. */
const referenceLabel = ({
  busy,
  connected,
  fileName,
  preview,
  unavailable,
}: LabelInput) => {
  if (unavailable) {
    return preview
      ? `Preview of ${fileName} unavailable in lockdown mode`
      : `Download ${fileName} unavailable in lockdown mode`;
  }

  if (connected) {
    return busy ? `Opening ${fileName}` : `Open ${fileName}`;
  }

  if (preview) {
    return busy
      ? `Opening preview of ${fileName}`
      : `Open preview of ${fileName}`;
  }

  return busy ? `Downloading ${fileName}` : `Download ${fileName}`;
};

const FileReferenceChip = ({
  busy: busyProp = false,
  connected = false,
  fileExtension: extension,
  fileName,
  label,
  libraryProvider,
  mimeType,
  onAction,
  presentation = "inline",
  preview = false,
  saveable = false,
  sourceUrl,
  typeLabel,
  unavailable = false,
}: FileReferenceChipProps) => {
  const toast = useToast();
  const [pending, setPending] = useState<FileReferenceAction | null>(null);
  const busy = pending !== null || busyProp;
  const enabled = onAction !== undefined && !unavailable;

  const run = useCallback(
    async (action: FileReferenceAction) => {
      setPending(action);

      const failed = await Promise.resolve(onAction?.(action)).then(
        () => false,
        () => true
      );

      setPending(null);

      if (failed) {
        toast.danger(FAILURE_MESSAGE);
      }
    },
    [onAction, toast]
  );

  const ariaLabel = referenceLabel({
    busy,
    connected,
    fileName,
    preview,
    unavailable,
  });

  const iconProps = {
    fileExtension: extension,
    fileName,
    libraryProvider,
    mimeType,
    sourceUrl,
  };

  if (presentation === "inline") {
    return (
      <span className="inline-flex items-center gap-1">
        <TooltipHint content={fileName}>
          <button
            aria-busy={busy || undefined}
            aria-disabled={unavailable || undefined}
            aria-label={ariaLabel}
            className={inlineClassName}
            disabled={busy || !enabled}
            type="button"
            onClick={() => {
              void run("opening");
            }}
          >
            <span style={iconBox}>
              <span style={iconBoxInner}>
                <FileTypeIcon {...iconProps} aria-hidden size={16} />
              </span>
            </span>
            {label ?? fileName}
          </button>
        </TooltipHint>
      </span>
    );
  }

  const isRow = presentation === "artifact-row";
  const typeText = typeLabel ?? fileExtension(fileName)?.toUpperCase();
  const saveLabel = isRow ? "Download file" : `Save ${fileName} as…`;
  const showSave = saveable && enabled && !busy;

  const overlay = enabled ? (
    <button
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      className={isRow ? overlayRowClassName : overlayTileClassName}
      disabled={busy}
      type="button"
      onClick={() => {
        void run("opening");
      }}
    />
  ) : (
    <button
      aria-disabled
      aria-label={ariaLabel}
      className="absolute inset-0 bg-transparent"
      disabled
      type="button"
    />
  );

  let trailing: ReactNode = null;

  if (busy) {
    trailing = <Spinner as="span" className="size-4 shrink-0" />;
  } else if (showSave) {
    trailing = (
      <span className={isRow ? rowTrailingClassName : tileTrailingClassName}>
        <TooltipHint content={saveLabel}>
          <Button
            aria-label={saveLabel}
            color={isRow ? "ghostActive" : "ghost"}
            disabled={busy}
            loading={pending === "saving"}
            radius={isRow ? "large" : "default"}
            size={isRow ? "imageToolbar" : "toolbar"}
            uniform
            onClick={(event) => {
              event.stopPropagation();
              void run("saving");
            }}
          >
            {pending === "saving" ? null : (
              <ViewerDownloadIcon aria-hidden className="size-4" />
            )}
          </Button>
        </TooltipHint>
      </span>
    );
  }

  const icon = isRow ? (
    <FileTypeIcon {...iconProps} aria-hidden className="shrink-0" size={24} />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
      <FileTypeIcon {...iconProps} aria-hidden size={24} />
    </span>
  );

  const subtitle = isRow ? (
    <>
      <span className="group-focus-within/resource-row:hidden group-hover/resource-row:hidden">
        {typeText}
      </span>
      <span
        className="hidden group-focus-within/resource-row:inline group-hover/resource-row:inline"
        data-ck-markdown-copy="exclude"
      >
        Open file
      </span>
    </>
  ) : (
    typeText
  );

  const row = (
    <span className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3 px-3 py-2">
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <TooltipHint content={fileName}>
          <span className="min-w-0 truncate text-sm text-text">{fileName}</span>
        </TooltipHint>
        <span className="min-w-0 truncate text-xs text-text-subtle">
          {subtitle}
        </span>
      </span>
      {trailing}
    </span>
  );

  const body = (
    <span className="group/resource-row relative block">
      {overlay}
      {row}
    </span>
  );

  if (isRow) {
    return body;
  }

  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-2xl border border-border",
        "w-72 max-w-full"
      )}
    >
      {body}
    </span>
  );
};

export { FileReferenceChip };
