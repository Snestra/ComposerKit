/* The diff's four-worker tokenizer pool and 100-entry result cache. */

import type { RoleLines } from "./syntax-highlight";
import type { TokenizeRequest, TokenizeResponse } from "./syntax-worker";

const POOL_SIZE = 4;
const CACHE_SIZE = 100;

interface Pending {
  reject: (error: Error) => void;
  request: TokenizeRequest;
  resolve: (lines: RoleLines | null) => void;
}

interface Slot {
  listeners: AbortController;
  pending?: Pending;
  worker: Worker;
}

const queue: Pending[] = [];
const cache = new Map<string, RoleLines | null>();
let slots: Slot[] = [];
let nextId = 0;

const remember = (key: string, lines: RoleLines | null) => {
  cache.delete(key);
  cache.set(key, lines);

  if (cache.size > CACHE_SIZE) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
};

const failPool = (error: Error) => {
  for (const slot of slots) {
    slot.listeners.abort();
    slot.worker.terminate();
    slot.pending?.reject(error);
  }

  slots = [];

  for (const pending of queue.splice(0)) {
    pending.reject(error);
  }
};

const pump = () => {
  for (const slot of slots) {
    if (slot.pending) {
      continue;
    }

    const pending = queue.shift();

    if (!pending) {
      break;
    }

    slot.pending = pending;

    try {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker.postMessage takes no target origin.
      slot.worker.postMessage(pending.request);
    } catch (error) {
      failPool(error instanceof Error ? error : new Error(String(error)));

      return;
    }
  }
};

const createPool = () => {
  try {
    for (let index = 0; index < POOL_SIZE; index += 1) {
      const worker = new Worker(
        // oxlint-disable-next-line unicorn/relative-url-style -- Bundlers require a relative module path.
        new URL("./syntax-worker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      const listeners = new AbortController();
      const slot: Slot = { listeners, worker };
      slots.push(slot);
      worker.addEventListener(
        "message",
        (event: MessageEvent<TokenizeResponse>) => {
          const { pending } = slot;

          if (!pending || event.data.id !== pending.request.id) {
            failPool(new Error("Unexpected tokenizer worker response"));

            return;
          }

          slot.pending = undefined;

          if (event.data.error === undefined) {
            pending.resolve(event.data.lines);
          } else {
            pending.reject(new Error(event.data.error));
          }

          pump();
        },
        { signal: listeners.signal }
      );

      worker.addEventListener(
        "error",
        (event) => {
          failPool(new Error(event.message || "Tokenizer worker failed"));
        },
        { signal: listeners.signal }
      );

      worker.addEventListener(
        "messageerror",
        () => {
          failPool(new Error("Tokenizer worker message could not be read"));
        },
        { signal: listeners.signal }
      );
    }
  } catch (error) {
    failPool(error instanceof Error ? error : new Error(String(error)));
  }
};

/** The role lines of a document, or null when Prism has no grammar for the language. */
export const requestRoleLines = async (
  contents: string,
  language: string,
  tokenizeMaxLineLength: number
): Promise<RoleLines | null> => {
  const key = `${language}\u0000${tokenizeMaxLineLength}\u0000${contents}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    remember(key, cached);

    return cached;
  }

  nextId += 1;

  // oxlint-disable-next-line promise/avoid-new -- Workers answer requests asynchronously.
  return await new Promise((resolve, reject) => {
    queue.push({
      reject,
      request: { contents, id: nextId, language, tokenizeMaxLineLength },
      resolve: (lines) => {
        remember(key, lines);
        resolve(lines);
      },
    });

    if (slots.length === 0) {
      createPool();
    }

    pump();
  });
};
