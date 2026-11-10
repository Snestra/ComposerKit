"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values, shadcn/no-inline-styles -- The gallery draws measured frames and generates its example photos as inline SVG. */

import { Button } from "@workspace/react/components/ui/button";
import {
  BaseCarousel,
  ImageGroupCarousel,
  OptionCarousel,
  useCarousel,
} from "@workspace/react/components/ui/carousel";
import type {
  ImageGroupCarouselHandle,
  OptionCarouselLayout,
} from "@workspace/react/components/ui/carousel";
import {
  ReducedMotionProvider,
  useReducedMotion,
} from "@workspace/react/lib/reduced-motion";
import type { ReducedMotionPreference } from "@workspace/react/lib/reduced-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";
import { CarouselAssetExamples } from "@/examples/carousel-asset-examples";
import { Frame, Section, photos } from "@/examples/carousel-gallery-parts";
import { CarouselViewerExamples } from "@/examples/carousel-viewer-examples";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const Card = ({ children, tall }: { children: ReactNode; tall: boolean }) => (
  <div
    className={`flex w-40 shrink-0 snap-start items-center justify-center rounded-xl border bg-panel text-sm ${tall ? "h-32" : "h-24"}`}
  >
    {children}
  </div>
);

const cards = (count: number, prefix = "Card", tall = false) =>
  Array.from({ length: count }, (_, index) => (
    <Card key={index} tall={tall}>
      {`${prefix} ${index + 1}`}
    </Card>
  ));

/* ------------------------------------------------------ base carousel --- */

const BaseDemo = ({ count, testId }: { count: number; testId: string }) => {
  const { actions, model } = useCarousel();

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <Button
          aria-label="Previous"
          color="outlineSurface"
          disabled={!model.canPrevious}
          onClick={() => {
            actions.previous();
          }}
          size="dialog"
          uniform
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          aria-label="Next"
          color="outlineSurface"
          disabled={!model.canNext}
          onClick={() => {
            actions.next();
          }}
          size="dialog"
          uniform
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {`canPrevious ${String(model.canPrevious)}, canNext ${String(model.canNext)}`}
        </span>
      </div>
      <BaseCarousel label="Example cards" viewportRef={actions.viewportRef}>
        {cards(count)}
      </BaseCarousel>
    </div>
  );
};

const BaseExamples = () => (
  <Section
    description="The source viewport is a focusable section. Previous and next scroll by 0.85 of the viewport width, and the arrows disable at the ends. With a single card both stay disabled."
    id="base"
    title="Base carousel"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <Frame label="Eight cards" testId="base-many">
        <BaseDemo count={8} testId="base-many-demo" />
      </Frame>
      <Frame label="One card (nothing to scroll)" testId="base-single">
        <BaseDemo count={1} testId="base-single-demo" />
      </Frame>
    </div>
  </Section>
);

/* ----------------------------------------------------- option carousel --- */

const OptionDemo = ({
  count,
  header,
  invalid,
  label,
  layout,
  reducedMotion,
  testId,
}: {
  count: number;
  header?: ReactNode;
  invalid?: boolean;
  label: string;
  layout: OptionCarouselLayout;
  reducedMotion?: boolean;
  testId: string;
}) => (
  <Frame label={label} testId={testId}>
    <OptionCarousel
      ariaInvalid={invalid}
      ariaLabel={`${label} options`}
      backLabel="Back"
      forwardLabel="Forward"
      header={header}
      layout={layout}
      shouldUseReducedMotion={reducedMotion}
    >
      {cards(count, "Option", layout === "form")}
    </OptionCarousel>
  </Frame>
);

const OptionReducedMotionToggle = ({
  onChange,
  preference,
}: {
  onChange: (preference: ReducedMotionPreference) => void;
  preference: ReducedMotionPreference;
}) => (
  <div className="flex items-center gap-2">
    <Button
      aria-pressed={preference === "on"}
      color="outlineSurface"
      data-testid="option-reduced-motion"
      onClick={() => {
        onChange(preference === "on" ? "system" : "on");
      }}
      size="dialog"
    >
      {preference === "on" ? "Reduced motion: on" : "Reduced motion: system"}
    </Button>
    <span className="text-xs text-muted-foreground">
      Arrow presses scroll instantly when it is on.
    </span>
  </div>
);

const OptionLayouts = () => {
  const reduced = useReducedMotion();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionDemo
        count={8}
        header={<span className="text-sm font-medium">Choose one</span>}
        label="Form, with header"
        layout="form"
        reducedMotion={reduced}
        testId="option-form-header"
      />
      <OptionDemo
        count={8}
        label="Form, no header (arrows overlay the track)"
        layout="form"
        reducedMotion={reduced}
        testId="option-form"
      />
      <OptionDemo
        count={8}
        header={<span className="text-sm font-medium">Gallery</span>}
        label="Gallery"
        layout="gallery"
        reducedMotion={reduced}
        testId="option-gallery"
      />
      <OptionDemo
        count={8}
        header={<span className="text-sm font-medium">Compact</span>}
        label="Compact"
        layout="compact"
        reducedMotion={reduced}
        testId="option-compact"
      />
      <OptionDemo
        count={2}
        header={<span className="text-sm font-medium">Two options</span>}
        label="Gallery, nothing to scroll (arrows disabled)"
        layout="gallery"
        reducedMotion={reduced}
        testId="option-gallery-short"
      />
      <OptionDemo
        count={8}
        header={<span className="text-sm font-medium">Required</span>}
        invalid
        label="Form, invalid (aria-invalid)"
        layout="form"
        reducedMotion={reduced}
        testId="option-invalid"
      />
    </div>
  );
};

const OptionExamples = () => {
  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  return (
    <Section
      description="Three layouts. Form overlays its arrows on the track and hides the one that cannot scroll. Gallery and compact keep the arrows in a header row and disable them. The first card of the form layout snaps to the scroll padding."
      id="option"
      title="Option carousel"
    >
      <ReducedMotionProvider preference={preference}>
        <OptionReducedMotionToggle
          onChange={setPreference}
          preference={preference}
        />
        <OptionLayouts />
      </ReducedMotionProvider>
    </Section>
  );
};

/* ------------------------------------------------------ image carousel --- */

const sidebarFrame = "mx-auto w-96 max-w-full px-6";

const ImageExamples = () => {
  const [arrowLog, setArrowLog] = useState("No arrow pressed yet");
  const [thumbnailLog, setThumbnailLog] = useState("No thumbnail read yet");
  const handleRef = useRef<ImageGroupCarouselHandle>(null);

  return (
    <Section
      description="The photo carousel of an entity panel. Hover or focus it to show the arrows. ArrowLeft and ArrowRight move one photo, and next wraps from the last photo to the first. A photo opens the full-size viewer."
      id="images"
      title="Photo carousel"
    >
      <p
        className="text-xs text-muted-foreground"
        data-testid="image-arrow-log"
      >
        {arrowLog}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Frame label="Sidebar presentation, five photos" testId="image-sidebar">
          <div className={sidebarFrame}>
            <ImageGroupCarousel
              images={photos(5)}
              onArrowClick={(direction, index) => {
                setArrowLog(`Arrow ${direction} to photo ${index + 1}`);
              }}
              ref={handleRef}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button
                color="outlineSurface"
                onClick={() => {
                  const thumbnail = handleRef.current?.getThumbnail("photo-2");

                  setThumbnailLog(
                    thumbnail === null || thumbnail === undefined
                      ? "No thumbnail for photo-2"
                      : `Thumbnail for photo-2: ${thumbnail.naturalWidth} x ${thumbnail.naturalHeight}`
                  );
                }}
                size="dialog"
              >
                Read photo 2 thumbnail
              </Button>
              <span
                className="text-xs text-muted-foreground"
                data-testid="image-thumbnail-log"
              >
                {thumbnailLog}
              </span>
            </div>
          </div>
        </Frame>
        <Frame label="Dialog presentation, five photos" testId="image-dialog">
          <div className={sidebarFrame}>
            <ImageGroupCarousel images={photos(5)} presentation="dialog" />
          </div>
        </Frame>
        <Frame label="One photo (no arrows or dots)" testId="image-single">
          <div className={sidebarFrame}>
            <ImageGroupCarousel images={photos(1)} />
          </div>
        </Frame>
        <Frame
          label="Twenty-five photos (no dots above twenty)"
          testId="image-many"
        >
          <div className={sidebarFrame}>
            <ImageGroupCarousel images={photos(25)} />
          </div>
        </Frame>
        <Frame
          label="Loading: no source yet (placeholder)"
          testId="image-loading"
        >
          <div className={sidebarFrame}>
            <ImageGroupCarousel
              images={[
                { id: "pending-1", src: "" },
                { id: "pending-2", src: "" },
              ]}
            />
          </div>
        </Frame>
        <Frame
          label="Error: the preview fails, the photo source loads"
          testId="image-error"
        >
          <div className={sidebarFrame}>
            <ImageGroupCarousel
              images={photos(3).map((image) => ({
                ...image,
                previewSrc: "/gallery-missing-preview.png",
              }))}
            />
          </div>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------- RTL --- */

const RtlExample = () => (
  <Section
    description="In a right-to-left container the arrow chevrons turn around, the scroll range runs through negative scrollLeft, and ArrowLeft moves forward."
    id="rtl"
    title="Right to left"
  >
    <div className="grid gap-4 md:grid-cols-2" dir="rtl" lang="ar">
      <OptionDemo
        count={8}
        header={<span className="text-sm font-medium">Choose one</span>}
        label="Gallery (RTL)"
        layout="gallery"
        testId="rtl-option-gallery"
      />
      <OptionDemo
        count={8}
        label="Form (RTL)"
        layout="form"
        testId="rtl-option-form"
      />
      <Frame label="Photos (RTL)" testId="rtl-images">
        <div className={sidebarFrame}>
          <ImageGroupCarousel images={photos(5)} />
        </div>
      </Frame>
      <Frame label="Base (RTL)" testId="rtl-base">
        <BaseDemo count={8} testId="rtl-base-demo" />
      </Frame>
    </div>
  </Section>
);

/* ------------------------------------------------------- appearance --- */

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex min-w-0 flex-col gap-3">
    <OptionCarousel
      ariaLabel={`${prefix} options`}
      backLabel="Back"
      forwardLabel="Forward"
      header={<span className="text-sm font-medium">Gallery</span>}
      layout="gallery"
    >
      {cards(6, "Option")}
    </OptionCarousel>
    <div className={sidebarFrame}>
      <ImageGroupCarousel images={photos(4).slice(0, 4)} />
    </div>
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

const CarouselGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Carousel</h1>
      <AppearanceControl id="carousel-appearance" />
    </header>
    <BaseExamples />
    <OptionExamples />
    <ImageExamples />
    <CarouselAssetExamples />
    <CarouselViewerExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { CarouselGalleryExample };
