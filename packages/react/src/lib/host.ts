export const HOST_ORIGIN = globalThis.location?.origin ?? "http://localhost";
export const HOST_AUTH_HEADER = "X-ComposerKit-Attach-Auth";

export const ATTACHMENT_CONTENT_PATHS = [
  "/backend-api/estuary/content",
  "/backend-api/estuary/public_content/enc",
] as const;

export const ATTACHMENT_CONTENT_URL = new URL(
  ATTACHMENT_CONTENT_PATHS[0],
  HOST_ORIGIN
).href;
