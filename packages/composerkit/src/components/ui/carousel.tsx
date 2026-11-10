"use client";

/* oxlint-disable react/no-react-children, shadcn/no-restyle -- The carousel counts children and uses unstyled buttons for dots and photo slides. */

import {
  ChevronLeft20Icon,
  ChevronRightGallery16Icon,
  ChevronRight16Icon,
  ChevronRight20Icon,
} from "composerkit/components/carousel/icons";
import { useGeneratedImageSource } from "composerkit/components/carousel/image-source";
import type { ImageAssetResolver } from "composerkit/components/carousel/image-source";
import { ImageViewerDialog } from "composerkit/components/carousel/image-viewer";
import { Button } from "composerkit/components/ui/button";
import type { LayerEvent } from "composerkit/lib/dismissable-layer";
import { cn } from "composerkit/lib/utils";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  Ref,
  UIEvent,
} from "react";

import styles from "./carousel.module.css";

type ScrollDirection = "ltr" | "rtl";

const HIDE_SCROLLBAR =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** The reduced-motion variant is the root attribute, else the media query. */
const NO_SMOOTH_SCROLL =
  "[:root[data-ck-reduced-motion=true]_&]:scroll-auto motion-reduce:[:root:not([data-ck-reduced-motion])_&]:scroll-auto";

const NO_TRANSITION =
  "[:root[data-ck-reduced-motion=true]_&]:transition-none motion-reduce:[:root:not([data-ck-reduced-motion])_&]:transition-none";

/** An effect or ref cleanup for the paths that set nothing up. */
const noCleanup = () => {
  // Nothing was set up, so there is nothing to undo.
};

const clampBetween = (value: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, value));

/* ------------------------------------------------------- scroll targets --- */

const scrollPaddingStart = (
  element: HTMLElement,
  direction: ScrollDirection
) => {
  const style = getComputedStyle(element);

  // The computed scroll padding is a length such as "16px": Number("16px") is NaN, parseFloat reads it.
  // oxlint-disable-next-line unicorn/prefer-number-coercion
  const padding = Number.parseFloat(
    direction === "rtl" ? style.scrollPaddingRight : style.scrollPaddingLeft
  );

  return Number.isNaN(padding) ? 0 : padding;
};

/** Where a child starts, as a scrollLeft. */
const childScrollStart = (
  element: HTMLElement,
  child: HTMLElement,
  direction: ScrollDirection
) =>
  direction === "rtl"
    ? child.offsetLeft -
      element.offsetLeft +
      child.offsetWidth -
      element.clientWidth +
      scrollPaddingStart(element, direction)
    : child.offsetLeft -
      element.offsetLeft -
      scrollPaddingStart(element, direction);

/** The smallest and largest scrollLeft. */
const carouselScrollBounds = (
  element: HTMLElement,
  direction: ScrollDirection = "ltr"
) => {
  const range = Math.max(0, element.scrollWidth - element.clientWidth);

  if (direction === "rtl") {
    return { maximum: 0, minimum: -range };
  }

  const first = element.firstElementChild;

  return {
    maximum: range,
    minimum: Math.min(
      range,
      first instanceof HTMLElement
        ? Math.max(0, childScrollStart(element, first, direction))
        : 0
    ),
  };
};

/**
 * The scrollLeft an arrow press scrolls to.
 * It aims one viewport (less the scroll padding) ahead, then snaps to the
 * first child start at or beyond that point.
 */
const carouselScrollTarget = (
  element: HTMLElement,
  step: -1 | 1,
  direction: ScrollDirection = "ltr"
) => {
  const { maximum, minimum } = carouselScrollBounds(element, direction);
  const physical = direction === "rtl" ? -step : step;

  const aim = clampBetween(
    element.scrollLeft +
      physical * (element.clientWidth - scrollPaddingStart(element, direction)),
    minimum,
    maximum
  );

  const { children } = element;

  for (
    let index = step === 1 ? 0 : children.length - 1;
    index >= 0 && index < children.length;
    index += step
  ) {
    const child = children.item(index);

    if (!(child instanceof HTMLElement)) {
      continue;
    }

    const start = clampBetween(
      childScrollStart(element, child, direction),
      minimum,
      maximum
    );

    if (
      (physical === 1 && start >= aim - 1) ||
      (physical === -1 && start <= aim + 1)
    ) {
      return start;
    }
  }

  return physical === 1 ? maximum : minimum;
};

/* ----------------------------------------------------------- useCarousel --- */

interface CarouselModel {
  canNext: boolean;
  canPrevious: boolean;
}

/** Viewport scroll share of one press of previous or next. */
const SCROLL_SHARE = 0.85;

/**
 * The scroll state of a viewport and the actions
 * that move it. `viewportRef` is a state setter, so it takes the element.
 */
export const useCarousel = () => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const [model, setModel] = useState<CarouselModel>({
    canNext: false,
    canPrevious: false,
  });

  useLayoutEffect(() => {
    if (viewport === null) {
      return noCleanup;
    }

    const refresh = () => {
      const range = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const offset = Math.min(range, Math.abs(viewport.scrollLeft));
      const canPrevious = offset > 1;
      const canNext = offset < range - 1;

      setModel((current) =>
        current.canPrevious === canPrevious && current.canNext === canNext
          ? current
          : { canNext, canPrevious }
      );
    };

    refresh();
    viewport.addEventListener("scroll", refresh, { passive: true });

    const resizeObserver = new ResizeObserver(refresh);

    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);

      for (const child of viewport.children) {
        resizeObserver.observe(child);
      }

      refresh();
    };

    const mutationObserver = new MutationObserver(observeChildren);
    mutationObserver.observe(viewport, { childList: true });
    observeChildren();

    return () => {
      viewport.removeEventListener("scroll", refresh);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [viewport]);

  const scroll = useCallback(
    (step: -1 | 1) => {
      if (viewport === null) {
        return;
      }

      const view = viewport.ownerDocument.defaultView;
      const rtl = view?.getComputedStyle(viewport).direction === "rtl";

      const reduceMotion =
        view?.matchMedia("(prefers-reduced-motion: reduce)").matches === true;

      viewport.scrollBy({
        behavior: reduceMotion ? "instant" : "smooth",
        left: step * (rtl ? -1 : 1) * viewport.clientWidth * SCROLL_SHARE,
      });
    },
    [viewport]
  );

  return {
    actions: {
      next: () => {
        scroll(1);
      },
      previous: () => {
        scroll(-1);
      },
      viewportRef: setViewport,
    },
    model,
  };
};

/* -------------------------------------------------------------- BaseCarousel --- */

export interface BaseCarouselProps {
  children?: ReactNode;
  className?: string;
  label: string;
  viewportRef?: Ref<HTMLElement>;
}

/** The focusable scroll viewport. */
export const BaseCarousel = ({
  children,
  className,
  label,
  viewportRef,
}: BaseCarouselProps) => (
  <section
    aria-label={label}
    className={cn(
      // oxlint-disable-next-line shadcn/no-unknown-classes -- hook class kept as a styling target.
      "ck-carousel-track flex min-w-0 gap-4 overflow-x-auto overscroll-x-contain pb-1",
      HIDE_SCROLLBAR,
      className
    )}
    ref={viewportRef}
    // The viewport is a tab stop so the keyboard can scroll it.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    tabIndex={0}
  >
    {children}
  </section>
);

/* ------------------------------------------------------ CarouselPagination --- */

export interface CarouselPaginationProps {
  activeIndex: number;
  count: number;
  getPageLabel: (index: number) => string;
  onSelect: (index: number) => void;
}

/** One dot button per page in a scrim pill. */
export const CarouselPagination = ({
  activeIndex,
  count,
  getPageLabel,
  onSelect,
}: CarouselPaginationProps) => (
  <div className="flex w-fit items-center justify-center rounded-full bg-(--color-media-surface)/40 bg-clip-padding p-0.75 backdrop-blur select-none">
    {Array.from({ length: count }, (_, index) => (
      <Button
        aria-current={index === activeIndex ? "true" : undefined}
        aria-label={getPageLabel(index)}
        className="shrink-0 cursor-(--ck-action-cursor) justify-center rounded-full p-0.75 focus-visible:ring-2 focus-visible:ring-ring"
        disabledAppearance="none"
        focusRing="none"
        key={index}
        onClick={() => {
          onSelect(index);
        }}
        unstyled
      >
        <span
          className={cn(
            "pointer-events-none h-1 rounded-full bg-white transition-[width,opacity] duration-(--motion-duration-fast) ease-out",
            NO_TRANSITION,
            index === activeIndex ? "w-3 opacity-100" : "w-1 opacity-40"
          )}
        />
      </Button>
    ))}
  </div>
);

/* --------------------------------------------------------------- OptionCarousel --- */

export type OptionCarouselLayout = "compact" | "form" | "gallery";

/** The arrow Button colour and size of each layout. */
const OPTION_ARROW_BUTTON = {
  compact: { color: "ghost", size: "compact" },
  form: { color: "secondarySurface", size: "actionSm" },
  gallery: { color: "outlineSurface", size: "dialog" },
} as const;

/**
 * A callback whose identity never changes and
 * which always runs the latest function.
 */
const useStableCallback = <Args extends unknown[], Result>(
  latestFn: (...args: Args) => Result
) => {
  const latest = useRef(latestFn);

  useInsertionEffect(() => {
    latest.current = latestFn;
  });

  return useCallback((...args: Args) => latest.current(...args), []);
};

export interface OptionCarouselProps {
  ariaInvalid?: boolean;
  ariaLabel?: string;
  backLabel?: string;
  children?: ReactNode;
  forwardLabel?: string;
  header?: ReactNode;
  layout?: OptionCarouselLayout;
  role?: string;
  shouldUseReducedMotion?: boolean;
}

/**
 * A snapping row of options with back and
 * forward arrows. Form puts the arrows over the track, gallery and compact
 * put them in a header row.
 */
export const OptionCarousel = ({
  ariaInvalid,
  ariaLabel,
  backLabel,
  children,
  forwardLabel,
  header,
  layout = "form",
  role = "group",
  shouldUseReducedMotion,
}: OptionCarouselProps) => {
  const childCount = Children.count(children);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [direction, setDirection] = useState<ScrollDirection>("ltr");
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const measure = useStableCallback((element: HTMLElement) => {
    const next = getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
    setDirection(next);

    const { maximum, minimum } = carouselScrollBounds(element, next);

    if (next === "rtl") {
      setCanBack(element.scrollLeft < maximum - 1);
      setCanForward(element.scrollLeft > minimum + 1);
    } else {
      setCanBack(element.scrollLeft > minimum + 1);
      setCanForward(element.scrollLeft < maximum - 1);
    }
  });

  // A callback ref that returns a cleanup.
  const attachTrack = useCallback(
    (element: HTMLDivElement | null) => {
      trackRef.current = element;

      if (element === null || childCount === 0) {
        return noCleanup;
      }

      measure(element);

      if (typeof ResizeObserver === "undefined") {
        return noCleanup;
      }

      const refresh = () => {
        measure(element);
      };

      const resizeObserver = new ResizeObserver(refresh);
      const mutationObserver = new MutationObserver(refresh);
      mutationObserver.observe(element, { childList: true });
      resizeObserver.observe(element);

      if (element.firstElementChild !== null) {
        resizeObserver.observe(element.firstElementChild);
      }

      if (element.lastElementChild !== null) {
        resizeObserver.observe(element.lastElementChild);
      }

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        trackRef.current = null;
      };
    },
    [childCount, measure]
  );

  const scrollToward = (step: -1 | 1) => {
    const track = trackRef.current;

    if (track === null) {
      return;
    }

    track.scrollTo({
      behavior: shouldUseReducedMotion === true ? "instant" : "smooth",
      left: carouselScrollTarget(
        track,
        step,
        getComputedStyle(track).direction === "rtl" ? "rtl" : "ltr"
      ),
    });
  };

  const isForm = layout === "form";
  const isGallery = layout === "gallery";
  const isCompact = layout === "compact";

  const arrows = (
    <div
      className={cn(
        "flex items-center",
        isForm &&
          "pointer-events-none absolute inset-x-0 top-1 z-10 h-34 justify-between px-3",
        isGallery && "gap-2"
      )}
    >
      {([-1, 1] as const).map((step) => {
        const enabled = step === -1 ? canBack : canForward;
        const label = step === -1 ? backLabel : forwardLabel;

        const Chevron = isGallery
          ? ChevronRightGallery16Icon
          : ChevronRight16Icon;

        return (
          <Button
            aria-label={label}
            className={cn(
              "pointer-events-auto",
              isForm && !enabled && "invisible"
            )}
            disabled={!enabled}
            key={step}
            onClick={() => {
              scrollToward(step);
            }}
            radius={isCompact ? undefined : "full"}
            title={label}
            uniform
            {...OPTION_ARROW_BUTTON[layout]}
          >
            <Chevron
              className={
                step === (direction === "rtl" ? 1 : -1)
                  ? "rotate-180"
                  : undefined
              }
            />
          </Button>
        );
      })}
    </div>
  );

  const showHeader = header !== null && header !== undefined ? true : !isForm;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        isGallery && "gap-4",
        isCompact && "gap-2",
        isForm && "gap-1.5"
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            "flex min-w-0 items-center",
            isForm && "gap-1 px-4 py-1.5",
            isCompact && "gap-3",
            isGallery && "min-h-9 gap-3"
          )}
        >
          <div className="min-w-0 flex-1">{header}</div>
          {isForm ? null : arrows}
        </div>
      ) : null}
      <div className="relative min-w-0">
        <div
          aria-invalid={ariaInvalid === true ? true : undefined}
          aria-label={ariaLabel}
          className={cn(
            "flex overflow-x-auto overscroll-x-contain",
            HIDE_SCROLLBAR,
            isForm
              ? "snap-x snap-mandatory scroll-px-4 gap-4 px-4 py-1"
              : "-my-1.5 py-1.5",
            isGallery && "gap-3",
            isCompact && "gap-2"
          )}
          data-ck-horizontal-scroll
          onScroll={(event: UIEvent<HTMLDivElement>) => {
            measure(event.currentTarget);
          }}
          ref={attachTrack}
          role={role}
        >
          {children}
        </div>
        {isForm ? arrows : null}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------- ImageGroupCarousel --- */

export interface CarouselImage {
  height?: number | null;
  id: string;
  previewSrc?: string | null;
  src: string;
  width?: number | null;
}

export type ImageGroupPresentation = "dialog" | "sidebar";

export interface ImageGroupCarouselHandle {
  getThumbnail: (imageId: string) => HTMLImageElement | null;
}

/**
 * Image group messages. `{number}` is the one-based photo
 * position.
 */
export interface ImageGroupCarouselLabels {
  carouselRole: string;
  goToPhoto: string;
  nextPhoto: string;
  openPhoto: string;
  photoAlt: string;
  photos: string;
  previousPhoto: string;
}

const DEFAULT_IMAGE_GROUP_LABELS: ImageGroupCarouselLabels = {
  carouselRole: "carousel",
  goToPhoto: "Go to photo {number}",
  nextPhoto: "Next photo",
  openPhoto: "Open photo {number}",
  photoAlt: "Photo {number}",
  photos: "Photos",
  previousPhoto: "Previous photo",
};

const numbered = (template: string, number: number) =>
  template.replace("{number}", String(number));

/** A ref the region element is attached to. */
export const ImageGroupCarouselRegionContext =
  createContext<Ref<HTMLElement> | null>(null);

/** The pager shows page dots for up to this many photos. */
const MAX_PAGINATION_PHOTOS = 20;

/** The scrollLeft that brings slide `index` into view. */
const slideScrollLeft = (track: HTMLElement, index: number) => {
  const slide = track.children.item(index);

  if (!(slide instanceof HTMLElement)) {
    return 0;
  }

  const rtl = getComputedStyle(track).direction === "rtl";
  const range = track.scrollWidth - track.clientWidth;
  let start = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;

  if (index === 0) {
    start = 0;
  } else if (index === track.children.length - 1) {
    start = rtl
      ? slide.offsetLeft
      : slide.offsetLeft + slide.offsetWidth - track.clientWidth;
  }

  return rtl
    ? Math.max(-range, Math.min(0, start))
    : Math.max(0, Math.min(range, start));
};

/** The preview source until it fails to load, then the image source. */
const requestedSource = (image: CarouselImage, failedPreview: string | null) =>
  image.previewSrc !== null &&
  image.previewSrc !== undefined &&
  image.previewSrc !== failedPreview
    ? image.previewSrc
    : image.src;

/** A slide's intrinsic aspect ratio, as a custom property for the stylesheet. */
const slideAspectRatio = ({
  hasFallback,
  image,
  presentation,
  single,
}: {
  hasFallback: boolean;
  image: CarouselImage;
  presentation: ImageGroupPresentation;
  single: boolean;
}): string | undefined => {
  if (single || presentation === "dialog") {
    return undefined;
  }

  return hasFallback ? "5/4" : `${image.width ?? 1}/${image.height ?? 1}`;
};

interface ImageGroupSlideProps {
  conversationId?: string | null;
  fallbackSrc?: string;
  image: CarouselImage;
  imageAssetResolver?: ImageAssetResolver | null;
  imageNumber: number;
  imageRef: (element: HTMLImageElement | null) => (() => void) | undefined;
  labels: ImageGroupCarouselLabels;
  onOpen: (trigger: HTMLButtonElement) => void;
  presentation: ImageGroupPresentation;
  single: boolean;
}

/**
 * One photo button. The preview source is
 * the image's `previewSrc` until it fails to load, then its `src`.
 */
const ImageGroupSlide = ({
  conversationId,
  fallbackSrc,
  image,
  imageAssetResolver,
  imageNumber,
  imageRef,
  labels,
  onOpen,
  presentation,
  single,
}: ImageGroupSlideProps) => {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);

  const { previewSrc } = useGeneratedImageSource({
    conversationId,
    imageAssetResolver,
    shouldLoadFileDataUrl: false,
    src: requestedSource(image, failedPreview),
  });

  const hasFallback = fallbackSrc !== undefined;

  const showFallback =
    hasFallback && (previewSrc === null || loadedSrc !== previewSrc);

  const aspectRatio = slideAspectRatio({
    hasFallback,
    image,
    presentation,
    single,
  });

  // On a server-rendered page the browser can finish loading the photo before
  // React attaches onLoad and onError, so the ref reads the settled state.
  const attachPhoto = useCallback(
    (element: HTMLImageElement | null) => {
      if (element === null) {
        return noCleanup;
      }

      if (element.complete) {
        if (element.naturalWidth > 0) {
          setLoadedSrc(previewSrc);
        } else {
          setFailedPreview(image.previewSrc ?? null);
        }
      }

      return showFallback ? noCleanup : (imageRef(element) ?? noCleanup);
    },
    [image.previewSrc, imageRef, previewSrc, showFallback]
  );

  const slideStyle:
    | (CSSProperties & Record<`--${string}`, string>)
    | undefined =
    aspectRatio === undefined ? undefined : { "--slide-aspect": aspectRatio };

  return (
    <Button
      aria-label={numbered(labels.openPhoto, imageNumber)}
      className={cn(
        "relative h-full shrink-0 cursor-(--ck-action-cursor) snap-center overflow-hidden bg-panel-secondary first:snap-start last:snap-end focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        aspectRatio !== undefined && "aspect-(--slide-aspect)",
        single && "w-full",
        !single && (presentation === "dialog" ? "w-2/3" : "max-w-19/20")
      )}
      disabledAppearance="none"
      focusRing="none"
      onClick={(event) => {
        onOpen(event.currentTarget);
      }}
      style={slideStyle}
      unstyled
    >
      {previewSrc === null ? (
        <div className={cn("h-full w-full", styles.placeholder)} />
      ) : (
        // oxlint-disable-next-line nextjs/no-img-element -- photos come from arbitrary sources at runtime, with their own load and error handling.
        <img
          alt=""
          className={cn(
            "h-full w-full object-cover transition-opacity duration-(--motion-duration-fast) ease-(--ease-enter)",
            NO_TRANSITION,
            !hasFallback && loadedSrc !== previewSrc && "opacity-0"
          )}
          draggable={false}
          loading={hasFallback ? "eager" : "lazy"}
          onError={() => {
            setFailedPreview(image.previewSrc ?? null);
          }}
          onLoad={() => {
            setLoadedSrc(previewSrc);
          }}
          ref={attachPhoto}
          referrerPolicy="no-referrer"
          src={previewSrc}
        />
      )}
      {showFallback ? (
        // oxlint-disable-next-line nextjs/no-img-element -- the first photo's fallback shows while the preview loads.
        <img
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
          fetchPriority="high"
          loading="eager"
          ref={imageRef}
          referrerPolicy="no-referrer"
          src={fallbackSrc}
        />
      ) : null}
    </Button>
  );
};

interface ImageGroupViewerProps {
  alt: string;
  conversationId?: string | null;
  imageAssetResolver?: ImageAssetResolver | null;
  onClose: () => void;
  onCloseAutoFocus: (event: LayerEvent) => void;
  onNextImage?: () => void;
  onPreviousImage?: () => void;
  src: string;
}

/** The viewer, rendered only once the photo has a source. */
const ImageGroupViewer = ({
  alt,
  conversationId,
  imageAssetResolver,
  onClose,
  onCloseAutoFocus,
  onNextImage,
  onPreviousImage,
  src,
}: ImageGroupViewerProps) => {
  const { previewSrc } = useGeneratedImageSource({
    conversationId,
    imageAssetResolver,
    shouldLoadFileDataUrl: false,
    src,
  });

  return previewSrc === null ? null : (
    <ImageViewerDialog
      alt={alt}
      imageReferrerPolicy="no-referrer"
      onCloseAutoFocus={onCloseAutoFocus}
      onNextImage={onNextImage}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      onPreviousImage={onPreviousImage}
      open
      src={previewSrc}
    />
  );
};

export interface ImageGroupCarouselProps {
  conversationId?: string | null;
  firstPhotoFallbackSrc?: string;
  imageAssetResolver?: ImageAssetResolver | null;
  images: readonly CarouselImage[];
  labels?: Partial<ImageGroupCarouselLabels>;
  onArrowClick?: (direction: "next" | "previous", index: number) => void;
  /** Handles a slide activation; the carousel opens its own viewer when absent. */
  onOpenImage?: (index: number) => void;
  presentation?: ImageGroupPresentation;
  ref?: Ref<ImageGroupCarouselHandle>;
}

/**
 * The photo carousel of an entity panel.
 * Slides snap to the centre, arrows appear on hover or keyboard focus, the
 * dots page through up to 20 photos, and a slide opens a full-size viewer.
 */
export const ImageGroupCarousel = ({
  conversationId,
  firstPhotoFallbackSrc,
  imageAssetResolver,
  images,
  labels: labelOverrides,
  onArrowClick,
  onOpenImage,
  presentation = "sidebar",
  ref,
}: ImageGroupCarouselProps) => {
  const labels = { ...DEFAULT_IMAGE_GROUP_LABELS, ...labelOverrides };
  const regionRef = useContext(ImageGroupCarouselRegionContext);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const thumbnailsRef = useRef(new Map<string, HTMLImageElement>());
  const [index, setIndex] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getThumbnail: (imageId) => thumbnailsRef.current.get(imageId) ?? null,
  }));

  const openIndex = images.findIndex((image) => image.id === openId);
  const openImage = images[openIndex];
  const activeIndex = Math.min(index, images.length - 1);

  const scrollToIndex = (target: number) => {
    const track = trackRef.current;

    if (track === null) {
      return;
    }

    const left = slideScrollLeft(track, target);
    pendingTargetRef.current =
      Math.abs(track.scrollLeft - left) <= 1 ? null : left;
    track.scrollTo({ left });
    setIndex(target);
  };

  const syncActiveIndex = (track: HTMLElement) => {
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;

    for (let slide = 0; slide < images.length; slide += 1) {
      const gap = Math.abs(slideScrollLeft(track, slide) - track.scrollLeft);

      if (gap < distance) {
        distance = gap;
        nearest = slide;
      }
    }

    setIndex(nearest);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");

    scrollToIndex(
      forward ? (activeIndex + 1) % images.length : Math.max(0, activeIndex - 1)
    );
  };

  const hasMany = images.length > 1;

  return (
    <div
      className={cn("-mx-6", presentation === "sidebar" && "mb-5")}
      data-testid="image-group-carousel"
    >
      {/* The region takes the arrow keys itself, like the carousel widget. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section
        aria-label={labels.photos}
        aria-roledescription={labels.carouselRole}
        className={cn(
          "group/photos relative overflow-hidden select-none",
          presentation === "dialog" ? "h-56 sm:h-64" : "aspect-5/4"
        )}
        data-ck-entity-photos
        onKeyDown={onKeyDown}
        ref={regionRef}
      >
        <div
          className={cn(
            "relative flex h-full snap-x snap-mandatory gap-0.5 overflow-x-auto scroll-smooth",
            HIDE_SCROLLBAR,
            NO_SMOOTH_SCROLL
          )}
          onPointerDown={() => {
            pendingTargetRef.current = null;
          }}
          onScroll={(event) => {
            const track = event.currentTarget;
            const pending = pendingTargetRef.current;

            if (pending === null) {
              syncActiveIndex(track);
            } else if (Math.abs(track.scrollLeft - pending) <= 1) {
              pendingTargetRef.current = null;
            }
          }}
          onScrollEnd={(event) => {
            pendingTargetRef.current = null;
            syncActiveIndex(event.currentTarget);
          }}
          onWheel={() => {
            pendingTargetRef.current = null;
          }}
          ref={trackRef}
        >
          {images.map((image, position) => (
            <ImageGroupSlide
              conversationId={conversationId}
              fallbackSrc={position === 0 ? firstPhotoFallbackSrc : undefined}
              image={image}
              imageAssetResolver={imageAssetResolver}
              imageNumber={position + 1}
              imageRef={(element) => {
                if (element === null) {
                  return noCleanup;
                }

                thumbnailsRef.current.set(image.id, element);

                return () => {
                  if (thumbnailsRef.current.get(image.id) === element) {
                    thumbnailsRef.current.delete(image.id);
                  }
                };
              }}
              key={image.id}
              labels={labels}
              onOpen={(trigger) => {
                if (onOpenImage === undefined) {
                  openerRef.current = trigger;
                  setOpenId(image.id);
                } else {
                  onOpenImage(position);
                }
              }}
              presentation={presentation}
              single={images.length === 1}
            />
          ))}
        </div>
        {hasMany ? (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between opacity-0 group-hover/photos:opacity-100 group-hover/photos:*:pointer-events-auto group-has-[:focus-visible]/photos:opacity-100 group-has-[:focus-visible]/photos:*:pointer-events-auto">
              <Button
                aria-label={labels.previousPhoto}
                className={activeIndex === 0 ? "invisible" : undefined}
                color="mediaSolid"
                onClick={() => {
                  const target = Math.max(0, activeIndex - 1);

                  if (target !== activeIndex) {
                    onArrowClick?.("previous", target);
                  }

                  scrollToIndex(target);
                }}
                radius="full"
                size="inputIcon"
              >
                <ChevronLeft20Icon className="rtl:rotate-180" />
              </Button>
              <Button
                aria-label={labels.nextPhoto}
                color="mediaSolid"
                onClick={() => {
                  const target = (activeIndex + 1) % images.length;

                  if (target !== activeIndex) {
                    onArrowClick?.("next", target);
                  }

                  scrollToIndex(target);
                }}
                radius="full"
                size="inputIcon"
              >
                <ChevronRight20Icon className="rtl:rotate-180" />
              </Button>
            </div>
            {images.length <= MAX_PAGINATION_PHOTOS ? (
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <CarouselPagination
                  activeIndex={activeIndex}
                  count={images.length}
                  getPageLabel={(page) => numbered(labels.goToPhoto, page + 1)}
                  onSelect={scrollToIndex}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </section>
      {openImage === undefined ? null : (
        <ImageGroupViewer
          alt={numbered(labels.photoAlt, openIndex + 1)}
          conversationId={conversationId}
          imageAssetResolver={imageAssetResolver}
          onClose={() => {
            setOpenId(null);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          onNextImage={
            openIndex < images.length - 1
              ? () => {
                  setOpenId(images[openIndex + 1]?.id ?? null);
                }
              : undefined
          }
          onPreviousImage={
            openIndex > 0
              ? () => {
                  setOpenId(images[openIndex - 1]?.id ?? null);
                }
              : undefined
          }
          src={openImage.src}
        />
      )}
    </div>
  );
};

export type { CarouselModel };
