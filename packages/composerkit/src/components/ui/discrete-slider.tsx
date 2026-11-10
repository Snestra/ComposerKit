"use client";

import { NamedIcon } from "composerkit/components/icon/registry";
import { SliderRoot, SliderThumb } from "composerkit/components/ui/slider";
import { cn } from "composerkit/lib/utils";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import styles from "./discrete-slider.module.css";

interface DiscreteSliderOption {
  id: string;
  label: string;
  icon?: ReactNode;
  isLocked?: boolean;
  requiresExplicitSelection?: boolean;
}

interface DiscreteSliderProps {
  "aria-label": string;
  className?: string;
  disabled?: boolean;
  options: readonly DiscreteSliderOption[];
  selectedOptionId: string;
  onSelectOption: (option: DiscreteSliderOption) => void;
}

type SliderStyle = CSSProperties & Record<`--${string}`, string>;

const position = (index: number, lastIndex: number) => {
  const percentage = (index / lastIndex) * 100;

  return `calc(${percentage}% + ${13 - (percentage / 50) * 13}px)`;
};

function DiscreteSlider({
  "aria-label": ariaLabel,
  className,
  disabled = false,
  options,
  selectedOptionId,
  onSelectOption,
}: DiscreteSliderProps) {
  const [dragging, setDragging] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);

  const explicitIndex = options.findIndex(
    (option) => option.requiresExplicitSelection === true
  );

  const ordinaryCount = explicitIndex === -1 ? options.length : explicitIndex;

  if (
    ordinaryCount === 0 ||
    options
      .slice(ordinaryCount)
      .some((option) => option.requiresExplicitSelection !== true)
  ) {
    throw new Error(
      "Place options requiring confirmation after the directly selectable slider options."
    );
  }

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === selectedOptionId)
  );

  const selected = options[selectedIndex];
  const lastIndex = Math.max(1, options.length - 1);

  const selectedStyle: SliderStyle = {
    "--discrete-position": position(selectedIndex, lastIndex),
  };

  const trackStyle: SliderStyle = {
    "--discrete-track-clip":
      explicitIndex === -1
        ? "none"
        : `inset(0 calc(100% - ${position(Math.max(ordinaryCount - 1, selectedIndex), lastIndex)} - 14px) 0 0 round 9999px)`,
  };

  const select = (index: number) => {
    const option = options[index];

    if (!disabled && option !== undefined) {
      onSelectOption(option);
    }
  };

  return (
    <div
      className={cn(styles.container, className)}
      data-ck-keyboard-focused={keyboardFocused}
    >
      <SliderRoot
        className={styles.root}
        data-dragging={dragging}
        data-locked={
          disabled && options.some((option) => option.isLocked === true)
        }
        dir="ltr"
        disabled={disabled || options.length <= 1}
        max={lastIndex}
        style={selectedStyle}
        onBlur={() => {
          setKeyboardFocused(false);
        }}
        onFocus={(event) => {
          setKeyboardFocused(event.target.matches(":focus-visible"));
        }}
        onKeyDown={() => {
          setKeyboardFocused(true);
        }}
        onLostPointerCapture={() => {
          setDragging(false);
        }}
        onPointerCancel={() => {
          setDragging(false);
        }}
        onPointerDown={() => {
          setKeyboardFocused(false);
        }}
        onPointerMove={(event) => {
          if (!disabled && event.buttons !== 0) {
            setDragging(true);
          }
        }}
        onPointerUp={() => {
          setDragging(false);
        }}
        onValueChange={(values) => {
          select(
            Math.min(values[0] ?? 0, Math.max(ordinaryCount - 1, selectedIndex))
          );
        }}
        value={[selectedIndex]}
      >
        <span className={styles.track} style={trackStyle}>
          <span aria-hidden className={styles.range} style={selectedStyle} />
          <span aria-hidden className={styles.tickRail}>
            {options.slice(0, ordinaryCount).map((option, index) => {
              const tickStyle: SliderStyle = {
                "--discrete-position": position(index, lastIndex),
              };

              return (
                <span
                  className={styles.tick}
                  data-locked={option.isLocked}
                  data-selected={index <= selectedIndex}
                  key={option.id}
                  style={tickStyle}
                >
                  {option.isLocked === true && !disabled ? (
                    <NamedIcon aria-hidden name="lock" />
                  ) : null}
                </span>
              );
            })}
          </span>
        </span>
        {options.slice(ordinaryCount).map((option, index) => {
          const optionStyle: SliderStyle = {
            "--discrete-position": position(ordinaryCount + index, lastIndex),
          };

          return (
            <button
              aria-label={option.label}
              aria-pressed={selectedOptionId === option.id}
              className={cn(styles.thumbScale, styles.explicitOption)}
              data-selected={selectedOptionId === option.id}
              disabled={disabled || options.length <= 1}
              key={option.id}
              onClick={(event) => {
                event.stopPropagation();
                select(ordinaryCount + index);
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              style={optionStyle}
              type="button"
            >
              <span className={styles.thumb}>{option.icon}</span>
            </button>
          );
        })}
        <span aria-hidden className={styles.visualThumbRail}>
          <span className={styles.thumbScale} style={selectedStyle}>
            <span className={styles.thumb}>
              {selected?.isLocked === true ||
              (disabled &&
                options.some((option) => option.isLocked === true)) ? (
                <NamedIcon aria-hidden name="lock" />
              ) : (
                selected?.icon
              )}
            </span>
          </span>
        </span>
        <SliderThumb
          aria-label={ariaLabel}
          aria-valuetext={selected?.label}
          className={styles.thumbInput}
        />
      </SliderRoot>
    </div>
  );
}

export { DiscreteSlider };

export type { DiscreteSliderOption, DiscreteSliderProps };
