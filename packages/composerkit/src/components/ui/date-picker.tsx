"use client";

import { DataButton } from "composerkit/components/button/data-button";
import {
  DateTime,
  chunk,
  daysOfMonth,
  formatValue,
  intervalContains,
  isBefore,
  isSameDay,
  isToday,
  monthLabel,
  toDateTime,
  weekdayLabels,
} from "composerkit/components/date-picker/date-time";
import {
  Popover,
  PopoverContent,
  useClosePopover,
  usePopoverTrigger,
} from "composerkit/components/date-picker/popover";
import type {
  PopoverAlign,
  PopoverSide,
} from "composerkit/components/date-picker/popover";
import {
  SelectControl,
  setPressableScale,
} from "composerkit/components/date-picker/select-control";
import type {
  DropdownIconType,
  SelectControlSize,
  SelectControlVariant,
} from "composerkit/components/date-picker/select-control";
import { TransitionGroup } from "composerkit/components/date-picker/transition-group";
import {
  afterFrames,
  mergeRefs,
} from "composerkit/components/dialog/dialog-layer";
import { useLatest } from "composerkit/lib/dismissable-layer";
import { cn } from "composerkit/lib/utils";
import {
  Calendar as LucideCalendar,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
} from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, MouseEventHandler, ReactNode, Ref } from "react";

import styles from "composerkit/components/date-picker/date-picker.module.css";

/*
 * DatePicker: a SelectControl trigger that opens a popover holding a month
 * calendar. Dates are the DateTime of components/date-picker/date-time.ts.
 */

const POPOVER_MIN_WIDTH = 236;
const DAYS_IN_WEEK = 7;
const MONTH_ENTER_EXIT_MS = 380;

interface DatePickerContextValue {
  initialCalendarDate: DateTime | undefined;
  locale: string | undefined;
  max: DateTime | undefined;
  min: DateTime | undefined;
  onChange: (value: DateTime | null) => void;
  value: DateTime | null;
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null);

const useDatePicker = (): DatePickerContextValue => {
  const context = use(DatePickerContext);

  if (context === null) {
    throw new Error("Place date picker parts under a DatePicker root");
  }

  return context;
};

/* --------------------------------------------------------------- icons */

const CalendarIcon = ({ className }: { className?: string }) => (
  <LucideCalendar
    aria-hidden="true"
    className={className}
    height="1em"
    width="1em"
    strokeWidth={1.5}
  />
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <LucideChevronLeft
    aria-hidden="true"
    className={className}
    height="1em"
    width="1em"
    strokeWidth={1.5}
  />
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <LucideChevronRight
    aria-hidden="true"
    className={className}
    height="1em"
    width="1em"
    strokeWidth={1.5}
  />
);

/* ------------------------------------------------------------ calendar */

interface MonthProps {
  date: DateTime;
  locale: string | undefined;
  max: DateTime | undefined;
  min: DateTime | undefined;
  onDateSelect: (day: DateTime) => void;
  selectedDate: DateTime | null;
  stepPosition: number;
}

/** One month of day buttons, placed at its step in the strip. */
const Month = ({
  date,
  locale,
  max,
  min,
  onDateSelect,
  selectedDate,
  stepPosition,
}: MonthProps) => {
  // The month keeps the step it was created at while the strip moves on.
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const initialStep = useRef(stepPosition);

  useLayoutEffect(() => {
    calendarRef.current?.style.setProperty(
      "--month-step",
      String(initialStep.current)
    );
  }, []);

  const startOfMonth = date.startOf("month");
  const endOfMonth = date.endOf("month");

  const leading: null[] = Array.from(
    { length: startOfMonth.weekday % DAYS_IN_WEEK },
    () => null
  );

  const weeks = chunk<DateTime | null>(
    [...leading, ...daysOfMonth(startOfMonth)],
    DAYS_IN_WEEK
  );

  const intervalStart = min ?? startOfMonth;
  const intervalEnd = max ?? endOfMonth;

  return (
    <div className={styles.calendar} data-calendar ref={calendarRef}>
      <p className={styles.monthLabel}>{monthLabel(startOfMonth, locale)}</p>
      <div className={styles.week}>
        {weekdayLabels(locale).map((label) => (
          <div className={styles.dayLabel} key={label}>
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div className={styles.week} key={`week-${weekIndex.toString()}`}>
          {week.map((day, dayIndex) => {
            if (day === null) {
              return (
                <div
                  className={styles.day}
                  key={`${weekIndex.toString()}-${dayIndex.toString()}`}
                />
              );
            }

            const enabled = intervalContains(intervalStart, intervalEnd, day);

            const selected =
              enabled && selectedDate !== null && isSameDay(day, selectedDate);

            return (
              <div
                className={styles.day}
                data-ck-is-selected={selected ? "" : undefined}
                key={day.day}
              >
                <button
                  className={styles.interactiveDay}
                  disabled={!enabled}
                  onClick={() => {
                    onDateSelect(day);
                  }}
                  type="button"
                >
                  {day.day}
                  {isToday(day) ? <span className={styles.todayDot} /> : null}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

interface CalendarProps {
  nextMonthLabel?: string;
  previousMonthLabel?: string;
}

/** The month navigation and the sliding month strip. */
const Calendar = ({
  nextMonthLabel = "Next month",
  previousMonthLabel = "Previous month",
}: CalendarProps) => {
  const { value, initialCalendarDate, min, max, locale, onChange } =
    useDatePicker();

  const close = useClosePopover();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [viewKey, setViewKey] = useState(0);

  const [month, setMonth] = useState<DateTime>(
    () => value ?? initialCalendarDate ?? DateTime.now()
  );

  const previousValue = useRef(value);
  const monthRef = useLatest(month);

  const canGoPrevious =
    min === undefined || isBefore(min, month.startOf("month"));

  const canGoNext = max === undefined || isBefore(month.endOf("month"), max);

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the one key is a `--name` custom property with a number value, which CSSProperties accepts
  const stripStyle = { "--calendar-step": step } as CSSProperties;

  /* A value in another month jumps the view there without sliding. */
  useEffect(() => {
    const previous = previousValue.current;

    previousValue.current = value;

    if (value === null || (previous !== null && isSameDay(previous, value))) {
      return;
    }

    const shown = monthRef.current;

    if (
      !intervalContains(shown.startOf("month"), shown.endOf("month"), value)
    ) {
      setStep(0);
      setMonth(value);
      setViewKey((key) => key + 1);
    }
  }, [value, monthRef]);

  /* The container height follows the tallest visible month. */
  useEffect(
    () =>
      afterFrames(() => {
        const container = containerRef.current;

        if (!container) {
          return;
        }

        let tallest = Number.NEGATIVE_INFINITY;

        for (const calendar of container.querySelectorAll<HTMLElement>(
          "[data-calendar]"
        )) {
          if (!calendar.closest("[data-exiting]")) {
            tallest = Math.max(tallest, calendar.clientHeight);
          }
        }

        container.style.height = `${tallest}px`;

        if (!container.style.transition) {
          afterFrames(() => {
            container.style.transition = "height 0.25s var(--ck-curve-move)";
          });
        }
      }),
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the component measures the container again whenever the displayed month changes
    [month]
  );

  return (
    <div className={styles.calendarWrapper} key={`stable-view-${viewKey}`}>
      <div className={styles.calendarContainer} ref={containerRef}>
        <div className={styles.previous}>
          <DataButton
            aria-label={previousMonthLabel}
            className={styles.navButton}
            color="secondary"
            disabled={!canGoPrevious}
            gutterSize="2xs"
            iconSize="sm"
            onClick={() => {
              setStep((current) => current - 1);
              setMonth((current) => current.minus({ months: 1 }));
            }}
            onPointerEnter={setPressableScale}
            pill={false}
            size="sm"
            squircle={false}
            variant="ghost"
          >
            <ChevronLeftIcon className={styles.navigationIcon} />
          </DataButton>
        </div>
        <div className={styles.next}>
          <DataButton
            aria-label={nextMonthLabel}
            className={styles.navButton}
            color="secondary"
            disabled={!canGoNext}
            gutterSize="2xs"
            iconSize="sm"
            onClick={() => {
              setStep((current) => current + 1);
              setMonth((current) => current.plus({ months: 1 }));
            }}
            onPointerEnter={setPressableScale}
            pill={false}
            size="sm"
            squircle={false}
            variant="ghost"
          >
            <ChevronRightIcon className={styles.navigationIcon} />
          </DataButton>
        </div>
        <div className={styles.calendarRange} style={stripStyle}>
          <TransitionGroup
            enterDuration={MONTH_ENTER_EXIT_MS}
            exitDuration={MONTH_ENTER_EXIT_MS}
          >
            <Month
              date={month}
              key={month.toLocaleString({ month: "long", year: "numeric" })}
              locale={locale}
              max={max}
              min={min}
              onDateSelect={(day) => {
                onChange(day);
                close();
              }}
              selectedDate={value}
              stepPosition={step}
            />
          </TransitionGroup>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------- date picker */

interface DatePickerBaseProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true";
  "aria-labelledby"?: string;
  align?: PopoverAlign;
  alignOffset?: number;
  block?: boolean;
  clearable?: boolean;
  disablePressable?: boolean;
  disabled?: boolean;
  dropdownIconType?: DropdownIconType;
  id?: string;
  initialCalendarDate?: DateTime | Date | null;
  invalid?: boolean;
  locale?: string;
  max?: DateTime | Date | null;
  min?: DateTime | Date | null;
  nextMonthLabel?: string;
  onTriggerClickCapture?: MouseEventHandler<HTMLSpanElement>;
  pill?: boolean;
  placeholder?: string;
  previousMonthLabel?: string;
  side?: PopoverSide;
  sideOffset?: number;
  size?: SelectControlSize;
  triggerClassName?: string;
  triggerDateFormat?: string;
  triggerRef?: Ref<HTMLSpanElement>;
  triggerShowIcon?: boolean;
  value?: DateTime | Date | null;
  variant?: SelectControlVariant;
}

export type DatePickerProps = DatePickerBaseProps &
  (
    | {
        /** The value in `onChange` is a Luxon-style DateTime (the default). */
        valueType?: "luxon";
        onChange: (value: DateTime | null) => void;
      }
    | {
        /** The value in `onChange` is a JS Date. */
        valueType: "date";
        onChange: (value: Date | null) => void;
      }
  );

const DatePickerTrigger = ({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledBy,
  block,
  clearable = false,
  disablePressable,
  disabled = false,
  dropdownIconType,
  id,
  invalid,
  onTriggerClickCapture,
  pill = false,
  placeholder = "Select date...",
  size = "md",
  triggerClassName,
  triggerDateFormat = "MM/dd/yy",
  triggerRef,
  triggerShowIcon = true,
  variant = "outline",
  onClear,
  triggerValue,
  triggerLocale,
}: Pick<
  DatePickerBaseProps,
  | "aria-describedby"
  | "aria-invalid"
  | "aria-labelledby"
  | "block"
  | "clearable"
  | "disablePressable"
  | "disabled"
  | "dropdownIconType"
  | "id"
  | "invalid"
  | "onTriggerClickCapture"
  | "pill"
  | "placeholder"
  | "size"
  | "triggerClassName"
  | "triggerDateFormat"
  | "triggerRef"
  | "triggerShowIcon"
  | "variant"
> & {
  onClear: () => void;
  triggerLocale: string | undefined;
  triggerValue: DateTime | null;
}) => {
  const { ref: popoverRef, ...popoverProps } = usePopoverTrigger();
  const valueId = `${id}-value`;
  const labelledBy = [ariaLabelledBy, valueId].filter(Boolean).join(" ");

  const mergedRef = useMemo(
    () => mergeRefs<HTMLSpanElement>(popoverRef, triggerRef),
    [popoverRef, triggerRef]
  );

  return (
    <SelectControl
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-labelledby={labelledBy}
      block={block}
      className={cn(styles.trigger, triggerClassName)}
      disablePressable={disablePressable}
      disabled={disabled}
      dropdownIconType={dropdownIconType}
      id={id}
      invalid={invalid}
      onClearClick={clearable ? onClear : undefined}
      onClickCapture={onTriggerClickCapture}
      pill={pill}
      ref={mergedRef}
      selected={triggerValue !== null}
      size={size}
      StartIcon={triggerShowIcon ? CalendarIcon : undefined}
      variant={variant}
      {...popoverProps}
    >
      <span className="tabular-nums" id={valueId}>
        {triggerValue === null
          ? placeholder
          : formatValue(triggerValue, triggerDateFormat, triggerLocale)}
      </span>
    </SelectControl>
  );
};

const DatePickerRoot = (props: DatePickerProps) => {
  const {
    align = "center",
    alignOffset,
    initialCalendarDate,
    locale,
    max,
    min,
    nextMonthLabel,
    onChange: _onChange,
    previousMonthLabel,
    side = "bottom",
    sideOffset = 8,
    value,
    valueType: _valueType,
    ...triggerProps
  } = props;

  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const latestProps = useLatest(props);
  const resolvedMin = useMemo(() => toDateTime(min) ?? undefined, [min]);

  const resolvedMax = useMemo(
    () => toDateTime(max)?.endOf("day") ?? undefined,
    [max]
  );

  const resolvedValue = useMemo(() => toDateTime(value), [value]);

  const resolvedInitial = useMemo(
    () => toDateTime(initialCalendarDate) ?? undefined,
    [initialCalendarDate]
  );

  if (
    resolvedMin !== undefined &&
    resolvedMax !== undefined &&
    !isBefore(resolvedMin, resolvedMax)
  ) {
    throw new Error(
      "DatePicker cannot use a minimum date later than its maximum"
    );
  }

  /* A JS Date for `valueType="date"`, the DateTime otherwise. */
  const emit = useCallback(
    (next: DateTime | null) => {
      const { current } = latestProps;

      if (current.valueType === "date") {
        current.onChange(next === null ? null : next.toJSDate());
      } else {
        current.onChange(next);
      }
    },
    [latestProps]
  );

  const clear = useCallback(() => {
    emit(null);
  }, [emit]);

  const context = useMemo<DatePickerContextValue>(
    () => ({
      initialCalendarDate: resolvedInitial,
      locale,
      max: resolvedMax,
      min: resolvedMin,
      onChange: emit,
      value: resolvedValue,
    }),
    [emit, locale, resolvedInitial, resolvedMax, resolvedMin, resolvedValue]
  );

  const onOpenChange = (open: boolean, element: HTMLElement | null) => {
    if (open && element) {
      setDirection(
        getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr"
      );
    }
  };

  return (
    <DatePickerContext value={context}>
      <Popover onOpenChange={onOpenChange}>
        <DatePickerTrigger
          {...triggerProps}
          onClear={clear}
          triggerLocale={locale}
          triggerValue={resolvedValue}
        />
        <PopoverContent
          align={align}
          alignOffset={alignOffset}
          dir={direction}
          minWidth={POPOVER_MIN_WIDTH}
          side={side}
          sideOffset={sideOffset}
        >
          <Calendar
            nextMonthLabel={nextMonthLabel}
            previousMonthLabel={previousMonthLabel}
          />
        </PopoverContent>
      </Popover>
    </DatePickerContext>
  );
};

export const DatePicker = (props: DatePickerProps): ReactNode => (
  <DatePickerRoot {...props} />
);
