"use client";

/* oxlint-disable eslint/complexity -- VideoPlayer is one component that holds the playback state and every control. */

import { Button } from "@workspace/react/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSectionLabel,
  MenuSeparator,
} from "@workspace/react/components/ui/menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/react/components/ui/popover";
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "@workspace/react/components/ui/slider";
import {
  TooltipHint,
  TooltipProvider,
} from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { useEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";

import {
  VideoExitFullscreenIcon,
  VideoFullscreenIcon,
  VideoMutedIcon,
  VideoOptionsIcon,
  VideoPauseIcon,
  VideoPlayIcon,
  VideoVolumeIcon,
} from "./video-control-icons";

import styles from "./video-player.module.css";

/** Seconds the arrow keys move the seek slider in overlay mode. */
const SEEK_STEP_SECONDS = 5;

/** Milliseconds without input before the overlay controls hide while playing. */
const CONTROLS_IDLE_MS = 3000;

/** An effect cleanup for the paths that set nothing up. */
const noCleanup = () => {
  // Nothing was set up, so there is nothing to undo.
};

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / SECONDS_PER_HOUR);
  const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = String(whole % SECONDS_PER_MINUTE).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
};

const finiteDuration = (value: number) =>
  Number.isFinite(value) && value > 0 ? value : 0;

const ControlButton = ({
  label,
  ...props
}: Omit<ComponentProps<typeof Button>, "aria-label"> & {
  label: string;
}) => (
  <TooltipHint content={label}>
    <Button
      aria-label={label}
      color="ghostSecondary"
      size="toolbar"
      uniform
      {...props}
    />
  </TooltipHint>
);

const ControlSlider = ({
  disabled,
  label,
  max,
  min,
  onKeyDown,
  onPointerDownCapture,
  onPointerUp,
  onValueChange,
  step,
  value,
  valueText,
  ...rest
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onKeyDown?: (event: KeyboardEvent<HTMLSpanElement>) => void;
  onPointerDownCapture?: (event: PointerEvent<HTMLSpanElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLSpanElement>) => void;
  onValueChange: (value: number[]) => void;
  step: number;
  value: number[];
  valueText: string;
} & Pick<
  ComponentProps<"span">,
  "onPointerCancel" | "onLostPointerCapture"
>) => (
  <SliderRoot
    {...rest}
    className="w-full"
    disabled={disabled}
    max={max}
    min={min}
    step={step}
    value={value}
    onKeyDown={onKeyDown}
    onPointerDownCapture={onPointerDownCapture}
    onPointerUp={onPointerUp}
    onValueChange={onValueChange}
  >
    <SliderTrack>
      <SliderRange />
      <SliderThumb aria-label={label} aria-valuetext={valueText} />
    </SliderTrack>
  </SliderRoot>
);

export type VideoPresentation = "below" | "overlay";

export type VideoSizing = "container" | "content";

export interface VideoPlayerProps {
  allowFullscreen?: boolean;
  className?: string;
  /** Known length in seconds, shown until the media reports its own. */
  durationHint?: number;
  /** Name of the video for assistive technology (aria-label on the video). */
  label?: string;
  /** Copies the link. Defaults to the clipboard. */
  onCopyLink?: (url: string) => Promise<void>;
  /** Replaces fullscreen with a larger preview (label "Expand video"). */
  onExpand?: (video: HTMLVideoElement) => void;
  onSaveCopy?: () => Promise<void>;
  poster?: string;
  presentation?: VideoPresentation;
  preload?: "auto" | "metadata" | "none";
  previewLoading?: boolean;
  previewPlaceholder?: ReactNode;
  sizing?: VideoSizing;
  /** The link the options menu copies. */
  sourceUrl?: string;
  src?: string;
  title?: string;
  transparentBackground?: boolean;
}

/**
 * The video player. Space on the video toggles play
 * and Enter activates playback or expansion, both ignoring key repeat. Escape leaves
 * fullscreen. In overlay mode the seek slider moves 5 seconds with the arrow
 * keys, and the controls hide after 2.5 seconds of inactivity while playing.
 */
export const VideoPlayer = ({
  allowFullscreen = true,
  className,
  durationHint = 0,
  label,
  onCopyLink,
  onExpand,
  onSaveCopy,
  poster,
  presentation = "below",
  preload = "metadata",
  previewLoading,
  previewPlaceholder,
  sizing = "content",
  sourceUrl,
  src,
  title,
  transparentBackground = false,
}: VideoPlayerProps) => {
  const video = useRef<HTMLVideoElement | null>(null);

  const seekPress = useRef<{ pointerId: number; wasPlaying: boolean } | null>(
    null
  );

  const [container, setContainer] = useState<HTMLSpanElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [idle, setIdle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const overlay = presentation === "overlay";
  const portalContainer = fullscreen ? (container ?? undefined) : undefined;

  useEffect(() => {
    if (container === null) {
      return noCleanup;
    }

    const doc = container.ownerDocument;

    const sync = () => {
      setFullscreen(doc.fullscreenElement === container);
    };

    doc.addEventListener("fullscreenchange", sync);

    return () => {
      doc.removeEventListener("fullscreenchange", sync);
    };
  }, [container]);

  useEffect(() => {
    if (container === null || !overlay || !playing || menuOpen) {
      return noCleanup;
    }

    let timer = window.setTimeout(() => {
      setIdle(true);
    }, CONTROLS_IDLE_MS);

    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        setIdle(true);
      }, CONTROLS_IDLE_MS);
    };

    container.addEventListener("pointermove", wake);
    container.addEventListener("pointerdown", wake);
    container.addEventListener("keydown", wake);

    return () => {
      window.clearTimeout(timer);
      container.removeEventListener("pointermove", wake);
      container.removeEventListener("pointerdown", wake);
      container.removeEventListener("keydown", wake);
    };
  }, [container, menuOpen, overlay, playing]);

  const fail = () => {
    setFailed(true);
  };

  const togglePlay = () => {
    const element = video.current;

    if (element === null) {
      return;
    }

    setFailed(false);

    if (element.paused) {
      element.play().catch(fail);
    } else {
      element.pause();
    }
  };

  const toggleFullscreen = () => {
    if (onExpand !== undefined && video.current !== null) {
      onExpand(video.current);

      return;
    }

    if (container === null) {
      return;
    }

    setFailed(false);

    const doc = container.ownerDocument;

    (doc.fullscreenElement === container
      ? doc.exitFullscreen()
      : container.requestFullscreen()
    ).catch(fail);
  };

  // A click and Enter play or pause, or expand when onExpand is set.
  const activate = () => {
    if (onExpand === undefined) {
      togglePlay();
    } else {
      toggleFullscreen();
    }
  };

  const onVideoKeyDown = (event: KeyboardEvent<HTMLVideoElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (event.repeat) {
      return;
    }

    if (event.key === "Enter") {
      activate();
    } else {
      togglePlay();
    }
  };

  const onSeekKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const element = video.current;

    if (
      !overlay ||
      duration <= 0 ||
      element === null ||
      (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
    ) {
      return;
    }

    event.preventDefault();

    element.currentTime = Math.max(
      0,
      Math.min(
        duration,
        element.currentTime +
          (event.key === "ArrowRight" ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS)
      )
    );

    setCurrentTime(element.currentTime);
  };

  const onSeekPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    const element = video.current;

    if (
      element === null ||
      duration <= 0 ||
      event.button !== 0 ||
      seekPress.current !== null
    ) {
      return;
    }

    seekPress.current = {
      pointerId: event.pointerId,
      wasPlaying: !element.paused,
    };

    element.pause();
  };

  const onSeekPointerEnd = (event: PointerEvent<HTMLSpanElement>) => {
    const press = seekPress.current;

    if (press === null || press.pointerId !== event.pointerId) {
      return;
    }

    seekPress.current = null;

    if (press.wasPlaying) {
      setFailed(false);
      video.current?.play().catch(fail);
    }
  };

  const copyLink = async () => {
    if (sourceUrl === undefined) {
      return;
    }

    await (onCopyLink?.(sourceUrl) ?? navigator.clipboard.writeText(sourceUrl));
    setCopied(true);
  };

  const shownDuration = duration || Math.max(0, durationHint);
  const progress = `${formatTime(currentTime)} / ${formatTime(shownDuration)}`;
  const playLabel = playing ? "Pause video" : "Play video";
  const PlayIcon = playing ? VideoPauseIcon : VideoPlayIcon;
  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VideoMutedIcon : VideoVolumeIcon;
  const doc = container?.ownerDocument;

  const canFullscreen =
    onExpand !== undefined ||
    (allowFullscreen && doc?.fullscreenEnabled === true);

  const fullscreenLabel = fullscreen ? "Exit fullscreen" : "Fullscreen";

  return (
    <TooltipProvider portalContainer={portalContainer}>
      <span
        ref={setContainer}
        aria-busy={previewLoading === true ? true : undefined}
        className={cn(
          styles.player,
          overlay && styles.overlay,
          "flex min-h-0 min-w-0 flex-col overflow-hidden",
          overlay ? "relative aspect-video rounded-md" : "bg-panel",
          overlay && !transparentBackground && "bg-media-background",
          sizing === "container"
            ? "size-full"
            : "my-3 w-fit rounded-md shadow-md",
          sizing === "content" &&
            "max-h-[min(48vh,32rem)] max-w-[min(100%,44rem)]",
          overlay && !transparentBackground && "dark",
          className
        )}
        data-ck-controls-hidden={
          (playing && idle && !menuOpen && !failed) || undefined
        }
        data-ck-markdown-copy="exclude"
        data-theme={overlay && !transparentBackground ? "dark" : undefined}
        onKeyDownCapture={(event) => {
          if (
            event.key === "Escape" &&
            !menuOpen &&
            event.currentTarget.ownerDocument.fullscreenElement ===
              event.currentTarget
          ) {
            event.preventDefault();
            event.stopPropagation();
            toggleFullscreen();
          }
        }}
      >
        {/* The video has no caption track to offer. */}
        {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={(element) => {
            video.current = element;

            if (element !== null) {
              setDuration(finiteDuration(element.duration));
            }
          }}
          aria-label={label}
          className="block min-h-0 w-full flex-1 cursor-(--ck-action-cursor) object-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          disablePictureInPicture={overlay}
          playsInline
          poster={poster}
          preload={preload}
          src={src}
          tabIndex={0}
          title={title}
          onClick={activate}
          onDurationChange={(event) => {
            setDuration(finiteDuration(event.currentTarget.duration));
          }}
          onEnded={() => {
            setPlaying(false);
          }}
          onError={fail}
          onKeyDown={onVideoKeyDown}
          onPause={() => {
            setPlaying(false);
          }}
          onPlay={() => {
            setIdle(false);
            setPlaying(true);
            setFailed(false);
          }}
          onRateChange={(event) => {
            setRate(event.currentTarget.playbackRate);
          }}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
          }}
          onVolumeChange={(event) => {
            setVolume(event.currentTarget.volume);
            setMuted(event.currentTarget.muted);
          }}
        />
        {previewPlaceholder}
        {overlay && !playing ? (
          <ControlButton
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            color="mediaOverlay"
            label={playLabel}
            onClick={togglePlay}
          >
            <VideoPlayIcon aria-hidden />
          </ControlButton>
        ) : null}
        <span
          className={cn(
            styles.controls,
            "@container/video-controls shrink-0 select-none",
            overlay
              ? "absolute inset-x-0 bottom-0 bg-media-background/80 text-media-foreground"
              : "border-t border-stroke-subtle",
            overlay && transparentBackground && "dark"
          )}
          data-theme={overlay && transparentBackground ? "dark" : undefined}
        >
          <span className="flex h-bar-pane flex-wrap items-center gap-x-2 px-2 @max-xs/video-controls:h-auto @max-xs/video-controls:py-1">
            <ControlButton label={playLabel} onClick={togglePlay}>
              <PlayIcon aria-hidden />
            </ControlButton>
            <span className="flex min-w-0 flex-1 @max-xs/video-controls:order-first @max-xs/video-controls:basis-full">
              <ControlSlider
                disabled={duration <= 0}
                label="Seek in video"
                max={duration || 1}
                min={0}
                step={0.1}
                value={[Math.min(currentTime, duration)]}
                valueText={progress}
                onKeyDown={onSeekKeyDown}
                onLostPointerCapture={onSeekPointerEnd}
                onPointerCancel={onSeekPointerEnd}
                onPointerDownCapture={onSeekPointerDown}
                onPointerUp={onSeekPointerEnd}
                onValueChange={([next]) => {
                  const element = video.current;

                  if (element !== null && next !== undefined) {
                    element.currentTime = next;
                    setCurrentTime(element.currentTime);
                  }
                }}
              />
            </span>
            <span className="shrink-0 text-xs whitespace-nowrap text-text-muted tabular-nums">
              {progress}
            </span>
            <span className="ms-auto flex shrink-0 items-center gap-1.5">
              <Popover
                onOpenChange={(open) => {
                  setIdle(false);
                  setMenuOpen(open);
                }}
              >
                <TooltipHint content="Video volume">
                  <PopoverTrigger
                    render={
                      <Button
                        aria-label="Video volume"
                        color="ghostSecondary"
                        size="toolbar"
                        uniform
                      />
                    }
                  >
                    <VolumeIcon aria-hidden />
                  </PopoverTrigger>
                </TooltipHint>
                <PopoverContent
                  align="end"
                  aria-label="Video volume"
                  portalContainer={portalContainer}
                  side="top"
                  size="content"
                  variant="menu"
                >
                  <span className="flex w-40 items-center gap-2">
                    <ControlButton
                      aria-pressed={muted}
                      label="Mute video"
                      onClick={() => {
                        const element = video.current;

                        if (element !== null) {
                          element.muted = !element.muted;
                        }
                      }}
                    >
                      <VolumeIcon aria-hidden />
                    </ControlButton>
                    <ControlSlider
                      label="Video volume"
                      max={1}
                      min={0}
                      step={0.01}
                      value={[silent ? 0 : volume]}
                      valueText={`${Math.round((silent ? 0 : volume) * 100)}%`}
                      onValueChange={([next]) => {
                        const element = video.current;

                        if (element !== null && next !== undefined) {
                          element.volume = next;
                          element.muted = false;
                        }
                      }}
                    />
                  </span>
                </PopoverContent>
              </Popover>
              <Menu
                align="end"
                portalContainer={portalContainer}
                side="top"
                triggerButton={
                  <ControlButton label="Video options">
                    <VideoOptionsIcon aria-hidden />
                  </ControlButton>
                }
                onOpenChange={(open) => {
                  setIdle(false);
                  setMenuOpen(open);

                  if (!open) {
                    setCopied(false);
                  }
                }}
              >
                {onSaveCopy === undefined ? null : (
                  <>
                    <MenuItem
                      onSelect={() => {
                        setFailed(false);
                        onSaveCopy().catch(fail);
                      }}
                    >
                      Save video as…
                    </MenuItem>
                    <MenuSeparator />
                  </>
                )}
                {sourceUrl === undefined ? null : (
                  <>
                    <MenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        copyLink().catch(fail);
                      }}
                    >
                      {copied ? "Link copied" : "Copy link"}
                    </MenuItem>
                    <MenuSeparator />
                  </>
                )}
                <MenuSectionLabel>Playback speed</MenuSectionLabel>
                <MenuRadioGroup
                  value={String(rate)}
                  onValueChange={(next) => {
                    const element = video.current;

                    if (element !== null) {
                      element.playbackRate = Number(next);
                    }
                  }}
                >
                  {PLAYBACK_RATES.map((option) => (
                    <MenuRadioItem key={option} value={String(option)}>
                      {`${option}×`}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
                {!overlay && doc?.pictureInPictureEnabled === true ? (
                  <MenuItem
                    onSelect={() => {
                      const element = video.current;

                      if (element === null) {
                        return;
                      }

                      setFailed(false);

                      (element.ownerDocument.pictureInPictureElement === element
                        ? element.ownerDocument.exitPictureInPicture()
                        : element.requestPictureInPicture()
                      ).catch(fail);
                    }}
                  >
                    Picture in picture
                  </MenuItem>
                ) : null}
              </Menu>
              {canFullscreen ? (
                <ControlButton
                  label={
                    onExpand === undefined ? fullscreenLabel : "Expand video"
                  }
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? (
                    <VideoExitFullscreenIcon aria-hidden />
                  ) : (
                    <VideoFullscreenIcon aria-hidden />
                  )}
                </ControlButton>
              ) : null}
            </span>
          </span>
          {failed ? (
            <output className="block px-2 pb-2 text-xs text-text-muted">
              Could not complete this video action. Try again
            </output>
          ) : null}
        </span>
      </span>
    </TooltipProvider>
  );
};
