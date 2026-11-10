/* oxlint-disable eslint/complexity, eslint/no-control-regex, eslint/prefer-named-capture-group -- The provider parser keeps its validation rules in one pass. */

const providers = new Set([
  "box",
  "dropbox",
  "google_drive",
  "sharepoint",
  "onedrive",
  "imanage",
]);

const externalId =
  /^external-([a-z0-9][a-z0-9-]*):(?:account:((?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+):)?(?:(file|folder|collection):(\S+)|root)$/u;

const googleId = /^[A-Za-z0-9_-]{5,512}$/u;
const encodedComponent = /^[A-Za-z0-9_-]{1,683}$/u;
const decodedComponent = /^[A-Za-z0-9._!~:-]{1,512}$/u;

const validAccount = (value: string, strict: boolean) => {
  if (value.length === 0 || value.length > 1536) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(value);

    const encoded = encodeURIComponent(decoded).replaceAll(
      /[!'()*]/gu,
      (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`
    );

    return (
      decoded.length > 0 &&
      (strict
        ? !/^\p{White_Space}|\p{White_Space}$/u.test(decoded)
        : decoded === decoded.trim()) &&
      !/[\u0000-\u001F\u007F]/u.test(decoded) &&
      new TextEncoder().encode(decoded).length <= 512 &&
      encoded === value
    );
  } catch {
    return false;
  }
};

const validBase64 = (value: string) => {
  if (!encodedComponent.test(value)) {
    return false;
  }

  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));

    return (
      decodedComponent.test(decoded) &&
      btoa(decoded)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/[=]+$/u, "") === value
    );
  } catch {
    return false;
  }
};

const fromExternalId = (id: string): string | undefined => {
  if (id.startsWith("external-imanage:")) {
    const match = /^external-imanage:[a-f0-9]{64}:document:([^:]+)$/u.exec(id);

    if (match?.[1] !== undefined && validAccount(match[1], true)) {
      return /^[^!]+![0-9]+\.[0-9]+$/u.test(decodeURIComponent(match[1]))
        ? "imanage"
        : undefined;
    }

    return undefined;
  }

  if (id.startsWith("external-onedrive:file:v3:")) {
    const parts = id.split(":");

    return id.length <= 2100 &&
      parts.length === 7 &&
      (parts[3] === "personal" || parts[3] === "business") &&
      parts.slice(4).every(validBase64)
      ? "onedrive"
      : undefined;
  }

  const match = externalId.exec(id);

  if (!match) {
    return undefined;
  }

  const [, slug, account, kind, nativeId] = match;

  if (!slug || kind !== "file" || !nativeId) {
    return undefined;
  }

  const strict = slug === "box" || slug === "dropbox" || slug === "sharepoint";

  if (
    account !== undefined &&
    !(slug === "gdrive"
      ? /^[A-Za-z0-9_-]+$/u.test(account)
      : validAccount(account, strict))
  ) {
    return undefined;
  }

  if (
    account !== undefined &&
    strict &&
    (new TextEncoder().encode(id).length > 4096 ||
      new TextEncoder().encode(nativeId).length > 2048 ||
      /[\u0000-\u001F\u007F]/u.test(nativeId))
  ) {
    return undefined;
  }

  if (slug === "sharepoint") {
    const parts = nativeId.startsWith("v1:item:")
      ? nativeId.slice(8).split(":")
      : [];

    return parts.length === 2 && parts.every(validBase64)
      ? "sharepoint"
      : undefined;
  }

  if (nativeId.length > 512) {
    return undefined;
  }

  if (slug === "box" && /^[1-9][0-9]*$/u.test(nativeId)) {
    return "box";
  }

  if (
    slug === "dropbox" &&
    nativeId.length <= 256 &&
    /^id:[A-Za-z0-9_:-]+$/u.test(nativeId)
  ) {
    return "dropbox";
  }

  if (slug === "gdrive" && googleId.test(nativeId)) {
    return "google_drive";
  }

  return undefined;
};

export const mountedFileProvider = (
  libraryProvider?: string | null,
  mountedLibraryFileId?: string | null
) => {
  const id =
    mountedLibraryFileId?.startsWith("file-library:") === true
      ? mountedLibraryFileId.slice(13)
      : mountedLibraryFileId;

  if (id?.startsWith("external-") === true) {
    const provider = fromExternalId(id);

    return libraryProvider === null ||
      libraryProvider === undefined ||
      libraryProvider === provider
      ? provider
      : undefined;
  }

  return libraryProvider !== null &&
    libraryProvider !== undefined &&
    providers.has(libraryProvider)
    ? libraryProvider
    : undefined;
};
