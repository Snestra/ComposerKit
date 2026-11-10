type JsonValue =
  | boolean
  | number
  | string
  | null
  | readonly JsonValue[]
  | JsonObject;

interface JsonObject {
  readonly [key: string]: JsonValue;
}

interface PendingOrStreaming {
  status: "pending" | "streaming";
}

interface Failed {
  error: string;
  status: "error";
}

interface PartIdentity {
  id: string;
  key: string;
}

interface ToolCallFields extends PartIdentity {
  argumentsText: string;
  kind: "tool";
  name: string;
  outputText: string;
}

type ToolCallPartState = ToolCallFields &
  (
    | PendingOrStreaming
    | Failed
    | {
        input: JsonValue;
        status: "done";
      }
  );

interface ReasoningFields extends PartIdentity {
  kind: "reasoning";
  text: string;
}

type ReasoningPartState = ReasoningFields &
  (PendingOrStreaming | Failed | { status: "done" });

interface AttachmentFields extends PartIdentity {
  kind: "attachment";
  mediaType: string;
  name: string;
  size?: number;
}

type AttachmentPartState = AttachmentFields &
  (
    | (PendingOrStreaming & { url?: string })
    | (Failed & { url?: string })
    | { status: "done"; url: string }
  );

type ChatPartState =
  | ToolCallPartState
  | ReasoningPartState
  | AttachmentPartState;

interface ChatStreamState {
  attempt: number;
  parts: readonly ChatPartState[];
}

type ChatPartStatus = ChatPartState["status"];

const chatPartStatusLabels: Record<ChatPartStatus, string> = {
  done: "Done",
  error: "Failed",
  pending: "Waiting",
  streaming: "Streaming",
};

const chatPartStatusClassNames: Record<ChatPartStatus, string> = {
  done: "text-text-positive",
  error: "text-text-error",
  pending: "text-text-muted",
  streaming: "text-text-notice",
};

export { chatPartStatusClassNames, chatPartStatusLabels };

export type {
  ChatPartStatus,
  AttachmentPartState,
  ChatPartState,
  ChatStreamState,
  JsonObject,
  JsonValue,
  ReasoningPartState,
  ToolCallPartState,
};
