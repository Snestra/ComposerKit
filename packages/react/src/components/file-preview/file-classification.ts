/* oxlint-disable anti-slop/no-known-value-widening, eslint/complexity -- The tables are read with runtime file keys, and classifyByType and decideFileIcon keep their ordered rule lists one rule per branch. */

import { mountedFileProvider } from "./mounted-file-provider";

// File classification: by extension, by Google MIME type, by category and icon
// key, and by provider rules.

export type FileCategory =
  | "audio"
  | "code"
  | "document"
  | "file"
  | "html"
  | "image"
  | "pdf"
  | "presentation"
  | "spreadsheet";

export interface FileClassification {
  readonly category: FileCategory;
  readonly iconKey: string;
  readonly isImageLike: boolean;
  readonly key: string;
  readonly label: string;
}

export interface ClassifyInput {
  readonly fileName?: string | null;
  readonly isNote?: boolean;
  readonly kind?: string;
  readonly mimeType?: string | null;
  readonly sourceUrl?: string | null;
}

const presentationExtensions = new Set(["ppt", "pptx"]);
const keynoteExtensions = new Set(["key"]);
const sheetExtensions = new Set(["csv", "tsv", "xls", "xlsm", "xlsx"]);
const wordExtensions = new Set(["doc", "docx"]);

const textExtensions = new Set([
  "dotenv",
  "env",
  "gitignore",
  "lock",
  "markdown",
  "md",
  "mdown",
  "mdx",
  "mkd",
  "rtf",
  "txt",
]);

const audioExtensions = new Set([
  "aac",
  "aif",
  "aiff",
  "flac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "opus",
  "wav",
  "weba",
  "wma",
]);

const threeDExtensions = new Set([
  "3ds",
  "blend",
  "dae",
  "fbx",
  "glb",
  "gltf",
  "obj",
  "ply",
  "stl",
  "usdz",
]);

const codeExtensions = new Set(
  "bash.bazel.build.bzl.c.cc.cpp.cs.css.cxx.dockerfile.fish.gradle.go.h.hh.hpp.html.htm.ini.ipynb.java.js.jsonc.json.jsx.kt.less.lua.m.makefile.mjs.mk.mm.ninja.php.pl.ps1.py.rb.rs.scss.sass.sh.sql.swift.toml.ts.tsx.vue.xml.yaml.yml.zsh".split(
    "."
  )
);

const zipExtensions = new Set(["gz", "tar", "tgz", "zip"]);
const jpegExtensions = new Set(["jfif", "jpeg", "jpg"]);
const pngExtensions = new Set(["png"]);

const imageExtensions = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "jpg",
  "jpeg",
  "jfif",
  "png",
  "svg",
  "tif",
  "tiff",
  "webp",
]);

const videoExtensions = new Set([
  "3gp",
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  "wmv",
]);

const zipMimeTypes = new Set([
  "application/zip",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "application/x-zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

const codeByExtension: Readonly<
  Record<string, { iconKey: string; key: string }>
> = {
  c: { iconKey: "code", key: "cplusplus" },
  cc: { iconKey: "code", key: "cplusplus" },
  cpp: { iconKey: "code", key: "cplusplus" },
  h: { iconKey: "code", key: "cplusplus" },
  hpp: { iconKey: "code", key: "cplusplus" },
  htm: { iconKey: "html", key: "html" },
  html: { iconKey: "html", key: "html" },
  java: { iconKey: "code", key: "java" },
  js: { iconKey: "code", key: "javascript" },
  json: { iconKey: "code", key: "json" },
  jsx: { iconKey: "code", key: "react" },
  php: { iconKey: "code", key: "php" },
  py: { iconKey: "code", key: "python" },
  rs: { iconKey: "code", key: "rust" },
  ts: { iconKey: "code", key: "typescript" },
  tsx: { iconKey: "code", key: "react" },
};

const codeByMimeSubstring = [
  { info: { iconKey: "code", key: "typescript" }, substring: "typescript" },
  { info: { iconKey: "code", key: "javascript" }, substring: "javascript" },
  { info: { iconKey: "code", key: "python" }, substring: "python" },
  { info: { iconKey: "code", key: "json" }, substring: "json" },
  { info: { iconKey: "html", key: "html" }, substring: "html" },
] as const;

const googleMimeTypes: Readonly<Record<string, FileClassification>> = {
  "application/vnd.google-apps.document": {
    category: "document",
    iconKey: "google-docs",
    isImageLike: false,
    key: "doc",
    label: "DOC",
  },
  "application/vnd.google-apps.presentation": {
    category: "presentation",
    iconKey: "google-slides",
    isImageLike: false,
    key: "slides",
    label: "SLIDES",
  },
  "application/vnd.google-apps.spreadsheet": {
    category: "spreadsheet",
    iconKey: "google-sheets",
    isImageLike: false,
    key: "sheet",
    label: "SHEET",
  },
};

const googleUrlPrefixes = [
  ["https://docs.google.com/document", "application/vnd.google-apps.document"],
  [
    "https://docs.google.com/presentation",
    "application/vnd.google-apps.presentation",
  ],
  [
    "https://docs.google.com/spreadsheets",
    "application/vnd.google-apps.spreadsheet",
  ],
] as const;

const boxMimeTypes: Readonly<Record<string, string>> = {
  boxnote: "application/vnd.box.note",
  gdoc: "application/vnd.google-apps.document",
  gsheet: "application/vnd.google-apps.spreadsheet",
  gslides: "application/vnd.google-apps.presentation",
  pages: "application/vnd.apple.pages",
};

const googleHosts = new Set([
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "slides.google.com",
]);

const googleResourceIcons: Readonly<Record<string, string | undefined>> = {
  document: "google-docs",
  drive: undefined,
  presentation: "google-slides",
  spreadsheet: "google-sheets",
};

const SPACE = /\s/u;

/** True for a string that is neither missing nor empty. */
export const filled = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== "";

/** The lower-case extension of a file name, or null. */
export const fileExtension = (fileName: string | null | undefined) => {
  if (!filled(fileName)) {
    return null;
  }

  const trimmed = fileName.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const base = trimmed.slice(slash + 1);
  const dot = base.lastIndexOf(".");

  if (dot === 0 && base.length > 1) {
    return base.slice(1).toLowerCase();
  }

  if (dot === -1) {
    const lower = base.toLowerCase();

    return codeExtensions.has(lower) || textExtensions.has(lower)
      ? lower
      : null;
  }

  return dot === base.length - 1 ? null : base.slice(dot + 1).toLowerCase();
};

/** Google Workspace MIME types, from the MIME type or the source URL. */
export const googleClassification = (
  mimeType?: string | null,
  sourceUrl?: string | null
) => {
  const primary = mimeType?.split(";")[0]?.trim().toLowerCase();

  if (filled(primary)) {
    return googleMimeTypes[primary];
  }

  const matched = googleUrlPrefixes.find(
    ([prefix]) => sourceUrl?.startsWith(prefix) === true
  )?.[1];

  return matched === undefined ? undefined : googleMimeTypes[matched];
};

const make = (
  key: string,
  label: string,
  iconKey: string,
  category: FileCategory,
  isImageLike = false
): FileClassification => ({ category, iconKey, isImageLike, key, label });

const has = (set: ReadonlySet<string>, extension: string | null) =>
  extension !== null && set.has(extension);

const includesAny = (mime: string, parts: readonly string[]) =>
  parts.some((part) => mime.includes(part));

/** Category and icon key from the extension and MIME type. */
const classifyByType = ({
  fileName,
  isNote,
  kind,
  mimeType,
  sourceUrl,
}: ClassifyInput): FileClassification => {
  const google = googleClassification(mimeType, sourceUrl);

  if (google) {
    return google;
  }

  const extension = fileExtension(fileName);
  const mime = (mimeType ?? "").toLowerCase();
  const upper = filled(extension) ? extension.toUpperCase() : null;

  const rules: readonly (readonly [boolean, () => FileClassification])[] = [
    [
      extension === "pdf" || mime.includes("pdf"),
      () => make("pdf", "PDF", "pdf", "pdf"),
    ],
    [
      extension === "csv" || extension === "tsv" || mime.includes("csv"),
      () => make(extension ?? "csv", upper ?? "CSV", "csv", "spreadsheet"),
    ],
    [
      extension === "xls" ||
        extension === "xlsm" ||
        extension === "xlsx" ||
        includesAny(mime, ["excel", "spreadsheetml"]),
      () => make("sheet", upper ?? "SHEET", "xls", "spreadsheet"),
    ],
    [
      has(sheetExtensions, extension) ||
        includesAny(mime, ["spreadsheet", "csv"]),
      () => make("sheet", upper ?? "SHEET", "csv", "spreadsheet"),
    ],
    [
      has(presentationExtensions, extension) ||
        includesAny(mime, ["powerpoint", "presentationml"]),
      () => make(extension ?? "ppt", upper ?? "PPT", "ppt", "presentation"),
    ],
    [
      has(keynoteExtensions, extension) || mime.includes("presentation"),
      () =>
        make(
          extension ?? "slides",
          upper ?? "SLIDES",
          "slides",
          "presentation"
        ),
    ],
    [
      has(wordExtensions, extension) ||
        includesAny(mime, ["word", "officedocument.wordprocessingml.document"]),
      () => make("doc", upper ?? "DOC", "document", "document"),
    ],
    [
      has(threeDExtensions, extension) ||
        mime.startsWith("model/") ||
        includesAny(mime, ["x-3ds", "x-blender", "wavefront"]),
      () => make(extension ?? "3d", upper ?? "3D", "three-d", "file"),
    ],
  ];

  for (const [matches, build] of rules) {
    if (matches) {
      return build();
    }
  }

  const code =
    (filled(extension) ? codeByExtension[extension] : undefined) ??
    codeByMimeSubstring.find(({ substring }) => mime.includes(substring))?.info;

  if (code) {
    return make(
      extension ?? code.key,
      upper ?? "CODE",
      code.iconKey,
      code.iconKey === "html" ? "html" : "code"
    );
  }

  const tail: readonly (readonly [boolean, () => FileClassification])[] = [
    [
      has(codeExtensions, extension) ||
        includesAny(mime, [
          "javascript",
          "typescript",
          "python",
          "json",
          "xml",
        ]),
      () => make(extension ?? "code", upper ?? "CODE", "code", "code"),
    ],
    [
      isNote === true ||
        kind === "note" ||
        has(textExtensions, extension) ||
        mime.startsWith("text/"),
      () => make("doc", upper ?? "TEXT", "text", "document"),
    ],
    [
      has(zipExtensions, extension) || zipMimeTypes.has(mime),
      () => make("zip", "ZIP", "zip", "file"),
    ],
    [
      has(audioExtensions, extension) || mime.startsWith("audio/"),
      () => make(extension ?? "audio", upper ?? "AUDIO", "audio", "audio"),
    ],
    [
      extension === "mp4" || mime.startsWith("video/mp4"),
      () => make("mp4", "MP4", "file-video", "file"),
    ],
    [
      has(videoExtensions, extension) || mime.startsWith("video/"),
      () => make(extension ?? "video", upper ?? "VIDEO", "file-video", "file"),
    ],
    [
      has(jpegExtensions, extension) || mime === "image/jpeg",
      () => make(extension ?? "jpg", upper ?? "JPG", "photo", "image", true),
    ],
    [
      has(pngExtensions, extension) || mime === "image/png",
      () => make(extension ?? "png", upper ?? "PNG", "photo", "image", true),
    ],
    [
      has(imageExtensions, extension) || mime.startsWith("image/"),
      () =>
        make(extension ?? "image", upper ?? "IMAGE", "photo", "image", true),
    ],
  ];

  for (const [matches, build] of tail) {
    if (matches) {
      return build();
    }
  }

  return filled(extension)
    ? make(extension, upper ?? extension.toUpperCase(), "file", "file")
    : make("file", "FILE", "file", "file");
};

/** Adds the Figma and Microsoft Office brand icon keys. */
export const classifyFile = (input: ClassifyInput): FileClassification => {
  const google = googleClassification(input.mimeType);

  if (google) {
    return google;
  }

  const extension = fileExtension(input.fileName);
  const mime = (input.mimeType ?? "").toLowerCase();

  if (extension === "fig" || mime.includes("figma")) {
    return make("fig", "FIG", "figma-document", "file");
  }

  const base = classifyByType(input);

  const isOffice =
    mime.includes("officedocument") || mime.includes("ms-office");

  const plainOffice =
    base.category !== "document" &&
    base.category !== "presentation" &&
    base.category !== "spreadsheet";

  return isOffice && plainOffice
    ? {
        ...base,
        iconKey: "office-document",
        key: extension ?? "office",
        label: extension?.toUpperCase() ?? "OFFICE",
      }
    : base;
};

/** A Google Workspace link, only from an https host on the allow list. */
const googleResourceKind = (url: string) => {
  if (url !== url.trim() || url.includes("\\") || SPACE.test(url)) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const blocked =
    parsed.protocol !== "https:" ||
    !googleHosts.has(parsed.hostname) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "";

  if (blocked) {
    return null;
  }

  if (parsed.hostname === "docs.google.com") {
    if (parsed.pathname.startsWith("/document/")) {
      return "document";
    }

    if (parsed.pathname.startsWith("/spreadsheets/")) {
      return "spreadsheet";
    }

    return parsed.pathname.startsWith("/presentation/") ? "presentation" : null;
  }

  if (parsed.hostname === "sheets.google.com") {
    return "spreadsheet";
  }

  if (parsed.hostname === "slides.google.com") {
    return "presentation";
  }

  return parsed.hostname === "drive.google.com" ? "drive" : null;
};

export type FileIconDecision =
  | {
      readonly iconKey: string;
      readonly kind: "document";
      readonly provider?: string;
    }
  | {
      readonly brand: string;
      readonly kind: "brand";
      readonly provider: string;
    };

export interface FileIconInput {
  readonly fileExtension?: string | null;
  readonly fileName?: string | null;
  readonly libraryProvider?: string | null;
  readonly mountedLibraryFileId?: string | null;
  readonly mimeType?: string | null;
  readonly sourceMimeType?: string | null;
  readonly sourceUrl?: string | null;
}

const withExtension = (
  fileName: string | null | undefined,
  extension: string | null | undefined
) => {
  const cleaned = extension?.trim().replace(/^\.+/u, "");

  if (!filled(cleaned)) {
    return fileName ?? undefined;
  }

  const name = filled(fileName) ? fileName : "file";

  return fileExtension(name) === cleaned.toLowerCase()
    ? name
    : `${name}.${cleaned}`;
};

const primaryMime = (mime: string | null | undefined) =>
  mime?.split(";")[0]?.trim().toLowerCase();

/** The icon decision for a file, with its connected provider. */
export const decideFileIcon = ({
  fileExtension: extension,
  fileName,
  libraryProvider,
  mimeType,
  mountedLibraryFileId,
  sourceMimeType,
  sourceUrl,
}: FileIconInput): FileIconDecision => {
  const name = withExtension(fileName, extension);
  const provider = mountedFileProvider(libraryProvider, mountedLibraryFileId);

  if (
    provider === "google_drive" &&
    !filled(sourceMimeType) &&
    !googleClassification(mimeType) &&
    filled(sourceUrl)
  ) {
    const resource = googleResourceKind(sourceUrl);
    const iconKey = resource ? googleResourceIcons[resource] : undefined;

    if (filled(iconKey)) {
      return { iconKey, kind: "document", provider };
    }
  }

  const fromSource = filled(sourceMimeType)
    ? classifyFile({ mimeType: sourceMimeType })
    : undefined;

  const sourceIsSpecific =
    fromSource !== undefined && fromSource.iconKey !== "file";

  const nameExtension = fileExtension(name);

  const boxMime =
    provider === "box" && !sourceIsSpecific && nameExtension !== null
      ? boxMimeTypes[nameExtension]
      : undefined;

  const fromBox =
    boxMime === undefined
      ? undefined
      : (googleClassification(mimeType) ??
        classifyFile({ fileName: name, mimeType: boxMime }));

  const source = primaryMime(sourceMimeType);
  const own = primaryMime(mimeType);

  const chosen =
    sourceIsSpecific &&
    (source !== "text/plain" || (filled(own) && own !== source))
      ? fromSource
      : (fromBox ??
        classifyFile({
          fileName: name,
          mimeType: filled(sourceMimeType) ? sourceMimeType : mimeType,
        }));

  if (filled(provider) && provider !== "imanage" && chosen.iconKey === "file") {
    return { brand: provider, kind: "brand", provider };
  }

  return { iconKey: chosen.iconKey, kind: "document", provider };
};
