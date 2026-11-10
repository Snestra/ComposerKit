"use client";

import { AutocompleteListbox } from "composerkit/components/select/autocomplete-listbox";
import type { AutocompleteOption } from "composerkit/components/select/autocomplete-listbox";
import { ClearableSelectorTrigger } from "composerkit/components/select/clearable-trigger";
import { Button } from "composerkit/components/ui/button";
import { Select } from "composerkit/components/ui/select";
import type {
  SelectOption,
  SelectOptionGroup,
} from "composerkit/components/ui/select";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";

const words = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

const makeOptions = (count: number): SelectOption[] =>
  Array.from({ length: count }, (_, index) => ({
    label: `${words[index % words.length]} ${Math.floor(index / words.length) + 1}`,
    value: `option-${index}`,
  }));

const basic = makeOptions(5);
const many = makeOptions(20);
const huge = makeOptions(350);

const withStates: SelectOption[] = [
  { label: "One", value: "one" },
  { disabled: true, label: "Two", value: "two" },
  { label: "Three", value: "three" },
  { label: "Four", value: "four" },
];

const described: SelectOption[] = [
  { description: "description", label: "One", value: "one" },
  {
    label: "Two",
    tooltip: { content: "tooltip", maxWidth: 240 },
    value: "two",
  },
  { disabled: true, label: "Three", value: "three" },
  { label: "Four", value: "four" },
];

const grouped: SelectOptionGroup[] = [
  { label: "Group one", options: makeOptions(3) },
  {
    label: "Group two",
    options: Array.from({ length: 120 }, (_, index) => ({
      label: `Item ${index + 1}`,
      value: `group-two-${index}`,
    })),
  },
];

const sizes = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
] as const;

const variants = ["outline", "soft", "ghost"] as const;

const autocompleteOptions: AutocompleteOption[] = [
  { id: "one", label: "One", secondaryLabel: "secondaryLabel" },
  { disabledReason: "disabledReason", id: "two", label: "Two" },
  { colorKey: "three", id: "three", label: "Three" },
];

const Section = ({ children, name }: { children: ReactNode; name: string }) => (
  <section aria-label={name} className="flex flex-col gap-4">
    <h2>{name}</h2>
    {children}
  </section>
);

const Row = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="flex flex-wrap items-center gap-4">
    <span className="w-40">{label}</span>
    <div className="min-w-48">{children}</div>
  </div>
);

const useSingle = (initial = "") => {
  const [value, setValue] = useState(initial);

  return {
    onChange: (option: SelectOption) => {
      setValue(option.value);
    },
    value,
  };
};

const useMultiple = (initial: readonly string[] = []) => {
  const [value, setValue] = useState(initial);

  return {
    multiple: true as const,
    onChange: (options: readonly SelectOption[]) => {
      setValue(options.map((option) => option.value));
    },
    value,
  };
};

const VariantsSection = () => {
  const single = useSingle("option-1");

  return (
    <Section name="select-props-variants">
      {variants.map((variant) => (
        <Row key={variant} label={variant}>
          <Select
            aria-label={variant}
            options={basic}
            variant={variant}
            {...single}
          />
        </Row>
      ))}
      <Row label="pill">
        <Select aria-label="pill" options={basic} pill {...single} />
      </Row>
      <Row label="block">
        <Select aria-label="block" block={false} options={basic} {...single} />
      </Row>
    </Section>
  );
};

const SizesSection = () => {
  const single = useSingle("option-1");

  return (
    <Section name="select-size-scale">
      {sizes.map((size) => (
        <div className="flex flex-wrap items-center gap-4" key={size}>
          <span className="w-12">{size}</span>
          <Select
            aria-label={`${size} dropdown`}
            block={false}
            clearable
            options={basic}
            size={size}
            {...single}
          />
          <Select
            aria-label={`${size} chevronDown`}
            block={false}
            dropdownIconType="chevronDown"
            options={basic}
            size={size}
            {...single}
          />
        </div>
      ))}
    </Section>
  );
};

const StatesSection = () => {
  const [open, setOpen] = useState(false);
  const single = useSingle("three");
  const empty = useSingle("");

  return (
    <Section name="select-states">
      <Row label="placeholder">
        <Select aria-label="placeholder" options={withStates} {...empty} />
      </Row>
      <Row label="open">
        <Select
          aria-label="open"
          onOpenChange={setOpen}
          open={open}
          options={withStates}
          {...single}
        />
      </Row>
      <Row label="disabled">
        <Select
          aria-label="disabled"
          disabled
          options={withStates}
          {...single}
        />
      </Row>
      <Row label="loading">
        <Select aria-label="loading" loading options={withStates} {...single} />
      </Row>
      <Row label="invalid">
        <Select aria-label="invalid" invalid options={withStates} {...single} />
      </Row>
    </Section>
  );
};

const KeyboardSection = () => {
  const single = useSingle("");
  const multiple = useMultiple();

  return (
    <Section name="select-trigger-keyboard">
      <Row label="trigger">
        <Select aria-label="trigger" options={withStates} {...single} />
      </Row>
      <Row label="select-list-keyboard">
        <Select aria-label="select-list-keyboard" options={many} {...single} />
      </Row>
      <Row label="multiple">
        <Select aria-label="multiple" options={withStates} {...multiple} />
      </Row>
    </Section>
  );
};

const AppearanceSection = () => {
  const single = useSingle("one");
  const end = useSingle("one");

  return (
    <Section name="select-option-appearance">
      <Row label="start">
        <Select aria-label="start" options={described} {...single} />
      </Row>
      <Row label="end">
        <Select
          aria-label="end"
          optionIndicatorPosition="end"
          options={described}
          {...end}
        />
      </Row>
      <Row label="groups">
        <Select aria-label="groups" options={grouped} {...single} />
      </Row>
    </Section>
  );
};

const PopupSection = () => {
  const single = useSingle("one");
  const [action, setAction] = useState("");

  return (
    <Section name="select-popup-appearance">
      <Row label="block">
        <Select aria-label="block popup" options={withStates} {...single} />
      </Row>
      <Row label="not block">
        <Select
          aria-label="not block popup"
          block={false}
          options={withStates}
          {...single}
        />
      </Row>
      <Row label="actions and footer">
        <Select
          actions={[{ id: "action", label: "actions", onSelect: setAction }]}
          aria-label="actions and footer"
          footer={<div className="p-2">footer</div>}
          options={withStates}
          {...single}
        />
      </Row>
      <Row label="select-popup-motion">
        <Select
          aria-label="select-popup-motion"
          block={false}
          options={basic}
          side="top"
          {...single}
        />
      </Row>
      <output aria-live="polite">{action}</output>
    </Section>
  );
};

const SearchSection = () => {
  const single = useSingle("option-3");
  const multiple = useMultiple(["option-1", "option-2"]);
  const searchMultiple = useMultiple(["option-1", "option-2"]);
  const huge1 = useSingle("");
  const grouped1 = useSingle("");
  const [pages, setPages] = useState(1);
  const paged = useSingle("");

  const pagedOptions = useMemo(() => makeOptions(pages * 20), [pages]);

  return (
    <Section name="select-search-multi-clear">
      <Row label="searchable">
        <Select aria-label="searchable" options={many} searchable {...single} />
      </Row>
      <Row label="multiple">
        <Select aria-label="multiple selected" options={basic} {...multiple} />
      </Row>
      <Row label="multiple searchable">
        <Select
          aria-label="multiple searchable"
          options={many}
          searchable
          {...searchMultiple}
        />
      </Row>
      <Row label="clearable">
        <Select aria-label="clearable" clearable options={basic} {...single} />
      </Row>
      <Row label="350 options">
        <Select aria-label="350 options" options={huge} {...huge1} />
      </Row>
      <Row label="optionsLimit">
        <Select aria-label="optionsLimit" options={grouped} {...grouped1} />
      </Row>
      <Row label="pagination">
        <Select
          aria-label="pagination"
          options={pagedOptions}
          pagination={{
            hasNextPage: pages < 5,
            isFetching: false,
            onLoadMore: () => {
              setPages((count) => count + 1);
            },
          }}
          {...paged}
        />
      </Row>
    </Section>
  );
};

const FormSection = () => {
  const single = useSingle("option-1");
  const native = useSingle("option-2");
  const [submitted, setSubmitted] = useState("");

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitted(JSON.stringify(Object.fromEntries(data.entries())));
  };

  return (
    <Section name="select-form-and-native">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Row label="name and id">
          <Select
            aria-label="name and id"
            id="gallery-select-id"
            name="select"
            options={basic}
            required
            {...single}
          />
        </Row>
        <Row label="forceNativeSelect">
          <Select
            aria-label="forceNativeSelect"
            forceNativeSelect
            name="native"
            options={grouped.slice(0, 1)}
            {...native}
          />
        </Row>
        <Button color="outline" size="pageAction" type="submit">
          select-form-and-native
        </Button>
        <output aria-live="polite">{submitted}</output>
      </form>
    </Section>
  );
};

const ClearableSection = () => {
  const [value, setValue] = useState("option-1");
  const [open, setOpen] = useState(false);

  return (
    <Section name="select-clearable-trigger">
      <ClearableSelectorTrigger
        clearLabel="Clear current value"
        menuOpen={open}
        onClear={() => {
          setValue("");
        }}
      >
        <Select
          aria-label="select-clearable-trigger"
          block={false}
          onChange={(option) => {
            setValue(option.value);
          }}
          onOpenChange={setOpen}
          options={basic}
          pill
          value={value}
          variant="ghost"
        />
      </ClearableSelectorTrigger>
    </Section>
  );
};

const AutocompleteSection = () => {
  const [highlighted, setHighlighted] = useState(0);

  return (
    <Section name="select-autocomplete-listbox">
      {(["field", "select"] as const).map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span>{variant}</span>
          <AutocompleteListbox
            ariaLabel={variant}
            getItemProps={(index) => ({
              onClick: () => {
                setHighlighted(index);
              },
              onPointerMove: () => {
                setHighlighted(index);
              },
            })}
            highlightedIndex={highlighted}
            listboxId={`gallery-autocomplete-${variant}`}
            options={autocompleteOptions}
            selectedIds={variant === "select" ? ["one"] : undefined}
            variant={variant}
          />
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <span>role=alert</span>
        <AutocompleteListbox
          ariaLabel="error"
          error="No results found."
          getItemProps={() => ({})}
          highlightedIndex={-1}
          listboxId="gallery-autocomplete-error"
          options={[]}
          variant="field"
        />
      </div>
    </Section>
  );
};

const SelectGalleryExample = () => (
  <div className="flex flex-col gap-8">
    <header>
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Select</h1>
    </header>
    <VariantsSection />
    <SizesSection />
    <StatesSection />
    <KeyboardSection />
    <AppearanceSection />
    <PopupSection />
    <SearchSection />
    <FormSection />
    <ClearableSection />
    <AutocompleteSection />
  </div>
);

export { SelectGalleryExample };
