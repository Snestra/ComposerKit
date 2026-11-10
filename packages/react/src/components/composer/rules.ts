/* oxlint-disable anti-slop/no-unknown-parameters -- A thrown value is untyped; the component reads its code and size by shape. */

/*
 * The rules of the main composer that do not depend on its ProseMirror
 * editor and the modules it imports:
 *
 * - queueing and the follow-up shortcut,
 * - send rules: the submit, steer, queue and clear commands and the Enter
 *   behaviour,
 * - placeholders, including the working placeholder,
 * - attachments: the draft dedupe key, the upload messages, the pasted-text
 *   limit and the undo entry.
 *
 * Strings are the default English messages.
 */

/* ---------------------------------------------------------------- queueing */

type FollowUpQueueMode = "queue" | "steer";

/** The stored value may still be the retired `interrupt`. */
type StoredFollowUpQueueMode = FollowUpQueueMode | "interrupt" | undefined;

interface FollowUpQueueState {
  isQueueingEnabled: boolean;
  mode: FollowUpQueueMode;
  /** True when the stored `interrupt` has to be rewritten to `steer`. */
  needsMigration: boolean;
}

/**
 * use-follow-up-queue-mode: `interrupt` reads as `steer` (and is stored as
 * `steer`), no stored value reads as `queue`, and queueing is on in `queue`.
 */
const resolveFollowUpQueueMode = (
  stored: StoredFollowUpQueueMode
): FollowUpQueueState => {
  const mode: FollowUpQueueMode =
    stored === "interrupt" ? "steer" : (stored ?? "queue");

  return {
    isQueueingEnabled: mode === "queue",
    mode,
    needsMigration: stored === "interrupt",
  };
};

type ComposerEnterBehavior = "cmdAlways" | "cmdIfMultiline" | "enter";

type FollowUpSubmitAction = "queue" | "steer";

interface FollowUpShortcutEvent {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
}

interface FollowUpShortcutState {
  canQueueFollowUp: boolean;
  enterBehavior: ComposerEnterBehavior;
  event: FollowUpShortcutEvent;
  followUpType: string | undefined;
  isQueueingEnabledForCurrentFollowUp: boolean;
  isResponseInProgress: boolean;
}

type FollowUpShortcutResult =
  | { action: FollowUpSubmitAction; kind: "submit" }
  | { kind: "ignore" }
  | { kind: "swallow" };

/**
 * The modified Enter while a response is in progress. A repeated
 * Cmd/Ctrl+Enter is swallowed. With enter behaviour `enter` the key is
 * Cmd/Ctrl+Enter, otherwise Cmd/Ctrl+Shift+Enter; it only acts on a local
 * follow-up with a response in progress. It does the opposite of the current
 * default: steer when queueing is on or cannot be used, queue otherwise.
 */
const resolveFollowUpShortcut = ({
  canQueueFollowUp,
  enterBehavior,
  event,
  followUpType,
  isQueueingEnabledForCurrentFollowUp,
  isResponseInProgress,
}: FollowUpShortcutState): FollowUpShortcutResult => {
  const modified = event.metaKey || event.ctrlKey;

  if (event.repeat && modified && !event.shiftKey && !event.altKey) {
    return { kind: "swallow" };
  }

  const matches =
    enterBehavior === "enter"
      ? modified && !event.shiftKey && !event.altKey
      : modified && event.shiftKey && !event.altKey;

  if (!matches || followUpType !== "local" || !isResponseInProgress) {
    return { kind: "ignore" };
  }

  return {
    action:
      !canQueueFollowUp || isQueueingEnabledForCurrentFollowUp
        ? "steer"
        : "queue",
    kind: "submit",
  };
};

/* ---------------------------------------------------------------- send rules */

interface EnterSubmitEvent {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

const INTERACTIVE_ENTER_TARGETS = "button, a[href], select, [role='button']";

/**
 * Cmd/Ctrl+Enter always submits; a bare Enter submits when the Enter
 * behaviour is `enter`, or `cmdIfMultiline` while the text is a single line,
 * and the focus is not on a button, link, select or role=button.
 */
const submitsOnEnter = (
  event: EnterSubmitEvent,
  enterBehavior: ComposerEnterBehavior,
  isMultiline: boolean,
  activeElement: Element | null
) => {
  if (event.key !== "Enter" || event.altKey) {
    return false;
  }

  const modified = event.metaKey || event.ctrlKey;

  if (modified && !event.shiftKey) {
    return true;
  }

  const bareEnterSubmits =
    enterBehavior === "enter" ||
    (enterBehavior === "cmdIfMultiline" && !isMultiline);

  return (
    bareEnterSubmits &&
    !modified &&
    !event.shiftKey &&
    (activeElement?.closest(INTERACTIVE_ENTER_TARGETS) ?? null) === null
  );
};

type SubmitButtonMode = "stop" | "submit";

interface SendCommandState {
  composerInteractionsEnabled: boolean;
  isDictating: boolean;
  isResumePending: boolean;
  submitButtonMode: SubmitButtonMode;
  submitDisabled: boolean;
}

interface SendCommandAvailability {
  /** composer.resetDraft */
  clear: boolean;
  /** composer.enqueueMessage and composer.redirectRun */
  followUp: boolean;
  /** composer.sendMessage */
  submit: boolean;
}

/** When each command is registered. Dictation counts as something to send. */
const sendCommandAvailability = ({
  composerInteractionsEnabled,
  isDictating,
  isResumePending,
  submitButtonMode,
  submitDisabled,
}: SendCommandState): SendCommandAvailability => {
  const live = composerInteractionsEnabled && !isResumePending;

  return {
    clear: composerInteractionsEnabled,
    followUp:
      live && !isDictating && !submitDisabled && submitButtonMode === "submit",
    submit: live && (isDictating || !submitDisabled),
  };
};

type SubmitCommandOutcome = "ignored" | "stop-dictation" | "submit";

/**
 * The composer.sendMessage handler: while dictating it sends the dictation, with
 * nothing to send it does nothing, and in `stop` mode it does not submit.
 */
const resolveSubmitCommand = ({
  composerInteractionsEnabled,
  isDictating,
  isResumePending,
  submitButtonMode,
  submitDisabled,
}: SendCommandState): SubmitCommandOutcome => {
  if (!composerInteractionsEnabled || isResumePending) {
    return "ignored";
  }

  if (isDictating) {
    return "stop-dictation";
  }

  return !submitDisabled && submitButtonMode === "submit"
    ? "submit"
    : "ignored";
};

/* ---------------------------------------------------------------- placeholders */

type ComposerProductMode = "chat" | "code" | "work";

const PLACEHOLDER_WORKING = "Working…";
const PLACEHOLDER_IMAGE_MARKUP = "Add instructions…";

const PLACEHOLDER_GOAL = "Describe your goal and the outcomes you want";

const PLACEHOLDER_PLAN = "Describe your task to generate a plan...";
const PLACEHOLDER_ASK_ASSISTANT = "Ask the assistant";
const PLACEHOLDER_WORK_WITH_AGENT = "Work with the agent";
const PLACEHOLDER_DO_ANYTHING = "Do anything";
const PLACEHOLDER_WORK_WITH_ASSISTANT = "Work with the assistant";
const PLACEHOLDER_THINKING = "Thinking…";

/** The product placeholder. A workspace agent name replaces the chat text. */
const productPlaceholder = (
  productMode: ComposerProductMode,
  {
    isFollowUp = false,
    workspaceAgentName,
  }: {
    isFollowUp?: boolean;
    workspaceAgentName?: string;
  } = {}
) => {
  switch (productMode) {
    case "chat": {
      return workspaceAgentName === undefined
        ? PLACEHOLDER_ASK_ASSISTANT
        : `Ask ${workspaceAgentName}`;
    }

    case "code": {
      return isFollowUp ? PLACEHOLDER_WORK_WITH_AGENT : PLACEHOLDER_DO_ANYTHING;
    }

    case "work": {
      return PLACEHOLDER_WORK_WITH_ASSISTANT;
    }

    default: {
      return PLACEHOLDER_DO_ANYTHING;
    }
  }
};

interface ComposerPlaceholderState {
  /** Set when the composer continues a chat. */
  followUpType?: string | null;
  isCompactFloatingComposer?: boolean;
  isGoalModeActive?: boolean;
  isImageMarkupActive?: boolean;
  isPlanModeActive?: boolean;
  isResponseInProgress?: boolean;
  /** A caller supplied text wins over the product text. */
  placeholderText?: string | null;
  productMode: ComposerProductMode;
}

/**
 * The first match wins. Image markup, a compact floating composer with a
 * response in progress, goal mode, plan mode, the caller's text, then the
 * product placeholder (a follow-up when `followUpType` is not null).
 */
const composerPlaceholder = ({
  followUpType,
  isCompactFloatingComposer = false,
  isGoalModeActive = false,
  isImageMarkupActive = false,
  isPlanModeActive = false,
  isResponseInProgress = false,
  placeholderText,
  productMode,
}: ComposerPlaceholderState) => {
  if (isImageMarkupActive) {
    return PLACEHOLDER_IMAGE_MARKUP;
  }

  if (isCompactFloatingComposer && isResponseInProgress) {
    return PLACEHOLDER_WORKING;
  }

  if (isGoalModeActive) {
    return PLACEHOLDER_GOAL;
  }

  if (isPlanModeActive) {
    return PLACEHOLDER_PLAN;
  }

  return (
    placeholderText ??
    productPlaceholder(productMode, {
      isFollowUp: followUpType !== undefined && followUpType !== null,
    })
  );
};

interface WorkingComposerState<Heading> {
  /** The latest work heading, or null while there is none. */
  heading: Heading | null;
  /** Whether the thread is loading, read and not blocked, worked out by the caller. */
  isLoadingWithoutBlocker: boolean;
  placeholder: string;
}

interface WorkingComposerResult<Heading> {
  accessibleStatus: Heading | string | null;
  /** True when the heading row replaces the placeholder. */
  showsWorkingHeading: boolean;
  placeholder: string;
}

/**
 * While the floating composer has a work heading, or is loading without a
 * blocking request, the placeholder is empty, the heading row shows and the
 * accessible status is the heading, or "Thinking…" when there is none.
 */
const workingComposerState = <Heading>({
  heading,
  isLoadingWithoutBlocker,
  placeholder,
}: WorkingComposerState<Heading>): WorkingComposerResult<Heading> => {
  const showsWorkingHeading = heading !== null || isLoadingWithoutBlocker;

  return {
    accessibleStatus: showsWorkingHeading
      ? (heading ?? PLACEHOLDER_THINKING)
      : null,
    placeholder: showsWorkingHeading ? "" : placeholder,
    showsWorkingHeading,
  };
};

/* ---------------------------------------------------------------- attachments */

interface FileAttachmentRef {
  endLine?: number;
  fsPath: string;
  startLine?: number;
}

/** composer-attachment-actions K: the key that makes two file attachments the same. */
const fileAttachmentKey = ({ endLine, fsPath, startLine }: FileAttachmentRef) =>
  JSON.stringify([fsPath, startLine, endLine]);

/** Drops attachments already in the draft and repeats inside the new batch. */
const dedupeFileAttachments = <Attachment extends FileAttachmentRef>(
  existing: readonly FileAttachmentRef[],
  incoming: readonly Attachment[]
): Attachment[] => {
  const seen = new Set(existing.map(fileAttachmentKey));

  return incoming.filter((attachment) => {
    const key = fileAttachmentKey(attachment);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

const BYTES_PER_MEGABYTE = 1_048_576;

const FILE_UPLOAD_ERROR_MESSAGE = "Unable to upload file";

const REMOTE_FOLDER_UNSUPPORTED_MESSAGE =
  "Folders can only be attached to local conversations";

const BROWSER_FILE_COPY_ERROR_MESSAGE = "Unable to attach file";
const IMAGE_UPLOAD_FAILED_MESSAGE = "Failed to upload image";
const ATTACHMENT_RESTORED_MESSAGE = "Attachment restored";

/** composer-attachment-actions K (second function): the too-large error carries its limit. */
const isFileTooLargeError = (
  error: unknown
): error is Error & {
  code: "attachment_too_large";
  maximumSizeBytes: number;
} =>
  error instanceof Error &&
  "code" in error &&
  error.code === "attachment_too_large" &&
  "maximumSizeBytes" in error &&
  typeof error.maximumSizeBytes === "number";

/** composer-attachment-actions he: the toast text of a failed remote upload. */
const fileUploadErrorMessage = (error: unknown) =>
  isFileTooLargeError(error)
    ? `File is too large to upload (maximum ${new Intl.NumberFormat("en-US").format(error.maximumSizeBytes / BYTES_PER_MEGABYTE)} MB)`
    : FILE_UPLOAD_ERROR_MESSAGE;

/** pasted-text-file-attachment-actions f: a pasted text attachment longer than this is not restored. */
const PASTED_TEXT_RESTORE_LIMIT = 25_000;

const canRestorePastedText = (text: string) =>
  text.length <= PASTED_TEXT_RESTORE_LIMIT;

/** How long an undo entry stays available. */
const ATTACHMENT_UNDO_WINDOW_MS = 60_000;

export {
  ATTACHMENT_RESTORED_MESSAGE,
  ATTACHMENT_UNDO_WINDOW_MS,
  BROWSER_FILE_COPY_ERROR_MESSAGE,
  canRestorePastedText,
  composerPlaceholder,
  dedupeFileAttachments,
  FILE_UPLOAD_ERROR_MESSAGE,
  fileAttachmentKey,
  fileUploadErrorMessage,
  IMAGE_UPLOAD_FAILED_MESSAGE,
  isFileTooLargeError,
  PASTED_TEXT_RESTORE_LIMIT,
  PLACEHOLDER_THINKING,
  productPlaceholder,
  REMOTE_FOLDER_UNSUPPORTED_MESSAGE,
  resolveFollowUpQueueMode,
  resolveFollowUpShortcut,
  resolveSubmitCommand,
  sendCommandAvailability,
  submitsOnEnter,
  workingComposerState,
};

export type {
  ComposerEnterBehavior,
  ComposerPlaceholderState,
  ComposerProductMode,
  EnterSubmitEvent,
  FileAttachmentRef,
  FollowUpQueueMode,
  FollowUpQueueState,
  FollowUpShortcutEvent,
  FollowUpShortcutResult,
  FollowUpShortcutState,
  FollowUpSubmitAction,
  SendCommandAvailability,
  SendCommandState,
  StoredFollowUpQueueMode,
  SubmitButtonMode,
  SubmitCommandOutcome,
  WorkingComposerResult,
  WorkingComposerState,
};
