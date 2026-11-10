"use client";

import { Button } from "composerkit/components/ui/button";
import { PhoneInput } from "composerkit/components/ui/phone-input";
import type { PhoneInputProps } from "composerkit/components/ui/phone-input";
import {
  FieldError,
  Input,
  InputGroup,
  TagInput,
  Textarea,
  TextareaField,
  TextInput,
} from "composerkit/components/ui/text-field";
import type {
  ControlSize,
  GutterSize,
  Tag,
  TagDensity,
  TextareaFieldVariant,
  TextInputVariant,
} from "composerkit/components/ui/text-field";
import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";
import { withBasePath } from "@/lib/site";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const sizes: readonly ControlSize[] = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
];

const gutterSizes: readonly GutterSize[] = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
];

const inputVariants: readonly TextInputVariant[] = [
  "default",
  "compact",
  "field",
  "form",
  "onboarding",
  "outlined",
  "rounded",
  "auth",
  "code",
  "amount",
  "segmented",
  "search",
  "searchFilter",
  "heading",
  "inline",
  "display",
  "displayName",
  "settings",
  "ghost",
  "plain",
  "grouped",
  "transparent",
  "tags",
];

const tagDensities: readonly TagDensity[] = [
  "compact",
  "comfortable",
  "multiline",
];

const textareaVariants: readonly TextareaFieldVariant[] = [
  "default",
  "compact",
  "dialog",
  "code",
  "ghost",
  "plain",
  "settings",
  "outlined",
  "editor",
  "comparison",
  "rounded",
  "display",
  "segmented",
  "feedback",
];

const Section = ({
  children,
  id,
  note,
  title,
}: {
  children: ReactNode;
  id: string;
  note?: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {note === undefined ? null : (
      <p className="text-sm text-muted-foreground">{note}</p>
    )}
    {children}
  </section>
);

// The flags come from a local route (app/gallery/text-field/flags/[file]), so
// the demonstration needs no network.
const LOCAL_FLAG_URL = withBasePath("/gallery/text-field/flags/{XX}.svg");

// A phone input with its own value state and a readout of the E.164 value.
const PhoneField = ({
  id,
  initialValue = "",
  label,
  showCountryFlag = false,
  ...props
}: Omit<
  PhoneInputProps,
  "flagUrl" | "onChange" | "showCountryFlag" | "value"
> & {
  id: string;
  showCountryFlag?: boolean;
  initialValue?: string;
  label: string;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {showCountryFlag ? (
        <PhoneInput
          aria-label={label}
          flagUrl={LOCAL_FLAG_URL}
          id={id}
          onChange={setValue}
          showCountryFlag
          value={value}
          {...props}
        />
      ) : (
        <PhoneInput
          aria-label={label}
          id={id}
          onChange={setValue}
          value={value}
          {...props}
        />
      )}
      <span
        className="text-xs text-muted-foreground"
        data-testid={`${id}-value`}
      >
        value: {value === "" ? "empty" : value}
      </span>
    </div>
  );
};

const PhoneExample = () => (
  <Section
    id="phone"
    note="Type digits to see the national format and the E.164 value. Open the country button, type to search by name, code or dial code, move with the arrow keys and press Enter. Typing a plus sign and a calling code picks the country."
    title="Phone input"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <PhoneField id="phone-default" label="Default" />
      <PhoneField
        id="phone-flags"
        label="Flags"
        placeholder="Phone number"
        showCountryFlag
      />
      <PhoneField
        defaultCountry="GB"
        id="phone-default-country"
        label="Default country GB"
        showCountryFlag
      />
      <PhoneField
        countries={["US", "GB", "FR", "DE", "JP"]}
        id="phone-restricted"
        label="Countries US, GB, FR, DE, JP"
      />
      <PhoneField
        addInternationalOption
        id="phone-international-option"
        label="International option"
      />
      <PhoneField
        id="phone-international"
        international
        label="International"
      />
      <PhoneField
        id="phone-national"
        international={false}
        label="National only"
      />
      <PhoneField
        id="phone-initial"
        initialValue="+442079460958"
        label="Initial value +442079460958"
      />
      <div
        className="flex min-w-0 flex-col gap-1 rounded-xl border border-border p-3 pb-10"
        data-ck-menu-overlay-surface
        data-testid="phone-overlay-surface"
      >
        <PhoneField
          id="phone-overlay-surface"
          label="Inside a menu overlay surface"
        />
      </div>
      <PhoneField
        focusInputOnCountrySelection={false}
        id="phone-no-input-focus"
        label="Input is not focused after a choice"
      />
      <PhoneField
        displayInitialValueAsLocalNumber
        id="phone-local"
        initialValue="+442079460958"
        label="Initial value shown as local number"
      />
      <PhoneField
        id="phone-outlined"
        label="Outlined"
        showCountryFlag
        variant="outlined"
      />
      <PhoneField
        disabled
        id="phone-disabled"
        initialValue="+12133734253"
        label="Disabled"
      />
      <PhoneField countries={[]} id="phone-no-countries" label="No countries" />
    </div>
  </Section>
);

const StateFields = ({ prefix }: { prefix: string }) => (
  <>
    <Input
      aria-label="Name"
      id={`${prefix}-outline`}
      placeholder="Jane Example"
    />
    <Input
      aria-label="Search"
      id={`${prefix}-search`}
      defaultValue="query"
      startAdornment={<Search aria-hidden="true" className="size-4 shrink-0" />}
    />
    <Input
      aria-label="Soft"
      id={`${prefix}-soft`}
      placeholder="Soft variant"
      variant="soft"
    />
    <Input
      aria-label="Invalid"
      defaultValue="bad value"
      id={`${prefix}-invalid`}
      invalid
    />
    <Input
      aria-label="Invalid soft"
      defaultValue="bad value"
      id={`${prefix}-invalid-soft`}
      invalid
      variant="soft"
    />
    <Input
      aria-label="Disabled"
      defaultValue="locked"
      disabled
      id={`${prefix}-disabled`}
    />
    <Input
      aria-label="Read only"
      defaultValue="read only"
      id={`${prefix}-readonly`}
      readOnly
    />
    <Textarea
      aria-label="Notes"
      defaultValue={"First line\nSecond line"}
      id={`${prefix}-textarea`}
    />
    <PhoneField id={`${prefix}-phone`} label="Phone" />
    <PhoneField
      id={`${prefix}-phone-outlined`}
      label="Phone, outlined"
      showCountryFlag
      variant="outlined"
    />
  </>
);

// A theme scope sets color-scheme, so every ring, fill and text color inside
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
    <StateFields prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <StateFields prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const SizesExample = () => (
  <Section
    id="sizes"
    note="Heights are 22, 24, 26, 28, 32, 36, 40, 44 and 48px. The gutter size changes only the horizontal padding. Pill rounds the container and grows the gutter by 1.33."
    title="Sizes, gutters and pill"
  >
    <div className="grid items-start gap-2 md:grid-cols-3">
      {sizes.map((size) => (
        <Input
          aria-label={`Size ${size}`}
          defaultValue={`Size ${size}`}
          id={`size-${size}`}
          key={size}
          size={size}
        />
      ))}
    </div>
    <div className="grid items-start gap-2 md:grid-cols-3">
      {gutterSizes.map((gutter) => (
        <Input
          aria-label={`Gutter ${gutter}`}
          defaultValue={`Gutter ${gutter}`}
          gutterSize={gutter}
          id={`gutter-${gutter}`}
          key={gutter}
          startAdornment={
            <Search aria-hidden="true" className="size-4 shrink-0" />
          }
        />
      ))}
    </div>
    <div className="grid items-start gap-2 md:grid-cols-2">
      <Input aria-label="Pill" defaultValue="Pill" id="pill" pill />
      <Input
        aria-label="Pill with adornment"
        defaultValue="Pill with adornment"
        endAdornment={<Search aria-hidden="true" className="size-4" />}
        id="pill-adornment"
        pill
        size="xl"
      />
    </div>
    <div className="grid items-start gap-2 md:grid-cols-3">
      {(["xs", "md", "xl"] as const).map((size) => (
        <Textarea
          aria-label={`Textarea ${size}`}
          defaultValue={`Textarea ${size}`}
          id={`textarea-size-${size}`}
          key={size}
          size={size}
        />
      ))}
    </div>
  </Section>
);

const InteractionExample = () => {
  const [log, setLog] = useState<string[]>([]);

  const record = (entry: string) => {
    setLog((entries) => [...entries.slice(-5), entry]);
  };

  return (
    <Section
      id="interaction"
      note="Press the container beside the text and the input takes focus with the caret at the start or the end. Double-click beside the text selects the nearest word, triple-click selects all. The button inside the container keeps its own press."
      title="Container press, focus and select"
    >
      <Input
        aria-label="Sentence"
        defaultValue="alpha beta gamma"
        endAdornment={
          <Button
            onClick={() => {
              record("end button pressed");
            }}
            size="compact"
            type="button"
            color="ghost"
          >
            Go
          </Button>
        }
        id="press-input"
        onBlur={() => {
          record("blur");
        }}
        onFocus={() => {
          record("focus");
        }}
        size="xl"
        startAdornment={
          <Search aria-hidden="true" className="size-4 shrink-0" />
        }
      />
      <Input
        aria-label="Selected on mount"
        autoSelect
        defaultValue="selected on mount"
        id="auto-select"
      />
      <Input
        aria-label="Email"
        autoComplete="email"
        id="autofill-email"
        name="email"
        placeholder="name@example.com"
        type="email"
      />
      <Input
        aria-label="Number"
        defaultValue="42"
        id="number-input"
        type="number"
      />
      <p className="text-sm" data-testid="interaction-log">
        events: {log.length === 0 ? "none" : log.join(", ")}
      </p>
    </Section>
  );
};

const PropsExample = () => (
  <Section
    id="props"
    note="Optical alignment pulls the container outward by one gutter. Autofill extensions stay active when asked for. The field variant hides the number spin buttons. The focus ring can be turned off."
    title="Other props"
  >
    <div className="grid items-start gap-3 md:grid-cols-2">
      <div className="ps-6">
        <Input
          aria-label="Optically aligned at the start"
          defaultValue="opticallyAlign start"
          id="optical-start"
          opticallyAlign="start"
          startAdornment={
            <Search aria-hidden="true" className="size-4 shrink-0" />
          }
        />
      </div>
      <div className="pe-6">
        <Input
          aria-label="Optically aligned at the end"
          defaultValue="opticallyAlign end"
          endAdornment={<Search aria-hidden="true" className="size-4" />}
          id="optical-end"
          opticallyAlign="end"
        />
      </div>
      <Input
        allowAutofillExtensions
        aria-label="Extensions allowed"
        id="extensions-allowed"
        placeholder="Autofill extensions stay active"
      />
      <Input
        aria-label="Extensions blocked"
        id="extensions-blocked"
        placeholder="Autofill extensions are told to ignore it"
      />
      <TextInput
        aria-label="Quantity"
        defaultValue="3"
        id="field-number"
        type="number"
        variant="field"
      />
      <TextInput
        aria-label="No focus ring"
        defaultValue="focusRing is false"
        focusRing={false}
        id="no-focus-ring"
        variant="default"
      />
    </div>
  </Section>
);

const TextareaExample = () => {
  const [value, setValue] = useState(
    "First line\nSecond line\nThird line\nFourth line"
  );

  return (
    <Section
      id="textarea"
      note="Rows sets the minimum height. Auto resize grows the box with the text up to max rows, then scrolls. Resize shows the corner handle."
      title="Textarea"
    >
      <div className="grid items-start gap-3 md:grid-cols-2">
        <Textarea
          aria-label="Three rows"
          defaultValue="Three rows by default"
          id="textarea-rows"
        />
        <Textarea
          aria-label="Auto resize"
          autoResize
          id="textarea-auto"
          maxRows={6}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          rows={2}
          value={value}
        />
        <Textarea
          aria-label="Max height"
          autoResize
          defaultValue={"One\nTwo\nThree\nFour\nFive\nSix"}
          id="textarea-max-height"
          maxHeight="6rem"
        />
        <Textarea
          aria-label="Resizable"
          defaultValue="Drag the corner"
          id="textarea-resize"
          resize="vertical"
        />
        <Textarea
          aria-label="Soft textarea"
          defaultValue="Soft"
          id="textarea-soft"
          variant="soft"
        />
        <Textarea
          aria-label="Invalid textarea"
          defaultValue="Invalid"
          id="textarea-invalid"
          invalid
        />
        <Textarea
          aria-label="Disabled textarea"
          defaultValue="Disabled"
          disabled
          id="textarea-disabled"
        />
        <Textarea
          aria-label="Read only textarea"
          defaultValue="Read only"
          id="textarea-readonly"
          readOnly
        />
      </div>
    </Section>
  );
};

const initialTags: Tag[] = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
  { label: "Gamma", value: "gamma" },
];

const TagExample = () => {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [draft, setDraft] = useState("");

  return (
    <Section
      id="tags"
      note="Press Backspace or ArrowLeft with the caret at the start to move to the last tag. In a tag, ArrowLeft and ArrowRight move between tags, Backspace and Delete remove one. Enter in the field adds the text as a tag."
      title="Tag input"
    >
      <TagInput
        aria-label="Tags"
        id="tag-input"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          const text = draft.trim();

          if (event.key === "Enter" && text !== "") {
            event.preventDefault();
            setTags((current) => [
              ...current,
              { label: text, value: `${text}-${current.length}` },
            ]);
            setDraft("");
          }
        }}
        onRemoveTag={(tag) => {
          setTags((current) =>
            current.filter((entry) => entry.value !== tag.value)
          );
        }}
        placeholder="Add a tag"
        tags={tags}
        value={draft}
      />
      <TagInput
        aria-label="Tags, extra large"
        id="tag-input-xl"
        onChange={() => {
          /* The field is not edited. */
        }}
        onRemoveTag={() => {
          /* The tags are fixed. */
        }}
        size="xl"
        tags={initialTags}
        value=""
      />
      <TagInput
        aria-label="Tags, disabled"
        disabled
        id="tag-input-disabled"
        onChange={() => {
          /* The field is disabled. */
        }}
        onRemoveTag={() => {
          /* The field is disabled. */
        }}
        tags={initialTags}
        value=""
      />
      <p className="text-sm" data-testid="tag-readout">
        tags: {tags.map((tag) => tag.label).join(", ") || "none"}
      </p>
    </Section>
  );
};

const VariantsExample = () => (
  <Section
    id="variants"
    note="Every TextInput variant with its classes. Four variants (default, field, segmented and form) are also shown with a leading control, a value suffix and a trailing control."
    title="TextInput variants"
  >
    <div className="grid gap-3 md:grid-cols-2">
      {inputVariants.map((variant) => (
        <div
          className="flex min-w-0 flex-col gap-1"
          data-testid={`variant-${variant}`}
          key={variant}
        >
          <span className="text-xs text-muted-foreground">{variant}</span>
          <TextInput
            aria-label={variant}
            defaultValue={variant === "tags" ? "" : `${variant} text`}
            placeholder={variant}
            variant={variant}
          />
        </div>
      ))}
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      {(["default", "field", "segmented", "form"] as const).map((variant) => (
        <div className="flex min-w-0 flex-col gap-1" key={variant}>
          <span className="text-xs text-muted-foreground">
            {variant} with controls
          </span>
          <TextInput
            aria-label={`${variant} with controls`}
            defaultValue="12"
            leadingControl={
              <Search aria-hidden="true" className="ms-2 size-4 shrink-0" />
            }
            trailingControl={
              <span className="px-2 text-xs text-muted-foreground">end</span>
            }
            valueSuffix="kg"
            variant={variant}
          />
        </div>
      ))}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">mixed</span>
        <TextInput
          aria-label="Mixed"
          mixed
          placeholder="Mixed values"
          trailingInlineControl={<span className="text-xs">%</span>}
          valueSuffix="%"
          variant="default"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">auto size</span>
        <TextInput
          aria-label="Auto size"
          autoSize
          defaultValue="Sized to text"
          variant="outlined"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">invalid</span>
        <TextInput
          aria-invalid="true"
          aria-label="Invalid variant"
          defaultValue="bad value"
          variant="default"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">disabled</span>
        <TextInput
          aria-label="Disabled variant"
          defaultValue="locked"
          disabled
          variant="default"
        />
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {tagDensities.map((density) => (
        <div className="flex min-w-0 flex-col gap-1" key={density}>
          <span className="text-xs text-muted-foreground">tags, {density}</span>
          <TextInput
            aria-label={`Tags ${density}`}
            leadingControl={
              <>
                <span className="rounded-sm bg-muted px-1 text-xs">One</span>
                <span className="rounded-sm bg-muted px-1 text-xs">Two</span>
              </>
            }
            placeholder="Add"
            tagDensity={density}
            variant="tags"
          />
        </div>
      ))}
    </div>
    <InputGroup>
      <TextInput
        aria-label="Group first"
        placeholder="First"
        variant="grouped"
      />
      <TextInput
        aria-label="Group second"
        placeholder="Second"
        variant="grouped"
      />
      <TextInput
        aria-label="Group number"
        defaultValue="7"
        type="number"
        variant="grouped"
      />
    </InputGroup>
  </Section>
);

const TextareaVariantsExample = () => (
  <Section
    id="textarea-variants"
    note="Every TextareaField variant. Auto resize and the display fit run on input. The feedback variant takes a footer and the segmented variant takes a trailing control."
    title="TextareaField variants"
  >
    <div className="grid gap-3 md:grid-cols-2">
      {textareaVariants.map((variant) => (
        <div
          className="flex min-w-0 flex-col gap-1"
          data-testid={`textarea-variant-${variant}`}
          key={variant}
        >
          <span className="text-xs text-muted-foreground">{variant}</span>
          <TextareaField
            aria-label={`Textarea ${variant}`}
            autoResize={variant === "compact" || variant === "display"}
            defaultValue={variant === "display" ? "Display text" : undefined}
            placeholder={variant}
            variant={variant}
          />
        </div>
      ))}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">feedback, footer</span>
        <TextareaField
          aria-label="Feedback with footer"
          footer={
            <p className="mt-2 text-xs text-muted-foreground">Footer text</p>
          }
          placeholder="Tell us more"
          variant="feedback"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          segmented, trailing control
        </span>
        <TextareaField
          aria-label="Segmented with control"
          placeholder="Write"
          trailingControl={<span className="px-2 text-xs">Send</span>}
          variant="segmented"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">invalid</span>
        <TextareaField
          aria-invalid="true"
          aria-label="Invalid textarea field"
          defaultValue="bad value"
          variant="default"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">disabled</span>
        <TextareaField
          aria-label="Disabled textarea field"
          defaultValue="locked"
          disabled
          variant="default"
        />
      </div>
    </div>
  </Section>
);

const maxLength = 20;

const ErrorExample = () => {
  const [name, setName] = useState("A name that is far too long");
  const tooLong = name.length > maxLength;

  return (
    <Section
      id="errors"
      note="The error is a plain element with role alert that exists only while the value is too long. It is announced when it appears."
      title="Inline error text"
    >
      <div className="flex flex-col gap-2">
        <TextInput
          aria-describedby={tooLong ? "name-error" : undefined}
          aria-invalid={tooLong}
          aria-label="Project name"
          id="project-name"
          onChange={(event) => {
            setName(event.target.value);
          }}
          value={name}
          variant="segmented"
        />
        {tooLong ? (
          <FieldError id="name-error">
            Project name cannot be longer than {maxLength} characters
          </FieldError>
        ) : null}
        <FieldError as="div" size="compact">
          Compact row error, always shown
        </FieldError>
      </div>
    </Section>
  );
};

const RefCleanupExample = () => {
  const [shown, setShown] = useState(true);
  const [events, setEvents] = useState<string[]>([]);
  const log = useRef<string[]>([]);

  // A stable callback ref that returns a cleanup. React calls the cleanup,
  // not the ref with null, when the field unmounts.
  const watchField = useCallback((node: HTMLInputElement | null) => {
    log.current.push(`ref ${node === null ? "null" : "set"}`);

    return () => {
      log.current.push("cleanup");
    };
  }, []);

  return (
    <Section
      id="ref-cleanup"
      note="The callback ref returns a cleanup. Hiding the field runs that cleanup once, not a call with null."
      title="Ref cleanup"
    >
      {shown ? (
        <Input aria-label="Ref field" id="ref-field" ref={watchField} />
      ) : null}
      <Button
        onClick={() => {
          setShown((value) => !value);
        }}
        size="compact"
        type="button"
        color="outline"
      >
        {shown ? "Hide the field" : "Show the field"}
      </Button>
      <Button
        onClick={() => {
          setEvents([...log.current]);
        }}
        size="compact"
        type="button"
        color="outline"
      >
        Read the ref log
      </Button>
      <p className="text-sm" data-testid="ref-readout">
        ref events: {events.join(", ")}
      </p>
    </Section>
  );
};

const rtlInitialTags: Tag[] = [
  { label: "أول", value: "first" },
  { label: "ثان", value: "second" },
];

const RtlExample = () => {
  const [tags, setTags] = useState<Tag[]>(rtlInitialTags);

  return (
    <Section id="rtl" title="Right to left">
      <div className="flex flex-col gap-3" dir="rtl" lang="ar">
        <Input
          aria-label="بحث"
          defaultValue="نص تجريبي"
          endAdornment={<Search aria-hidden="true" className="size-4" />}
          id="rtl-input"
          startAdornment={<Search aria-hidden="true" className="size-4" />}
        />
        <Textarea
          aria-label="ملاحظات"
          defaultValue="سطر أول"
          id="rtl-textarea"
        />
        <TextInput
          aria-label="حقل"
          leadingControl={<Search aria-hidden="true" className="ms-2 size-4" />}
          placeholder="حقل"
          variant="segmented"
        />
        <TagInput
          aria-label="وسوم"
          id="rtl-tag-input"
          onChange={() => {
            /* The field is not edited. */
          }}
          onRemoveTag={(tag) => {
            setTags((current) =>
              current.filter((entry) => entry.value !== tag.value)
            );
          }}
          placeholder="أضف وسما"
          tags={tags}
          value=""
        />
      </div>
    </Section>
  );
};

const TextFieldGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Text field</h1>
      <AppearanceControl id="text-field-appearance" />
    </header>

    <Section
      id="appearance"
      note="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside. Hover a field, press Tab to focus it, and read the ring."
      title="States in light and dark"
    >
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
    </Section>

    <SizesExample />
    <InteractionExample />
    <PropsExample />
    <TextareaExample />
    <TagExample />
    <PhoneExample />
    <VariantsExample />
    <TextareaVariantsExample />
    <ErrorExample />
    <RefCleanupExample />
    <RtlExample />
  </main>
);

export { TextFieldGalleryExample };
