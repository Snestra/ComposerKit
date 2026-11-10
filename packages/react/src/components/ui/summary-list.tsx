"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle, jsx-a11y/prefer-tag-over-role -- The rows and the show-more button use these classes, including the important modifiers on the Button. */

import { useLinkComponent } from "@workspace/react/components/platform-provider";
import { Button } from "@workspace/react/components/ui/button";
import { cn } from "@workspace/react/lib/utils";
import { Fragment, createElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

type SummaryRowAction =
  | { href: string; type: "link" }
  | { onSelect: () => void; type: "select" };

interface SummaryRowProps {
  action?: SummaryRowAction;
  icon?: ReactNode;
  label: ReactNode;
  preview?: ReactNode;
  previewLineCount?: 1 | 2;
  trailing?: ReactNode;
}

const SummaryRow = ({
  action,
  icon,
  label,
  preview,
  previewLineCount = 1,
  trailing,
}: SummaryRowProps) => {
  const Link = useLinkComponent();
  const hasPreview = preview !== null && preview !== undefined;
  const hasTrailing = trailing !== null && trailing !== undefined;

  const className = cn(
    "flex min-h-10 w-full gap-3 rounded-lg px-2 py-2 text-start select-none",
    action !== undefined &&
      "cursor-(--ck-action-cursor,pointer) hover:bg-panel-secondary/92 focus-visible:bg-panel-secondary/92 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
    hasPreview ? "items-start" : "items-center"
  );

  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex min-h-6 items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-text">{label}</span>
          {hasTrailing ? (
            <span className="shrink-0 text-xs whitespace-nowrap text-text-subtle tabular-nums">
              {trailing}
            </span>
          ) : null}
        </span>
        {hasPreview ? (
          <span
            className={cn(
              "block text-sm leading-5 text-text-muted",
              previewLineCount === 2 ? "line-clamp-2!" : "truncate"
            )}
          >
            {preview}
          </span>
        ) : null}
      </span>
    </>
  );

  if (action?.type === "link") {
    return createElement(
      Link,
      { className: cn(className, "no-underline"), href: action.href },
      content
    );
  }

  if (action?.type === "select") {
    const handleSelect = action.onSelect;

    return (
      <button className={className} onClick={handleSelect} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

const SHOW_MORE_LIMIT = 6;
const SHOW_MORE_INCREMENT = 50;

const countFormat = new Intl.NumberFormat();

interface ExpandableListPagination {
  isExpanded: boolean;
  isLoadingMore: boolean;
  nextRevealCount: number;
  onToggle: () => void;
}

interface ExpandableListProps<Item> {
  children: (item: Item, index: number) => ReactNode;
  empty?: ReactElement;
  getKey: (item: Item, index: number) => string;
  isLoadingMore?: boolean;
  items: readonly Item[];
  listAriaLabel?: string;
  listClassName?: string;
  onLoadMore?: () => void;
  onVisibleItemsChange?: (items: readonly Item[]) => void;
  paginationButtonClassName?: string;
  renderFooter?: (visibleItems: readonly Item[]) => ReactNode;
  renderPagination?: (pagination: ExpandableListPagination) => ReactNode;
  visibleItemIncrement?: number;
  visibleItemLimit?: number;
}

const ExpandableList = <Item,>({
  children,
  empty,
  getKey,
  isLoadingMore = false,
  items,
  listAriaLabel,
  listClassName,
  onLoadMore,
  onVisibleItemsChange,
  paginationButtonClassName,
  renderFooter,
  renderPagination,
  visibleItemIncrement,
  visibleItemLimit = SHOW_MORE_LIMIT,
}: ExpandableListProps<Item>) => {
  const [limit, setLimit] = useState(visibleItemLimit);

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);

  useEffect(() => {
    onVisibleItemsChange?.(visible);
  }, [onVisibleItemsChange, visible]);

  if (items.length === 0 && onLoadMore === undefined) {
    return empty ?? null;
  }

  const showsPagination =
    items.length > visibleItemLimit || onLoadMore !== undefined;

  const remaining = items.length - visible.length;
  const isExpanded = remaining === 0 && onLoadMore === undefined;
  const increment = visibleItemIncrement ?? SHOW_MORE_INCREMENT;

  const nextRevealCount =
    onLoadMore === undefined ? Math.min(remaining, increment) : increment;

  const onToggle = () => {
    if (isLoadingMore) {
      return;
    }

    setLimit((current) => {
      if (isExpanded) {
        return visibleItemLimit;
      }

      return onLoadMore === undefined
        ? Math.min(items.length, current + increment)
        : current + increment;
    });

    if (remaining < increment) {
      onLoadMore?.();
    }
  };

  const rows = visible.map((item, index) => (
    <Fragment key={getKey(item, index)}>{children(item, index)}</Fragment>
  ));

  return (
    <>
      {listAriaLabel === undefined ? (
        <div className={listClassName}>{rows}</div>
      ) : (
        <div aria-label={listAriaLabel} className={listClassName} role="list">
          {visible.map((item, index) => (
            <div key={getKey(item, index)} role="listitem">
              {children(item, index)}
            </div>
          ))}
        </div>
      )}
      {renderFooter?.(visible)}
      {showsPagination && renderPagination !== undefined
        ? renderPagination({
            isExpanded,
            isLoadingMore,
            nextRevealCount,
            onToggle,
          })
        : null}
      {showsPagination && renderPagination === undefined ? (
        <Button
          className={cn(
            "px-0! py-0! text-text-subtle hover:text-text-muted",
            paginationButtonClassName
          )}
          color="ghostMuted"
          disabled={isLoadingMore}
          onClick={onToggle}
          size="default"
        >
          {isExpanded
            ? "Show less"
            : `Show ${countFormat.format(nextRevealCount)} more`}
        </Button>
      ) : null}
    </>
  );
};

interface SummarySectionProps<Item extends { id: string }> {
  children: (item: Item, index: number) => ReactNode;
  className?: string;
  emptyState?: ReactNode;
  items: readonly Item[];
  title: ReactNode;
  titleTrailing?: ReactNode;
  visibleItemLimit?: number;
}

const SummarySection = <Item extends { id: string }>({
  children,
  className,
  emptyState,
  items,
  title,
  titleTrailing,
  visibleItemLimit,
}: SummarySectionProps<Item>) => {
  const hasEmptyState = emptyState !== null && emptyState !== undefined;

  if (items.length === 0 && !hasEmptyState) {
    return null;
  }

  return (
    <section className={className}>
      <h2 className="mb-2 flex min-w-0 items-center justify-between gap-3 px-2 text-sm text-text-subtle select-none">
        <span className="min-w-0 truncate">{title}</span>
        {titleTrailing}
      </h2>
      {items.length === 0 ? (
        <div className="px-2 py-1 text-sm text-text-subtle">{emptyState}</div>
      ) : (
        <ExpandableList
          getKey={(item) => item.id}
          items={items}
          listClassName="flex flex-col gap-1"
          paginationButtonClassName="ms-11 mt-2"
          visibleItemIncrement={items.length}
          visibleItemLimit={visibleItemLimit}
        >
          {children}
        </ExpandableList>
      )}
    </section>
  );
};

export { ExpandableList, SummaryRow, SummarySection };

export type {
  ExpandableListPagination,
  ExpandableListProps,
  SummaryRowAction,
  SummaryRowProps,
  SummarySectionProps,
};
