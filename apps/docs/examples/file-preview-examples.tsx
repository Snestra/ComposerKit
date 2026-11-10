"use client";

/* oxlint-disable eslint/require-await, eslint/no-empty-function, promise/avoid-new, unicorn/no-useless-promise-resolve-reject, typescript/return-await, unicorn/no-useless-undefined -- The example actions resolve, reject or never settle, to reach the busy, failed and ready states with local data. */

import {
  AnnotationComment,
  DocxPreviewPage,
  DocxPreviewPanel,
  NotebookPreviewPanel,
  PdfPagePlaceholder,
  PdfPreviewPage,
  PdfPreviewPanel,
  docxAnnotationLabels,
  pdfAnnotationLabels,
} from "@workspace/react/components/file-preview/document-panels";
import type { NotebookCell } from "@workspace/react/components/file-preview/document-panels";
import { FilePreviewFallback } from "@workspace/react/components/file-preview/file-preview-fallback";
import { FileReferenceChip } from "@workspace/react/components/file-preview/file-reference-chip";
import type { FileReferencePresentation } from "@workspace/react/components/file-preview/file-reference-chip";
import { FileTypeIcon } from "@workspace/react/components/file-preview/file-type-icon";
import {
  ImageLightbox,
  ImageThumbnail,
} from "@workspace/react/components/file-preview/image-lightbox";
import { ImagePreviewDialog } from "@workspace/react/components/file-preview/image-preview-dialog";
import { VideoLightbox } from "@workspace/react/components/file-preview/video-lightbox";
import { VideoPlayer } from "@workspace/react/components/file-preview/video-player";
import { Button } from "@workspace/react/components/ui/button";
import { ToastProvider } from "@workspace/react/components/ui/toast";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

import { sampleVideoBase64 } from "./file-preview-sample-video";

const swatch = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="hsl(${hue} 60% 50%)"/></svg>`
  )}`;

const images = [
  { src: swatch(10) },
  { src: swatch(140) },
  { src: swatch(260) },
] as const;

// An image that cannot decode, for the load failure state.
const BROKEN_IMAGE = "data:image/png;base64,AAAA";

// A video that cannot play, for the video action failure state.
const BROKEN_VIDEO = "data:video/webm;base64,AAAA";

// The sample clip is a data URL, so the player demonstration makes no network request.
const SAMPLE_VIDEO = `data:video/webm;base64,${sampleVideoBase64}`;

const Section = ({ children, id }: { children: ReactNode; id: string }) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-4"
    id={id}
  >
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {id}
    </h2>
    {children}
  </section>
);

const Group = ({ children, title }: { children: ReactNode; title: string }) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-sm font-medium text-text-muted">{title}</h3>
    <div className="flex flex-wrap items-start gap-3">{children}</div>
  </div>
);

/* ------------------------------------------------------------ chips --- */

const presentations = [
  "inline",
  "artifact-row",
  "file-tile",
] as const satisfies readonly FileReferencePresentation[];

const resolves = async () => Promise.resolve();

// A promise that never settles keeps the chip busy until the page reloads.
const neverSettles = async () => new Promise<void>(() => {});

const rejects = async () => Promise.reject(new Error("The action failed."));

const ChipStates = () => (
  <Section id="file-preview-chip-states">
    {presentations.map((presentation) => (
      <div key={presentation} className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-muted">{presentation}</h3>
        <div className="flex flex-wrap items-start gap-4">
          <FileReferenceChip
            fileName="example.pdf"
            presentation={presentation}
            preview
            saveable
            typeLabel="ready"
            onAction={resolves}
          />
          <FileReferenceChip
            fileName="example.xlsx"
            presentation={presentation}
            saveable
            typeLabel="ready"
            onAction={resolves}
          />
          <FileReferenceChip
            connected
            fileName="example.docx"
            libraryProvider="google_drive"
            presentation={presentation}
            typeLabel="ready"
            onAction={resolves}
          />
          <FileReferenceChip
            busy
            fileName="example.csv"
            presentation={presentation}
            preview
            typeLabel="busy"
            onAction={resolves}
          />
          <FileReferenceChip
            busy
            fileName="example.zip"
            presentation={presentation}
            typeLabel="busy"
            onAction={resolves}
          />
          <FileReferenceChip
            fileName="example.txt"
            presentation={presentation}
            typeLabel="busy after activation"
            onAction={neverSettles}
          />
          <FileReferenceChip
            fileName="example.pptx"
            presentation={presentation}
            preview
            typeLabel="unavailable"
            unavailable
            onAction={resolves}
          />
          <FileReferenceChip
            fileName="example.mp3"
            presentation={presentation}
            typeLabel="unavailable"
            unavailable
            onAction={resolves}
          />
          <FileReferenceChip
            fileName="example.png"
            presentation={presentation}
            typeLabel="failed download"
            onAction={rejects}
          />
        </div>
      </div>
    ))}
  </Section>
);

const ChipAppearance = () => (
  <Section id="file-preview-chip-appearance">
    <Group title="inline, hover and focus">
      <p className="text-sm">
        <FileReferenceChip fileName="example.pdf" preview onAction={resolves} />
      </p>
      <p className="text-sm">
        <FileReferenceChip
          fileName="a-long-file-name-that-keeps-going-and-going-example.pdf"
          preview
          onAction={resolves}
        />
      </p>
    </Group>
    <Group title="artifact-row">
      <div className="w-80">
        <FileReferenceChip
          fileName="example.pdf"
          presentation="artifact-row"
          preview
          saveable
          onAction={resolves}
        />
      </div>
    </Group>
    <Group title="file-tile">
      <FileReferenceChip
        fileName="example.pdf"
        presentation="file-tile"
        preview
        saveable
        onAction={resolves}
      />
    </Group>
  </Section>
);

/* --------------------------------------------------------- fallback --- */

const Fallback = () => (
  <Section id="file-preview-fallback">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-80 rounded-2xl border border-border">
        <FilePreviewFallback fileName="example.dwg" onDownload={() => {}} />
      </div>
      <div className="h-80 rounded-2xl border border-border">
        <FilePreviewFallback downloadable={false} fileName="example.dwg" />
      </div>
    </div>
  </Section>
);

/* ----------------------------------------------------------- images --- */

const ImageDialogExample = ({ busy = false }: { busy?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const image = images[index];

  return (
    <>
      <Button
        color="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {busy ? "ImagePreviewDialog busy" : "ImagePreviewDialog"}
      </Button>
      {open && image !== undefined ? (
        <ImagePreviewDialog
          busy={busy}
          footer={<output>{`${index + 1} of ${images.length}`}</output>}
          imageRef={imageRef}
          onNext={
            index < images.length - 1
              ? () => {
                  setIndex(index + 1);
                }
              : undefined
          }
          onOpenChange={setOpen}
          onPrevious={
            index > 0
              ? () => {
                  setIndex(index - 1);
                }
              : undefined
          }
        >
          <div className="flex size-full items-center justify-center">
            {/* The alt text Image {n} is the wording. A data URL needs no optimizer. */}
            {/* oxlint-disable-next-line next/no-img-element */}
            <img
              ref={imageRef}
              // oxlint-disable-next-line jsx-a11y/img-redundant-alt
              alt={`Image ${index + 1}`}
              className="max-h-full max-w-full object-contain"
              src={image.src}
            />
          </div>
        </ImagePreviewDialog>
      ) : null}
    </>
  );
};

const LightboxExample = ({
  download,
  label,
  list,
}: {
  download?: () => Promise<boolean>;
  label: string;
  list: readonly { src: string }[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        color="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {open ? (
        <ImageLightbox
          images={list}
          open
          onDownload={download}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
};

const Images = () => (
  <>
    <Section id="file-preview-image-keyboard">
      <Group title="ImagePreviewDialog">
        <ImageDialogExample />
        <ImageDialogExample busy />
      </Group>
    </Section>
    <Section id="file-preview-image-layout">
      <Group title="ImageThumbnail">
        {images.map((image, index) => (
          <div key={image.src} className="size-24 rounded-lg">
            <ImageThumbnail alt={`Image ${index + 1}`} src={image.src} />
          </div>
        ))}
      </Group>
      <Group title="ImageLightbox">
        <LightboxExample
          download={async () => Promise.resolve(true)}
          label="ImageLightbox"
          list={images}
        />
        <LightboxExample
          download={async () => Promise.resolve(false)}
          label="ImageLightbox download failure"
          list={[images[0]]}
        />
        <LightboxExample
          label="ImageLightbox load failure"
          list={[{ src: BROKEN_IMAGE }]}
        />
      </Group>
    </Section>
  </>
);

/* ----------------------------------------------------------- videos --- */

const VideoControls = () => {
  const src = SAMPLE_VIDEO;

  return (
    <Section id="file-preview-video-controls">
      <Group title="below">
        <VideoPlayer
          durationHint={12}
          label="below"
          sourceUrl="https://example.com/video"
          src={src}
          onCopyLink={resolves}
          onSaveCopy={resolves}
        />
      </Group>
      <Group title="overlay">
        <div className="w-full max-w-xl">
          <VideoPlayer
            label="overlay"
            presentation="overlay"
            sizing="container"
            src={src}
            onSaveCopy={resolves}
          />
        </div>
      </Group>
      <Group title="overlay">
        <div className="w-full max-w-xl">
          <VideoPlayer
            label="overlay"
            presentation="overlay"
            sizing="container"
            src={src}
            transparentBackground
            onSaveCopy={async () => Promise.reject(new Error("Failed"))}
          />
        </div>
      </Group>
      <Group title="onExpand">
        <VideoPlayer label="onExpand" src={src} onExpand={() => {}} />
      </Group>
      <Group title="action failure">
        <VideoPlayer label="action failure" src={BROKEN_VIDEO} />
      </Group>
    </Section>
  );
};

const videos = [{ id: "one" }, { id: "two" }, { id: "three" }] as const;

const VideoLightboxes = () => {
  const src = SAMPLE_VIDEO;
  const [open, setOpen] = useState(false);

  return (
    <Section id="file-preview-video-lightbox">
      <Group title="VideoLightbox">
        <Button
          color="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          VideoLightbox
        </Button>
        {open ? (
          <VideoLightbox
            open
            renderPlayer={() => (
              <VideoPlayer
                label="VideoLightbox"
                presentation="overlay"
                sizing="container"
                src={src}
              />
            )}
            renderPreview={() => (
              <div className="size-full bg-panel-secondary" />
            )}
            videos={videos}
            onOpenChange={setOpen}
          />
        ) : null}
      </Group>
    </Section>
  );
};

/* -------------------------------------------------------- documents --- */

const lineWidths = ["w-3/4", "w-full", "w-5/6", "w-2/3"] as const;

const PageLines = () => (
  <div className="flex flex-col gap-2 p-4">
    {lineWidths.map((width) => (
      <div key={width} className={`h-2 rounded bg-black/10 ${width}`} />
    ))}
  </div>
);

const notebookCells: readonly NotebookCell[] = [
  {
    cellType: "markdown",
    source: "# example\n\n**Markdown** and <kbd>Enter</kbd>",
  },
  { cellType: "markdown", source: "" },
  {
    cellType: "code",
    executionCount: 1,
    outputs: [
      { kind: "text", text: "2" },
      { kind: "error", message: "division by zero", name: "ZeroDivisionError" },
      { kind: "image", src: swatch(200) },
    ],
    source: "print(1 + 1)",
  },
  { cellType: "code", executionCount: null, source: "" },
  { cellType: "raw", source: "raw text" },
  { cellType: "raw", source: "" },
  { cellType: "unknown", source: "" },
];

const DocumentPanels = () => (
  <Section id="file-preview-document-panels">
    <Group title="PdfPreviewPanel">
      <div className="h-96 w-full max-w-lg overflow-hidden rounded-lg border border-border">
        <PdfPreviewPanel>
          <PdfPreviewPage className="w-64">
            <PageLines />
          </PdfPreviewPage>
          <PdfPreviewPage className="w-64">
            <PdfPagePlaceholder />
          </PdfPreviewPage>
        </PdfPreviewPanel>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <AnnotationComment
          labels={pdfAnnotationLabels}
          onEscape={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onSubmit={async () => Promise.resolve()}
        />
        <AnnotationComment
          labels={pdfAnnotationLabels}
          onSubmit={async () =>
            Promise.reject(new Error("The comment failed."))
          }
        />
      </div>
    </Group>
    <Group title="DocxPreviewPanel">
      <div className="h-96 w-full max-w-lg overflow-hidden rounded-lg border border-border">
        <DocxPreviewPanel
          renderPages={(showRedlines) => (
            <div className="mx-auto w-64" data-show-redlines={showRedlines}>
              <DocxPreviewPage>
                <PageLines />
              </DocxPreviewPage>
            </div>
          )}
        />
      </div>
      <div className="w-full max-w-sm">
        <AnnotationComment
          labels={docxAnnotationLabels}
          onSubmit={async () =>
            Promise.reject(new Error("The comment failed."))
          }
        />
      </div>
    </Group>
    <Group title="NotebookPreviewPanel">
      <div className="flex h-[32rem] w-full flex-col overflow-hidden rounded-lg border border-border">
        <NotebookPreviewPanel cells={notebookCells} />
      </div>
      <div className="flex h-32 w-full flex-col overflow-hidden rounded-lg border border-border">
        <NotebookPreviewPanel cells={[]} />
      </div>
    </Group>
  </Section>
);

/* ------------------------------------------------------------ icons --- */

const sizes = [12, 16, 20, 24, 32] as const;

interface IconSample {
  fileName?: string;
  libraryArtifactType?: string;
  libraryProvider?: string;
  mountedLibraryFileId?: string;
  mimeType?: string;
  sourceMimeType?: string;
  sourceUrl?: string;
}

const iconSamples: readonly IconSample[] = [
  { fileName: "example.pdf" },
  { fileName: "example.csv" },
  { fileName: "example.xlsx" },
  { fileName: "example.docx" },
  { fileName: "example.pptx" },
  { fileName: "example.key" },
  { fileName: "example.txt" },
  { fileName: "example.md" },
  { fileName: "example.py" },
  { fileName: "example.ts" },
  { fileName: "example.html" },
  { fileName: "example.json" },
  { fileName: "example.zip" },
  { fileName: "example.mp3" },
  { fileName: "example.mp4" },
  { fileName: "example.mov" },
  { fileName: "example.png" },
  { fileName: "example.jpg" },
  { fileName: "example.webp" },
  { fileName: "example.glb" },
  { fileName: "example.fig" },
  {
    fileName: "example.bin",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  },
  { fileName: "example.bin", mimeType: "application/ms-office" },
  { fileName: "example.bin", mimeType: "application/vnd.google-apps.document" },
  {
    fileName: "example.bin",
    mimeType: "application/vnd.google-apps.spreadsheet",
  },
  {
    fileName: "example.bin",
    mimeType: "application/vnd.google-apps.presentation",
  },
  { fileName: "example.xyz" },
  { fileName: "example" },
  { libraryArtifactType: "writing_block" },
  { libraryArtifactType: "research_report" },
  { libraryArtifactType: "app_block" },
  { libraryArtifactType: "site_preview" },
  { fileName: "example.xyz", libraryProvider: "box" },
  { fileName: "example.xyz", mountedLibraryFileId: "external-box:file:123" },
  { fileName: "example.xyz", libraryProvider: "dropbox" },
  { fileName: "example.xyz", libraryProvider: "google_drive" },
  { fileName: "example.xyz", libraryProvider: "onedrive" },
  { fileName: "example.xyz", libraryProvider: "sharepoint" },
];

const sampleName = (sample: IconSample) =>
  [
    sample.fileName,
    sample.mimeType,
    sample.libraryProvider,
    sample.mountedLibraryFileId,
    sample.libraryArtifactType,
  ]
    .filter(Boolean)
    .join(" ");

const IconRow = ({ sample }: { sample: IconSample }) => (
  <tr>
    <th className="py-1 pe-4 text-start text-xs font-normal text-text-muted">
      {sampleName(sample)}
    </th>
    {(["branded", "monochrome"] as const).map((variant) => (
      <td key={variant} className="py-1 pe-6">
        <div className="flex items-center gap-2">
          {sizes.map((size) => (
            <FileTypeIcon
              key={size}
              {...sample}
              aria-label={`${sampleName(sample)} ${variant} ${size}`}
              size={size}
              variant={variant}
            />
          ))}
        </div>
      </td>
    ))}
  </tr>
);

const IconTable = ({ id }: { id: string }) => (
  <Section id={id}>
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-start text-xs font-medium" scope="col">
            fileName
          </th>
          <th className="text-start text-xs font-medium" scope="col">
            branded
          </th>
          <th className="text-start text-xs font-medium" scope="col">
            monochrome
          </th>
        </tr>
      </thead>
      <tbody>
        {iconSamples.map((sample) => (
          <IconRow key={sampleName(sample)} sample={sample} />
        ))}
      </tbody>
    </table>
  </Section>
);

/* ------------------------------------------------------------- page --- */

const FilePreviewGalleryExample = () => (
  <ToastProvider>
    <main className="mx-auto flex max-w-5xl flex-col gap-10 bg-background p-6 text-foreground">
      <header className="flex flex-wrap items-center gap-4">
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">File Preview</h1>
        <AppearanceControl id="file-preview-appearance" />
      </header>
      <ChipStates />
      <ChipAppearance />
      <Fallback />
      <Images />
      <VideoControls />
      <VideoLightboxes />
      <DocumentPanels />
      <IconTable id="file-preview-icon-by-type" />
      <IconTable id="file-preview-brand-colors" />
    </main>
  </ToastProvider>
);

export { FilePreviewGalleryExample };
