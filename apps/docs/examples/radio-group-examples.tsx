"use client";

import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/react/components/ui/radio-group";
/* oxlint-disable anti-slop/no-runtime-typeof -- FormData entries are strings or files. */
import { useState } from "react";
import type { ReactNode } from "react";

const sizes = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { disabled: true, label: "Unavailable", value: "archived" },
  { label: "Large", value: "large" },
] as const;

const Section = ({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    id={id}
  >
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {children}
  </section>
);

const Readout = ({ label, value }: { label: string; value: string | null }) => (
  <p className="m-0 text-sm text-muted-foreground">
    {label}{" "}
    <output className="font-medium text-foreground">{value ?? "none"}</output>
  </p>
);

const Options = () =>
  sizes.map((size) => (
    <RadioGroupItem
      disabled={"disabled" in size ? size.disabled : undefined}
      key={size.value}
      value={size.value}
    >
      {size.label}
    </RadioGroupItem>
  ));

const RowExample = () => {
  const [value, setValue] = useState<string | null>("medium");

  return (
    <Section id="radio-group-row" title="Row (default)">
      <RadioGroup aria-label="Row size" onChange={setValue} value={value}>
        <Options />
      </RadioGroup>
      <Readout label="Selected:" value={value} />
    </Section>
  );
};

const ColumnExample = () => (
  <Section id="radio-group-column" title="Column">
    <RadioGroup aria-label="Column size" defaultValue="small" direction="col">
      <Options />
    </RadioGroup>
  </Section>
);

const BlockExample = () => {
  const [value, setValue] = useState<string | null>("small");

  return (
    <Section id="radio-group-block" title="Block items">
      <div className="max-w-sm rounded-2xl border p-4">
        <RadioGroup
          aria-label="Block size"
          direction="col"
          onChange={setValue}
          value={value}
        >
          {sizes.map((size) => (
            <RadioGroupItem
              block
              disabled={"disabled" in size ? size.disabled : undefined}
              key={size.value}
              value={size.value}
            >
              {size.label}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </div>
    </Section>
  );
};

const ListExample = () => {
  const [value, setValue] = useState<string | null>("medium");

  return (
    <Section id="radio-group-list" title="List variant">
      <div className="max-w-sm rounded-2xl border">
        <RadioGroup
          aria-label="List size"
          onChange={setValue}
          value={value}
          variant="list"
        >
          <Options />
        </RadioGroup>
      </div>
      <Readout label="Selected:" value={value} />
    </Section>
  );
};

const DisabledExample = () => (
  <Section id="radio-group-disabled" title="Disabled">
    <RadioGroup
      aria-label="Disabled group"
      defaultValue="medium"
      direction="col"
      disabled
    >
      <Options />
    </RadioGroup>
  </Section>
);

const FormExample = () => {
  const [submitted, setSubmitted] = useState("nothing yet");
  const [changed, setChanged] = useState<string | null>(null);

  return (
    <Section id="radio-group-form" title="In a form">
      <form
        className="flex flex-col items-start gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const entry = new FormData(event.currentTarget).get("size");
          setSubmitted(typeof entry === "string" ? entry : "nothing selected");
        }}
      >
        <RadioGroup
          aria-label="Form size"
          direction="col"
          name="size"
          onChange={setChanged}
        >
          <Options />
        </RadioGroup>
        <div className="flex gap-2">
          <button
            className="rounded-lg border px-3 py-1.5 text-sm"
            type="submit"
          >
            Submit
          </button>
          <button
            className="rounded-lg border px-3 py-1.5 text-sm"
            type="reset"
          >
            Reset
          </button>
        </div>
      </form>
      <Readout label="Changed to:" value={changed} />
      <Readout label="Submitted:" value={submitted} />
    </Section>
  );
};

const RtlExample = () => {
  const [value, setValue] = useState<string | null>("small");
  const [listValue, setListValue] = useState<string | null>("medium");

  return (
    <Section id="radio-group-rtl" title="Right to left">
      <div className="flex max-w-sm flex-col gap-4" dir="rtl">
        <RadioGroup
          aria-label="RTL row size"
          dir="rtl"
          onChange={setValue}
          value={value}
        >
          <Options />
        </RadioGroup>
        <div className="rounded-2xl border">
          <RadioGroup
            aria-label="RTL list size"
            dir="rtl"
            onChange={setListValue}
            value={listValue}
            variant="list"
          >
            <Options />
          </RadioGroup>
        </div>
      </div>
    </Section>
  );
};

const DarkExample = () => {
  const [value, setValue] = useState<string | null>("medium");
  const [listValue, setListValue] = useState<string | null>("small");

  return (
    <Section id="radio-group-dark" title="Dark appearance">
      <div className="dark flex max-w-sm flex-col gap-4 rounded-2xl border bg-background p-4 text-foreground">
        <RadioGroup
          aria-label="Dark row size"
          onChange={setValue}
          value={value}
        >
          <Options />
        </RadioGroup>
        <div className="rounded-2xl border">
          <RadioGroup
            aria-label="Dark list size"
            onChange={setListValue}
            value={listValue}
            variant="list"
          >
            <Options />
          </RadioGroup>
        </div>
      </div>
    </Section>
  );
};

const RadioGroupGalleryExample = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
    <h1 className="text-title-lg font-semibold">Radio group</h1>
    <RowExample />
    <ColumnExample />
    <BlockExample />
    <ListExample />
    <DisabledExample />
    <FormExample />
    <RtlExample />
    <DarkExample />
  </main>
);

export { RadioGroupGalleryExample };
