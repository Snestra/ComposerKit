import {
  CalendarDays,
  Cloud,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitFork,
  Globe,
  HardDrive,
  ListTodo,
  Mail,
  MessagesSquare,
  NotebookText,
  PenTool,
  Presentation,
  Sheet,
  Wallet,
} from "lucide-react";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const FigmaIcon = (props: IconProps) => (
  <PenTool width={20} height={20} strokeWidth={1.5} {...props} />
);

export const FileCsvIcon = (props: IconProps) => (
  <FileSpreadsheet width={20} height={20} strokeWidth={1.5} {...props} />
);

export const FilePdfIcon = (props: IconProps) => (
  <FileText width={20} height={20} strokeWidth={1.5} {...props} />
);

export const FilePresentationIcon = (props: IconProps) => (
  <Presentation width={20} height={20} strokeWidth={1.5} {...props} />
);

export const FileSpreadsheetIcon = (props: IconProps) => (
  <Sheet width={20} height={20} strokeWidth={1.5} {...props} />
);

export const FileWordDocumentIcon = (props: IconProps) => (
  <FileText width={20} height={20} strokeWidth={1.5} {...props} />
);

export const GitIcon = (props: IconProps) => (
  <GitBranch width={20} height={20} strokeWidth={1.5} {...props} />
);

export const GmailIcon = (props: IconProps) => (
  <Mail width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GoogleCalendarIcon = (props: IconProps) => (
  <CalendarDays width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GoogleDocsIcon = (props: IconProps) => (
  <FileText width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GoogleDriveIcon = (props: IconProps) => (
  <HardDrive width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GoogleSheetsIcon = (props: IconProps) => (
  <Sheet width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GoogleSlidesIcon = (props: IconProps) => (
  <Presentation width={192} height={192} strokeWidth={1.5} {...props} />
);

export const GithubIcon = (props: IconProps) => (
  <GitFork width={20} height={20} strokeWidth={1.5} {...props} />
);

export const LinearIcon = (props: IconProps) => (
  <ListTodo width={20} height={20} strokeWidth={1.5} {...props} />
);

export const NotionIcon = (props: IconProps) => (
  <NotebookText width={20} height={20} strokeWidth={1.5} {...props} />
);

export const PresentationsIcon = (props: IconProps) => (
  <Presentation width={20} height={20} strokeWidth={1.5} {...props} />
);

export const SalesforceIcon = (props: IconProps) => (
  <Cloud width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const SitesIcon = (props: IconProps) => (
  <Globe width={24} height={24} strokeWidth={1.5} {...props} />
);

export const SlackIcon = (props: IconProps) => (
  <MessagesSquare width={20} height={20} strokeWidth={1.5} {...props} />
);

export const WalletIcon = (props: IconProps) => (
  <Wallet width={16} height={16} strokeWidth={1.5} {...props} />
);
