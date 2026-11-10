"use client";

import { Button } from "@workspace/react/components/ui/button";
import { Checkbox } from "@workspace/react/components/ui/checkbox";
import type { CheckedState } from "@workspace/react/components/ui/checkbox";
import Link from "next/link";
import { useState } from "react";
import type { SyntheticEvent } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const stateRows = [
  { defaultChecked: false, label: "Remember me" },
  { defaultChecked: true, label: "Accept terms" },
  { defaultChecked: "indeterminate", label: "Select all" },
  { defaultChecked: false, disabled: true, label: "Locked unchecked" },
  { defaultChecked: true, disabled: true, label: "Locked checked" },
  {
    defaultChecked: "indeterminate",
    disabled: true,
    label: "Locked indeterminate",
  },
] as const;

const StateRows = ({ prefix }: { prefix: string }) =>
  stateRows.map((row) => (
    <Checkbox
      defaultChecked={row.defaultChecked}
      disabled={"disabled" in row ? row.disabled : undefined}
      id={`${prefix}-${row.label.toLowerCase().replaceAll(" ", "-")}`}
      key={row.label}
      label={row.label}
    />
  ));

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

// A theme scope sets color-scheme, so every checkbox color inside resolves at
// its nearest scope, at any depth.
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
    <StateRows prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <StateRows prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const ControlledExample = () => {
  const [checked, setChecked] = useState<CheckedState>("indeterminate");
  const [calls, setCalls] = useState(0);

  return (
    <section
      aria-labelledby="controlled-heading"
      className="flex flex-col gap-3"
    >
      <h2 className="text-title-md font-semibold" id="controlled-heading">
        Controlled state
      </h2>
      <p className="text-sm text-muted-foreground">
        Click cycles indeterminate to checked, checked to unchecked, unchecked
        to checked. Enter does not toggle; Space does.
      </p>
      <Checkbox
        checked={checked}
        id="controlled-checkbox"
        label="Select all"
        onCheckedChange={(next) => {
          setChecked(next);
          setCalls((count) => count + 1);
        }}
      />
      <p className="text-sm" data-testid="controlled-readout">
        checked: {String(checked)}, onCheckedChange calls: {calls}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setChecked("indeterminate");
          }}
          color="outline"
          size="pageAction"
        >
          Set indeterminate
        </Button>
        <Button
          onClick={() => {
            setChecked(false);
          }}
          color="outline"
          size="pageAction"
        >
          Set unchecked
        </Button>
      </div>
    </section>
  );
};

const FormExample = () => {
  const [submitted, setSubmitted] = useState("not submitted");

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    setSubmitted(
      JSON.stringify({
        newsletter: data.get("newsletter"),
        terms: data.get("terms"),
      })
    );
  };

  return (
    <section aria-labelledby="form-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="form-heading">
        Form participation
      </h2>
      <Checkbox
        defaultChecked
        form="checkbox-form"
        id="form-terms"
        label="Accept terms (required)"
        name="terms"
        required
      />
      <form
        className="flex flex-col gap-3"
        id="checkbox-form"
        onReset={() => {
          setSubmitted("reset");
        }}
        onSubmit={submit}
      >
        <Checkbox
          id="form-newsletter"
          label="Newsletter (value yes)"
          name="newsletter"
          value="yes"
        />
        <div className="flex flex-wrap gap-2">
          <Button color="outline" size="pageAction" type="submit">
            Submit
          </Button>
          <Button color="outline" size="pageAction" type="reset">
            Reset
          </Button>
        </div>
        <p className="text-sm" data-testid="form-readout">
          {submitted}
        </p>
      </form>
    </section>
  );
};

const LayoutExample = () => (
  <section aria-labelledby="layout-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="layout-heading">
      Layout and labels
    </h2>
    <Checkbox id="layout-left" label="Label on the left side" />
    <Checkbox
      id="layout-right"
      label="Label on the right side"
      orientation="right"
    />
    <Checkbox
      className="w-64"
      id="layout-wrap"
      label="A long label that wraps onto a second line to show the box staying aligned with the first line"
    />
    <Checkbox aria-label="Select row" defaultChecked id="layout-unlabelled" />
    <Checkbox
      label="Label with a custom class that is limited to twelve rem and wraps"
      labelClassName="max-w-48"
    />
  </section>
);

const RtlExample = () => (
  <section aria-labelledby="rtl-heading" className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id="rtl-heading">
      Right to left
    </h2>
    <div className="flex flex-col gap-3" dir="rtl" lang="ar">
      <Checkbox defaultChecked id="rtl-left" label="تذكرني" />
      <Checkbox id="rtl-right" label="اقبل الشروط" orientation="right" />
    </div>
  </section>
);

const CheckboxGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Checkbox</h1>
      <AppearanceControl id="checkbox-appearance" />
    </header>

    <section aria-labelledby="states-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="states-heading">
        States in light and dark
      </h2>
      <p className="text-sm text-muted-foreground">
        Each panel sets its own theme scope, so the appearance control above
        does not change them. The two lower panels nest the opposite theme
        inside, and the nested checkboxes follow the nearest scope. Hover an
        unchecked box, press Tab to see the focus ring, and press Space to
        toggle. Disabled boxes ignore the pointer and the keyboard.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AppearancePanel id="appearance-light" scope="light" />
        <AppearancePanel id="appearance-dark" scope="dark" />
        <AppearancePanel
          id="appearance-dark-light"
          nested="light"
          scope="dark"
        />
        <AppearancePanel
          id="appearance-light-dark"
          nested="dark"
          scope="light"
        />
      </div>
    </section>

    <ControlledExample />
    <FormExample />
    <LayoutExample />
    <RtlExample />
  </main>
);

export { CheckboxGalleryExample };
