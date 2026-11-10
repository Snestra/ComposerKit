"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values, eslint/complexity, eslint/require-await -- The gallery draws measured frames and one control per viewer option. */

import {
  ImageViewerDialog,
  ImageViewerHostContext,
  ImageViewerPortalContext,
} from "@workspace/react/components/carousel/image-viewer";
import type {
  ImageViewerDialogProps,
  ImageViewerHost,
} from "@workspace/react/components/carousel/image-viewer";
import {
  dispatchImageViewerZoom,
  registerImageViewerZoomHandler,
  useImageViewerActive,
} from "@workspace/react/components/carousel/zoom-bridge";
import { Button } from "@workspace/react/components/ui/button";
import { Pencil, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  Frame,
  Section,
  WIDE,
  photoSource,
} from "@/examples/carousel-gallery-parts";

const SOURCES = [1, 2, 3].map((number) => photoSource(number, WIDE));

type VariantKey =
  | "classic"
  | "contained"
  | "disabled-zoom"
  | "download-custom"
  | "download-failure"
  | "download-host"
  | "download-link"
  | "navigation"
  | "non-modal"
  | "overlay"
  | "preview"
  | "render-preview"
  | "slots"
  | "surface"
  | "toolbar"
  | "trigger"
  | "zoomable";

const VARIANTS: readonly { key: VariantKey; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "navigation", label: "Previous and next" },
  { key: "download-host", label: "Download through the host" },
  { key: "download-failure", label: "Download, host cannot save" },
  { key: "download-link", label: "Download link (https)" },
  { key: "download-custom", label: "Custom download handler" },
  { key: "toolbar", label: "Toolbar actions, edit and leading action" },
  { key: "slots", label: "Header, bottom, caption and bottom action" },
  { key: "zoomable", label: "Zoomable content" },
  { key: "preview", label: "Own preview" },
  { key: "render-preview", label: "Rendered preview with a ref" },
  { key: "surface", label: "Card surface, translucent controls" },
  { key: "disabled-zoom", label: "No zoom controls" },
  { key: "non-modal", label: "Not modal" },
  { key: "trigger", label: "Opened by its own trigger" },
  { key: "overlay", label: "Overlay presentation" },
  { key: "contained", label: "Contained in a frame" },
];

/** The host reserves title bar space with data-ui-titlebar-inset. */
const WindowFlags = ({ children }: { children: ReactNode }) => {
  const [windows, setWindows] = useState(false);
  const [electron, setElectron] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    if (windows) {
      root.dataset.uiPlatform = "win32";
    }

    if (electron) {
      root.dataset.uiWindowKind = "electron";
    }

    if (compact) {
      root.classList.add("compact-window");
    }

    if (windows && electron && !compact) {
      root.dataset.uiTitlebarInset = "";
    }

    return () => {
      delete root.dataset.uiPlatform;
      delete root.dataset.uiWindowKind;
      delete root.dataset.uiTitlebarInset;
      root.classList.remove("compact-window");
    };
  }, [compact, electron, windows]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            checked={windows}
            data-testid="flag-windows"
            onChange={(event) => {
              setWindows(event.target.checked);
            }}
            type="checkbox"
          />
          Windows (data-ui-platform=win32)
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={electron}
            data-testid="flag-electron"
            onChange={(event) => {
              setElectron(event.target.checked);
            }}
            type="checkbox"
          />
          Electron window (data-ui-window-kind=electron)
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={compact}
            data-testid="flag-compact"
            onChange={(event) => {
              setCompact(event.target.checked);
            }}
            type="checkbox"
          />
          Compact window (.compact-window)
        </label>
      </div>
      {children}
    </div>
  );
};

/** A stand-in for the desktop menu: it talks to the viewer only through the bridge. */
const HostMenuStub = () => {
  const active = useImageViewerActive();
  const [log, setLog] = useState("Nothing sent yet");
  const [rivalOn, setRivalOn] = useState(false);
  const stopRival = useRef<(() => void) | null>(null);

  // Registers or removes a second owner of the zoom commands.
  const toggleRival = useCallback(() => {
    if (stopRival.current === null) {
      stopRival.current = registerImageViewerZoomHandler((command) => {
        setLog(`Rival handler received ${command.type}`);
      });

      setRivalOn(true);
    } else {
      stopRival.current();
      stopRival.current = null;
      setRivalOn(false);
      setLog("Rival handler removed");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) {
        return;
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        setLog("Alt + sent step-zoom 1");
        dispatchImageViewerZoom({ delta: 1, type: "step-zoom" });
      } else if (event.key === "-") {
        event.preventDefault();
        setLog("Alt - sent step-zoom -1");
        dispatchImageViewerZoom({ delta: -1, type: "step-zoom" });
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        toggleRival();
      } else if (event.key === "0") {
        event.preventDefault();
        setLog("Alt 0 sent reset-zoom");
        dispatchImageViewerZoom({ type: "reset-zoom" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggleRival]);

  return (
    <Frame
      label="Host zoom menu (stub). While a viewer is open, Alt plus, Alt minus and Alt 0 send the commands, and Alt R registers or removes a rival handler."
      testId="viewer-menu"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" data-testid="viewer-selection">
          Image viewer active: {active ? "yes" : "no"}
        </span>
        <Button
          color="outlineSurface"
          onClick={() => {
            setLog("Button sent step-zoom 1");
            dispatchImageViewerZoom({ delta: 1, type: "step-zoom" });
          }}
          size="dialog"
        >
          Menu: zoom in
        </Button>
        <Button
          color="outlineSurface"
          onClick={() => {
            setLog("Button sent step-zoom -1");
            dispatchImageViewerZoom({ delta: -1, type: "step-zoom" });
          }}
          size="dialog"
        >
          Menu: zoom out
        </Button>
        <Button
          color="outlineSurface"
          onClick={() => {
            setLog("Button sent reset-zoom");
            dispatchImageViewerZoom({ type: "reset-zoom" });
          }}
          size="dialog"
        >
          Menu: reset zoom
        </Button>
        <Button color="outlineSurface" onClick={toggleRival} size="dialog">
          {rivalOn ? "Remove the rival handler" : "Register a rival handler"}
        </Button>
      </div>
      <p
        className="mt-2 text-xs text-muted-foreground"
        data-testid="viewer-events"
      >
        {log}
      </p>
    </Frame>
  );
};

const noop = () => {
  // Nothing to do.
};

const ViewerVariants = () => {
  const [active, setActive] = useState<VariantKey | null>(null);
  const [index, setIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const [log, setLog] = useState("No viewer event yet");
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const [inlineShown, setInlineShown] = useState(false);

  const host = useMemo<ImageViewerHost>(
    () => ({
      saveFile: async ({ fileName, source }) => {
        setLog(`Host saved ${fileName} (${source.size} bytes)`);

        return { path: `/downloads/${fileName}` };
      },
    }),
    []
  );

  const cannotSave = useMemo<ImageViewerHost>(() => ({ saveFile: null }), []);

  const src = SOURCES[index] ?? SOURCES[0] ?? "";

  const common: ImageViewerDialogProps = {
    alt: `Photo ${index + 1}`,
    onOpenChange: (open) => {
      if (!open) {
        setActive(null);
      }
    },
    open: active !== null,
    src,
  };

  const downloadEvents = {
    onDownloadClick: () => {
      setLog("Download clicked");
    },
    onDownloadFailure: () => {
      setLog("Download failed");
    },
    onDownloaded: () => {
      setLog("Download finished");
    },
  };

  const variants: Partial<Record<VariantKey, Partial<ImageViewerDialogProps>>> =
    {
      "disabled-zoom": { showZoomControls: false },
      "download-custom": {
        onDownload: () => {
          setLog("Custom download handler ran");
        },
        onDownloadClick: () => {
          setLog("Download clicked, then the custom handler ran");
        },
      },
      "download-failure": { downloadSrc: src, ...downloadEvents },
      "download-host": { downloadSrc: src, ...downloadEvents },
      "download-link": {
        downloadFileName: "trip.png",
        downloadSrc: "https://example.test/photos/trip.png",
        onDownloadClick: () => {
          setLog("Link download clicked");
        },
      },
      navigation: {
        nextDisabled: index === SOURCES.length - 1,
        onNextImage: () => {
          setIndex((previous) => Math.min(SOURCES.length - 1, previous + 1));
        },
        onPreviousImage: () => {
          setIndex((previous) => Math.max(0, previous - 1));
        },
        previousDisabled: index === 0,
      },
      "non-modal": { modal: false },
      preview: {
        previewContent: (
          <div
            className="m-auto flex size-64 items-center justify-center rounded-lg bg-panel text-text"
            data-testid="own-preview"
          >
            Own preview
          </div>
        ),
      },
      "render-preview": {
        renderPreview: ({ imageRef }) => (
          <div
            className="m-auto flex size-64 items-center justify-center rounded-lg bg-panel text-text"
            data-testid="rendered-preview"
            ref={imageRef}
          >
            Rendered preview
          </div>
        ),
      },
      slots: {
        bottomContent: <p data-testid="slot-bottom">Bottom slot</p>,
        caption: "  A caption under the photo  ",
        headerContent: (
          <p
            className="absolute top-3 left-3 text-text"
            data-testid="slot-header"
          >
            Header slot
          </p>
        ),
        renderBottomAction: (className) => (
          <button className={className} data-testid="slot-action" type="button">
            Bottom action
          </button>
        ),
      },
      surface: {
        controlsSurface: "translucent",
        disableOpenAnimation: true,
        imageDecoding: "async",
        imageDisplaySize: WIDE,
        imageDraggable: false,
        imageFetchPriority: "high",
        imageLoading: "eager",
        imageSurface: "card",
      },
      toolbar: {
        editButton: {
          ariaLabel: "Edit image",
          icon: <Pencil className="size-4" />,
          onClick: () => {
            setLog("Edit pressed");
          },
        },
        toolbarActions: [
          {
            ariaLabel: "Share image",
            icon: <Share2 className="size-4" />,
            onClick: () => {
              setLog("Share pressed");
            },
          },
        ],
        toolbarContent: (
          <span
            className="self-center text-sm text-text"
            data-testid="toolbar-slot"
          >
            Toolbar slot
          </span>
        ),
        toolbarLeadingAction: {
          active: compare,
          ariaLabel: "Compare with original",
          label: "Compare",
          onClick: () => {
            setCompare((previous) => !previous);
          },
        },
      },
      trigger: {
        triggerContent: (
          <span data-testid="viewer-trigger">Open from trigger</span>
        ),
      },
      zoomable: {
        zoomableContent: {
          content: (
            <div
              className="flex size-full items-center justify-center bg-panel text-text"
              data-testid="zoomable-block"
            >
              Zoomable block
            </div>
          ),
          height: 300,
          width: 400,
        },
      },
    };

  const overlay = active === "overlay";
  const contained = active === "contained";

  const props: ImageViewerDialogProps = {
    ...common,
    ...(active === null ? undefined : variants[active]),
  };

  if (overlay) {
    props.presentation = "overlay";
  }

  if (contained) {
    props.containedInPortal = true;
    props.containerResizeEdges = "all";
  }

  const viewer = (
    <ImageViewerHostContext
      value={active === "download-failure" ? cannotSave : host}
    >
      {/* The anchor of the https download is stopped here so the gallery stays open. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        onClickCapture={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a[download]") !== null
          ) {
            event.preventDefault();
          }
        }}
      >
        <ImageViewerDialog {...props} />
      </div>
    </ImageViewerHostContext>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((variant) => (
          <Button
            color="outlineSurface"
            data-testid={`open-${variant.key}`}
            key={variant.key}
            onClick={() => {
              setActive(variant.key);
            }}
            size="dialog"
          >
            {variant.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" data-testid="viewer-log">
        {log}
      </p>
      <Frame
        label="Inline viewer: no dialog, the content renders in place (it still counts as an open viewer while shown)"
        testId="viewer-inline"
      >
        <Button
          color="outlineSurface"
          onClick={() => {
            setInlineShown((previous) => !previous);
          }}
          size="dialog"
        >
          {inlineShown ? "Hide the inline viewer" : "Show the inline viewer"}
        </Button>
        {inlineShown ? (
          <div className="mt-2 h-80">
            <ImageViewerDialog
              alt="Inline photo"
              inline
              onOpenChange={noop}
              open
              src={SOURCES[1] ?? ""}
            />
          </div>
        ) : null}
      </Frame>
      <Frame
        label="Portal frame: a contained viewer renders inside this box"
        testId="viewer-frame"
      >
        <div
          className="relative h-80 overflow-hidden rounded-lg border"
          data-testid="viewer-frame-box"
          ref={setFrame}
        >
          <ImageViewerPortalContext value={frame}>
            {contained ? viewer : null}
          </ImageViewerPortalContext>
        </div>
      </Frame>
      {contained ? null : viewer}
    </div>
  );
};

export const CarouselViewerExamples = () => (
  <>
    <Section
      description="While a viewer is open it registers with the host zoom bridge. The stub below plays the desktop menu: it sends step-zoom and reset-zoom, and reads whether any viewer is open."
      id="viewer-bridge"
      title="Host zoom bridge"
    >
      <HostMenuStub />
    </Section>
    <Section
      description="Each button opens the viewer with one group of its options. Turn on the Windows, Electron and compact flags first to see the close buttons move."
      id="viewer-options"
      title="Image viewer options"
    >
      <WindowFlags>
        <ViewerVariants />
      </WindowFlags>
    </Section>
  </>
);
