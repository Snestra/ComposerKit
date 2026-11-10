import type {
  AttachmentPartState,
  ChatPartState,
  ChatStreamState,
  JsonObject,
  JsonValue,
  ReasoningPartState,
  ToolCallPartState,
} from "@workspace/react/lib/chat-part-state";

type ChatStreamProvider = "anthropic" | "openai" | "vercel";

/** One provider event, decoded at the boundary into the change it makes. */
type ChatStreamEvent =
  | { kind: "attachment"; mediaType: string; url: string }
  | { kind: "block-end"; key: string }
  | { kind: "fail"; message: string }
  | { kind: "finish" }
  | { kind: "ignored" }
  | { kind: "reasoning-delta"; delta: string; key: string }
  | { kind: "reasoning-end"; key: string; text?: string }
  | { kind: "reasoning-start"; key: string }
  | { kind: "start" }
  | { argumentsText?: string; key: string; kind: "tool-end"; name?: string }
  | { delta: string; key: string; kind: "tool-delta" }
  | { input: JsonValue; key: string; kind: "tool-input"; name: string }
  | { errorText?: string; key: string; kind: "tool-output"; output: JsonValue }
  | { id: string; key: string; kind: "tool-start"; name: string };

interface ChatStreamParser {
  finish: (state: ChatStreamState) => ChatStreamState;
  initialState: () => ChatStreamState;
  parse: (line: string) => ChatStreamEvent;
  step: (state: ChatStreamState, event: ChatStreamEvent) => ChatStreamState;
}

const EMPTY_OBJECT: JsonObject = {};
const IGNORED: ChatStreamEvent = { kind: "ignored" };
const UNNAMED_TOOL = "Tool call";
const URL_SUFFIX = /[?#]/u;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const JSON_TYPES = new Set(["boolean", "number", "object", "string"]);

const isJsonValue = (value: unknown): value is JsonValue =>
  JSON_TYPES.has(typeof value);

const isString = (value: JsonValue | undefined): value is string =>
  typeof value === "string";

const isNumber = (value: JsonValue | undefined): value is number =>
  typeof value === "number";

const textField = (object: JsonObject, key: string, fallback = ""): string => {
  const value = object[key];

  return isString(value) ? value : fallback;
};

const optionalTextField = (
  object: JsonObject,
  key: string
): string | undefined => {
  const value = object[key];

  return isString(value) ? value : undefined;
};

const objectField = (object: JsonObject, key: string): JsonObject => {
  const value = object[key];

  return isJsonObject(value) ? value : EMPTY_OBJECT;
};

const parseJsonObject = (line: string): JsonObject | undefined => {
  try {
    const value: unknown = JSON.parse(line);

    return isJsonObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const parseOpenAIEvent = (event: JsonObject): ChatStreamEvent => {
  const item = objectField(event, "item");
  const itemType = textField(item, "type");
  const itemId = textField(event, "item_id");

  switch (textField(event, "type")) {
    case "response.created": {
      return { kind: "start" };
    }

    case "response.output_item.added": {
      const id = textField(item, "id");

      if (itemType === "function_call") {
        return {
          id: textField(item, "call_id", id),
          key: id,
          kind: "tool-start",
          name: textField(item, "name", UNNAMED_TOOL),
        };
      }

      return itemType === "reasoning"
        ? { key: id, kind: "reasoning-start" }
        : IGNORED;
    }

    case "response.function_call_arguments.delta": {
      return {
        delta: textField(event, "delta"),
        key: itemId,
        kind: "tool-delta",
      };
    }

    case "response.function_call_arguments.done": {
      return {
        argumentsText: optionalTextField(event, "arguments"),
        key: itemId,
        kind: "tool-end",
      };
    }

    case "response.reasoning_summary_text.delta": {
      return {
        delta: textField(event, "delta"),
        key: itemId,
        kind: "reasoning-delta",
      };
    }

    case "response.reasoning_summary_text.done": {
      return {
        key: itemId,
        kind: "reasoning-end",
        text: optionalTextField(event, "text"),
      };
    }

    case "response.output_item.done": {
      return itemType === "function_call"
        ? {
            argumentsText: optionalTextField(item, "arguments"),
            key: textField(item, "id"),
            kind: "tool-end",
            name: optionalTextField(item, "name"),
          }
        : IGNORED;
    }

    case "response.failed": {
      const error = objectField(objectField(event, "response"), "error");

      return {
        kind: "fail",
        message: textField(error, "message", "The response failed."),
      };
    }

    case "response.incomplete": {
      const details = objectField(
        objectField(event, "response"),
        "incomplete_details"
      );

      return {
        kind: "fail",
        message: `The response is incomplete. ${textField(details, "reason", "No reason was given.")}`,
      };
    }

    case "error": {
      return {
        kind: "fail",
        message: textField(event, "message", "The response stream failed."),
      };
    }

    case "response.completed": {
      return { kind: "finish" };
    }

    default: {
      return IGNORED;
    }
  }
};

const anthropicBlockKey = (event: JsonObject): string => {
  const { index } = event;

  return isNumber(index) ? String(index) : "";
};

const parseAnthropicEvent = (event: JsonObject): ChatStreamEvent => {
  const key = anthropicBlockKey(event);
  const block = objectField(event, "content_block");
  const blockType = textField(block, "type");
  const delta = objectField(event, "delta");
  const deltaType = textField(delta, "type");

  switch (textField(event, "type")) {
    case "message_start": {
      return { kind: "start" };
    }

    case "content_block_start": {
      if (blockType === "tool_use" || blockType === "server_tool_use") {
        return {
          id: textField(block, "id", `tool-${key}`),
          key,
          kind: "tool-start",
          name: textField(block, "name", UNNAMED_TOOL),
        };
      }

      return blockType === "thinking"
        ? { key, kind: "reasoning-start" }
        : IGNORED;
    }

    case "content_block_delta": {
      if (deltaType === "input_json_delta") {
        return {
          delta: textField(delta, "partial_json"),
          key,
          kind: "tool-delta",
        };
      }

      return deltaType === "thinking_delta"
        ? { delta: textField(delta, "thinking"), key, kind: "reasoning-delta" }
        : IGNORED;
    }

    case "content_block_stop": {
      return { key, kind: "block-end" };
    }

    case "error": {
      return {
        kind: "fail",
        message: textField(
          objectField(event, "error"),
          "message",
          "The message stream failed."
        ),
      };
    }

    case "message_stop": {
      return { kind: "finish" };
    }

    default: {
      return IGNORED;
    }
  }
};

const parseVercelEvent = (event: JsonObject): ChatStreamEvent => {
  const key = textField(event, "toolCallId", textField(event, "id"));

  switch (textField(event, "type")) {
    case "start": {
      return { kind: "start" };
    }

    case "reasoning-start": {
      return { key, kind: "reasoning-start" };
    }

    case "reasoning-delta": {
      return { delta: textField(event, "delta"), key, kind: "reasoning-delta" };
    }

    case "reasoning-end": {
      return { key, kind: "reasoning-end" };
    }

    case "tool-input-start": {
      return {
        id: key,
        key,
        kind: "tool-start",
        name: textField(event, "toolName", UNNAMED_TOOL),
      };
    }

    case "tool-input-delta": {
      return {
        delta: textField(event, "inputTextDelta"),
        key,
        kind: "tool-delta",
      };
    }

    case "tool-input-available": {
      return {
        input: event.input ?? null,
        key,
        kind: "tool-input",
        name: textField(event, "toolName", UNNAMED_TOOL),
      };
    }

    case "tool-input-error": {
      return {
        errorText: textField(
          event,
          "errorText",
          "The tool input was rejected."
        ),
        key,
        kind: "tool-output",
        output: null,
      };
    }

    case "tool-output-available": {
      return { key, kind: "tool-output", output: event.output ?? null };
    }

    case "tool-output-error": {
      return {
        errorText: textField(event, "errorText", "The tool call failed."),
        key,
        kind: "tool-output",
        output: event.output ?? null,
      };
    }

    case "file": {
      return {
        kind: "attachment",
        mediaType: textField(event, "mediaType", "application/octet-stream"),
        url: textField(event, "url"),
      };
    }

    case "abort": {
      return {
        kind: "fail",
        message: `The stream was cancelled. ${textField(event, "reason", "No reason was given.")}`,
      };
    }

    case "error": {
      return {
        kind: "fail",
        message: textField(event, "errorText", "The message stream failed."),
      };
    }

    case "finish": {
      return { kind: "finish" };
    }

    default: {
      return IGNORED;
    }
  }
};

const EVENT_PARSERS = {
  anthropic: parseAnthropicEvent,
  openai: parseOpenAIEvent,
  vercel: parseVercelEvent,
} as const;

/** Decodes one raw JSONL line. A line that is not a JSON object, such as the `"[DONE]"` sentinel, changes nothing. */
const parseChatStreamLine = (
  provider: ChatStreamProvider,
  line: string
): ChatStreamEvent => {
  const event = parseJsonObject(line);

  return event === undefined ? IGNORED : EVENT_PARSERS[provider](event);
};

const initialChatStreamState = (): ChatStreamState => ({
  attempt: 0,
  parts: [],
});

const isActive = (part: ChatPartState): boolean =>
  part.status === "pending" || part.status === "streaming";

const putPart = (
  state: ChatStreamState,
  part: ChatPartState
): ChatStreamState => ({
  ...state,
  parts: [
    ...state.parts.filter((candidate) => candidate.key !== part.key),
    part,
  ],
});

const findPart = (
  state: ChatStreamState,
  key: string
): ChatPartState | undefined => state.parts.find((part) => part.key === key);

const newTool = (key: string, id: string, name: string): ToolCallPartState => ({
  argumentsText: "",
  id,
  key,
  kind: "tool",
  name,
  outputText: "",
  status: "pending",
});

const toolPart = (
  state: ChatStreamState,
  key: string,
  name = UNNAMED_TOOL
): ToolCallPartState => {
  const part = findPart(state, key);

  return part?.kind === "tool" ? part : newTool(key, key, name);
};

const newReasoning = (key: string): ReasoningPartState => ({
  id: key,
  key,
  kind: "reasoning",
  status: "pending",
  text: "",
});

const reasoningPart = (
  state: ChatStreamState,
  key: string
): ReasoningPartState => {
  const part = findPart(state, key);

  return part?.kind === "reasoning" ? part : newReasoning(key);
};

const parseArguments = (
  part: ToolCallPartState,
  argumentsText: string
): ToolCallPartState => {
  try {
    const input: unknown = JSON.parse(argumentsText);

    return {
      ...part,
      argumentsText,
      input: isJsonValue(input) ? input : null,
      status: "done",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON.";

    return {
      ...part,
      argumentsText,
      error: `The tool arguments are not valid JSON. ${detail}`,
      status: "error",
    };
  }
};

const appendToolDelta = (
  state: ChatStreamState,
  key: string,
  delta: string
): ChatStreamState => {
  const part = toolPart(state, key);

  return isActive(part)
    ? putPart(state, {
        ...part,
        argumentsText: part.argumentsText + delta,
        status: "streaming",
      })
    : state;
};

const endTool = (
  state: ChatStreamState,
  key: string,
  argumentsText?: string,
  name?: string
): ChatStreamState => {
  const part = toolPart(state, key, name);

  if (part.status === "error") {
    return state;
  }

  return putPart(
    state,
    parseArguments(
      { ...part, name: name ?? part.name },
      argumentsText ?? part.argumentsText
    )
  );
};

const formatJson = (value: JsonValue): string => JSON.stringify(value, null, 2);

const setToolInput = (
  state: ChatStreamState,
  key: string,
  name: string,
  input: JsonValue
): ChatStreamState => {
  const part = toolPart(state, key, name);

  return putPart(state, {
    ...part,
    argumentsText: formatJson(input),
    input,
    name,
    status: "done",
  });
};

const setToolOutput = (
  state: ChatStreamState,
  key: string,
  output: JsonValue,
  errorText?: string
): ChatStreamState => {
  const part = toolPart(state, key);
  const outputText = output === null ? "" : formatJson(output);

  if (errorText !== undefined) {
    return putPart(state, {
      ...part,
      error: errorText,
      outputText,
      status: "error",
    });
  }

  return putPart(state, { ...part, outputText });
};

const appendReasoningDelta = (
  state: ChatStreamState,
  key: string,
  delta: string
): ChatStreamState => {
  const part = reasoningPart(state, key);

  return isActive(part)
    ? putPart(state, { ...part, status: "streaming", text: part.text + delta })
    : state;
};

const endReasoning = (
  state: ChatStreamState,
  key: string,
  text?: string
): ChatStreamState => {
  const part = reasoningPart(state, key);

  return part.status === "error"
    ? state
    : putPart(state, { ...part, status: "done", text: text ?? part.text });
};

const endBlock = (state: ChatStreamState, key: string): ChatStreamState => {
  const part = findPart(state, key);

  if (part?.kind === "tool") {
    return endTool(state, key);
  }

  return part?.kind === "reasoning" ? endReasoning(state, key) : state;
};

const attachmentName = (url: string): string => {
  const [path = ""] = url.split(URL_SUFFIX);
  const name = path.split("/").findLast((segment) => segment !== "");

  return name ?? "";
};

const addAttachment = (
  state: ChatStreamState,
  url: string,
  mediaType: string
): ChatStreamState => {
  const sequence = state.parts.filter(
    (part) => part.kind === "attachment"
  ).length;

  const key = `attachment-${state.attempt}-${sequence}`;
  const base = { id: url, key, kind: "attachment", mediaType } as const;

  if (url === "") {
    const part: AttachmentPartState = {
      ...base,
      error: "The file event has no URL.",
      name: "",
      status: "error",
    };

    return putPart(state, part);
  }

  return putPart(state, {
    ...base,
    name: attachmentName(url),
    status: "done",
    url,
  });
};

const failActiveParts = (
  state: ChatStreamState,
  message: string
): ChatStreamState => ({
  ...state,
  parts: state.parts.map((part) =>
    isActive(part) ? { ...part, error: message, status: "error" } : part
  ),
});

/** Ends the stream. A part still pending or streaming never completed, so it fails. */
const finishChatStream = (state: ChatStreamState): ChatStreamState =>
  failActiveParts(state, "The stream ended before this part completed.");

const reduceChatStream = (
  state: ChatStreamState,
  event: ChatStreamEvent
): ChatStreamState => {
  switch (event.kind) {
    case "start": {
      return { attempt: state.attempt + 1, parts: [] };
    }

    case "tool-start": {
      return putPart(state, newTool(event.key, event.id, event.name));
    }

    case "tool-delta": {
      return appendToolDelta(state, event.key, event.delta);
    }

    case "tool-end": {
      return endTool(state, event.key, event.argumentsText, event.name);
    }

    case "tool-input": {
      return setToolInput(state, event.key, event.name, event.input);
    }

    case "tool-output": {
      return setToolOutput(state, event.key, event.output, event.errorText);
    }

    case "reasoning-start": {
      return putPart(state, newReasoning(event.key));
    }

    case "reasoning-delta": {
      return appendReasoningDelta(state, event.key, event.delta);
    }

    case "reasoning-end": {
      return endReasoning(state, event.key, event.text);
    }

    case "block-end": {
      return endBlock(state, event.key);
    }

    case "attachment": {
      return addAttachment(state, event.url, event.mediaType);
    }

    case "fail": {
      return failActiveParts(state, event.message);
    }

    case "finish": {
      return finishChatStream(state);
    }

    case "ignored": {
      return state;
    }

    default: {
      return state;
    }
  }
};

const createChatStreamParser = (
  provider: ChatStreamProvider
): ChatStreamParser => ({
  finish: finishChatStream,
  initialState: initialChatStreamState,
  parse: (line) => parseChatStreamLine(provider, line),
  step: reduceChatStream,
});

/** Replays raw JSONL lines and returns the parts after the first `count` lines. The stream finishes once every line has played. */
const replayChatStream = (
  provider: ChatStreamProvider,
  lines: readonly string[],
  count = lines.length
): ChatStreamState => {
  const parser = createChatStreamParser(provider);
  let state = parser.initialState();

  for (const line of lines.slice(0, count)) {
    state = parser.step(state, parser.parse(line));
  }

  return count >= lines.length ? parser.finish(state) : state;
};

export {
  createChatStreamParser,
  finishChatStream,
  initialChatStreamState,
  parseChatStreamLine,
  reduceChatStream,
  replayChatStream,
};

export type { ChatStreamEvent, ChatStreamParser, ChatStreamProvider };
