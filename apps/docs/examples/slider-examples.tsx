"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { DiscreteSlider } from "@workspace/react/components/ui/discrete-slider";
import {
  Slider,
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "@workspace/react/components/ui/slider";
import Link from "next/link";
import { useId, useState } from "react";

type Variant = "light" | "dark" | "rtl";

const panelTitles: Record<Variant, string> = {
  dark: "Dark",
  light: "Light",
  rtl: "Right to left",
};

const NativeSliders = () => {
  const volumeId = useId();
  const opacityId = useId();
  const lockedId = useId();
  const [volume, setVolume] = useState(40);
  const [opacity, setOpacity] = useState(0.6);

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-semibold">Native range input</h4>
      <div className="flex items-center gap-3">
        <label className="w-20 text-sm" htmlFor={volumeId}>
          Volume
        </label>
        <Slider
          id={volumeId}
          max={100}
          min={0}
          onChange={(event) => {
            setVolume(event.currentTarget.valueAsNumber);
          }}
          step={1}
          value={volume}
        />
        <output className="w-10 text-sm tabular-nums" htmlFor={volumeId}>
          {volume}
        </output>
      </div>
      <div className="flex items-center gap-3">
        <label className="w-20 text-sm" htmlFor={opacityId}>
          Opacity
        </label>
        <Slider
          id={opacityId}
          max={1}
          min={0}
          onChange={(event) => {
            setOpacity(event.currentTarget.valueAsNumber);
          }}
          step={0.1}
          value={opacity}
        />
        <output className="w-10 text-sm tabular-nums" htmlFor={opacityId}>
          {opacity}
        </output>
      </div>
      <div className="flex items-center gap-3">
        <label className="w-20 text-sm" htmlFor={lockedId}>
          Locked
        </label>
        <Slider defaultValue={20} disabled id={lockedId} />
        <output className="w-10 text-sm tabular-nums" htmlFor={lockedId}>
          20
        </output>
      </div>
    </div>
  );
};

const SingleThumbExample = () => {
  const [value, setValue] = useState<number[]>([40]);
  const [committed, setCommitted] = useState<number[]>([40]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>Single thumb</span>
        <output aria-live="off" className="tabular-nums">
          {value[0]} (committed {committed[0]})
        </output>
      </div>
      <SliderRoot
        onValueChange={setValue}
        onValueCommit={setCommitted}
        value={value}
      >
        <SliderTrack>
          <SliderRange />
          <SliderThumb aria-label="Single thumb value" />
        </SliderTrack>
      </SliderRoot>
    </div>
  );
};

const RangeExample = () => {
  const [value, setValue] = useState<number[]>([20, 70]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>Range, two thumbs without an index, at least 1 step apart</span>
        <output className="tabular-nums">{value.join(" to ")}</output>
      </div>
      <SliderRoot
        minStepsBetweenThumbs={1}
        onValueChange={setValue}
        value={value}
      >
        <SliderTrack>
          <SliderRange />
          <SliderThumb />
          <SliderThumb />
        </SliderTrack>
      </SliderRoot>
    </div>
  );
};

const PreventedKeysExample = () => {
  const [value, setValue] = useState<number[]>([50]);
  const [seen, setSeen] = useState(0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>Thumb onKeyDown prevents ArrowRight</span>
        <output className="tabular-nums">
          {value[0]} (seen {seen})
        </output>
      </div>
      <SliderRoot onValueChange={setValue} value={value}>
        <SliderTrack>
          <SliderRange />
          <SliderThumb
            aria-label="Prevented keys value"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                setSeen((count) => count + 1);
              }
            }}
          />
        </SliderTrack>
      </SliderRoot>
    </div>
  );
};

const OffGridExample = () => {
  const [value, setValue] = useState<number[]>([43]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>Step 10, starts at 43 (off the step grid)</span>
        <output className="tabular-nums">{value[0]}</output>
      </div>
      <SliderRoot onValueChange={setValue} step={10} value={value}>
        <SliderTrack>
          <SliderRange />
          <SliderThumb aria-label="Stepped value" />
        </SliderTrack>
      </SliderRoot>
    </div>
  );
};

const DisabledExample = () => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-sm">
      <span>Disabled (thumb is not in the tab order)</span>
      <output className="tabular-nums">30</output>
    </div>
    <SliderRoot defaultValue={[30]} disabled>
      <SliderTrack>
        <SliderRange />
        <SliderThumb aria-label="Disabled value" />
      </SliderTrack>
    </SliderRoot>
  </div>
);

const VerticalExample = () => {
  const [value, setValue] = useState<number[]>([60]);

  return (
    <div className="flex items-center gap-4">
      <SliderRoot
        className="h-40 w-8 justify-center"
        onValueChange={setValue}
        orientation="vertical"
        value={value}
      >
        <SliderTrack className="h-full w-[4px] grow-0">
          <SliderRange className="h-auto w-full" />
          <SliderThumb aria-label="Vertical value" />
        </SliderTrack>
      </SliderRoot>
      <div className="text-sm">
        <div>Vertical, the parts read the orientation from the root</div>
        <output className="tabular-nums">{value[0]}</output>
      </div>
    </div>
  );
};

const discreteOptions = [
  { id: "a", label: "Option A" },
  { id: "b", label: "Option B" },
  { id: "c", isLocked: true, label: "Locked" },
  { id: "d", label: "On", requiresExplicitSelection: true },
] as const;

const DiscreteExamples = () => {
  const [selected, setSelected] = useState("b");

  return (
    <div className="flex flex-col gap-3" data-discrete-examples>
      <output className="text-sm">
        {discreteOptions.find((option) => option.id === selected)?.label}
      </output>
      <DiscreteSlider
        aria-label="Volume"
        options={discreteOptions}
        selectedOptionId={selected}
        onSelectOption={(option) => {
          setSelected(option.id);
        }}
      />
      <DiscreteSlider
        aria-label="Locked"
        disabled
        options={discreteOptions}
        selectedOptionId="c"
        onSelectOption={(option) => {
          setSelected(option.id);
        }}
      />
    </div>
  );
};

const SliderPanel = ({ variant }: { variant: Variant }) => (
  <DirectionProvider direction={variant === "rtl" ? "rtl" : "ltr"}>
    <section
      aria-label={`${panelTitles[variant]} sliders`}
      className={`${variant === "dark" ? "dark" : "light"} flex min-w-0 flex-col gap-5 rounded-2xl border bg-background p-4 text-foreground`}
      data-panel={variant}
      dir={variant === "rtl" ? "rtl" : "ltr"}
    >
      <h3 className="text-title-sm font-semibold">{panelTitles[variant]}</h3>
      <NativeSliders />
      <DiscreteExamples />
      <h4 className="text-sm font-semibold">Slider parts</h4>
      <SingleThumbExample />
      <RangeExample />
      <PreventedKeysExample />
      <OffGridExample />
      <DisabledExample />
      <VerticalExample />
    </section>
  </DirectionProvider>
);

const SliderGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Slider</h1>
    </header>
    <p className="text-sm text-muted-foreground">
      Click or drag the tracks. Tab to a thumb, then use the arrow keys, Page Up
      and Page Down, Shift with an arrow key, Home and End.
    </p>
    <div className="grid gap-4 md:grid-cols-2">
      <SliderPanel variant="light" />
      <SliderPanel variant="dark" />
      <SliderPanel variant="rtl" />
    </div>
  </main>
);

export { SliderGalleryExample };
