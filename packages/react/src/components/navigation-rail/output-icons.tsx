import {
  AppWindow,
  Atom,
  ClipboardCheck,
  Coffee,
  Cog,
  FileCode,
  FileCode2,
  FileCog,
  FileImage,
  FileJson,
  FileText,
  GitCommitHorizontal,
  GitPullRequest,
  Globe,
  Hammer,
  HardDrive,
  Hash,
  Image,
  NotebookText,
  Sparkles,
  SquareTerminal,
  Terminal,
} from "lucide-react";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const AppOutputIcon = (props: IconProps) => (
  <AppWindow width={16} height={16} strokeWidth={1.5} {...props} />
);

export const CommitOutputIcon = (props: IconProps) => (
  <GitCommitHorizontal width={20} height={20} strokeWidth={1.5} {...props} />
);

export const GoogleDriveOutputIcon = (props: IconProps) => (
  <HardDrive width={192} height={192} strokeWidth={1.5} {...props} />
);

export const ImageOutputIcon = (props: IconProps) => (
  <Image width={21} height={21} strokeWidth={1.5} {...props} />
);

export const PullRequestOutputIcon = (props: IconProps) => (
  <GitPullRequest width={20} height={20} strokeWidth={1.5} {...props} />
);

export const ReviewOutputIcon = (props: IconProps) => (
  <ClipboardCheck width={16} height={16} strokeWidth={1.5} {...props} />
);

export const WebsiteOutputIcon = (props: IconProps) => (
  <Globe width={20} height={20} strokeWidth={1.5} {...props} />
);

export const CodeFileIcon = (props: IconProps) => (
  <FileCode width={21} height={21} strokeWidth={1.5} {...props} />
);

export const DocumentFileIcon = (props: IconProps) => (
  <FileText width={10} height={10} strokeWidth={1.5} {...props} />
);

export const CssFileIcon = (props: IconProps) => (
  <FileCode width={16} height={16} strokeWidth={1.5} {...props} />
);

export const CplusplusFileIcon = (props: IconProps) => (
  <FileCode2 width={16} height={16} strokeWidth={1.5} {...props} />
);

export const HtmlFileIcon = (props: IconProps) => (
  <FileCode width={16} height={16} strokeWidth={1.5} {...props} />
);

export const JavaFileIcon = (props: IconProps) => (
  <Coffee width={16} height={16} strokeWidth={1.5} {...props} />
);

export const JavascriptFileIcon = (props: IconProps) => (
  <FileCode width={16} height={16} strokeWidth={1.5} {...props} />
);

export const ImageFileIcon = (props: IconProps) => (
  <FileImage width={20} height={21} strokeWidth={1.5} {...props} />
);

export const JsonFileIcon = (props: IconProps) => (
  <FileJson width={16} height={16} strokeWidth={1.5} {...props} />
);

export const NotebookFileIcon = (props: IconProps) => (
  <NotebookText width={20} height={21} strokeWidth={1.5} {...props} />
);

export const PdfFileIcon = (props: IconProps) => (
  <FileText width={24} height={24} strokeWidth={1.5} {...props} />
);

export const PhpFileIcon = (props: IconProps) => (
  <FileCode2 width={16} height={16} strokeWidth={1.5} {...props} />
);

export const PythonFileIcon = (props: IconProps) => (
  <FileCode2 width={16} height={16} strokeWidth={1.5} {...props} />
);

export const ReactFileIcon = (props: IconProps) => (
  <Atom width={16} height={16} strokeWidth={1.5} {...props} />
);

export const RustFileIcon = (props: IconProps) => (
  <Cog width={16} height={16} strokeWidth={1.5} {...props} />
);

export const ShellFileIcon = (props: IconProps) => (
  <SquareTerminal width={16} height={16} strokeWidth={1.5} {...props} />
);

export const SkillFileIcon = (props: IconProps) => (
  <Sparkles width={20} height={20} strokeWidth={1.5} {...props} />
);

export const BuildFileIcon = (props: IconProps) => (
  <Hammer width={16} height={16} strokeWidth={1.5} {...props} />
);

export const HashesFileIcon = (props: IconProps) => (
  <Hash width={16} height={16} strokeWidth={1.5} {...props} />
);

export const TerminalFileIcon = (props: IconProps) => (
  <Terminal width={20} height={20} strokeWidth={1.5} {...props} />
);

export const TypescriptFileIcon = (props: IconProps) => (
  <FileCode2 width={16} height={16} strokeWidth={1.5} {...props} />
);

export const TomlFileIcon = (props: IconProps) => (
  <FileCog width={20} height={20} strokeWidth={1.5} {...props} />
);
