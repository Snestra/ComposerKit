/* oxlint-disable eslint/max-classes-per-file, unicorn/custom-error-definition, anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion -- Thrown values are untyped; the component reads their message, data.code and detail by shape. */

import type { ToastManager } from "composerkit/components/toast/manager";
import type { ReactNode } from "react";

/*
 * Submit-failure messages: the toast
 * text chosen for an error: one for a local task, one for the rest, two for
 * cloud submissions and three for specific cases. Each message is its default
 * English text and
 * `{br}` is a line break element.
 */

type ComposerSubmitMode = string;

interface SubmitErrorEnvelope {
  message: string;
  type: string | null;
}

const APP_INPUT_ERROR = "Could not use app content";
const APP_INPUT_MESSAGE = "Content from the app could not be used";
const MISSING_GITHUB_CONNECTOR_LINK = "github_link_missing";
const BROWSER_TAB_MENTION_LIMIT = 100;
const WORKTREE_INIT_FAILED = "worktree_setup_error";
const CLOSED_AGENT_MARKER = "agent_closed";

/** The message text of any thrown value. */
const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/** The `detail` of a JSON error body, normalised to a type and a message. */
const parseErrorDetail = (error: Error): SubmitErrorEnvelope | null => {
  try {
    const body: unknown = JSON.parse(error.message);

    if (typeof body !== "object" || body === null || !("detail" in body)) {
      return null;
    }

    const { detail } = body;

    if (typeof detail === "string") {
      return { message: detail, type: null };
    }

    if (typeof detail !== "object" || detail === null) {
      return null;
    }

    const {
      error_code: code,
      message,
      type,
    } = detail as {
      error_code?: unknown;
      message?: unknown;
      type?: unknown;
    };

    if (typeof message !== "string") {
      return null;
    }

    let kind: string | null = null;

    if (typeof type === "string") {
      kind = type;
    } else if (typeof code === "string") {
      kind = code;
    }

    return { message, type: kind };
  } catch {
    return null;
  }
};

const lineBreak = (message: string, error: string, key: string): ReactNode => (
  <>
    {message}
    <br key={key} />
    {error}
  </>
);

const threadReferenceMessage = (error: unknown) =>
  errorMessage(error) === "thread_refs_missing"
    ? "Remove the chat references, or use them in a new chat instead"
    : null;

const browserTabMentionMessage = (error: unknown) => {
  switch (errorMessage(error)) {
    case "tab_context_overflow": {
      return "Remove some browser tab mentions before sending this message again";
    }

    case "tab_count_overflow": {
      return `You can mention up to ${BROWSER_TAB_MENTION_LIMIT} browser tabs per message`;
    }

    default: {
      return null;
    }
  }
};

const worktreeStateMessage = (error: unknown) => {
  const text = errorMessage(error);

  if (text.includes("worktree_needs_restore")) {
    return "Restore this worktree before continuing";
  }

  if (text.includes("worktree_gone")) {
    return "This worktree has been removed";
  }

  if (text.includes("worktree_state_unknown")) {
    return "The worktree status could not be read";
  }

  return null;
};

/** A worktree setup script failure carries `data.code`. */
const isWorktreeSetupFailure = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return false;
  }

  const { data } = error;

  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === WORKTREE_INIT_FAILED
  );
};

const WORKTREE_SETUP_FAILED =
  "The worktree setup script failed. Review the script in the host environment settings";

/** Messages for the first or follow-up message of a code task and for cloud task creation. */
const cloudSubmitMessage = (error: unknown, creation: boolean): ReactNode => {
  if (errorMessage(error) === APP_INPUT_ERROR) {
    return APP_INPUT_MESSAGE;
  }

  const detail = error instanceof Error ? parseErrorDetail(error) : null;

  if (detail?.type === MISSING_GITHUB_CONNECTOR_LINK) {
    return "Reconnect GitHub in Plugins before sending this request";
  }

  return lineBreak(
    "The message could not be sent",
    detail?.message ?? errorMessage(error),
    creation ? "remote-submit-error-detail" : "submit-error-detail"
  );
};

/** The message for a failed worktree or local submission. */
const localSubmitMessage = (error: unknown): ReactNode => {
  if (errorMessage(error) === APP_INPUT_ERROR) {
    return APP_INPUT_MESSAGE;
  }

  return (
    threadReferenceMessage(error) ??
    browserTabMentionMessage(error) ??
    worktreeStateMessage(error) ??
    (isWorktreeSetupFailure(error)
      ? WORKTREE_SETUP_FAILED
      : lineBreak(
          "Error starting chat",
          errorMessage(error),
          "local-task-error-break"
        ))
  );
};

/**
 * The message for the modes other than worktree. The thread
 * reference, browser tab and worktree state messages come first, then a worktree
 * setup failure (worktree mode only), a closed sub-agent chat (the error text
 * contains `agent_closed`), and the cloud or other task message.
 */
const composerSubmitErrorMessage = (
  error: unknown,
  mode: ComposerSubmitMode
): ReactNode => {
  const specific =
    threadReferenceMessage(error) ??
    browserTabMentionMessage(error) ??
    worktreeStateMessage(error);

  if (specific !== null) {
    return specific;
  }

  if (mode === "worktree" && isWorktreeSetupFailure(error)) {
    return WORKTREE_SETUP_FAILED;
  }

  if (errorMessage(error).includes(CLOSED_AGENT_MARKER)) {
    return "Resume this sub-agent from its parent conversation before replying";
  }

  return cloudSubmitMessage(error, mode === "cloud");
};

/**
 * A failed submit uses the message for its mode.
 * The composer stays populated so the user can retry.
 */
const submitFailureMessage = (
  error: unknown,
  mode: ComposerSubmitMode
): ReactNode =>
  mode === "worktree"
    ? localSubmitMessage(error)
    : composerSubmitErrorMessage(error, mode);

/* ---------------------------------------------------------------- failure handler */

/** An error that carries its own user-facing message. */
class ComposerSubmitError extends Error {}

/** A slide suggestion was sent in Cloud mode. */
class PresentationSuggestionCloudUnsupportedError extends Error {}

/** A reply-chain draft that includes images. */
class ReplyTextOnlyError extends Error {
  constructor() {
    super("reply_text_mode");
  }
}

/** The app request error with its delivery flags. */
class AppRequestError extends Error {
  deliveryUnknown: boolean;
  retryWithSameRequest: boolean;
  status: number | undefined;

  constructor(
    message: string,
    status?: number,
    options?: { deliveryUnknown?: boolean; retryWithSameRequest?: boolean }
  ) {
    super(message);
    this.status = status;
    this.deliveryUnknown = options?.deliveryUnknown ?? false;
    this.retryWithSameRequest = options?.retryWithSameRequest ?? false;
  }
}

/** The project context could not be synced. The handler ignores it. */
class ProjectContextSyncError extends Error {
  constructor() {
    super("Could not sync project context");
  }
}

/** The user cancelled the follow-up confirmation dialog. The handler ignores it. */
class FollowUpConfirmationCancelledError extends Error {}

/** The app HTTP error with a status and an error code. */
class AppHttpError extends Error {
  errorCode: string | undefined;
  status: number;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

/** A predicate on any value, not an error class. */
const isModelUnavailable = (
  error: unknown
): error is Error & { code: "model-unavailable" } =>
  error instanceof Error &&
  "code" in error &&
  error.code === "model-unavailable";

/** The assistant's chosen name failed moderation. */
const isRejectedNameError = (error: unknown) =>
  error instanceof AppHttpError &&
  error.status === 400 &&
  error.errorCode === "invalid_name";

const NAME_REJECTED_MESSAGE =
  "This name is not allowed. Choose a different name.";

const PRESENTATION_SUGGESTION_CLOUD_MESSAGE =
  "To send this slide suggestion, leave Cloud mode or remove the slide attachment";

const REPLY_TEXT_ONLY_MESSAGE =
  "Remove the images before replying. Replies accept only text.";

const VIEW_DIAGNOSTICS_LABEL = "View diagnostics";

/** Toast ids of the handler. */
const COMPOSER_TASK_ERROR_TOAST_ID = "composer.taskError";

/** The error analytics payload every failure toast carries. */
const COMPOSER_SUBMIT_ERROR_ANALYTICS = {
  code: "submit_failed",
  source: "composer",
  surface: "toast",
} as const;

/** What the failure handler gives the diagnostics host; the host classifies, redacts and normalises it (components/composer/diagnostics-host.ts). */
interface SubmitDiagnosticsReport {
  conversationId: string | null;
  errorMessage: string;
  occurredAtMs: number;
  operation: string;
  surface: "code";
}

/**
 * The host's diagnostics service. It returns no action when the
 * diagnostics gate is off. Otherwise it prepares the report once, when the
 * failure happens, and returns the handler that the "View diagnostics" action
 * runs on click.
 */
interface SubmitDiagnosticsHost {
  prepare: (report: SubmitDiagnosticsReport) => (() => void) | undefined;
}

interface SubmitFailureOptions {
  composerMode: ComposerSubmitMode;
  conversationId?: string | null;
  cwd?: string | null;
  /** Diagnostics service, kept apart from the analytics payload. */
  diagnostics?: SubmitDiagnosticsHost;
  followUpType?: string;
  /** Logger o.error. */
  log?: (
    message: string,
    details: {
      safe: { followUp: string | undefined; mode: ComposerSubmitMode };
      sensitive: { cwd: string | null | undefined; error: unknown };
    }
  ) => void;
  now?: () => number;
  toast: ToastManager;
}

/** The "View diagnostics" toast action, or nothing when the host has none. */
const viewDiagnosticsAction = (
  diagnostics: SubmitDiagnosticsHost | undefined,
  report: SubmitDiagnosticsReport
) => {
  const onClick = diagnostics?.prepare(report);

  return onClick === undefined
    ? undefined
    : { label: VIEW_DIAGNOSTICS_LABEL, onClick };
};

/**
 * The failure handler of the composer submit. It returns what
 * `(error, toastId, operation)` does: a rejected name, a Cloud slide
 * suggestion, a text-only reply and an error that carries its own message each
 * show their toast and stop; project-sync, cancelled-confirmation and abort
 * errors are ignored; every other error is logged and shows the message of
 * the mode with a "View diagnostics" action, except in Cloud mode.
 * Analytics ride along as the toast's errorAnalytics option and the
 * diagnostics host is only called when the action is clicked.
 */
const createSubmitFailureHandler =
  ({
    composerMode,
    conversationId,
    cwd,
    diagnostics,
    followUpType,
    log,
    now = Date.now,
    toast,
  }: SubmitFailureOptions) =>
  (error: unknown, toastId: string, operation?: string) => {
    const analytics = COMPOSER_SUBMIT_ERROR_ANALYTICS;

    if (isRejectedNameError(error)) {
      toast.danger(NAME_REJECTED_MESSAGE, {
        errorAnalytics: {
          ...analytics,
          code: "name_rejected",
          message: NAME_REJECTED_MESSAGE,
        },
      });

      return;
    }

    if (error instanceof PresentationSuggestionCloudUnsupportedError) {
      toast.danger(PRESENTATION_SUGGESTION_CLOUD_MESSAGE, {
        errorAnalytics: {
          ...analytics,
          code: "unsupported_attachment",
          message: PRESENTATION_SUGGESTION_CLOUD_MESSAGE,
        },
      });

      return;
    }

    if (error instanceof ReplyTextOnlyError) {
      toast.danger(REPLY_TEXT_ONLY_MESSAGE, {
        errorAnalytics: {
          ...analytics,
          code: "unsupported_reply",
          message: REPLY_TEXT_ONLY_MESSAGE,
        },
      });

      return;
    }

    if (
      error instanceof ComposerSubmitError ||
      isModelUnavailable(error) ||
      error instanceof AppRequestError
    ) {
      toast.danger(error.message, {
        errorAnalytics: {
          ...analytics,
          message: error.message,
        },
      });

      return;
    }

    if (
      error instanceof ProjectContextSyncError ||
      error instanceof FollowUpConfirmationCancelledError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return;
    }

    log?.("[Composer] submit failed", {
      safe: { followUp: followUpType, mode: composerMode },
      sensitive: { cwd, error },
    });

    const primaryAction =
      composerMode === "cloud"
        ? undefined
        : viewDiagnosticsAction(diagnostics, {
            conversationId: conversationId ?? null,
            errorMessage: errorMessage(error),
            occurredAtMs: now(),
            operation:
              operation ??
              (conversationId === undefined || conversationId === null
                ? "startup"
                : "request_submission"),
            surface: "code",
          });

    const message =
      composerMode === "worktree"
        ? localSubmitMessage(error)
        : composerSubmitErrorMessage(error, composerMode);

    toast.danger(message, {
      errorAnalytics: { ...analytics, message },
      id: composerMode === "worktree" ? COMPOSER_TASK_ERROR_TOAST_ID : toastId,
      primaryAction,
    });
  };

export {
  AppHttpError,
  AppRequestError,
  browserTabMentionMessage,
  cloudSubmitMessage,
  COMPOSER_SUBMIT_ERROR_ANALYTICS,
  COMPOSER_TASK_ERROR_TOAST_ID,
  ComposerSubmitError,
  composerSubmitErrorMessage,
  createSubmitFailureHandler,
  errorMessage,
  FollowUpConfirmationCancelledError,
  isModelUnavailable,
  isRejectedNameError,
  localSubmitMessage,
  parseErrorDetail,
  PresentationSuggestionCloudUnsupportedError,
  ProjectContextSyncError,
  ReplyTextOnlyError,
  submitFailureMessage,
  threadReferenceMessage,
  worktreeStateMessage,
};

export type {
  ComposerSubmitMode,
  SubmitDiagnosticsHost,
  SubmitDiagnosticsReport,
  SubmitErrorEnvelope,
  SubmitFailureOptions,
};
