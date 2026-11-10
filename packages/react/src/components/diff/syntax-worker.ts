/*
 * The tokenizer worker. It runs in a module worker, loads the Prism grammar a request names,
 * tokenizes the document and posts the role lines back.
 */

import { loadLanguage, tokenizeRoles } from "./syntax-highlight";
import type { RoleLines } from "./syntax-highlight";

export interface TokenizeRequest {
  contents: string;
  id: number;
  language: string;
  tokenizeMaxLineLength: number;
}

export interface TokenizeResponse {
  error?: string;
  id: number;
  lines: RoleLines | null;
}

const handle = async ({
  contents,
  id,
  language,
  tokenizeMaxLineLength,
}: TokenizeRequest) => {
  const response: TokenizeResponse = { id, lines: null };

  try {
    if (await loadLanguage(language)) {
      response.lines =
        tokenizeRoles(contents, language, tokenizeMaxLineLength) ?? null;
    }
  } catch (error) {
    response.error = error instanceof Error ? error.message : String(error);
  }

  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker scope postMessage takes no target origin.
  self.postMessage(response);
};

self.addEventListener("message", (event: MessageEvent<TokenizeRequest>) => {
  handle(event.data).catch(console.error);
});
