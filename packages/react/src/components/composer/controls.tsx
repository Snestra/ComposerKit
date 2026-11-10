"use client";

import {
  ComposerSendIcon,
  ComposerStopIcon,
  Xmark16Icon,
} from "@workspace/react/components/composer/icons";
import {
  useKeyCommand,
  useKeyCommandDispatch,
} from "@workspace/react/components/composer/key-commands";
import {
  ATTACHMENT_RESTORED_MESSAGE,
  ATTACHMENT_UNDO_WINDOW_MS,
  composerPlaceholder,
  resolveFollowUpQueueMode,
  resolveFollowUpShortcut,
  resolveSubmitCommand,
  sendCommandAvailability,
  submitsOnEnter,
  workingComposerState,
} from "@workspace/react/components/composer/rules";
import type {
  ComposerEnterBehavior,
  ComposerPlaceholderState,
  FollowUpQueueMode,
  FollowUpSubmitAction,
  StoredFollowUpQueueMode,
  SubmitButtonMode,
} from "@workspace/react/components/composer/rules";
import { Button } from "@workspace/react/components/ui/button";
import {
  ComposerSubmitButton,
  ComposerSurface,
  composerEditorInputClassName,
} from "@workspace/react/components/ui/composer";
import { useToast } from "@workspace/react/components/ui/toast";
import { cn } from "@workspace/react/lib/utils";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/*
 * The parts of the main composer that do
 * not need its ProseMirror editor: the follow-up queue mode, the send
 * commands and keys, the placeholder, and the attachment row with undo. The
 * text field is a plain textarea; the rich editor stays out of this file.
 */

/* ---------------------------------------------------------------- queue mode */

/**
 * use-follow-up-queue-mode: the stored mode as React state. A stored
 * `interrupt` is rewritten to `steer` before it is first used, and no stored
 * value reads `queue`.
 */
const useFollowUpQueueMode = (initial?: StoredFollowUpQueueMode) => {
  const [mode, setMode] = useState<FollowUpQueueMode>(
    () => resolveFollowUpQueueMode(initial).mode
  );

  return { ...resolveFollowUpQueueMode(mode), setMode };
};

/* ---------------------------------------------------------------- attachments */

interface ComposerAttachment {
  id: string;
  label: string;
}

interface UndoEntry {
  expiresAt: number;
  redo: readonly ComposerAttachment[];
  undo: readonly ComposerAttachment[];
}

/**
 * uploaded-file-attachments Y: removing an attachment records an undo entry
 * that restores the earlier list for 60 seconds. Undo shows the success
 * toast "Attachment restored"; redo removes it again without one.
 */
const useAttachmentUndo = (initial: readonly ComposerAttachment[]) => {
  const toast = useToast();
  const [attachments, setAttachments] = useState(initial);
  const [undoStack, setUndoStack] = useState<readonly UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<readonly UndoEntry[]>([]);

  const remove = useCallback(
    (id: string) => {
      const before = attachments;
      const after = before.filter((attachment) => attachment.id !== id);

      if (after.length === before.length) {
        return;
      }

      setAttachments(after);
      setRedoStack([]);
      setUndoStack((stack) => [
        ...stack,
        {
          expiresAt: Date.now() + ATTACHMENT_UNDO_WINDOW_MS,
          redo: after,
          undo: before,
        },
      ]);
    },
    [attachments]
  );

  const undo = useCallback(() => {
    const entry = undoStack.at(-1);

    if (entry === undefined) {
      return false;
    }

    setUndoStack((stack) => stack.slice(0, -1));

    if (entry.expiresAt <= Date.now()) {
      return false;
    }

    setAttachments(entry.undo);
    setRedoStack((stack) => [...stack, entry]);
    toast.success(ATTACHMENT_RESTORED_MESSAGE);

    return true;
  }, [toast, undoStack]);

  const redo = useCallback(() => {
    const entry = redoStack.at(-1);

    if (entry === undefined) {
      return false;
    }

    setRedoStack((stack) => stack.slice(0, -1));
    setAttachments(entry.redo);
    setUndoStack((stack) => [...stack, entry]);

    return true;
  }, [redoStack]);

  return {
    attachments,
    canRedo: redoStack.length > 0,
    canUndo: undoStack.length > 0,
    redo,
    remove,
    undo,
  };
};

/* ---------------------------------------------------------------- controls */

interface ComposerSubmitRequest {
  followUpSubmitAction?: FollowUpSubmitAction;
}

interface ComposerControlsProps extends Omit<
  ComposerPlaceholderState,
  "placeholderText"
> {
  attachments?: readonly ComposerAttachment[];
  canQueueFollowUp?: boolean;
  composerInteractionsEnabled?: boolean;
  enterBehavior?: ComposerEnterBehavior;
  /** The latest work heading of the floating composer. */
  heading?: string | null;
  isDictating?: boolean;
  isLoadingWithoutBlocker?: boolean;
  isQueueingEnabled: boolean;
  isResumePending?: boolean;
  onChange: (value: string) => void;
  onClear?: () => void;
  onRemoveAttachment?: (id: string) => void;
  onStop?: () => void;
  onStopDictation?: () => void;
  onSubmit: (request: ComposerSubmitRequest) => void;
  placeholderText?: string | null;
  submitButtonMode?: SubmitButtonMode;
  value: string;
}

const isMultiline = (value: string) => value.includes("\n");

const NO_ATTACHMENTS: readonly ComposerAttachment[] = [];

/**
 * The main composer without its rich editor. composer.sendMessage, composer.redirectRun,
 * composer.enqueueMessage and composer.resetDraft are key commands of the registry, enabled
 * by the rules. Enter in the textarea follows the Enter
 * behaviour, and the modified Enter during a response queues or steers.
 */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
const ComposerControls = ({
  attachments = NO_ATTACHMENTS,
  canQueueFollowUp = true,
  composerInteractionsEnabled = true,
  enterBehavior = "enter",
  followUpType,
  heading = null,
  isDictating = false,
  isLoadingWithoutBlocker = false,
  isQueueingEnabled,
  isResumePending = false,
  isResponseInProgress = false,
  onChange,
  onClear,
  onRemoveAttachment,
  onStop,
  onStopDictation,
  onSubmit,
  placeholderText,
  submitButtonMode = "submit",
  value,
  ...placeholderState
}: ComposerControlsProps) => {
  const dispatchKey = useKeyCommandDispatch("composer.sendMessage");
  const rootRef = useRef<HTMLDivElement>(null);
  const submitDisabled = value.trim() === "" && attachments.length === 0;

  const commandState = {
    composerInteractionsEnabled,
    isDictating,
    isResumePending,
    submitButtonMode,
    submitDisabled,
  };

  const available = sendCommandAvailability(commandState);

  const submit = (request: ComposerSubmitRequest = {}) => {
    onSubmit(request);
  };

  const runSubmit = () => {
    const outcome = resolveSubmitCommand(commandState);

    if (outcome === "stop-dictation") {
      onStopDictation?.();
    } else if (outcome === "submit") {
      submit();
    }
  };

  useKeyCommand("composer.sendMessage", runSubmit, {
    enabled: available.submit,
    keyboardHandler: (event) => {
      const root = rootRef.current;

      if (
        root === null ||
        !(event.target instanceof Node) ||
        !root.contains(event.target) ||
        !submitsOnEnter(
          event,
          enterBehavior,
          isMultiline(value),
          document.activeElement
        )
      ) {
        return false;
      }

      runSubmit();

      return true;
    },
  });

  useKeyCommand(
    "composer.redirectRun",
    () => {
      submit({ followUpSubmitAction: "steer" });
    },
    { enabled: available.followUp }
  );

  useKeyCommand(
    "composer.enqueueMessage",
    () => {
      submit({ followUpSubmitAction: "queue" });
    },
    { enabled: available.followUp }
  );

  useKeyCommand(
    "composer.resetDraft",
    () => {
      onClear?.();
    },
    { enabled: available.clear }
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const shortcut = resolveFollowUpShortcut({
      canQueueFollowUp,
      enterBehavior,
      event: event.nativeEvent,
      followUpType: followUpType ?? undefined,
      isQueueingEnabledForCurrentFollowUp: isQueueingEnabled,
      isResponseInProgress,
    });

    if (shortcut.kind === "swallow") {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    if (shortcut.kind === "submit") {
      event.preventDefault();
      event.stopPropagation();
      submit({ followUpSubmitAction: shortcut.action });

      return;
    }

    dispatchKey(event.nativeEvent);
    // The field keeps its Enter: an unhandled Enter is a new line, not an approval.
    event.stopPropagation();
  };

  const working = workingComposerState({
    heading,
    isLoadingWithoutBlocker,
    placeholder: composerPlaceholder({
      ...placeholderState,
      followUpType,
      isResponseInProgress,
      placeholderText,
    }),
  });

  const stopped = submitButtonMode === "stop";

  return (
    <ComposerSurface ref={rootRef} data-ui-editor-root>
      <div className="flex flex-col gap-2 p-3">
        {attachments.length > 0 ? (
          <ul
            aria-label="Attachments"
            className="flex flex-wrap gap-1.5"
            data-testid="composer-attachments"
          >
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center gap-1 rounded-full border border-border bg-panel-elevated-secondary ps-2.5 pe-1 text-sm"
              >
                <span className="truncate">{attachment.label}</span>
                <Button
                  aria-label={`Remove ${attachment.label}`}
                  color="ghost"
                  size="composerSm"
                  onClick={() => {
                    onRemoveAttachment?.(attachment.id);
                  }}
                >
                  <Xmark16Icon aria-hidden="true" className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {working.showsWorkingHeading ? (
          <p
            className="text-sm font-semibold text-text"
            data-testid="working-heading"
          >
            {working.accessibleStatus}
          </p>
        ) : null}
        <textarea
          aria-label={working.accessibleStatus ?? working.placeholder}
          className={cn(
            composerEditorInputClassName,
            "max-h-48 resize-none border-0 bg-transparent outline-none placeholder:text-text-subtle"
          )}
          disabled={!composerInteractionsEnabled}
          placeholder={working.placeholder}
          rows={2}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="flex justify-end">
          <ComposerSubmitButton
            ariaLabel={stopped ? "Stop" : "Send"}
            disabled={stopped ? false : !available.submit || submitDisabled}
            Icon={stopped ? ComposerStopIcon : ComposerSendIcon}
            type="button"
            onClick={stopped ? onStop : runSubmit}
          />
        </div>
      </div>
    </ComposerSurface>
  );
};

export { ComposerControls, useAttachmentUndo, useFollowUpQueueMode };

export type {
  ComposerAttachment,
  ComposerControlsProps,
  ComposerSubmitRequest,
};
