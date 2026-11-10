"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle, eslint/complexity, anti-slop/no-runtime-typeof, eslint/no-eq-null, eqeqeq -- The component sizes text from --ui-message-text-size, puts classes on its Buttons, tests children for strings and reads activeElement with a null comparison. */

import { CompoundButton } from "composerkit/components/composer/compound-button";
import {
  ChevronDown16Icon,
  CircleInfoLight16Icon,
} from "composerkit/components/composer/icons";
import { useKeyCommand } from "composerkit/components/composer/key-commands";
import {
  AvatarOverlayMaterial,
  useIsAvatarOverlay,
} from "composerkit/components/composer/overlay-material";
import { ApprovalReasonLink } from "composerkit/components/composer/reason-link";
import { Button } from "composerkit/components/ui/button";
import { Menu, MenuItem } from "composerkit/components/ui/menu";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { createContext, useContext, useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

/*
 * The approval request card with its surface, title block and shortcut chip,
 * the property row and the hotkeys. The Electron default bindings are
 * Enter for approve and Escape for decline; their
 * labels are the formatter's "⏎" and "Esc".
 */

/** Whether this surface may bind hotkeys. Default true. */
const ApprovalHotkeysContext = createContext(true);

/** Whether approval surfaces draw no border or background of their own. */
const ApprovalEmbeddedContext = createContext<boolean | undefined>(undefined);

/* ---------------------------------------------------------------- pieces */

type ApprovalSurfaceVariant = "announcement" | "approval" | "connection";

interface ApprovalSurfaceProps extends ComponentProps<"div"> {
  embedded?: boolean;
  variant?: ApprovalSurfaceVariant;
}

/**
 * The surface classes. `announcement` is the composer-radius
 * elevated card (Electron: --ck-compose-radius is calc(var(--spacing) * 5),
 * --shadow-card uses the theme shadow color and --color-stroke-primary-outline is
 * --ck-palette-border-heavy); the others are the rounded-3xl bordered cards.
 */
const surfaceClassName = (variant: ApprovalSurfaceVariant) => {
  if (variant === "announcement") {
    return "rounded-[calc(var(--spacing)*5)] bg-panel-elevated shadow-[0px_3px_18px_0px_#0000000d] inset-ring-1 inset-ring-(--ck-palette-border-heavy,var(--color-border))";
  }

  return [
    "rounded-3xl border border-border",
    variant === "connection"
      ? "bg-panel-elevated"
      : "bg-panel-elevated-secondary",
  ];
};

/** Uses the transcript card material for non-embedded requests in an avatar overlay. */
const ApprovalSurface = ({
  children,
  className,
  embedded,
  variant = "approval",
  ...props
}: ApprovalSurfaceProps) => {
  const inherited = useContext(ApprovalEmbeddedContext);
  const isEmbedded = embedded ?? inherited ?? false;
  const isOverlay = useIsAvatarOverlay();

  if (isOverlay && !isEmbedded) {
    return (
      <AvatarOverlayMaterial
        {...props}
        className={cn(
          "overflow-x-hidden overflow-y-auto overscroll-contain text-text focus:outline-none",
          className
        )}
        variant="transcript"
      >
        {children}
      </AvatarOverlayMaterial>
    );
  }

  return (
    <div
      {...props}
      className={cn(
        "flex flex-col overflow-hidden text-text focus:outline-none",
        !isEmbedded && surfaceClassName(variant),
        className
      )}
    >
      {children}
    </div>
  );
};

/** The key chip inside an action button. */
const ApprovalKeyboardShortcut = ({
  children,
  variant,
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary";
}) => (
  <kbd
    aria-hidden="true"
    className={cn(
      "inline-flex h-4 min-w-4 items-center justify-center rounded-md border-0 bg-current/10 px-1.5 py-0 font-sans text-xs leading-4 text-current shadow-none",
      variant === "primary"
        ? "text-text-strong-solid"
        : "text-text group-hover:bg-text/15"
    )}
  >
    {children}
  </kbd>
);

interface ApprovalTitleProps {
  headerContent?: ReactNode;
  size?: "compact" | "default";
  subtitle?: ReactNode;
  title?: ReactNode;
  titleVariant?: "primary" | "secondary";
}

const ApprovalTitle = ({
  headerContent,
  size = "default",
  subtitle,
  title,
  titleVariant = "primary",
}: ApprovalTitleProps) => {
  const compact = size === "compact";

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-3" : "gap-2")}>
      {headerContent === undefined || headerContent === null ? null : (
        <div
          className={cn(
            "flex items-center gap-2 font-normal text-text-muted",
            compact
              ? "text-[0.8125rem] leading-4.5"
              : "text-[length:calc(var(--ui-message-text-size,13px)-1px)] leading-5"
          )}
        >
          {headerContent}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div
          className={cn(
            "min-w-0 wrap-anywhere",
            compact ? "text-[14px] leading-none" : "leading-5",
            titleVariant === "secondary"
              ? "font-normal text-text-muted"
              : "font-medium text-text",
            !compact &&
              titleVariant === "secondary" &&
              "text-[length:calc(var(--ui-message-text-size,13px)-1px)]",
            !compact &&
              titleVariant === "primary" &&
              "text-[length:var(--ui-message-text-size,13px)]"
          )}
        >
          {title}
        </div>
        {subtitle === undefined || subtitle === null ? null : (
          <div className="text-[length:calc(var(--ui-message-text-size,13px)-1px)] text-text-subtle">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

/** Splits text into plain parts and http(s) links. */
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/giu;
const URL_TRAILING_PUNCTUATION = /[),.;:!?]+$/u;

type TextPart =
  | { href: string; index: number; kind: "link" }
  | { index: number; kind: "text"; text: string };

const splitTextAndLinks = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const [raw] = match;
    const { index: start } = match;
    const href = raw.replace(URL_TRAILING_PUNCTUATION, "");

    if (href.length === 0) {
      continue;
    }

    if (start > cursor) {
      parts.push({
        index: cursor,
        kind: "text",
        text: text.slice(cursor, start),
      });
    }

    parts.push({ href, index: start, kind: "link" });
    cursor = start + href.length;
  }

  if (cursor < text.length) {
    parts.push({ index: cursor, kind: "text", text: text.slice(cursor) });
  }

  return parts;
};

/** Text with its links. */
const ApprovalLinkedText = ({ children }: { children: string }) => (
  <>
    {splitTextAndLinks(children).map((part) =>
      part.kind === "text" ? (
        <span key={`text-${part.index}`}>{part.text}</span>
      ) : (
        <ApprovalReasonLink key={`link-${part.index}`} href={part.href}>
          {part.href}
        </ApprovalReasonLink>
      )
    )}
  </>
);

/** Label and value, stacked until the container is 25rem wide. */
const DetailPropertyRow = ({
  children,
  className,
  label,
}: {
  children?: ReactNode;
  className?: string;
  label: ReactNode;
}) => (
  <div
    className={cn(
      "grid grid-cols-1 items-start gap-x-3 gap-y-0.5 py-1.25 text-[length:var(--ck-detail-row-font-size,var(--text-base))] leading-5 @min-[25rem]:grid-cols-[var(--ck-detail-property-label-width,124px)_minmax(0,1fr)] @min-[25rem]:items-center",
      className
    )}
  >
    <dt className="flex min-w-0 items-center gap-2 wrap-anywhere text-text-subtle">
      {label}
    </dt>
    <dd className="m-0 flex min-w-0 items-center wrap-anywhere text-text">
      {children}
    </dd>
  </div>
);

/** The "Reason" row. */
const ApprovalReason = ({
  children,
  label = "Reason",
}: {
  children?: ReactNode;
  label?: ReactNode;
}) => (
  <dl className="@container">
    <DetailPropertyRow
      className="[--ck-detail-row-font-size:var(--ui-message-text-size,13px)]"
      label={label}
    >
      {typeof children === "string" ? (
        <span className="min-w-0">
          <ApprovalLinkedText>{children}</ApprovalLinkedText>
        </span>
      ) : (
        children
      )}
    </DetailPropertyRow>
  </dl>
);

interface ApprovalRequestBodyProps extends ApprovalTitleProps {
  /** The title block is a polite `alert` that is read whole. */
  announce?: boolean;
  details?: ReactNode;
  headingAction?: ReactNode;
  reason?: ReactNode;
  reasonLabel?: ReactNode;
}

const ApprovalRequestBody = ({
  announce = false,
  details,
  headerContent,
  headingAction,
  reason,
  reasonLabel,
  subtitle,
  title,
}: ApprovalRequestBodyProps) => {
  const hasReason = reason !== undefined && reason !== null;
  const hasDetails = details !== undefined && details !== null;

  return (
    <>
      <div className="flex items-start gap-2">
        <div
          aria-atomic={announce || undefined}
          className="min-w-0 flex-1"
          role={announce ? "alert" : undefined}
        >
          <ApprovalTitle
            headerContent={headerContent}
            subtitle={subtitle}
            title={title}
          />
        </div>
        {headingAction}
      </div>
      {hasReason || hasDetails ? (
        <div className="flex flex-col gap-1">
          {hasReason ? (
            <ApprovalReason label={reasonLabel}>{reason}</ApprovalReason>
          ) : null}
          {details}
        </div>
      ) : null}
    </>
  );
};

/* ---------------------------------------------------------------- hotkeys */

interface ApprovalHotkeyState {
  approveEnabled?: boolean;
  enabled: boolean;
  onApprove: (timeStamp?: number) => void;
  onDecline: (timeStamp?: number) => void;
}

const isInDialogOrMenu = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("[role='dialog'],[role='menu']") !== null;

/**
 * Registers the
 * approval.acceptRequest and approval.rejectRequest key commands. The registry offers a
 * key to the newest registration first and stops after one accepts it, so one
 * Enter approves exactly one mounted card. The keys belong to a dialog or
 * menu, a focused button or link (Enter) or a focused button (Space) when
 * the target is inside one, and the command then declines.
 */
const useApprovalHotkeys = ({
  approveEnabled = true,
  enabled,
  onApprove,
  onDecline,
}: ApprovalHotkeyState) => {
  useKeyCommand(
    "approval.acceptRequest",
    () => {
      onApprove();
    },
    {
      enabled: enabled && approveEnabled,
      keyboardHandler: (event) => {
        const { target } = event;

        if (
          target instanceof Element &&
          (isInDialogOrMenu(target) ||
            (event.key === "Enter" && target.closest("button,a") !== null) ||
            (event.key === " " && target.closest("button") !== null))
        ) {
          return false;
        }

        onApprove(event.timeStamp);

        return true;
      },
    }
  );

  useKeyCommand(
    "approval.rejectRequest",
    () => {
      onDecline();
    },
    {
      enabled,
      keyboardHandler: (event) => {
        if (isInDialogOrMenu(event.target)) {
          return false;
        }

        onDecline(event.timeStamp);

        return true;
      },
    }
  );
};

/* ---------------------------------------------------------------- card */

type ApprovalLeadingAction =
  | { label: ReactNode; menu: ReactNode }
  | {
      label?: ReactNode;
      onClick: (timeStamp: number) => void;
      tooltipContent?: ReactNode;
    };

interface ApprovalScopedApproveAction {
  infoTooltip?: ReactNode;
  label?: ReactNode;
  onClick: () => void;
}

interface ApprovalActions {
  approveDisabled?: boolean;
  approveLabel?: ReactNode;
  denyLabel?: ReactNode;
  disableHotkeys?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  leadingAction?: ApprovalLeadingAction;
  onApprove: (timeStamp?: number) => void;
  onDeny: (timeStamp?: number) => void;
  scopedApproveAction?: ApprovalScopedApproveAction;
}

interface ApprovalRequestCardProps extends ApprovalRequestBodyProps {
  actions: ApprovalActions;
  /** Label text; each can be replaced. */
  allowConversationLabel?: ReactNode;
  alwaysAllowLabel?: ReactNode;
  approvalOptionsLabel?: string;
  /** Content between the body and the footer. */
  body?: ReactNode;
  embedded?: boolean;
}

const APPROVE_SHORTCUT = "⏎";
const DENY_SHORTCUT = "Esc";

const EDITABLE_SELECTOR =
  "input, textarea, [contenteditable]:not([contenteditable='false' i])";

const BUTTON_STACK = "@max-md/approval-card:justify-center";

/** The card of an approval request with Deny and Allow once actions. */
const ApprovalRequestCard = ({
  actions,
  allowConversationLabel = "Allow this conversation",
  alwaysAllowLabel = "Always allow",
  approvalOptionsLabel = "Approval options",
  body,
  embedded,
  ...bodyProps
}: ApprovalRequestCardProps) => {
  const hotkeysAllowed = useContext(ApprovalHotkeysContext);

  const { leadingAction: leading, scopedApproveAction: scoped } = actions;
  const autoFocus = hotkeysAllowed && actions.disabled !== true;
  const approveRef = useRef<HTMLSpanElement>(null);
  const autoFocusOnMount = useRef(autoFocus);

  // The component focuses the approve button on mount unless an editable element
  // has focus. Checking document.activeElement during render would differ
  // between the server and the client, so the check and the focus run after
  // mount instead.
  useEffect(() => {
    if (
      autoFocusOnMount.current &&
      document.activeElement?.closest(EDITABLE_SELECTOR) == null
    ) {
      approveRef.current?.querySelector("button")?.focus();
    }
  }, []);

  const hotkeysEnabled =
    hotkeysAllowed &&
    actions.disabled !== true &&
    actions.disableHotkeys !== true &&
    actions.isLoading !== true;

  const approve = (timeStamp?: number) => {
    if (actions.approveDisabled !== true) {
      actions.onApprove(timeStamp);
    }
  };

  useApprovalHotkeys({
    enabled: hotkeysEnabled,
    onApprove: approve,
    onDecline: actions.onDeny,
  });

  const approveLabel = actions.approveLabel ?? "Allow once";

  const approveShortcut =
    hotkeysEnabled && actions.approveDisabled !== true ? (
      <span className="@max-md/approval-card:hidden">
        <ApprovalKeyboardShortcut variant="primary">
          {APPROVE_SHORTCUT}
        </ApprovalKeyboardShortcut>
      </span>
    ) : null;

  const denyShortcut = hotkeysEnabled ? (
    <span className="@max-md/approval-card:hidden">
      <ApprovalKeyboardShortcut variant="secondary">
        {DENY_SHORTCUT}
      </ApprovalKeyboardShortcut>
    </span>
  ) : null;

  const inactive = actions.disabled === true || actions.isLoading === true;

  let leadingNode: ReactNode = null;

  if (leading && "menu" in leading) {
    leadingNode = (
      <Menu
        align="start"
        disabled={inactive}
        side="top"
        triggerButton={
          <Button
            allowShrink
            className={cn("max-w-full", BUTTON_STACK)}
            color="outline"
            size="composer"
          >
            <span className="truncate">{leading.label}</span>
            <ChevronDown16Icon aria-hidden="true" className="size-[18px]" />
          </Button>
        }
      >
        {leading.menu}
      </Menu>
    );
  } else if (leading) {
    leadingNode = (
      <TooltipHint content={leading.tooltipContent}>
        <Button
          allowShrink
          className={cn("max-w-full", BUTTON_STACK)}
          color="outline"
          disabled={inactive}
          size="composer"
          onClick={(event) => {
            leading.onClick(event.timeStamp);
          }}
        >
          <span className="truncate">{leading.label ?? alwaysAllowLabel}</span>
        </Button>
      </TooltipHint>
    );
  }

  const approveNode =
    scoped === undefined ? (
      <Button
        allowShrink
        className={cn("max-w-full", BUTTON_STACK)}
        color="primary"
        disabled={actions.disabled === true || actions.approveDisabled === true}
        loading={actions.isLoading}
        size="composer"
        type="submit"
      >
        <span className="truncate">{approveLabel}</span>
        {approveShortcut}
      </Button>
    ) : (
      <CompoundButton
        className="min-w-0 @max-md/approval-card:w-full"
        color="primary"
        disabled={actions.disabled}
        dropdownAlign="end"
        dropdownContent={
          <>
            <MenuItem
              disabled={
                actions.disabled === true || actions.approveDisabled === true
              }
              onSelect={() => {
                actions.onApprove();
              }}
            >
              {approveLabel}
            </MenuItem>
            <MenuItem
              disabled={actions.disabled}
              RightIcon={
                scoped.infoTooltip === undefined
                  ? undefined
                  : CircleInfoLight16Icon
              }
              tooltipText={scoped.infoTooltip}
              onSelect={() => {
                scoped.onClick();
              }}
            >
              {scoped.label ?? allowConversationLabel}
            </MenuItem>
          </>
        }
        loading={actions.isLoading}
        primaryClassName="min-w-0 overflow-hidden @max-md/approval-card:flex-1 @max-md/approval-card:justify-center @max-md/approval-card:ps-6"
        primaryDisabled={actions.approveDisabled}
        secondaryAriaLabel={approvalOptionsLabel}
        size="composer"
        onClick={(event) => {
          actions.onApprove(event.timeStamp);
        }}
      >
        <span className="truncate">{approveLabel}</span>
        {approveShortcut}
      </CompoundButton>
    );

  return (
    <ApprovalSurface
      className="@container/approval-card"
      data-ui-review-panel
      embedded={embedded}
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
        <ApprovalRequestBody {...bodyProps} announce />
      </div>
      {body}
      <form
        className="flex shrink-0 items-center gap-2 px-4 pt-2 pb-4 @max-md/approval-card:flex-col @max-md/approval-card:items-stretch"
        onSubmit={(event) => {
          event.preventDefault();

          if (!inactive && actions.approveDisabled !== true) {
            actions.onApprove(event.timeStamp);
          }
        }}
      >
        {leadingNode}
        <div className="ms-auto flex min-w-0 items-center gap-2 @max-md/approval-card:ms-0 @max-md/approval-card:w-full @max-md/approval-card:flex-col @max-md/approval-card:items-stretch">
          <Button
            className={BUTTON_STACK}
            color="outline"
            disabled={inactive}
            size="composer"
            onClick={(event) => {
              actions.onDeny(event.timeStamp);
            }}
          >
            {actions.denyLabel ?? "Deny"}
            {denyShortcut}
          </Button>
          <span className="contents" ref={approveRef}>
            {approveNode}
          </span>
        </div>
      </form>
    </ApprovalSurface>
  );
};

export {
  ApprovalEmbeddedContext,
  ApprovalHotkeysContext,
  ApprovalKeyboardShortcut,
  ApprovalLinkedText,
  ApprovalReason,
  ApprovalRequestBody,
  ApprovalRequestCard,
  ApprovalSurface,
  ApprovalTitle,
  DetailPropertyRow,
  splitTextAndLinks,
  useApprovalHotkeys,
};

export type {
  ApprovalActions,
  ApprovalLeadingAction,
  ApprovalRequestBodyProps,
  ApprovalRequestCardProps,
  ApprovalScopedApproveAction,
  ApprovalSurfaceProps,
  ApprovalSurfaceVariant,
  ApprovalTitleProps,
  TextPart,
};
