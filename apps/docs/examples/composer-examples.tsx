"use client";

import {
  ApprovalHotkeysContext,
  ApprovalRequestBody,
  ApprovalRequestCard,
  ApprovalSurface,
} from "composerkit/components/composer/approval-card";
import type { ApprovalActions } from "composerkit/components/composer/approval-card";
import { CompoundButton } from "composerkit/components/composer/compound-button";
import {
  ComposerControls,
  useAttachmentUndo,
  useFollowUpQueueMode,
} from "composerkit/components/composer/controls";
import {
  DEFAULT_KEYBINDINGS,
  findKeyConflicts,
  KeyCommandProvider,
  useKeyCommandRegistrations,
} from "composerkit/components/composer/key-commands";
import type { KeyCommandKeymap } from "composerkit/components/composer/key-commands";
import { AvatarOverlayMaterial } from "composerkit/components/composer/overlay-material";
import {
  composerPlaceholder,
  fileUploadErrorMessage,
  resolveFollowUpShortcut,
  dedupeFileAttachments,
  PASTED_TEXT_RESTORE_LIMIT,
  REMOTE_FOLDER_UNSUPPORTED_MESSAGE,
} from "composerkit/components/composer/rules";
import type {
  ComposerEnterBehavior,
  ComposerProductMode,
} from "composerkit/components/composer/rules";
import {
  composerSubmitErrorMessage,
  submitFailureMessage,
} from "composerkit/components/composer/submit-error";
import {
  ComposerBeaconTip,
  ComposerTip,
} from "composerkit/components/composer/tip";
import { Button } from "composerkit/components/ui/button";
import {
  CommentComposerForm,
  ComposerReplacementConsumer,
  ComposerReplacementProvider,
  ComposerReplacementScopeContext,
  ComposerSubmitButton,
  ComposerSurface,
  ComposerViewOnlyContext,
  InlineComposer,
  composerSubmitShortcut,
  createComposerReplacementStore,
  cyclePlanMode,
  handleComposerShortcutKey,
  resolveComposerEscape,
  useIsComposerReplaced,
} from "composerkit/components/ui/composer";
import type {
  ComposerEscapeState,
  SelectedMode,
  SubmitShortcutPreference,
} from "composerkit/components/ui/composer";
import { MenuItem } from "composerkit/components/ui/menu";
import { ToastProvider } from "composerkit/components/ui/toast";
import { TooltipProvider } from "composerkit/components/ui/tooltip";
import {
  ReducedMotionAttribute,
  ReducedMotionProvider,
} from "composerkit/lib/reduced-motion";
import type { ReducedMotionPreference } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import { useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";
import {
  EditorExamples,
  MorphExamples,
} from "@/examples/composer-editor-examples";
import {
  AnalyticsDeliveryExamples,
  FailureHandlerExamples,
  ReasonLinkExamples,
  TipSelectionExamples,
} from "@/examples/composer-service-examples";

type Scope = "dark" | "light";

const noop = () => {
  /* the example has nothing to do here */
};

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const Frame = ({
  children,
  label,
  testId,
}: {
  children: ReactNode;
  label: string;
  testId: string;
}) => (
  <figure className="flex min-w-0 flex-col gap-1" data-testid={testId}>
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    <div className="min-w-0 rounded-xl border bg-background p-3">
      {children}
    </div>
  </figure>
);

/* ---------------------------------------------------------------- inline composer */

const InlineEditor = ({
  initial = "",
  multiline = false,
  placeholder = "Describe the change",
  ...rest
}: {
  initial?: string;
  multiline?: boolean;
  placeholder?: string;
} & Partial<React.ComponentProps<typeof InlineComposer>>) => {
  const [value, setValue] = useState(initial);
  const [log, setLog] = useState("Nothing submitted yet");

  return (
    <div className="flex flex-col gap-2">
      <InlineComposer
        canSubmit={value.trim() !== ""}
        label="Rewrite prompt"
        multiline={multiline}
        submitLabel="Send"
        onCancel={() => {
          setLog("Cancelled");
        }}
        onSubmit={(form) => {
          setLog(
            `Submitted from form "${form.getAttribute("aria-label")}": ${value.trim()}`
          );
          setValue("");
        }}
        {...rest}
      >
        {multiline ? (
          <textarea
            aria-label="Prompt"
            className="field-sizing-content max-h-32 resize-none"
            placeholder={placeholder}
            rows={1}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
        ) : (
          <input
            aria-label="Prompt"
            placeholder={placeholder}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
        )}
      </InlineComposer>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {log}
      </p>
    </div>
  );
};

const InlineExamples = () => {
  const [generating, setGenerating] = useState(true);
  const [blurLog, setBlurLog] = useState("Focus has not left the form");

  return (
    <Section
      description="Enter submits in a textarea, Shift+Enter adds a line, Escape cancels and a key press never leaves the form. While generating the input is hidden, a shimmering status replaces it and the send button becomes Stop generation."
      id="inline"
      title="Inline composer"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="Single line, ready" testId="inline-single">
          <InlineEditor />
        </Frame>
        <Frame label="Multiline with a hint" testId="inline-multiline">
          <InlineEditor
            hint="Press Enter to send, Shift+Enter for a new line"
            initial="Please tighten this paragraph."
            multiline
          />
        </Frame>
        <Frame
          label="Leading action (no start padding)"
          testId="inline-leading"
        >
          <InlineEditor
            leadingAction={
              <Button aria-label="Attach" color="ghost" size="composer" uniform>
                +
              </Button>
            }
          />
        </Frame>
        <Frame
          label="Embedded (no border, background or shadow)"
          testId="inline-embedded"
        >
          <InlineEditor embedded />
        </Frame>
        <Frame
          label="Blur outside reports (not while generating)"
          testId="inline-blur"
        >
          <div className="flex flex-col gap-2">
            <InlineEditor
              onBlurOutside={() => {
                setBlurLog("Focus left the form");
              }}
            />
            <p className="text-xs text-muted-foreground">{blurLog}</p>
          </div>
        </Frame>
        <Frame
          label="Cannot submit yet (empty value disables send)"
          testId="inline-disabled"
        >
          <InlineEditor placeholder="Type to enable send" />
        </Frame>
        <Frame
          label="Generating with the default status"
          testId="inline-generating"
        >
          <div className="flex flex-col gap-2">
            <Button
              aria-pressed={generating}
              color="outline"
              size="composerSm"
              onClick={() => {
                setGenerating((current) => !current);
              }}
            >
              {generating ? "Stop demo" : "Start demo"}
            </Button>
            <InlineEditor
              generating={generating}
              onCancel={() => {
                setGenerating(false);
              }}
            />
          </div>
        </Frame>
        <Frame
          label="Generating with a status and no cancel"
          testId="inline-generating-locked"
        >
          <InlineEditor
            canCancel={false}
            generating
            status="Reading the file…"
          />
        </Frame>
        <ComposerViewOnlyContext.Provider value>
          <Frame
            label="View-only workspace (content inert, send disabled)"
            testId="inline-view-only"
          >
            <InlineEditor initial="Read only" />
          </Frame>
        </ComposerViewOnlyContext.Provider>
      </div>
    </Section>
  );
};

/* ---------------------------------------------------------------- comment composer */

const CommentEditor = ({
  initial = "",
  ...props
}: { initial?: string } & Partial<
  React.ComponentProps<typeof CommentComposerForm>
>) => {
  const [value, setValue] = useState(initial);
  const [log, setLog] = useState("Nothing submitted yet");

  return (
    <div className="flex flex-col gap-2">
      <CommentComposerForm
        autoFocus={false}
        placeholder="Add a comment"
        submitLabel="Comment"
        value={value}
        onCancel={() => {
          setLog("Cancelled");
        }}
        onChange={setValue}
        onSubmit={(text) => {
          setLog(`Submitted: "${text}"`);
          setValue("");
        }}
        {...props}
      />
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {log}
      </p>
    </div>
  );
};

const CommentExamples = () => (
  <Section
    description="The plain-text comment composer trims its value and enables submit only for non-empty text in an enabled control. Enter submits, Shift+Enter adds a line and Escape cancels when a cancel handler exists."
    id="comment"
    title="Comment composer"
  >
    <div className="grid gap-3 md:grid-cols-2">
      <Frame
        label="Multiline with Cancel and the footer submit"
        testId="comment-multiline"
      >
        <CommentEditor initial="Please tighten this paragraph." />
      </Frame>
      <Frame
        label="Compact (submit appears with text)"
        testId="comment-compact"
      >
        <CommentEditor compact initial="Looks good" />
      </Frame>
      <Frame
        label="Single-line input (submit appears with text)"
        testId="comment-single"
      >
        <CommentEditor multiline={false} />
      </Frame>
      <Frame label="Disabled" testId="comment-disabled">
        <CommentEditor disabled initial="Locked comment" />
      </Frame>
      <Frame
        label="Discussion: comment (card layout)"
        testId="comment-discussion-card"
      >
        <CommentEditor discussion="comment" initial="Reply here" />
      </Frame>
      <Frame
        label="Discussion: inline layout"
        testId="comment-discussion-inline"
      >
        <CommentEditor discussion="inline" initial="Inline reply" />
      </Frame>
      <Frame
        label="Embedded (no surface) with maxLength 40"
        testId="comment-embedded"
      >
        <CommentEditor embedded maxLength={40} />
      </Frame>
    </div>
  </Section>
);

/* ---------------------------------------------------------------- surface and motion */

const MOTION_CHOICES = ["system", "on", "off"] as const;

const SurfaceExamples = () => {
  const [tall, setTall] = useState(false);

  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  const [revealing, setRevealing] = useState(false);

  return (
    <ReducedMotionProvider preference={preference}>
      <ReducedMotionAttribute />
      <Section
        description="The surface is 22px rounded with a shadow and an outline ring. Its height, width and opacity transition with the snappy ease (none while revealing a page comment), and reduced motion turns the transition off."
        id="surface"
        title="Surface and motion"
      >
        <div className="flex flex-wrap items-center gap-2">
          {MOTION_CHOICES.map((choice) => (
            <Button
              key={choice}
              aria-pressed={preference === choice}
              color="outline"
              size="composerSm"
              onClick={() => {
                setPreference(choice);
              }}
            >
              Reduced motion: {choice}
            </Button>
          ))}
          <Button
            aria-pressed={tall}
            color="outline"
            size="composerSm"
            onClick={() => {
              setTall((current) => !current);
            }}
          >
            Toggle height
          </Button>
          <Button
            aria-pressed={revealing}
            color="outline"
            size="composerSm"
            onClick={() => {
              setRevealing((current) => !current);
            }}
          >
            Revealing page comment
          </Button>
        </div>
        <Frame label="Default surface" testId="surface-default">
          <ComposerSurface
            className={tall ? "h-48" : "h-16"}
            data-testid="surface"
            isRevealingPageComment={revealing}
          >
            <p className="p-4 text-sm">Surface content</p>
          </ComposerSurface>
        </Frame>
        <Frame
          label="Another surface variant (no background, shadow or ring)"
          testId="surface-plain"
        >
          <ComposerSurface surfaceVariant="flat">
            <p className="p-4 text-sm">Flat surface content</p>
          </ComposerSurface>
        </Frame>
      </Section>
    </ReducedMotionProvider>
  );
};

/* ---------------------------------------------------------------- submit button */

const ButtonExamples = () => {
  const [nonce, setNonce] = useState<number | null>(0);
  const [clicks, setClicks] = useState(0);

  return (
    <TooltipProvider>
      <Section
        description="The round 28px send button. A disabled or loading button keeps aria-disabled, cancels its click and dims. A blocked reason shows in a tooltip that opens when its nonce changes."
        id="submit-button"
        title="Submit button"
      >
        <div
          className="flex flex-wrap items-center gap-4"
          data-testid="submit-buttons"
        >
          <ComposerSubmitButton
            ariaLabel="Send"
            onClick={() => {
              setClicks((count) => count + 1);
            }}
          />
          <ComposerSubmitButton
            ariaLabel="Send (voice end)"
            variant="voiceEnd"
          />
          <ComposerSubmitButton ariaLabel="Send (disabled)" disabled />
          <ComposerSubmitButton
            ariaLabel="Send (disabled, not dimmed)"
            disabled
            disabledAppearance="none"
          />
          <ComposerSubmitButton ariaLabel="Sending" isLoading />
          <ComposerSubmitButton
            ariaLabel="Send (shortcut)"
            keyboardShortcutLabel="⌘↵"
          />
          <ComposerSubmitButton ariaLabel="Send (full bleed)" fullBleedIcon />
          <ComposerSubmitButton
            ariaLabel="Send (tooltip)"
            tooltipContent="Send message"
            tooltipShortcut="CmdOrCtrl+Enter"
          />
          <ComposerSubmitButton
            ariaLabel="Send (blocked)"
            blockedReason="Finish the setup first"
            blockedReasonOpenNonce={nonce}
            disabled
          />
          <Button
            color="outline"
            size="composerSm"
            onClick={() => {
              setNonce((current) => (current ?? 0) + 1);
            }}
          >
            Show blocked reason
          </Button>
          <span
            className="text-xs text-muted-foreground"
            data-testid="submit-clicks"
          >
            Clicks: {clicks}
          </span>
        </div>
      </Section>
    </TooltipProvider>
  );
};

/* ---------------------------------------------------------------- tips */

const TipExamples = () => {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [shown, setShown] = useState(0);
  const [action, setAction] = useState("Action not used");
  const show = (id: string) => !dismissed.includes(id);

  const dismiss = (id: string) => () => {
    setDismissed((current) => [...current, id]);
  };

  return (
    <Section
      description="The tip bar is a polite status region. The plain bar shows its dismiss button on hover or focus, the pill bar always shows it."
      id="tips"
      title="Tip bar"
    >
      <div className="flex flex-col gap-3">
        <Button
          color="outline"
          size="composerSm"
          onClick={() => {
            setDismissed([]);
          }}
        >
          Restore tips
        </Button>
        {show("plain") ? (
          <Frame label="Plain" testId="tip-plain">
            <ComposerTip
              impressionId="plain"
              tip={{ content: "Type @ to mention a file" }}
              onDismiss={dismiss("plain")}
              onShown={() => {
                setShown((count) => count + 1);
              }}
            />
          </Frame>
        ) : null}
        {show("pill") ? (
          <Frame label="Pill with an action" testId="tip-pill">
            <ComposerTip
              tip={{
                actionLabel: "Learn more",
                content: "Type @ to mention a file",
              }}
              variant="pill"
              onDismiss={dismiss("pill")}
              onPrimaryAction={() => {
                setAction("Action used");
              }}
            />
          </Frame>
        ) : null}
        {show("beacon") ? (
          <ComposerBeaconTip
            beacon={{ ui_info: { title: "Type @ to mention a file" } }}
            onDismiss={dismiss("beacon")}
            onShown={() => {
              setShown((count) => count + 1);
            }}
          />
        ) : null}
        <p className="text-xs text-muted-foreground" data-testid="tip-log">
          Shown callbacks: {shown}. {action}
        </p>
      </div>
    </Section>
  );
};

/* ---------------------------------------------------------------- approval */

const ApprovalExamples = () => {
  const [log, setLog] = useState("No decision yet");
  const [width, setWidth] = useState(560);

  const base: ApprovalActions = {
    onApprove: () => {
      setLog("Allowed once");
    },
    onDeny: () => {
      setLog("Denied");
    },
  };

  return (
    <Section
      description="Enter approves and Escape denies while the card is enabled. The footer stacks below a medium container width."
      id="approval"
      title="Approval request card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="outline"
          size="composerSm"
          onClick={() => {
            setWidth((current) => (current === 560 ? 320 : 560));
          }}
        >
          Container width: {width}px
        </Button>
        <span
          aria-live="polite"
          className="text-xs text-muted-foreground"
          data-testid="approval-log"
        >
          {log}
        </span>
      </div>
      <div
        className={cn("grid gap-3", width === 560 ? "max-w-140" : "max-w-80")}
      >
        <Frame label="Default" testId="approval-default">
          <ApprovalRequestCard
            actions={{ ...base, disableHotkeys: true }}
            reason="Run a build script https://example.com/docs."
            subtitle="Needs permission to continue"
            title="Run the build"
          />
        </Frame>
        <Frame label="Hotkeys on" testId="approval-hotkeys">
          <ApprovalRequestCard actions={base} title="Run tests" />
        </Frame>
        <Frame label="Always allow action" testId="approval-always">
          <ApprovalRequestCard
            actions={{
              ...base,
              disableHotkeys: true,
              leadingAction: {
                onClick: () => {
                  setLog("Always allowed");
                },
                tooltipContent: "Allow matching requests from now on",
              },
            }}
            title="Install a package"
          />
        </Frame>
        <Frame label="Menu action" testId="approval-menu">
          <ApprovalRequestCard
            actions={{
              ...base,
              disableHotkeys: true,
              leadingAction: {
                label: "Options",
                menu: (
                  <MenuItem
                    onSelect={() => {
                      setLog("Menu option chosen");
                    }}
                  >
                    Choose a folder
                  </MenuItem>
                ),
              },
            }}
            title="Write to disk"
          />
        </Frame>
        <Frame
          label="Split approve with Allow this conversation"
          testId="approval-scoped"
        >
          <ApprovalRequestCard
            actions={{
              ...base,
              disableHotkeys: true,
              scopedApproveAction: {
                infoTooltip: "Applies until this conversation ends",
                onClick: () => {
                  setLog("Allowed for this conversation");
                },
              },
            }}
            title="Open a network connection"
          />
        </Frame>
        <Frame label="Loading" testId="approval-loading">
          <ApprovalRequestCard
            actions={{ ...base, isLoading: true }}
            title="Working"
          />
        </Frame>
        <Frame
          label="Disabled: every action off, hotkeys off, no key chips"
          testId="approval-disabled"
        >
          <ApprovalRequestCard
            actions={{ ...base, disabled: true }}
            title="Waiting for another request"
          />
        </Frame>
        <Frame
          label="Disabled with the split approve (both parts off)"
          testId="approval-disabled-split"
        >
          <ApprovalRequestCard
            actions={{
              ...base,
              disabled: true,
              scopedApproveAction: { onClick: noop },
            }}
            title="Waiting for another request"
          />
        </Frame>
        <Frame
          label="Approve disabled: Deny stays on, Enter does nothing, no Enter chip"
          testId="approval-approve-disabled"
        >
          <ApprovalRequestCard
            actions={{ ...base, approveDisabled: true, disableHotkeys: true }}
            title="Blocked"
          />
        </Frame>
        <Frame
          label="Approve disabled with the split approve (menu item off)"
          testId="approval-approve-disabled-split"
        >
          <ApprovalRequestCard
            actions={{
              ...base,
              approveDisabled: true,
              disableHotkeys: true,
              scopedApproveAction: { onClick: noop },
            }}
            title="Blocked"
          />
        </Frame>
      </div>
    </Section>
  );
};

/* ---------------------------------------------------------------- shortcuts */

const baseEscape: ComposerEscapeState = {
  canStopFromEscape: true,
  followUpType: "local",
  hasActiveApprovalSurface: false,
  hasActiveMentionMenu: false,
  hasActiveReplyChain: false,
  hasActiveTemplatePicker: false,
  hasFocusedComposer: true,
  isDictating: false,
  isResponseInProgress: false,
  isStopTurnConfirmationVisible: false,
  isTerminalTarget: false,
  realtimeSessionPhase: null,
};

const escapeCases: readonly (readonly [
  string,
  Partial<ComposerEscapeState>,
])[] = [
  ["Dictating", { isDictating: true }],
  ["Realtime session starting", { realtimeSessionPhase: "starting" }],
  ["Template picker open", { hasActiveTemplatePicker: true }],
  ["Approval surface active", { hasActiveApprovalSurface: true }],
  ["Reply chain open", { hasActiveReplyChain: true }],
  [
    "Reply chain and mention menu",
    { hasActiveMentionMenu: true, hasActiveReplyChain: true },
  ],
  ["Response in progress", { isResponseInProgress: true }],
  [
    "Response in progress, confirming",
    { isResponseInProgress: true, isStopTurnConfirmationVisible: true },
  ],
  ["Composer not focused", { hasFocusedComposer: false }],
];

const preferences = [
  "enter",
  "cmdIfMultiline",
  "cmdAlways",
] as const satisfies readonly SubmitShortcutPreference[];

const ShortcutExamples = () => {
  const [mode, setMode] = useState<SelectedMode>("plan");
  const [selection, setSelection] = useState("Press a key in the field");

  return (
    <Section
      description="The Escape rules in priority order, the submit shortcut labels, and the plan mode keys (Backspace at the start of the field leaves plan mode, Escape runs the handler)."
      id="shortcuts"
      title="Keyboard rules"
    >
      <ul className="flex flex-col gap-1 text-sm" data-testid="shortcut-labels">
        {preferences.map((preference) => (
          <li key={preference}>
            {preference}: {composerSubmitShortcut(preference)}
          </li>
        ))}
      </ul>
      <table className="text-sm" data-testid="escape-table">
        <caption className="text-start text-xs text-muted-foreground">
          Escape resolves to
        </caption>
        <tbody>
          {escapeCases.map(([label, patch]) => (
            <tr key={label}>
              <th className="pe-4 text-start font-normal">{label}</th>
              <td>
                {String(resolveComposerEscape({ ...baseEscape, ...patch }))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2" data-testid="plan-mode">
        <Button
          color="outline"
          size="composerSm"
          onClick={() => {
            cyclePlanMode({
              hasDefaultMode: true,
              hasPlanMode: true,
              isPlanMode: mode === "plan",
              setSelectedMode: setMode,
            });
          }}
        >
          Cycle plan mode
        </Button>
        <input
          aria-label="Plan mode field"
          className="rounded-md border px-2 py-1 text-sm"
          placeholder="Backspace here leaves plan mode"
          onKeyDown={(event) => {
            const handled = handleComposerShortcutKey({
              event,
              handleEscape: () => {
                setSelection("Escape handler ran");
              },
              hasActiveMentionMenu: false,
              hasDefaultMode: true,
              isComposerFocused: true,
              isPlanMode: mode === "plan",
              isSelectionAtStart: event.currentTarget.selectionStart === 0,
              setSelectedMode: setMode,
            });

            setSelection(
              handled ? `Handled ${event.key}` : `Not handled: ${event.key}`
            );
          }}
        />
        <p className="text-xs text-muted-foreground" data-testid="plan-log">
          Mode: {String(mode)}. {selection}
        </p>
      </div>
    </Section>
  );
};

/* ---------------------------------------------------------------- replacement */

const replacementStore = createComposerReplacementStore();

const ReplacementStatus = () => {
  const replaced = useIsComposerReplaced(replacementStore);

  return (
    <p className="text-sm" data-testid="replacement-status">
      Composer replaced: {String(replaced)}
    </p>
  );
};

const ReplacementExamples = () => {
  const [active, setActive] = useState(true);
  const [mounted, setMounted] = useState(true);

  return (
    <Section
      description="A surface that replaces the composer registers with the consumer. Without a provider the consumer reports true. An inactive provider reports false and registers nothing."
      id="replacement"
      title="Composer replacement"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          aria-pressed={active}
          color="outline"
          size="composerSm"
          onClick={() => {
            setActive((current) => !current);
          }}
        >
          Provider active
        </Button>
        <Button
          aria-pressed={mounted}
          color="outline"
          size="composerSm"
          onClick={() => {
            setMounted((current) => !current);
          }}
        >
          Consumer mounted
        </Button>
      </div>
      <ReplacementStatus />
      <p className="text-sm" data-testid="replacement-none">
        <ComposerReplacementConsumer>
          {(value) => `Without a provider: ${String(value)}`}
        </ComposerReplacementConsumer>
      </p>
      <ComposerReplacementScopeContext.Provider value={replacementStore}>
        <ComposerReplacementProvider isActive={active}>
          {mounted ? (
            <p className="text-sm" data-testid="replacement-consumer">
              <ComposerReplacementConsumer>
                {(value) => `With a provider: ${String(value)}`}
              </ComposerReplacementConsumer>
            </p>
          ) : null}
        </ComposerReplacementProvider>
      </ComposerReplacementScopeContext.Provider>
    </Section>
  );
};

/* ---------------------------------------------------------------- submit errors */

const jsonDetail = (detail: Record<string, string>) =>
  new Error(JSON.stringify({ detail }));

const errorCases: readonly (readonly [
  string,
  unknown,
  "cloud" | "local" | "worktree",
])[] = [
  ["Local failure", new Error("disk full"), "local"],
  ["Worktree failure", new Error("disk full"), "worktree"],
  ["Cloud failure", new Error("quota exceeded"), "cloud"],
  [
    "Cloud, missing GitHub link",
    jsonDetail({ message: "x", type: "github_link_missing" }),
    "cloud",
  ],
  ["Worktree restore required", new Error("worktree_needs_restore"), "local"],
  ["Worktree gone", new Error("worktree_gone"), "local"],
  ["Worktree status unavailable", new Error("worktree_state_unknown"), "local"],
  ["Too many browser tabs", new Error("tab_count_overflow"), "local"],
  ["Too much tab context", new Error("tab_context_overflow"), "local"],
  [
    "Worktree setup script failed",
    Object.assign(new Error("setup"), {
      data: { code: "worktree_setup_error" },
    }),
    "worktree",
  ],
  ["Chat references unavailable", new Error("thread_refs_missing"), "local"],
  ["Closed sub-agent", new Error("agent_closed"), "local"],
  ["App content", new Error("Could not use app content"), "cloud"],
];

const ErrorExamples = () => {
  const [value, setValue] = useState("Please keep this text");
  const [failure, setFailure] = useState<ReactNode>(null);

  return (
    <Section
      description="The toast text chosen for each failure. The composer stays populated so the user can retry."
      id="errors"
      title="Submit errors"
    >
      <InlineComposer
        canSubmit
        label="Retry prompt"
        submitLabel="Send"
        onCancel={noop}
        onSubmit={() => {
          setFailure(submitFailureMessage(new Error("network down"), "local"));
        }}
      >
        <input
          aria-label="Retry field"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </InlineComposer>
      <output aria-live="polite" className="text-sm" data-testid="error-toast">
        {failure}
      </output>
      <ul className="flex flex-col gap-1 text-sm" data-testid="error-table">
        {errorCases.map(([label, error, mode]) => (
          <li key={label}>
            <strong>{label}</strong>:{" "}
            {mode === "worktree"
              ? submitFailureMessage(error, mode)
              : composerSubmitErrorMessage(error, mode)}
          </li>
        ))}
      </ul>
    </Section>
  );
};

/* ---------------------------------------------------------------- key commands */

const RegistrationList = () => {
  const registrations = useKeyCommandRegistrations();
  const entries = [...registrations];

  return (
    <ul className="text-xs text-muted-foreground" data-testid="registrations">
      {entries.map(([command, list]) => (
        <li key={command}>
          {command}: {list?.length ?? 0} registered
        </li>
      ))}
    </ul>
  );
};

const KeyCommandExamples = () => {
  const [cards, setCards] = useState(["A", "B"]);
  const [log, setLog] = useState<readonly string[]>([]);
  const [commentLog, setCommentLog] = useState("No comment sent");
  const [comment, setComment] = useState("");
  const [remapLog, setRemapLog] = useState("Remapped card idle");

  const say = (entry: string) => {
    setLog((current) => [entry, ...current].slice(0, 6));
  };

  const remap: KeyCommandKeymap = {
    bindings: [{ command: "approval.acceptRequest", key: "CmdOrCtrl+Enter" }],
  };

  const conflictRows = [
    ["approval.acceptRequest", "Enter"],
    ["composer.sendMessage", "Enter"],
    ["approval.rejectRequest", "Escape"],
    ["approval.rejectRequest", "Enter"],
  ] as const;

  return (
    <Section
      description="One key press goes to one handler. The registry offers it to the newest registration first and stops when one accepts; a prevented key or an IME composition is never offered."
      id="key-commands"
      title="Key commands"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="outline"
          size="composerSm"
          onClick={() => {
            setCards((current) => [
              ...current,
              String.fromCodePoint(65 + current.length),
            ]);
          }}
        >
          Mount another card
        </Button>
        <Button
          color="outline"
          size="composerSm"
          onClick={() => {
            setCards((current) => current.slice(0, -1));
          }}
        >
          Unmount the newest card
        </Button>
      </div>
      <div className="grid max-w-140 gap-3" data-testid="key-cards">
        {cards.map((name) => (
          <Frame key={name} label={`Card ${name}`} testId={`key-card-${name}`}>
            <ApprovalRequestCard
              actions={{
                onApprove: () => {
                  say(`Card ${name} approved`);
                },
                onDeny: () => {
                  say(`Card ${name} denied`);
                },
              }}
              title={`Request ${name}`}
            />
          </Frame>
        ))}
      </div>
      <ol
        aria-label="Key command log"
        className="list-decimal ps-5 text-sm"
        data-testid="key-log"
      >
        {log.map((entry, index) => (
          // The log is newest first and an entry can repeat, so the position is its identity.
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
      <RegistrationList />
      <Frame
        label="A comment composer: its Enter submits the comment and approves no card"
        testId="key-comment"
      >
        <CommentComposerForm
          autoFocus={false}
          placeholder="Add a comment"
          submitLabel="Comment"
          value={comment}
          onChange={setComment}
          onSubmit={(text) => {
            setCommentLog(`Comment sent: "${text}"`);
            setComment("");
          }}
        />
        <p
          aria-live="polite"
          className="mt-2 text-xs text-muted-foreground"
          data-testid="key-comment-log"
        >
          {commentLog}
        </p>
      </Frame>
      <Frame
        label="Remapped: approve is bound to Cmd/Ctrl+Enter in this subtree only"
        testId="key-remap"
      >
        <KeyCommandProvider keymap={remap}>
          <ApprovalRequestCard
            actions={{
              onApprove: () => {
                setRemapLog("Remapped card approved");
              },
              onDeny: () => {
                setRemapLog("Remapped card denied");
              },
            }}
            title="Remapped request"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            Modifier in an editable field
            <select aria-label="Modifier in an editable field">
              <option>One</option>
              <option>Two</option>
            </select>
          </label>
          <p
            aria-live="polite"
            className="mt-2 text-xs text-muted-foreground"
            data-testid="key-remap-log"
          >
            {remapLog}
          </p>
        </KeyCommandProvider>
      </Frame>
      <table className="text-sm" data-testid="key-conflicts">
        <caption className="text-start text-xs text-muted-foreground">
          Default bindings {JSON.stringify(DEFAULT_KEYBINDINGS)}. Binding a
          command to a key another command holds:
        </caption>
        <tbody>
          {conflictRows.map(([command, key]) => (
            <tr key={`${command}-${key}`}>
              <td className="pe-4">
                {command} on {key}
              </td>
              <td>
                {findKeyConflicts(command, key, undefined).join(", ") ||
                  "no conflict"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
};

/* ---------------------------------------------------------------- compound button */

const COMPOUND_STATES = [
  ["Both on", {}],
  ["Dropdown off, primary on", { dropdownDisabled: true }],
  ["Primary off, dropdown on", { primaryDisabled: true }],
  ["Both off", { disabled: true }],
] as const;

const CompoundExamples = () => (
  <Section
    description="An outline compound button dims the chevron to 20% when the dropdown is off and the primary is on, dims the primary label to 40% when only the primary is off, and dims the whole button to 40% when both are off."
    id="compound"
    title="Compound button disabled states"
  >
    <div
      className="flex flex-wrap items-center gap-4"
      data-testid="compound-states"
    >
      {COMPOUND_STATES.map(([label, props]) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <CompoundButton
            color="outline"
            data-testid={`compound-${label.toLowerCase().replaceAll(/[^a-z]+/gu, "-")}`}
            dropdownContent={<MenuItem onSelect={noop}>Other action</MenuItem>}
            secondaryAriaLabel={`${label}: options`}
            size="composer"
            {...props}
          >
            Allow once
          </CompoundButton>
        </div>
      ))}
    </div>
  </Section>
);

/* ---------------------------------------------------------------- transcript card */

const TranscriptCardExamples = () => (
  <Section
    description="On the overlay window (the pathname or the initialRoute query is /ck-overlay) a card that is not embedded becomes the transcript card. Open this page with ?initialRoute=/ck-overlay to see every card above take it. The announcement surface is the composer-radius elevated card. A browser draws the material with CSS: the translucent elevated surface, its border and shadow."
    id="transcript"
    title="Transcript card and announcement surface"
  >
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="Announcement surface" testId="surface-announcement">
        <ApprovalSurface className="gap-2 p-4" variant="announcement">
          <ApprovalRequestBody
            subtitle="Shown as an announcement"
            title="Review the plan"
          />
        </ApprovalSurface>
      </Frame>
      <Frame label="Connection surface" testId="surface-connection">
        <ApprovalSurface className="gap-2 p-4" variant="connection">
          <ApprovalRequestBody title="Connect an account" />
        </ApprovalSurface>
      </Frame>
      <Frame
        label="Embedded card: no surface of its own, also on the overlay route"
        testId="surface-embedded"
      >
        <ApprovalRequestCard
          embedded
          actions={{ disableHotkeys: true, onApprove: noop, onDeny: noop }}
          title="Embedded request"
        />
      </Frame>
      <Frame
        label="Overlay material, variant transcript (CSS only)"
        testId="surface-transcript-card"
      >
        <AvatarOverlayMaterial
          className="gap-2 p-4 text-text"
          data-testid="transcript-card-material"
          variant="transcript"
        >
          <ApprovalRequestBody title="Run the build" />
        </AvatarOverlayMaterial>
      </Frame>
    </div>
  </Section>
);

/* ---------------------------------------------------------------- composer controls */

const productModes: readonly ComposerProductMode[] = ["code", "chat", "work"];

const enterBehaviors: readonly ComposerEnterBehavior[] = [
  "enter",
  "cmdIfMultiline",
  "cmdAlways",
];

const INITIAL_ATTACHMENTS = [
  { id: "a", label: "notes.md" },
  { id: "b", label: "diagram.png" },
];

const ControlsPanel = () => {
  const [value, setValue] = useState("");
  const [log, setLog] = useState("Nothing sent");
  const [running, setRunning] = useState(false);
  const [productMode, setProductMode] = useState<ComposerProductMode>("code");

  const [enterBehavior, setEnterBehavior] =
    useState<ComposerEnterBehavior>("enter");

  const [plan, setPlan] = useState(false);
  const [goal, setGoal] = useState(false);
  const [heading, setHeading] = useState(false);
  const [dictating, setDictating] = useState(false);
  const queue = useFollowUpQueueMode("interrupt");

  const list = useAttachmentUndo(INITIAL_ATTACHMENTS);
  const handleRemoveAttachment = list.remove;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          Product
          <select
            data-testid="ctl-product"
            value={productMode}
            onChange={(event) => {
              const next = productModes.find(
                (mode) => mode === event.target.value
              );

              if (next !== undefined) {
                setProductMode(next);
              }
            }}
          >
            {productModes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Enter behaviour
          <select
            data-testid="ctl-enter"
            value={enterBehavior}
            onChange={(event) => {
              const next = enterBehaviors.find(
                (behavior) => behavior === event.target.value
              );

              if (next !== undefined) {
                setEnterBehavior(next);
              }
            }}
          >
            {enterBehaviors.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        {(
          [
            ["Plan mode", plan, setPlan],
            ["Goal mode", goal, setGoal],
            ["Work heading", heading, setHeading],
            ["Dictating", dictating, setDictating],
            ["Response in progress", running, setRunning],
          ] as const
        ).map(([label, on, set]) => (
          <label key={label} className="flex items-center gap-1">
            <input
              checked={on}
              type="checkbox"
              onChange={(event) => {
                set(event.target.checked);
              }}
            />
            {label}
          </label>
        ))}
        <Button
          color="outline"
          size="composerSm"
          data-testid="ctl-queue-mode"
          onClick={() => {
            queue.setMode(queue.mode === "queue" ? "steer" : "queue");
          }}
        >
          Follow-up mode: {queue.mode}
        </Button>
      </div>
      <ComposerControls
        attachments={list.attachments}
        enterBehavior={enterBehavior}
        followUpType="local"
        heading={heading ? "Reading the repository" : null}
        isDictating={dictating}
        isLoadingWithoutBlocker={false}
        isPlanModeActive={plan}
        isGoalModeActive={goal}
        isQueueingEnabled={queue.isQueueingEnabled}
        isResponseInProgress={running}
        productMode={productMode}
        submitButtonMode={running ? "stop" : "submit"}
        value={value}
        onChange={setValue}
        onClear={() => {
          setValue("");
          setLog("Cleared");
        }}
        onRemoveAttachment={handleRemoveAttachment}
        onStop={() => {
          setRunning(false);
          setLog("Stopped");
        }}
        onStopDictation={() => {
          setDictating(false);
          setLog("Dictation sent");
        }}
        onSubmit={({ followUpSubmitAction }) => {
          setLog(`Sent: ${followUpSubmitAction ?? "submit"} "${value.trim()}"`);
          setValue("");
          setRunning(true);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="outline"
          disabled={!list.canUndo}
          size="composerSm"
          onClick={() => {
            list.undo();
          }}
        >
          Undo attachment change
        </Button>
        <Button
          color="outline"
          disabled={!list.canRedo}
          size="composerSm"
          onClick={() => {
            list.redo();
          }}
        >
          Redo
        </Button>
        <span
          aria-live="polite"
          className="text-xs text-muted-foreground"
          data-testid="ctl-log"
        >
          {log}
        </span>
      </div>
    </div>
  );
};

const shortcutEvent = (
  key: Partial<{
    altKey: boolean;
    ctrlKey: boolean;
    repeat: boolean;
    shiftKey: boolean;
  }>
) => ({
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  repeat: false,
  shiftKey: false,
  ...key,
});

const RuleTables = () => {
  const placeholderRows: readonly (readonly [
    string,
    Parameters<typeof composerPlaceholder>[0],
  ])[] = [
    ["Code, new", { productMode: "code" }],
    ["Code, follow-up", { followUpType: "local", productMode: "code" }],
    ["Chat", { productMode: "chat" }],
    ["Work", { productMode: "work" }],
    ["Plan mode", { isPlanModeActive: true, productMode: "code" }],
    ["Goal mode", { isGoalModeActive: true, productMode: "code" }],
    ["Image markup", { isImageMarkupActive: true, productMode: "code" }],
    [
      "Compact floating, working",
      {
        isCompactFloatingComposer: true,
        isResponseInProgress: true,
        productMode: "code",
      },
    ],
    ["Caller text", { placeholderText: "Reply to this", productMode: "code" }],
  ];

  const shortcutRows = [
    ["Cmd+Enter, queue on", "enter", true, shortcutEvent({ ctrlKey: true })],
    ["Cmd+Enter, queue off", "enter", false, shortcutEvent({ ctrlKey: true })],
    [
      "Cmd+Shift+Enter, cmdAlways, queue off",
      "cmdAlways",
      false,
      shortcutEvent({ ctrlKey: true, shiftKey: true }),
    ],
    [
      "Repeated Cmd+Enter",
      "enter",
      true,
      shortcutEvent({ ctrlKey: true, repeat: true }),
    ],
    ["Bare Enter", "enter", true, shortcutEvent({})],
  ] as const;

  const existing = [
    { fsPath: "/a.ts" },
    { endLine: 9, fsPath: "/b.ts", startLine: 3 },
  ];

  const incoming = [
    { fsPath: "/a.ts" },
    { endLine: 9, fsPath: "/b.ts", startLine: 3 },
    { endLine: 9, fsPath: "/b.ts", startLine: 4 },
    { fsPath: "/c.ts" },
    { fsPath: "/c.ts" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="rule-tables">
      <ul className="text-sm" data-testid="placeholder-table">
        {placeholderRows.map(([label, state]) => (
          <li key={label}>
            <strong>{label}</strong>: {composerPlaceholder(state)}
          </li>
        ))}
      </ul>
      <ul className="text-sm" data-testid="shortcut-table">
        {shortcutRows.map(([label, behavior, queueing, event]) => {
          const result = resolveFollowUpShortcut({
            canQueueFollowUp: true,
            enterBehavior: behavior,
            event,
            followUpType: "local",
            isQueueingEnabledForCurrentFollowUp: queueing,
            isResponseInProgress: true,
          });

          return (
            <li key={label}>
              <strong>{label}</strong>:{" "}
              {result.kind === "submit" ? result.action : result.kind}
            </li>
          );
        })}
      </ul>
      <ul className="text-sm" data-testid="attachment-table">
        <li>
          New attachments kept after the duplicate check:{" "}
          {dedupeFileAttachments(existing, incoming)
            .map((item) => item.fsPath + (item.startLine ?? ""))
            .join(", ")}
        </li>
        <li>{fileUploadErrorMessage(new Error("network"))}</li>
        <li>
          {fileUploadErrorMessage(
            Object.assign(new Error("big"), {
              code: "attachment_too_large",
              maximumSizeBytes: 5_242_880,
            })
          )}
        </li>
        <li>{REMOTE_FOLDER_UNSUPPORTED_MESSAGE}</li>
        <li>
          Pasted text restores up to {PASTED_TEXT_RESTORE_LIMIT} characters
        </li>
      </ul>
    </div>
  );
};

const ControlsExamples = () => (
  <Section
    description="The main composer without its rich editor. The send commands are key commands, Enter follows the Enter behaviour, Cmd/Ctrl+Enter queues or steers while a response runs, the placeholder follows the mode, and removing an attachment can be undone for a minute."
    id="controls"
    title="Composer controls"
  >
    <ToastProvider>
      <ControlsPanel />
    </ToastProvider>
    <RuleTables />
  </Section>
);

/* ---------------------------------------------------------------- appearance */

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
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-medium" id={`${id}-heading`}>
      {scope === "dark" ? "Dark theme" : "Light theme"}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <InlineEditor
      hint="Hint under the composer"
      initial="Themed prompt"
      multiline
    />
    <CommentEditor initial="Themed comment" />
    <ComposerTip
      tip={{ content: "Themed tip" }}
      variant="pill"
      onDismiss={noop}
    />
    {nested === undefined ? null : (
      <div
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <InlineEditor hint="Nested hint" initial="Nested prompt" multiline />
        <ComposerTip
          tip={{ content: "Nested tip" }}
          variant="pill"
          onDismiss={noop}
        />
      </div>
    )}
  </section>
);

const AppearanceExamples = () => (
  <Section
    description="Colours resolve against the nearest theme scope, so a light panel inside a dark one and the reverse each use their own colours."
    id="appearance"
    title="Light and dark"
  >
    <div className="grid gap-3 md:grid-cols-2">
      <AppearancePanel id="appearance-light" scope="light" />
      <AppearancePanel id="appearance-dark" scope="dark" />
      <AppearancePanel id="appearance-dark-light" nested="light" scope="dark" />
      <AppearancePanel id="appearance-light-dark" nested="dark" scope="light" />
    </div>
  </Section>
);

const RtlExamples = () => (
  <Section id="rtl" title="Right to left">
    <div className="flex flex-col gap-3" dir="rtl" lang="ar" data-testid="rtl">
      <InlineEditor hint="تلميح" initial="مسودة" multiline />
      <CommentEditor initial="تعليق" />
      <ComposerTip
        tip={{ actionLabel: "المزيد", content: "نصيحة" }}
        onDismiss={noop}
        onPrimaryAction={noop}
      />
      <ApprovalRequestCard
        actions={{
          disableHotkeys: true,
          onApprove: noop,
          onDeny: noop,
        }}
        title="طلب"
      />
    </div>
  </Section>
);

// Grants the approval hotkeys to the Key commands section after the first
// pointer or focus inside it, so its cards don't take focus on page load.
// Cards mounted afterwards focus their approve button.
const KeyCommandHotkeys = ({ children }: { children: ReactNode }) => {
  const [armed, setArmed] = useState(false);

  return (
    <div
      className="contents"
      onFocusCapture={() => {
        setArmed(true);
      }}
      onPointerDownCapture={() => {
        setArmed(true);
      }}
    >
      <ApprovalHotkeysContext value={armed}>{children}</ApprovalHotkeysContext>
    </div>
  );
};

// The gallery shows many approval cards at once. As in the desktop app, only a
// card that holds the approval hotkeys focuses its approve button on mount, so
// the page grants them only to the Key commands section, which demonstrates
// them.
const ComposerGalleryExample = () => (
  <ApprovalHotkeysContext value={false}>
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-lg font-semibold">Composer</h1>
        <AppearanceControl id="composer-appearance" />
      </header>
      <InlineExamples />
      <CommentExamples />
      <SurfaceExamples />
      <ButtonExamples />
      <TipExamples />
      <ApprovalExamples />
      <KeyCommandHotkeys>
        <KeyCommandExamples />
      </KeyCommandHotkeys>
      <CompoundExamples />
      <TranscriptCardExamples />
      <ShortcutExamples />
      <ReplacementExamples />
      <ErrorExamples />
      <FailureHandlerExamples />
      <AnalyticsDeliveryExamples />
      <ReasonLinkExamples />
      <TipSelectionExamples />
      <EditorExamples />
      <MorphExamples />
      <ControlsExamples />
      <AppearanceExamples />
      <RtlExamples />
    </main>
  </ApprovalHotkeysContext>
);

export { ComposerGalleryExample };
