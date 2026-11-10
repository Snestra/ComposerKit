"use client";

import { DataButton } from "composerkit/components/button/data-button";
/* oxlint-disable complexity -- The root, the list key handler and the open state keeps one branch per case. */
import { SelectControl } from "composerkit/components/date-picker/select-control";
import type {
  DropdownIconType,
  SelectControlSize,
  SelectControlVariant,
} from "composerkit/components/date-picker/select-control";
import { TransitionGroup } from "composerkit/components/date-picker/transition-group";
import {
  afterFrames,
  useIsClient,
} from "composerkit/components/dialog/dialog-layer";
import { CheckIcon, SearchIcon } from "composerkit/components/icon";
import { usePortalContainer } from "composerkit/components/platform-provider";
import {
  DEFAULT_GROUP_LIMIT,
  OPTION_LIMIT,
  countOptions,
  createTypeAhead,
  defaultSearchPredicate,
  filterOptions,
  findOption,
  firstEnabled,
  flatten,
  focusElementById,
  hasGroups,
  hasNode,
  hasText,
  isTypeAheadKey,
  matchTypeAhead,
  nextEnabled,
  optionDomId,
  optionElement,
  previousEnabled,
  selectedOptions as selectedOptionsOf,
} from "composerkit/components/select/options";
import type {
  SearchPredicate,
  SelectOption,
  SelectOptionGroup,
  SelectOptions,
} from "composerkit/components/select/options";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "composerkit/components/ui/popover";
import { Input, TagInput } from "composerkit/components/ui/text-field";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { useLatest } from "composerkit/lib/dismissable-layer";
import { cn } from "composerkit/lib/utils";
import { Info as LucideInfo, X as LucideX } from "lucide-react";
import {
  createContext,
  isValidElement,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import styles from "composerkit/components/select/select.module.css";

export type {
  SelectOption,
  SelectOptionGroup,
  SelectOptions,
} from "composerkit/components/select/options";

export interface SelectAction {
  Icon?: ComponentType<{ role?: string }>;
  className?: string;
  id: string;
  label: string;
  onSelect: (id: string) => void;
}

export interface SelectPagination {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}

export interface MultipleValueView {
  selectedAll: boolean;
  values: readonly SelectOption[];
}

interface SelectCommonProps {
  actions?: readonly SelectAction[];
  align?: "center" | "end" | "start";
  alignOffset?: number;
  "aria-describedby"?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  avoidCollisions?: boolean;
  block?: boolean;
  clearable?: boolean;
  disablePressable?: boolean;
  disabled?: boolean;
  dropdownIconType?: DropdownIconType;
  endAdornment?: ReactNode;
  footer?: ReactNode;
  forceNativeSelect?: boolean;
  id?: string;
  invalid?: boolean;
  listMaxWidth?: string;
  listMinWidth?: number | string;
  listWidth?: number | string;
  loading?: boolean;
  loadingPlaceholder?: string;
  name?: string;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (term: string) => void;
  onTriggerClickCapture?: (event: MouseEvent<HTMLElement>) => void;
  open?: boolean;
  optionClassName?: string;
  OptionView?: ComponentType<SelectOption>;
  optionIndicatorPosition?: "end" | "start";
  opticallyAlign?: "end" | "start";
  options: SelectOptions;
  pagination?: SelectPagination;
  pill?: boolean;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  searchEmptyMessage?: ReactNode;
  searchPlaceholder?: string;
  searchPredicate?: SearchPredicate;
  searchValue?: string;
  side?: "bottom" | "left" | "right" | "top";
  size?: SelectControlSize;
  triggerClassName?: string;
  TriggerStartIcon?: ComponentType<{ className?: string }>;
  variant?: SelectControlVariant;
}

export interface SelectSingleProps extends SelectCommonProps {
  multiple?: false;
  onChange: (option: SelectOption) => void;
  TriggerView?: ComponentType<SelectOption>;
  value: string;
}

export interface SelectMultipleProps extends SelectCommonProps {
  getTagRemoveLabel?: (option: SelectOption) => string;
  multiple: true;
  onChange: (options: readonly SelectOption[]) => void;
  selectedOptions?: readonly SelectOption[];
  TriggerView?: ComponentType<MultipleValueView>;
  value: readonly string[];
}

export type SelectProps = SelectMultipleProps | SelectSingleProps;

interface SelectState {
  actions: readonly SelectAction[];
  align: "center" | "end" | "start";
  alignOffset: number;
  ariaProps: Record<string, string | undefined>;
  avoidCollisions: boolean;
  block: boolean;
  clearable: boolean;
  disabled: boolean;
  disablePressable: boolean | undefined;
  dropdownIconType: DropdownIconType;
  endAdornment: ReactNode;
  footer: ReactNode;
  forceNativeSelect: boolean;
  formValue: string;
  getTagRemoveLabel: ((option: SelectOption) => string) | undefined;
  handleTriggerClickCapture:
    | ((event: MouseEvent<HTMLElement>) => void)
    | undefined;
  id: string | undefined;
  invalid: boolean;
  listMaxWidth: string;
  listMinWidth: number | string;
  listWidth: number | string | undefined;
  loading: boolean;
  loadingPlaceholder: string;
  multipleTriggerView: ComponentType<MultipleValueView> | undefined;
  multiple: boolean;
  name: string | undefined;
  onActionSelect: (id: string) => void;
  onOpenChange: ((open: boolean) => void) | undefined;
  onSearchChange: ((term: string) => void) | undefined;
  onSelect: (option: SelectOption, remove?: boolean) => void;
  open: boolean | undefined;
  optionClassName: string | undefined;
  OptionView: ComponentType<SelectOption>;
  optionIndicatorPosition: "end" | "start";
  opticallyAlign: "end" | "start" | undefined;
  options: SelectOptions;
  pagination: SelectPagination | undefined;
  pill: boolean;
  placeholder: string;
  required: boolean | undefined;
  searchable: boolean;
  searchEmptyMessage: ReactNode;
  searchPlaceholder: string;
  searchPredicate: SearchPredicate;
  selected: readonly SelectOption[];
  side: "bottom" | "left" | "right" | "top";
  singleTriggerView: ComponentType<SelectOption> | undefined;
  singleValue: string;
  size: SelectControlSize;
  triggerClassName: string | undefined;
  triggerId: string;
  TriggerStartIcon: ComponentType<{ className?: string }> | undefined;
  variant: SelectControlVariant;
}

const SelectStateContext = createContext<SelectState | null>(null);

const useSelectState = () => {
  const state = use(SelectStateContext);

  if (!state) {
    throw new Error("Place select parts under a Select root");
  }

  return state;
};

interface MenuState {
  highlightedValue: string;
  listId: string;
  listRef: RefObject<HTMLDivElement | null>;
  openValue: string;
  requestClose: () => void;
  resetSearch: () => void;
  searchTerm: string;
  setHighlightedValue: (update: string | ((current: string) => string)) => void;
}

const MenuContext = createContext<MenuState | null>(null);

const useMenuState = () => {
  const state = use(MenuContext);

  if (!state) {
    throw new Error("The select menu needs a Select ancestor");
  }

  return state;
};

interface PopupState {
  anchorRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  filteredOptions: SelectOptions;
  focusInitial: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onSearchFocus: () => void;
  onSearchInput: (term: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchRootRef: RefObject<HTMLDivElement | null>;
  tabFromFooterRef: RefObject<HTMLElement | null>;
}

const PopupContext = createContext<PopupState | null>(null);

const usePopupState = () => {
  const state = use(PopupContext);

  if (!state) {
    throw new Error("The select popup needs a Select ancestor");
  }

  return state;
};

const preventDefault = (event: Event) => {
  event.preventDefault();
};

/* ------------------------------------------------------------------ trigger */

/** The single-select trigger text. */
const SelectValue = ({ label }: SelectOption) => label;

/** The multiple-select trigger text. */
const MultipleValue = ({ selectedAll, values }: MultipleValueView) => {
  let text = `${values.length} selected`;

  if (selectedAll) {
    text = "All selected";
  } else if (values.length === 0) {
    text = "Select...";
  } else if (values.length === 1) {
    text = values[0]?.label ?? "";
  }

  return text;
};

const OptionText = ({ label }: SelectOption) => label;

/** The label an option shows by default. */
const SelectItemText = OptionText;

const NO_VALUES: readonly string[] = [];

const ignoreChange = () => {
  // The hidden form input mirrors the selected value and takes no edits.
};

const noCleanup = () => {
  // Nothing was observed, so there is nothing to undo.
};

/** A stable function that calls the latest handler. */
const useEvent = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result
) => {
  const latest = useLatest(handler);

  return useCallback((...args: Args) => latest.current(...args), [latest]);
};

const SR_ONLY = "sr-only w-full h-0 left-0 bottom-0 pointer-events-none";

interface SelectTriggerProps {
  "aria-expanded"?: boolean;
  "aria-hidden"?: "true";
  "aria-haspopup"?: "dialog";
  "data-state"?: "closed" | "open";
  onOpenChange?: (open?: boolean) => void;
  ref?: Ref<HTMLSpanElement>;
  tabIndex?: number;
}

/** The control, its labelling spans and the form input. */
const SelectTrigger = ({ onOpenChange, ref, ...rest }: SelectTriggerProps) => {
  const state = useSelectState();
  const labelId = useId();
  const valueId = useId();
  const ariaLabel = state.ariaProps["aria-label"];
  const labelledBy = state.ariaProps["aria-labelledby"];
  const [first] = state.selected;
  const text = state.loading ? state.loadingPlaceholder : state.placeholder;
  const single = first ?? { label: text, value: "" };

  const hasValue = state.multiple
    ? state.selected.length > 0
    : first !== undefined;

  const isPlaceholder = state.loading || !hasValue;

  const withInput =
    (hasText(state.name) || hasText(state.id)) && !state.forceNativeSelect;

  const multipleView = useMemo<MultipleValueView>(() => {
    const every = flatten(state.options);

    return {
      selectedAll: every.length > 0 && every.length <= state.selected.length,
      values:
        state.selected.length > 0
          ? state.selected
          : [{ label: text, value: "" }],
    };
  }, [state.options, state.selected, text]);

  let labelledByIds;

  if (hasText(labelledBy)) {
    labelledByIds = `${labelledBy} ${valueId}`;
  } else if (hasText(ariaLabel)) {
    labelledByIds = `${labelId} ${valueId}`;
  }

  const SingleView = state.singleTriggerView ?? SelectValue;
  const MultiView = state.multipleTriggerView ?? MultipleValue;

  const typeAhead = useMemo(() => createTypeAhead(), []);

  const clear = () => {
    state.onSelect({ label: "", value: "" });
    onOpenChange?.(false);
  };

  // A closed single select picks the next option whose label starts with the typed prefix.
  const pickByTyping = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (state.multiple || !isTypeAheadKey(event.key)) {
      return;
    }

    event.stopPropagation();

    const match = matchTypeAhead(
      state.options,
      typeAhead(event.key),
      state.singleValue
    );

    if (match) {
      state.onSelect(match);
    }
  };

  return (
    <SelectControl
      aria-describedby={state.ariaProps["aria-describedby"]}
      aria-labelledby={labelledByIds}
      block={state.block}
      className={cn(styles.trigger, state.triggerClassName)}
      disablePressable={state.disablePressable}
      disabled={state.disabled}
      dropdownIconType={state.dropdownIconType}
      id={state.triggerId}
      invalid={state.invalid}
      loading={state.loading}
      onClearClick={state.clearable ? clear : undefined}
      onClickCapture={state.handleTriggerClickCapture}
      onKeyDown={pickByTyping}
      onInteract={
        onOpenChange
          ? () => {
              onOpenChange();
            }
          : undefined
      }
      opticallyAlign={state.opticallyAlign}
      pill={state.pill}
      ref={ref}
      selected={!isPlaceholder}
      size={state.size}
      StartIcon={state.TriggerStartIcon}
      variant={state.variant}
      {...rest}
    >
      {hasText(ariaLabel) && !hasText(labelledBy) && (
        <span className={SR_ONLY} id={labelId}>
          {ariaLabel}
        </span>
      )}
      <span id={valueId}>
        {state.multiple ? (
          <MultiView {...multipleView} />
        ) : (
          <SingleView {...single} />
        )}
      </span>
      {withInput && (
        <input
          aria-hidden="true"
          className={SR_ONLY}
          id={state.id}
          inert
          name={state.name}
          onChange={ignoreChange}
          onFocus={() => {
            focusElementById(state.triggerId);
          }}
          required={state.required}
          tabIndex={-1}
          value={state.formValue}
        />
      )}
    </SelectControl>
  );
};

/* ------------------------------------------------------------------- native */

const optionTag = (option: SelectOption) => (
  <option disabled={option.disabled} key={option.value} value={option.value}>
    {option.label}
  </option>
);

/** A real select laid over the styled control. */
const NativeSelect = () => {
  const state = useSelectState();

  if (state.multiple) {
    throw new Error(
      "Native Select rendering cannot handle multiple selection."
    );
  }

  const { singleValue: value } = state;

  return (
    <div className="flex min-w-0">
      <div className={cn("relative max-w-full", state.block && "w-full")}>
        <select
          aria-describedby={state.ariaProps["aria-describedby"]}
          aria-label={state.ariaProps["aria-label"]}
          aria-labelledby={state.ariaProps["aria-labelledby"]}
          className={styles.nativeSelect}
          data-ck-native-selectcontrol=""
          disabled={state.loading}
          name={state.name}
          onChange={(event) => {
            const option = findOption(state.options, event.target.value);

            if (option) {
              state.onSelect(option);
            }
          }}
          onClickCapture={state.handleTriggerClickCapture}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          value={value}
        >
          {value === "" && <option value="">{state.placeholder}</option>}
          {hasGroups(state.options)
            ? state.options.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(optionTag)}
                </optgroup>
              ))
            : flatten(state.options).map(optionTag)}
        </select>
        <SelectTrigger aria-hidden="true" tabIndex={-1} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------- popup */

/** The enter and exit phases wrap the list. */
const SelectPortal = ({ children }: { children?: ReactNode }) => {
  const container = usePortalContainer();
  const client = useIsClient();

  if (!client) {
    return null;
  }

  return createPortal(
    <TransitionGroup
      className={styles.menu}
      enterDuration={350}
      exitDuration={200}
    >
      {children}
    </TransitionGroup>,
    container ?? document.body
  );
};

/** A number is pixels, as in the style helper; a string is used as is. */
const cssLength = (value: number | string | undefined) =>
  value === undefined
    ? undefined
    : `${value}${Number.isFinite(value) ? "px" : ""}`;

/** The Radix popover content that places the list. */
const SelectPositioner = ({ children }: { children?: ReactNode }) => {
  const state = useSelectState();
  const popup = usePopupState();
  const { requestClose } = useMenuState();
  const { contentRef } = popup;

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: every key is a `--name` custom property with a string value, which CSSProperties accepts
  const style = {
    "--ck-select-list-max-width": state.listMaxWidth,
    "--ck-select-list-min-width": cssLength(state.listMinWidth),
    "--ck-select-list-width": cssLength(state.listWidth),
  } as CSSProperties;

  return (
    <PopoverContent
      align={state.align}
      alignOffset={state.alignOffset}
      avoidCollisions={state.avoidCollisions}
      className={styles.menuList}
      collisionPadding={{ bottom: 30, top: 30 }}
      disablePortal
      forceMount
      onCloseAutoFocus={preventDefault}
      onEscapeKeyDown={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onInteractOutside={(event) => {
        if (
          event.target instanceof Node &&
          popup.anchorRef.current?.contains(event.target) === true
        ) {
          event.preventDefault();
        }
      }}
      onKeyDownCapture={(event) => {
        if (
          event.key === "Tab" &&
          event.shiftKey &&
          event.target === popup.tabFromFooterRef.current
        ) {
          popup.searchInputRef.current?.focus();
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onMouseDown={(event) => {
        if (
          state.searchable &&
          !(
            event.target instanceof Element &&
            event.target.closest("[data-ck-select-footer]") !== null
          )
        ) {
          event.preventDefault();
        }
      }}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        popup.focusInitial();
      }}
      ref={contentRef}
      side={state.side}
      sideOffset={5}
      style={style}
      unstyled
    >
      {children}
    </PopoverContent>
  );
};

/* ------------------------------------------------------------------ options */

const InfoIcon = () => (
  <LucideInfo height="1em" width="1em" strokeWidth={1.5} />
);

const IndicatorSlot = ({
  children,
  indicator = false,
  position,
}: {
  children?: ReactNode;
  indicator?: boolean;
  position: "end" | "start";
}) => (
  <div
    className={styles.optionIndicatorSlot}
    data-ck-option-indicator-position={position}
    data-ck-select-option-indicator={indicator ? "" : undefined}
  >
    {children}
  </div>
);

/** The selection check in its 16px slot. */
const SelectItemIndicator = ({
  isSelected,
  position,
}: {
  isSelected: boolean;
  position: "end" | "start";
}) => (
  <IndicatorSlot indicator position={position}>
    {isSelected && <CheckIcon className={styles.optionCheck} />}
  </IndicatorSlot>
);

/** One option row. */
const SelectItem = (option: SelectOption) => {
  const state = useSelectState();
  const menu = useMenuState();
  const { tooltip, value } = option;
  const disabled = option.disabled ?? false;

  const selected = state.multiple
    ? state.selected.some((entry) => entry.value === value)
    : value === menu.openValue;

  const highlighted = value === menu.highlightedValue;
  const position = state.optionIndicatorPosition;
  const View = state.OptionView;

  const choose = () => {
    if (state.multiple) {
      state.onSelect(option, selected);

      if (state.searchable) {
        menu.resetSearch();
      }
    } else {
      state.onSelect(option);
      menu.requestClose();
    }
  };

  return (
    <div
      aria-disabled={disabled}
      aria-selected={selected}
      className={cn(styles.option, state.optionClassName)}
      data-disabled={disabled ? "" : undefined}
      data-highlight={highlighted ? "" : undefined}
      data-ck-option-id={value}
      data-selected={selected ? "" : undefined}
      id={optionDomId(value)}
      onPointerLeave={
        disabled
          ? undefined
          : () => {
              menu.setHighlightedValue((current) =>
                current === value ? "" : current
              );
            }
      }
      onPointerMove={
        disabled
          ? undefined
          : () => {
              if (!highlighted) {
                menu.setHighlightedValue(value);
              }
            }
      }
      onPointerUp={disabled ? undefined : choose}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The option is a div with role option holding a check slot and a tooltip.
      role="option"
    >
      <div className={styles.pressableInner}>
        <div className={styles.optionInner}>
          {position === "start" && (
            <SelectItemIndicator isSelected={selected} position={position} />
          )}
          <View {...option} />
          {tooltip && (
            <TooltipHint
              content={tooltip.content}
              maxWidth={tooltip.maxWidth}
              side="right"
            >
              <InfoIcon />
            </TooltipHint>
          )}
          {position === "end" && (
            <SelectItemIndicator isSelected={selected} position={position} />
          )}
        </div>
        {hasNode(option.description) && (
          <div className={styles.optionInner}>
            {position === "start" && <IndicatorSlot position={position} />}
            {option.description}
            {position === "end" && <IndicatorSlot position={position} />}
          </div>
        )}
      </div>
    </div>
  );
};

const LimitRow = ({
  label,
  onPointerUp,
  value,
}: {
  label: string;
  onPointerUp: () => void;
  value: string;
}) => {
  const state = useSelectState();
  const menu = useMenuState();
  const highlighted = value === menu.highlightedValue;
  const position = state.optionIndicatorPosition;

  return (
    <div
      aria-selected={false}
      className={cn(styles.option, styles.optionsLimit)}
      data-highlight={highlighted ? "" : undefined}
      data-ck-option-id={value}
      id={optionDomId(value)}
      onPointerLeave={() => {
        menu.setHighlightedValue((current) =>
          current === value ? "" : current
        );
      }}
      onPointerMove={() => {
        if (!highlighted) {
          menu.setHighlightedValue(value);
        }
      }}
      onPointerUp={onPointerUp}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The limit row is a div with role option.
      role="option"
    >
      <div className={cn(styles.pressableInner, styles.optionInner)}>
        {position === "start" && <IndicatorSlot position={position} />}
        {label}
        {position === "end" && <IndicatorSlot position={position} />}
      </div>
    </div>
  );
};

const HardLimitHeading = ({ hidden }: { hidden: number }) => {
  const position = useSelectState().optionIndicatorPosition;

  return (
    <div className={styles.optionHardLimitHeading}>
      {position === "start" && <IndicatorSlot position={position} />}
      {`…and ${hidden.toLocaleString()} more options. Use search to refine results further.`}
      {position === "end" && <IndicatorSlot position={position} />}
    </div>
  );
};

const GroupBlock = ({
  label,
  options,
  optionsLimit = DEFAULT_GROUP_LIMIT,
}: SelectOptionGroup) => {
  const groupId = useId();
  const state = useSelectState();
  const menu = useMenuState();
  const [expanded, setExpanded] = useState(false);
  const position = state.optionIndicatorPosition;

  const limited =
    state.pagination === undefined &&
    optionsLimit.limit < options.length &&
    menu.searchTerm === "" &&
    !expanded;

  const truncated =
    state.pagination === undefined && OPTION_LIMIT < options.length && !limited;

  let shown = options;

  if (limited) {
    shown = options.slice(0, optionsLimit.limit);
  } else if (truncated) {
    shown = options.slice(0, OPTION_LIMIT);
  }

  return (
    <>
      <div className={styles.optionGroupHeading}>
        {position === "start" && <IndicatorSlot position={position} />}
        {label}
        {position === "end" && <IndicatorSlot position={position} />}
      </div>
      {shown.map((option) => (
        <SelectItem key={option.value} {...option} />
      ))}
      {limited && (
        <LimitRow
          label={optionsLimit.label}
          onPointerUp={() => {
            setExpanded(true);
            menu.setHighlightedValue(options[optionsLimit.limit]?.value ?? "");
          }}
          value={`group-limit-${groupId}`}
        />
      )}
      {truncated && <HardLimitHeading hidden={options.length - OPTION_LIMIT} />}
    </>
  );
};

/** Loads the next page when the sentinel scrolls into view. */
const PaginationSentinel = ({
  pagination,
}: {
  pagination: SelectPagination;
}) => {
  const latest = useLatest(pagination.onLoadMore);

  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null) {
        return noCleanup;
      }

      let armed = true;

      const observer = new IntersectionObserver(
        (entries) => {
          if (armed && entries.some((entry) => entry.isIntersecting)) {
            armed = false;
            observer.disconnect();
            latest.current();
          }
        },
        { root: node.parentElement }
      );

      observer.observe(node);

      return () => {
        armed = false;
        observer.disconnect();
      };
    },
    [latest]
  );

  return pagination.hasNextPage && !pagination.isFetching ? (
    <div aria-hidden className={styles.paginationSentinel} ref={observe} />
  ) : null;
};

/** The listbox. */
const Listbox = () => {
  const state = useSelectState();
  const menu = useMenuState();
  const { listRef } = menu;
  const { filteredOptions } = usePopupState();

  const activeId = hasText(menu.highlightedValue)
    ? optionDomId(menu.highlightedValue)
    : undefined;

  const total = countOptions(filteredOptions);
  const grouped = hasGroups(filteredOptions);

  if (total === 0) {
    return (
      <div
        aria-multiselectable={state.multiple ? true : undefined}
        id={menu.listId}
        ref={listRef}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The list is a div with role listbox.
        role="listbox"
      >
        <div
          className={styles.searchEmpty}
          data-ck-text-only={
            isValidElement(state.searchEmptyMessage) ? undefined : ""
          }
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The empty message is a div with role status.
          role="status"
        >
          {state.searchEmptyMessage}
        </div>
        {state.pagination && (
          <PaginationSentinel pagination={state.pagination} />
        )}
      </div>
    );
  }

  const flat = flatten(filteredOptions);

  const hardLimited =
    state.pagination === undefined && !grouped && flat.length > OPTION_LIMIT;

  return (
    <div
      aria-activedescendant={activeId}
      aria-multiselectable={state.multiple ? true : undefined}
      className={styles.optionsList}
      id={menu.listId}
      ref={listRef}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The list is a div with role listbox.
      role="listbox"
      tabIndex={state.searchable ? -1 : 0}
    >
      {grouped
        ? filteredOptions.map((group) => (
            <GroupBlock key={group.label} {...group} />
          ))
        : flat
            .slice(0, state.pagination === undefined ? OPTION_LIMIT : undefined)
            .map((option) => <SelectItem key={option.value} {...option} />)}
      {hardLimited && <HardLimitHeading hidden={flat.length - OPTION_LIMIT} />}
      {state.pagination && (
        <PaginationSentinel key={total} pagination={state.pagination} />
      )}
    </div>
  );
};

const ActionRow = ({ Icon, className, id, label }: SelectAction) => {
  const state = useSelectState();
  const menu = useMenuState();

  const run = () => {
    state.onActionSelect(id);
    menu.requestClose();
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The action is a focusable row with pointer and key handlers.
    <div
      className={styles.action}
      onKeyDown={(event) => {
        switch (event.key) {
          case "Tab": {
            break;
          }

          case "Enter":
          case " ": {
            event.stopPropagation();
            run();
            break;
          }

          default: {
            event.stopPropagation();
          }
        }
      }}
      onPointerUp={run}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The action is a focusable div without a role.
      tabIndex={0}
    >
      <div className={cn(styles.actionInner, className)}>
        {Icon && <Icon role="presentation" />}
        {label}
      </div>
    </div>
  );
};

/** The footer and the action rows under the list. */
const Actions = () => {
  const { actions, footer } = useSelectState();

  if (actions.length === 0 && !hasNode(footer)) {
    return null;
  }

  return (
    <div className={styles.actionsContainer}>
      {hasNode(footer) ? (
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The footer only stops key events reaching the list.
        <div
          data-ck-select-footer=""
          onKeyDown={(event) => {
            if (event.key !== "Escape" && event.key !== "Tab") {
              event.stopPropagation();
            }
          }}
        >
          {footer}
        </div>
      ) : null}
      {actions.map((action) => (
        <ActionRow key={action.id} {...action} />
      ))}
    </div>
  );
};

/** The scroll area, the list and the actions. */
const SelectPopup = () => {
  const state = useSelectState();
  const menu = useMenuState();
  const popup = usePopupState();
  const { menuRef } = popup;

  const highlighted = useLatest(menu.highlightedValue);
  const { listRef } = menu;

  // On open the selected option, else the first enabled one, is centred two frames later.
  useLayoutEffect(
    () =>
      afterFrames(() => {
        const list = listRef.current;
        const target = list ? optionElement(highlighted.current, list) : null;

        if (!list || !target) {
          return;
        }

        const max = list.scrollHeight - list.clientHeight;

        const centred =
          target.offsetTop - list.clientHeight / 2 + target.offsetHeight / 2;

        list.scrollTop = Math.max(0, Math.min(centred, max));
      }),
    [highlighted, listRef]
  );

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- The list container owns the key handling of the listbox inside it.
    <div
      className={styles.menuInner}
      onKeyDown={popup.handleKeyDown}
      ref={menuRef}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The list container takes the tab stop when there is no search field.
      tabIndex={state.searchable ? -1 : 0}
    >
      <Listbox />
      <Actions />
    </div>
  );
};

/* ------------------------------------------------------------------- search */

const SearchField = () => {
  const state = useSelectState();
  const popup = usePopupState();
  const menu = useMenuState();
  const [first] = state.selected;

  const showSelection =
    !state.multiple && menu.searchTerm === "" && first !== undefined;

  const selectionId = useId();
  const SingleView = state.singleTriggerView ?? SelectValue;

  const common = {
    "aria-activedescendant":
      popup.isOpen && hasText(menu.highlightedValue)
        ? optionDomId(menu.highlightedValue)
        : undefined,
    "aria-autocomplete": "list" as const,
    "aria-busy": state.loading ? true : undefined,
    "aria-controls": popup.isOpen ? menu.listId : undefined,
    "aria-describedby":
      [
        state.ariaProps["aria-describedby"],
        showSelection ? selectionId : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    "aria-expanded": popup.isOpen,
    "aria-label": state.ariaProps["aria-label"],
    "aria-labelledby": state.ariaProps["aria-labelledby"],
    autoComplete: "off",
    autoCorrect: "off",
    className: cn(
      state.triggerClassName,
      state.variant === "ghost" && styles.searchGhost
    ),
    disabled: state.disabled || state.loading,
    endAdornment:
      state.clearable && state.selected.length > 0 ? (
        <DataButton
          aria-label="Clear current value"
          color="secondary"
          disabled={state.disabled || state.loading}
          onClick={() => {
            state.onSelect({ label: "", value: "" });
            menu.resetSearch();
            popup.searchInputRef.current?.focus();
          }}
          size="3xs"
          squircle={false}
          uniform
          variant="ghost"
        >
          <LucideX
            aria-hidden="true"
            height="1em"
            width="1em"
            strokeWidth={1.5}
          />
        </DataButton>
      ) : (
        state.endAdornment
      ),
    id: state.triggerId,
    invalid: state.invalid,
    onChange: (event: { target: { value: string } }) => {
      popup.onSearchInput(event.target.value);
    },
    onClick: popup.onSearchFocus,
    onFocus: popup.onSearchFocus,
    onKeyDown: popup.onSearchKeyDown,
    opticallyAlign: state.opticallyAlign,
    pill: state.pill,
    ref: popup.searchInputRef,
    role: "combobox" as const,
    size: state.size,
    spellCheck: false,
    value: menu.searchTerm,
    variant: state.variant === "ghost" ? ("outline" as const) : state.variant,
  };

  const placeholder = state.loading
    ? state.loadingPlaceholder
    : state.searchPlaceholder || state.placeholder;

  const StartIcon = state.TriggerStartIcon;

  let singleStart: ReactNode = (
    <SearchIcon className="size-4 fill-[var(--ck-palette-ink-secondary)]" />
  );

  if (showSelection) {
    singleStart = (
      <span className={styles.searchSelection} id={selectionId}>
        <SingleView {...first} />
      </span>
    );
  } else if (StartIcon) {
    singleStart = <StartIcon />;
  }

  return (
    <>
      {state.multiple ? (
        <TagInput
          {...common}
          getRemoveLabel={state.getTagRemoveLabel}
          onRemoveTag={(tag) => {
            state.onSelect(tag, true);
          }}
          placeholder={placeholder}
          startAdornment={StartIcon ? <StartIcon /> : undefined}
          tags={state.selected}
        />
      ) : (
        <Input
          {...common}
          inputClassName={styles.searchInput}
          placeholder={showSelection ? "" : placeholder}
          startAdornment={singleStart}
        />
      )}
      {(hasText(state.name) || hasText(state.id)) && (
        <input
          aria-hidden="true"
          className="sr-only"
          id={state.id}
          inert
          name={state.name}
          onChange={ignoreChange}
          onFocus={() => {
            popup.searchInputRef.current?.focus();
          }}
          required={state.required}
          tabIndex={-1}
          value={state.formValue}
        />
      )}
    </>
  );
};

/* --------------------------------------------------------------------- root */

const CustomSelect = ({ searchValue }: { searchValue: string | undefined }) => {
  const state = useSelectState();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [ownTerm, setOwnTerm] = useState("");
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const tabFromFooterRef = useRef<HTMLElement | null>(null);
  const typeAhead = useMemo(() => createTypeAhead(), []);
  const listId = `select-list-${useId()}`;

  const searchTerm = state.searchable ? (searchValue ?? ownTerm) : "";
  const hasTerm = searchTerm.trim() !== "";
  const hasPagination = state.pagination !== undefined;

  const hasOptions =
    !state.searchable ||
    hasNode(state.footer) ||
    state.onSearchChange === undefined ||
    countOptions(state.options) > 0;

  const canOpen = hasOptions || hasTerm;
  const isOpen = (state.open ?? uncontrolledOpen) && canOpen;

  const filteredOptions = useMemo(
    () => filterOptions(state.options, searchTerm, state.searchPredicate),
    [state.options, searchTerm, state.searchPredicate]
  );

  const firstValue = firstEnabled(filteredOptions)?.value;
  const selectedValue = state.formValue;

  const initialHighlight = () =>
    findOption(filteredOptions, selectedValue)?.value ?? firstValue ?? "";

  const [highlightedValue, setHighlightedValue] = useState(initialHighlight);
  const [openValue, setOpenValue] = useState(state.singleValue);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Each open starts from the selected option, else the first enabled one.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);

    if (isOpen) {
      setOpenValue(state.singleValue);
      setHighlightedValue(initialHighlight());
    }
  }

  const setOpen = useEvent((next?: boolean) => {
    const target = (next ?? !isOpen) && canOpen;

    if (target === isOpen) {
      return;
    }

    if (!target) {
      setOwnTerm("");

      if (searchTerm !== "") {
        state.onSearchChange?.("");
      }
    }

    if (state.open === undefined) {
      setUncontrolledOpen(target);
    }

    state.onOpenChange?.(target);

    if (!target) {
      setTimeout(() => {
        if (!contentRef.current) {
          return;
        }

        const active = document.activeElement;

        if (!active || contentRef.current.contains(active)) {
          focusElementById(state.triggerId);
        }
      }, 0);
    }
  });

  const requestClose = useEvent(() => {
    setOpen(false);
  });

  const resetSearch = useEvent(() => {
    setOwnTerm("");
    state.onSearchChange?.("");
  });

  const previousTerm = useRef(searchTerm);

  const latest = useLatest({
    firstValue,
    highlightedValue,
    isOpen,
  });

  // The highlight follows the filtered options and the term.
  useLayoutEffect(() => {
    const { current } = latest;
    const sameTerm = hasPagination && previousTerm.current === searchTerm;

    previousTerm.current = searchTerm;

    if (!current.isOpen || !listRef.current) {
      return;
    }

    const highlighted = findOption(filteredOptions, current.highlightedValue);

    if (sameTerm && highlighted && highlighted.disabled !== true) {
      return;
    }

    if (!sameTerm) {
      listRef.current.scrollTop = 0;
    }

    setHighlightedValue(current.firstValue ?? "");
  }, [filteredOptions, searchTerm, hasPagination, latest]);

  const move = (value: string, element: HTMLElement) => {
    setHighlightedValue(value);
    element.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = useEvent((event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    const { key } = event;
    const list = menuRef.current;

    if (!list) {
      return;
    }

    const current =
      [highlightedValue, firstValue, selectedValue].find(hasText) ?? "";

    const searchFocused = document.activeElement === searchInputRef.current;

    const activate = () => {
      const target = optionElement(highlightedValue, list);
      target?.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
        })
      );
    };

    const restart = () => {
      const selected = hasText(selectedValue)
        ? optionElement(selectedValue, list)
        : null;

      if (selected && hasText(selectedValue)) {
        move(selectedValue, selected);

        return;
      }

      const first = hasText(firstValue)
        ? optionElement(firstValue, list)
        : null;

      if (first && hasText(firstValue)) {
        move(firstValue, first);
      }
    };

    switch (key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();

        if (highlightedValue === "" || !optionElement(highlightedValue, list)) {
          restart();

          return;
        }

        const step =
          key === "ArrowDown"
            ? nextEnabled(highlightedValue, list)
            : previousEnabled(current, list);

        const target = step instanceof HTMLElement ? step : undefined;
        const id = target?.dataset.ckOptionId;

        if (target && hasText(id)) {
          move(id, target);
        }

        return;
      }

      case "Enter": {
        event.preventDefault();
        activate();

        return;
      }

      case " ": {
        if (searchFocused) {
          return;
        }

        event.preventDefault();
        activate();

        return;
      }

      default: {
        break;
      }
    }

    if (isTypeAheadKey(key)) {
      if (searchFocused) {
        return;
      }

      event.stopPropagation();

      const match = matchTypeAhead(
        filteredOptions,
        typeAhead(key),
        highlightedValue
      );

      const element = match ? optionElement(match.value, list) : null;

      if (match && element) {
        move(match.value, element);
      }
    }
  });

  const focusInitial = useEvent(() => {
    (searchInputRef.current ?? listRef.current ?? menuRef.current)?.focus({
      preventScroll: true,
    });
  });

  const onSearchFocus = useEvent(() => {
    setOpen(true);
  });

  const onSearchInput = useEvent((term: string) => {
    const termHasText = term.trim() !== "";

    const allowed =
      state.onSearchChange === undefined ||
      hasNode(state.footer) ||
      countOptions(state.options) > 0 ||
      termHasText;

    if (isOpen && !allowed) {
      setOpen(false);

      return;
    }

    setOwnTerm(term);
    state.onSearchChange?.(term);

    if (state.open === undefined) {
      setUncontrolledOpen(termHasText || allowed);
    }

    if (!isOpen && termHasText) {
      state.onOpenChange?.(true);
    }
  });

  const onSearchKeyDown = useEvent((event: KeyboardEvent<HTMLInputElement>) => {
    if (
      isOpen &&
      hasNode(state.footer) &&
      event.key === "Tab" &&
      !event.shiftKey
    ) {
      const footer = contentRef.current?.querySelector(
        "[data-ck-select-footer]"
      );

      const focusable = [
        ...(footer?.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea, [tabindex], [contenteditable='true']"
        ) ?? []),
      ].filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(":disabled, input[type='hidden']") &&
          !element.closest("[hidden], [inert]")
      );

      for (const element of focusable) {
        element.focus();

        if (element.ownerDocument.activeElement === element) {
          tabFromFooterRef.current = element;
          event.preventDefault();

          return;
        }
      }
    }

    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
    } else if (isOpen) {
      handleKeyDown(event);
    }
  });

  const popup = useMemo<PopupState>(
    () => ({
      anchorRef,
      contentRef,
      filteredOptions,
      focusInitial,
      handleKeyDown,
      isOpen,
      menuRef,
      onSearchFocus,
      onSearchInput,
      onSearchKeyDown,
      searchInputRef,
      searchRootRef,
      tabFromFooterRef,
    }),
    [
      filteredOptions,
      focusInitial,
      handleKeyDown,
      isOpen,
      onSearchFocus,
      onSearchInput,
      onSearchKeyDown,
    ]
  );

  const menu = useMemo<MenuState>(
    () => ({
      highlightedValue,
      listId,
      listRef,
      openValue,
      requestClose,
      resetSearch,
      searchTerm,
      setHighlightedValue,
    }),
    [highlightedValue, listId, openValue, requestClose, resetSearch, searchTerm]
  );

  const trigger = state.searchable ? (
    <div
      className={styles.searchControl}
      data-block={state.block ? "" : undefined}
      onClickCapture={state.handleTriggerClickCapture}
      ref={(node) => {
        anchorRef.current = node;
        searchRootRef.current = node;
      }}
    >
      <SearchField />
    </div>
  ) : (
    <SelectTrigger
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      data-state={isOpen ? "open" : "closed"}
      onOpenChange={setOpen}
      ref={anchorRef}
    />
  );

  return (
    <PopupContext value={popup}>
      <MenuContext value={menu}>
        <Popover
          modal={false}
          onOpenChange={(next) => {
            if (!(state.loading && next)) {
              setOpen(next);
            }
          }}
          open
        >
          {trigger}
          <PopoverAnchor virtualRef={anchorRef} />
          <SelectPortal>
            {isOpen && (
              <SelectPositioner key="dropdown">
                <SelectPopup />
              </SelectPositioner>
            )}
          </SelectPortal>
        </Popover>
      </MenuContext>
    </PopupContext>
  );
};

/**
 * The Select. It owns the options, the value and the labelling,
 * and renders the trigger, list and rows above, or a native select with
 * `forceNativeSelect`.
 */
const Select = (props: SelectProps) => {
  const {
    actions = [],
    align,
    alignOffset,
    avoidCollisions = true,
    "aria-describedby": ariaDescribedBy,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    clearable = false,
    disabled = false,
    disablePressable,
    dropdownIconType = "dropdown",
    endAdornment,
    footer,
    forceNativeSelect = false,
    id,
    invalid = false,
    listMaxWidth = "auto",
    listMinWidth,
    listWidth,
    loading = false,
    loadingPlaceholder = "Loading...",
    name,
    onOpenChange,
    onSearchChange,
    onTriggerClickCapture,
    open,
    optionClassName,
    OptionView = OptionText,
    optionIndicatorPosition = "start",
    opticallyAlign,
    options,
    pagination,
    pill = false,
    placeholder = "Select...",
    required,
    searchEmptyMessage = "No results found.",
    searchPlaceholder = "",
    searchPredicate = defaultSearchPredicate,
    side = "bottom",
    size = "md",
    triggerClassName,
    TriggerStartIcon,
    variant = "outline",
  } = props;

  const multiple = props.multiple === true;

  if (forceNativeSelect && multiple) {
    throw new Error(
      "Select cannot combine forceNativeSelect with multiple selection."
    );
  }

  const block = props.block ?? variant !== "ghost";
  const resolvedAlign = align ?? (block ? "center" : "start");
  const triggerId = `select-trigger-${useId()}`;
  const searchable = props.searchable ?? countOptions(options) > 15;

  const values = props.multiple === true ? props.value : NO_VALUES;
  const singleValue = props.multiple === true ? "" : props.value;
  const formValue = props.multiple === true ? (values[0] ?? "") : singleValue;

  const selectedOptions =
    props.multiple === true ? props.selectedOptions : undefined;

  const getTagRemoveLabel =
    props.multiple === true ? props.getTagRemoveLabel : undefined;

  const singleTriggerView =
    props.multiple === true ? undefined : props.TriggerView;

  const multipleTriggerView =
    props.multiple === true ? props.TriggerView : undefined;

  const selected = useMemo(() => {
    if (multiple) {
      return selectedOptions ?? selectedOptionsOf(options, values);
    }

    const match = findOption(options, singleValue);

    return match ? [match] : [];
  }, [multiple, options, selectedOptions, singleValue, values]);

  const onSelect = useEvent((option: SelectOption, remove?: boolean) => {
    if (props.multiple !== true) {
      props.onChange(option);

      return;
    }

    if (option.value === "") {
      props.onChange([]);

      return;
    }

    const chosen =
      props.selectedOptions ?? selectedOptionsOf(options, props.value);

    props.onChange(
      remove === true
        ? chosen.filter((entry) => entry.value !== option.value)
        : [...chosen, option]
    );
  });

  const onActionSelect = useEvent((actionId: string) => {
    actions.find((action) => action.id === actionId)?.onSelect(actionId);
  });

  const value = useMemo<SelectState>(
    () => ({
      actions,
      align: resolvedAlign,
      alignOffset: alignOffset ?? (resolvedAlign === "center" ? 0 : -5),
      ariaProps: {
        "aria-describedby": ariaDescribedBy,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
      },
      avoidCollisions,
      block,
      clearable,
      disabled,
      disablePressable,
      dropdownIconType,
      endAdornment,
      footer,
      forceNativeSelect,
      formValue,
      getTagRemoveLabel,
      handleTriggerClickCapture: onTriggerClickCapture,
      id,
      invalid,
      listMaxWidth,
      listMinWidth: listMinWidth ?? (block ? "auto" : 300),
      listWidth,
      loading,
      loadingPlaceholder,
      multiple,
      multipleTriggerView,
      name,
      onActionSelect,
      onOpenChange,
      onSearchChange,
      onSelect,
      open,
      optionClassName,
      OptionView,
      optionIndicatorPosition,
      opticallyAlign,
      options,
      pagination,
      pill,
      placeholder,
      required,
      searchable,
      searchEmptyMessage,
      searchPlaceholder,
      searchPredicate,
      selected,
      side,
      singleTriggerView,
      singleValue,
      size,
      triggerClassName,
      triggerId,
      TriggerStartIcon,
      variant,
    }),
    [
      actions,
      alignOffset,
      ariaDescribedBy,
      ariaLabel,
      ariaLabelledBy,
      avoidCollisions,
      block,
      clearable,
      disablePressable,
      disabled,
      dropdownIconType,
      endAdornment,
      footer,
      forceNativeSelect,
      formValue,
      getTagRemoveLabel,
      id,
      invalid,
      listMaxWidth,
      listMinWidth,
      listWidth,
      loading,
      loadingPlaceholder,
      multiple,
      multipleTriggerView,
      name,
      onActionSelect,
      onOpenChange,
      onSearchChange,
      onSelect,
      onTriggerClickCapture,
      open,
      optionClassName,
      OptionView,
      optionIndicatorPosition,
      opticallyAlign,
      options,
      pagination,
      pill,
      placeholder,
      required,
      resolvedAlign,
      searchEmptyMessage,
      searchPlaceholder,
      searchPredicate,
      searchable,
      selected,
      side,
      singleTriggerView,
      singleValue,
      size,
      triggerClassName,
      triggerId,
      TriggerStartIcon,
      variant,
    ]
  );

  return (
    <SelectStateContext value={value}>
      {forceNativeSelect ? (
        <NativeSelect />
      ) : (
        <CustomSelect searchValue={props.searchValue} />
      )}
    </SelectStateContext>
  );
};

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
};

export type { SelectTriggerProps };
