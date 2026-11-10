"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable shadcn/no-arbitrary-values -- The utilities h-page-search, bg-page-search, border-primary-outline, rounded-button-toolbar, h-token-button-composer and bg-fill-secondary-soft-alpha read host tokens (--ck-page-height-search, --color-fill-page-search, --radius-button-toolbar, --ck-compose-button-spacing, --color-fill-secondary-soft-alpha) that have no theme utility here; each carries the Electron window value as fallback. */

import { createIcon } from "@workspace/react/components/icon";
import { useMergedRef } from "@workspace/react/components/ui/text-field";
import { isPresent } from "@workspace/react/lib/present";
import { cn } from "@workspace/react/lib/utils";
import { useRef } from "react";
import type {
  KeyboardEventHandler,
  FocusEventHandler,
  ReactNode,
  Ref,
} from "react";

/*
 * PageSearchInput: the page search field,
 * which SearchablePageLayout renders from its `search` props. Electron window values apply
 * unconditionally, so the browser window
 * rules (browser:h-9) are not reproduced.
 */

/** The search icon of the toolbar page search variants. */
const Search16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "magnifying-glass-16",
});

/** The search icon of the discovery page search variant. */
const Search20Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "magnifying-glass-20",
});

/** The clear button of the page search. */
const ClearCircleIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-circle-fill-16",
});

/** The search icon of the default, settings, catalog and sidebar page search variants. */
const SearchIcon16 = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "magnifying-glass-16",
});

type PageSearchVariant =
  | "catalog"
  | "catalog-compact"
  | "catalog-filter"
  | "default"
  | "directory"
  | "discovery"
  | "settings"
  | "sidebar"
  | "sidebar-header"
  | "toolbar"
  | "toolbar-action"
  | "toolbar-compact";

const toolbarVariants: ReadonlySet<PageSearchVariant> = new Set([
  "catalog-compact",
  "directory",
  "toolbar",
  "toolbar-action",
  "toolbar-compact",
]);

const PAGE_SEARCH_FIELD =
  "h-(--ck-page-height-search,calc(var(--spacing)*8)) gap-2 border border-stroke-strong bg-(--color-fill-page-search,var(--color-panel-elevated-secondary)) px-2.5";

const SOFT_ALPHA =
  "bg-[light-dark(color-mix(in_srgb,var(--ck-palette-ink)_8%,transparent),color-mix(in_srgb,var(--ck-palette-ink)_12%,transparent))]";

const TOOLBAR_FIELD = "gap-2 border border-stroke-strong text-sm leading-5";

// Classes added to the field for each variant.
const variantClasses = {
  catalog: "h-14 gap-3 rounded-xl border border-stroke-strong bg-panel px-5",
  "catalog-compact": cn(TOOLBAR_FIELD, "h-9 rounded-xl bg-transparent px-2"),
  "catalog-filter":
    "h-12 gap-3 rounded-xl border border-stroke-strong bg-panel-secondary px-4",
  default: cn(PAGE_SEARCH_FIELD, "rounded-full"),
  directory: cn(
    TOOLBAR_FIELD,
    "h-9 rounded-full bg-white px-3 dark:bg-[var(--gray-200,#212121)]"
  ),
  discovery:
    "h-12.5 gap-2 rounded-full border border-stroke-strong bg-(--ck-palette-surface-card,var(--ck-palette-surface-surface)) px-3 text-sm leading-5",
  settings: cn(
    PAGE_SEARCH_FIELD,
    "rounded-(--radius-button-toolbar,var(--radius-lg))"
  ),
  sidebar: cn(
    "h-(--ck-row-height-row,31px) rounded-lg pe-(--ck-row-padding-cell-x,var(--ck-row-padding-x,0.5rem))",
    SOFT_ALPHA
  ),
  "sidebar-header": cn("h-9 shrink-0 gap-2 rounded-full px-3", SOFT_ALPHA),
  toolbar: cn(TOOLBAR_FIELD, "h-9 rounded-full bg-transparent px-3"),
  "toolbar-action": cn(
    TOOLBAR_FIELD,
    "h-(--ck-compose-button-spacing,calc(var(--spacing)*8)) rounded-full bg-transparent px-3"
  ),
  "toolbar-compact": cn(TOOLBAR_FIELD, "h-8 rounded-full bg-transparent px-3"),
} as const satisfies Record<PageSearchVariant, string>;

const searchIconFor = (variant: PageSearchVariant) => {
  if (variant === "discovery") {
    return <Search20Icon className="shrink-0 text-text-muted" />;
  }

  if (variant === "sidebar-header" || toolbarVariants.has(variant)) {
    return <Search16Icon className="shrink-0 text-text-muted" />;
  }

  return <SearchIcon16 className="size-4 text-text-muted" />;
};

interface PageSearchInputProps {
  "aria-activedescendant"?: string;
  "aria-autocomplete"?: "both" | "inline" | "list" | "none";
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Accessible name of the clear button. */
  clearLabel?: string;
  disabled?: boolean;
  id: string;
  inputKey?: string;
  inputRef?: Ref<HTMLInputElement>;
  inputRole?: string;
  /** Shows the clear button while the query is not empty. Defaults to true. */
  isClearable?: boolean;
  /** The label of the input, visible to assistive technology only. */
  label: ReactNode;
  maxLength?: number;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onSearchQueryChange: (query: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  searchQuery: string;
  trailingControl?: ReactNode;
  variant?: PageSearchVariant;
}

const DEFAULT_CLEAR_LABEL = "Clear search";

const PageSearchInput = ({
  "aria-activedescendant": ariaActiveDescendant,
  "aria-autocomplete": ariaAutocomplete,
  "aria-controls": ariaControls,
  "aria-expanded": ariaExpanded,
  autoFocus,
  className,
  clearLabel,
  disabled,
  id,
  inputKey,
  inputRef,
  inputRole,
  isClearable = true,
  label,
  maxLength,
  onFocus,
  onKeyDown,
  onSearchQueryChange,
  placeholder,
  readOnly,
  searchQuery,
  trailingControl,
  variant = "default",
}: PageSearchInputProps) => {
  const ownRef = useRef<HTMLInputElement | null>(null);

  const attachInput = useMergedRef(inputRef, ownRef);

  const small = toolbarVariants.has(variant) || variant === "discovery";

  const searchIcon =
    variant === "sidebar" ? (
      <div className="flex shrink-0 items-center ps-1 pe-1">
        <span
          className="relative -mx-[3px] flex h-(--ck-row-height-row,31px) w-(--ck-row-height-row,31px) shrink-0 items-center justify-center"
          role="presentation"
        >
          {searchIconFor(variant)}
        </span>
      </div>
    ) : (
      <span className="flex shrink-0 items-center justify-center">
        {searchIconFor(variant)}
      </span>
    );

  return (
    <div
      className={cn(
        "flex items-center py-0 text-base leading-[18px] [-webkit-app-region:no-drag]",
        variantClasses[variant],
        className
      )}
      data-sidebar-header-search={variant === "sidebar-header" || undefined}
    >
      {searchIcon}
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        key={inputKey}
        ref={attachInput}
        aria-activedescendant={ariaActiveDescendant}
        aria-autocomplete={ariaAutocomplete}
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-text outline-none select-text [&::placeholder]:select-none",
          variant === "discovery"
            ? "placeholder:text-text"
            : "placeholder:text-text-subtle",
          small ? "text-sm leading-5" : "text-base leading-[18px]",
          variant === "discovery" && "tracking-[-0.15px] max-md:text-base"
        )}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        role={inputRole}
        type="text"
        value={searchQuery}
        onChange={(event) => {
          onSearchQueryChange(event.target.value);
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      {isClearable && searchQuery.length > 0 ? (
        <button
          aria-label={clearLabel ?? DEFAULT_CLEAR_LABEL}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center text-text-muted hover:text-text",
            variant === "sidebar" && "size-6"
          )}
          disabled={disabled}
          type="button"
          onClick={() => {
            ownRef.current?.focus();
            onSearchQueryChange("");
          }}
        >
          <ClearCircleIcon />
        </button>
      ) : null}
      {isPresent(trailingControl) ? (
        <div className="flex shrink-0 items-center">{trailingControl}</div>
      ) : null}
    </div>
  );
};

export { PageSearchInput };

export type { PageSearchInputProps, PageSearchVariant };
