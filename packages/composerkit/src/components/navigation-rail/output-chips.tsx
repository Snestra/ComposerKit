import { FolderIcon } from "composerkit/components/navigation-rail/icons";
import {
  AppOutputIcon,
  BuildFileIcon,
  CodeFileIcon,
  CommitOutputIcon,
  CplusplusFileIcon,
  CssFileIcon,
  DocumentFileIcon,
  GoogleDriveOutputIcon,
  HashesFileIcon,
  HtmlFileIcon,
  ImageFileIcon,
  ImageOutputIcon,
  JavaFileIcon,
  JavascriptFileIcon,
  JsonFileIcon,
  NotebookFileIcon,
  PdfFileIcon,
  PhpFileIcon,
  PullRequestOutputIcon,
  PythonFileIcon,
  ReactFileIcon,
  ReviewOutputIcon,
  RustFileIcon,
  ShellFileIcon,
  SkillFileIcon,
  TerminalFileIcon,
  TomlFileIcon,
  TypescriptFileIcon,
  WebsiteOutputIcon,
} from "composerkit/components/navigation-rail/output-icons";
import { createElement } from "react";
import type { ComponentType, SVGProps } from "react";

/*
 * The outputs row of the navigation rail preview: its chip, the chip icon and
 * label, and the file icon table.
 */

/** Chips shown before the rest collapse into a count. */
const MAX_OUTPUT_CHIPS = 2;

type NavigationRailOutputType =
  | "app"
  | "commit"
  | "file"
  | "google-drive"
  | "image"
  | "pull-request"
  | "review"
  | "website";

interface NavigationRailOutput {
  label?: string | null;
  type: NavigationRailOutputType;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** The label of an output without one. */
const FALLBACK_LABELS: Record<NavigationRailOutputType, string> = {
  app: "App preview",
  commit: "Commit",
  file: "File",
  "google-drive": "Google Drive",
  image: "Image",
  "pull-request": "Pull request",
  review: "Review",
  website: "Web preview",
};

const CHIP_ICON_CLASS = "size-[18px] shrink-0";

type FileIconKey =
  | "build"
  | "code"
  | "cplusplus"
  | "css"
  | "document"
  | "folder"
  | "hashes"
  | "html"
  | "image"
  | "java"
  | "javascript"
  | "json"
  | "notebook"
  | "pdf"
  | "php"
  | "python"
  | "react"
  | "rust"
  | "shell"
  | "skill"
  | "terminal"
  | "toml"
  | "typescript";

/*
 * The keys `artifactDocument`, `spreadsheet` and `presentation`
 * render the app's brand file artwork, which this library doesn't carry, so
 * they and `file` and `yaml` share the document icon.
 */
const FILE_ICONS: Record<FileIconKey, IconComponent> = {
  build: BuildFileIcon,
  code: CodeFileIcon,
  cplusplus: CplusplusFileIcon,
  css: CssFileIcon,
  document: DocumentFileIcon,
  folder: FolderIcon,
  hashes: HashesFileIcon,
  html: HtmlFileIcon,
  image: ImageFileIcon,
  java: JavaFileIcon,
  javascript: JavascriptFileIcon,
  json: JsonFileIcon,
  notebook: NotebookFileIcon,
  pdf: PdfFileIcon,
  php: PhpFileIcon,
  python: PythonFileIcon,
  react: ReactFileIcon,
  rust: RustFileIcon,
  shell: ShellFileIcon,
  skill: SkillFileIcon,
  terminal: TerminalFileIcon,
  toml: TomlFileIcon,
  typescript: TypescriptFileIcon,
};

/** Whole file names with their own icon. */
const FILE_NAME_KEYS = new Map<string, FileIconKey>([["skill.md", "skill"]]);

/** Extension to icon key. */
const EXTENSION_KEYS = new Map<string, FileIconKey>(
  (
    [
      ["typescript", ["ts"]],
      ["react", ["tsx", "jsx"]],
      ["javascript", ["js", "mjs", "cjs", "hs"]],
      ["python", ["py"]],
      ["java", ["java"]],
      ["rust", ["rs"]],
      ["php", ["php"]],
      ["css", ["css", "scss", "less", "sass"]],
      ["cplusplus", ["cpp", "cxx", "cc", "c", "hpp", "hh", "h"]],
      ["code", ["rb", "go", "kt", "swift", "m", "mm", "cs", "sql"]],
      ["json", ["json", "jsonc"]],
      ["document", ["md", "mdx", "markdown", "mkd", "mdown"]],
      ["html", ["html", "htm"]],
      ["document", ["yaml", "yml"]],
      ["toml", ["toml"]],
      ["document", ["xml"]],
      ["document", ["csv", "tsv", "xls", "xlsm", "xlsx"]],
      ["document", ["doc", "docx"]],
      ["notebook", ["ipynb"]],
      ["document", ["ppt", "pptx"]],
      ["shell", ["sh", "bash", "zsh", "fish", "ps1"]],
      ["terminal", ["dockerfile"]],
      ["document", ["env", "dotenv", "gitignore", "lock"]],
      ["image", ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"]],
      ["build", ["build", "bazel", "bzl", "ninja", "gradle", "mk", "makefile"]],
      ["hashes", ["sha", "sha1", "sha256", "md5", "checksum", "sum"]],
      ["pdf", ["pdf"]],
      ["folder", ["zip", "gz", "tgz", "tar"]],
    ] as const satisfies readonly (readonly [FileIconKey, readonly string[]])[]
  ).flatMap(([key, extensions]) =>
    extensions.map((extension) => [extension, key] as const)
  )
);

const TRAILING_SLASH = /[\\/]$/u;

/** The lowercased last path segment. */
const baseName = (path: string) => {
  const lower = path.toLowerCase();

  return lower.slice(
    Math.max(lower.lastIndexOf("/"), lower.lastIndexOf("\\")) + 1
  );
};

/** The extension, or the whole name when it has no dot. */
const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");

  if (dot > 0 && dot < name.length - 1) {
    return name.slice(dot + 1);
  }

  if (dot === 0 && name.length > 1) {
    return name.slice(1);
  }

  return dot === -1 ? name : null;
};

/**
 * The icon for a label alone. Names the tables miss get the file icon.
 */
const fileIconKeyOf = (label: string | null | undefined): FileIconKey => {
  if (label === null || label === undefined || label === "") {
    return "document";
  }

  if (TRAILING_SLASH.test(label)) {
    return "folder";
  }

  const name = baseName(label);
  const extension = extensionOf(name);

  return (
    FILE_NAME_KEYS.get(name) ??
    (extension === null ? undefined : EXTENSION_KEYS.get(extension)) ??
    "document"
  );
};

const CHIP_ICONS: Record<
  Exclude<NavigationRailOutputType, "file">,
  { className: string; icon: IconComponent }
> = {
  app: {
    className: `${CHIP_ICON_CLASS} text-chart-blue`,
    icon: AppOutputIcon,
  },
  commit: { className: CHIP_ICON_CLASS, icon: CommitOutputIcon },
  "google-drive": { className: CHIP_ICON_CLASS, icon: GoogleDriveOutputIcon },
  image: { className: CHIP_ICON_CLASS, icon: ImageOutputIcon },
  "pull-request": { className: CHIP_ICON_CLASS, icon: PullRequestOutputIcon },
  review: { className: CHIP_ICON_CLASS, icon: ReviewOutputIcon },
  website: { className: CHIP_ICON_CLASS, icon: WebsiteOutputIcon },
};

const outputIcon = (output: NavigationRailOutput) => {
  if (output.type === "file") {
    return createElement(FILE_ICONS[fileIconKeyOf(output.label)], {
      className: CHIP_ICON_CLASS,
    });
  }

  const { className, icon } = CHIP_ICONS[output.type];

  return createElement(icon, { className });
};

const NavigationRailOutputChip = ({
  output,
}: {
  output: NavigationRailOutput;
}) => (
  <span className="flex min-w-0 items-center gap-1.5">
    {outputIcon(output)}
    <span className="max-w-36 truncate">
      {output.label ?? FALLBACK_LABELS[output.type]}
    </span>
  </span>
);

/** The outputs row of the preview card: two chips, then the count of the rest. */
const NavigationRailOutputs = ({
  outputs,
}: {
  outputs: readonly NavigationRailOutput[];
}) => {
  if (outputs.length === 0) {
    return null;
  }

  const hidden = outputs.length - MAX_OUTPUT_CHIPS;

  return (
    <div
      className="mt-2 flex min-w-0 items-center gap-3 text-text-subtle"
      data-user-message-navigation-outputs
    >
      {outputs.slice(0, MAX_OUTPUT_CHIPS).map((output, index) => (
        <NavigationRailOutputChip
          key={`${output.type}:${output.label ?? index}`}
          output={output}
        />
      ))}
      {hidden > 0 ? (
        <span className="shrink-0 tabular-nums">{`+${hidden}`}</span>
      ) : null}
    </div>
  );
};

export { NavigationRailOutputs };

export type { NavigationRailOutput, NavigationRailOutputType };
