import type { ComponentType, SVGProps } from "react";

import * as icons from "./known-app-icons";
import { SAMPLE_CHARTS_ICON, WRITING_STYLE_ICON } from "./known-app-images";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The static known-app icon registry. Names are
 * normalized (lowercase, non-alphanumerics to dashes), `connector-` is
 * stripped, and a `-mcp-server` suffix falls back to the base name.
 */
const registry = new Map<string, IconComponent>(
  Object.entries({
    figma: icons.FigmaIcon,
    "file-csv": icons.FileCsvIcon,
    "file-pdf": icons.FilePdfIcon,
    "file-presentation": icons.FilePresentationIcon,
    "file-spreadsheet": icons.FileSpreadsheetIcon,
    "file-word-document": icons.FileWordDocumentIcon,
    git: icons.GitIcon,
    github: icons.GithubIcon,
    gmail: icons.GmailIcon,
    "google-calendar": icons.GoogleCalendarIcon,
    "google-docs": icons.GoogleDocsIcon,
    "google-drive": icons.GoogleDriveIcon,
    "google-sheets": icons.GoogleSheetsIcon,
    "google-slides": icons.GoogleSlidesIcon,
    linear: icons.LinearIcon,
    notion: icons.NotionIcon,
    presentations: icons.PresentationsIcon,
    salesforce: icons.SalesforceIcon,
    sites: icons.SitesIcon,
    slack: icons.SlackIcon,
    wallet: icons.WalletIcon,
  })
);

const normalize = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/gu)
    .filter((part) => part.length > 0)
    .join("-");

export const knownAppIcon = (name: string | null | undefined) => {
  if (name === null || name === undefined) {
    return null;
  }

  const normalized = normalize(name).replace(/^connector-/u, "");

  const icon =
    registry.get(normalized) ??
    registry.get(normalized.replace(/-mcp-server$/u, ""));

  return icon ?? null;
};

/** IconUrl entries: images rather than components. */
const imageRegistry = new Map<string, string>([
  [
    "visualize",
    `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_CHARTS_ICON)}`,
  ],
  [
    "write-like-me",
    `data:image/svg+xml;utf8,${encodeURIComponent(WRITING_STYLE_ICON)}`,
  ],
]);

export const knownAppImage = (name: string | null | undefined) => {
  if (name === null || name === undefined) {
    return null;
  }

  const normalized = normalize(name).replace(/^connector-/u, "");

  return (
    imageRegistry.get(normalized) ??
    imageRegistry.get(normalized.replace(/-mcp-server$/u, "")) ??
    null
  );
};
