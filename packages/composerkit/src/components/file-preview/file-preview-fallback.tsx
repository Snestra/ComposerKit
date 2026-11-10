import { Button } from "composerkit/components/ui/button";
import { EmptyState } from "composerkit/components/ui/empty-state";
import type { ReactNode } from "react";

import { FileTypeIcon } from "./file-type-icon";
import type { FileTypeIconProps } from "./file-type-icon";

export interface FilePreviewFallbackProps extends Pick<
  FileTypeIconProps,
  "fileExtension" | "mimeType"
> {
  /** Replaces the download button. */
  action?: ReactNode;
  /** Replaces the description. */
  description?: ReactNode;
  /** False when the type has no portable download. */
  downloadable?: boolean;
  fileName: string;
  onDownload?: () => void;
  /** Replaces the title. */
  title?: ReactNode;
}

/**
 * The empty state for a file with no preview has a size-16 tile with
 * the file type icon, the file name as an h2,
 * a description and one download button.
 */
export const FilePreviewFallback = ({
  action,
  description,
  downloadable = true,
  fileExtension,
  fileName,
  mimeType,
  onDownload,
  title,
}: FilePreviewFallbackProps) => (
  <EmptyState
    actions={
      action ??
      (onDownload === undefined ? null : (
        <Button color="outline" onClick={onDownload}>
          Download file
        </Button>
      ))
    }
    className="h-full min-h-0"
    contentClassName="max-w-sm"
    description={
      <div className="flex min-w-0 flex-col gap-1">
        <h2 aria-label={fileName}>
          <span className="block w-full truncate text-text select-text">
            {fileName}
          </span>
        </h2>
        {description ??
          (downloadable
            ? "This file type can be downloaded or attached to a chat"
            : "This file type cannot be downloaded")}
      </div>
    }
    icon={
      <div className="flex size-16 items-center justify-center rounded-2xl bg-text/10">
        <FileTypeIcon
          className="size-8 text-text-muted"
          fileExtension={fileExtension}
          fileName={fileName}
          mimeType={mimeType}
          size={32}
        />
      </div>
    }
    title={title ?? "Preview not available"}
  />
);
