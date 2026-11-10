import { readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

import registry from "../registry.json" with { type: "json" };

export interface PackageImport {
  path: string;
  symbol?: string;
}

export interface DerivedProps {
  components: readonly string[];
  item: string;
}

export interface ComponentPage {
  derivedProps?: readonly DerivedProps[];
  packageImport: PackageImport;
  registryItems: readonly string[];
}

export interface PropTypeReference {
  name: string;
  path: string;
  type?: string;
}

export interface DemoSource {
  name: string;
  path: string;
  source: string;
}

export interface LoadedComponentPage extends ComponentPage {
  demos: DemoSource[];
  name: string;
  props: PropTypeReference[];
}

export const packageImportSource = (page: ComponentPage): string =>
  page.packageImport.symbol
    ? `import { ${page.packageImport.symbol} } from "composerkit/${page.packageImport.path}";`
    : `import "composerkit/${page.packageImport.path}";`;

export const docsRoot =
  path.basename(process.cwd()) === "docs"
    ? process.cwd()
    : path.join(process.cwd(), "apps/docs");
export const repositoryRoot = path.resolve(docsRoot, "../..");

export const componentPages: Record<string, ComponentPage> = {
  foundations: {
    packageImport: { path: "globals.css" },
    registryItems: [
      "styles",
      "theme-variables",
      "platform-provider",
      "reduced-motion",
    ],
  },
  "app-shell": {
    packageImport: { path: "components/ui/app-shell", symbol: "AppShell" },
    registryItems: ["app-shell", "preview-layout"],
  },
  avatar: {
    packageImport: { path: "components/ui/avatar", symbol: "Avatar" },
    registryItems: ["avatar"],
  },
  badge: {
    packageImport: { path: "components/ui/badge", symbol: "Badge" },
    registryItems: ["badge"],
  },
  banner: {
    packageImport: { path: "components/ui/banner", symbol: "Banner" },
    registryItems: ["banner"],
  },
  attachment: {
    packageImport: {
      path: "components/attachment/attachment",
      symbol: "AttachmentPart",
    },
    registryItems: ["attachment", "chat-stream"],
  },
  button: {
    packageImport: { path: "components/ui/button", symbol: "Button" },
    registryItems: ["button"],
  },
  card: {
    packageImport: { path: "components/ui/card", symbol: "CardTile" },
    registryItems: ["card"],
  },
  carousel: {
    packageImport: { path: "components/ui/carousel", symbol: "BaseCarousel" },
    registryItems: ["carousel"],
  },
  "chat-sidebar": {
    packageImport: {
      path: "components/chat-sidebar/chat-sidebar",
      symbol: "ChatSidebar",
    },
    registryItems: ["chat-sidebar"],
  },
  checkbox: {
    packageImport: { path: "components/ui/checkbox", symbol: "Checkbox" },
    registryItems: ["checkbox"],
  },
  composer: {
    packageImport: { path: "components/ui/composer", symbol: "InlineComposer" },
    registryItems: ["composer"],
  },
  "conversation-view": {
    packageImport: {
      path: "components/ui/conversation-view",
      symbol: "ConversationView",
    },
    registryItems: ["conversation-view"],
  },
  "date-picker": {
    packageImport: { path: "components/ui/date-picker", symbol: "DatePicker" },
    registryItems: ["date-picker"],
  },
  dialog: {
    packageImport: { path: "components/ui/dialog", symbol: "Dialog" },
    registryItems: ["dialog"],
  },
  diff: {
    packageImport: { path: "components/ui/diff", symbol: "CodeDiff" },
    registryItems: ["diff"],
  },
  disclosure: {
    packageImport: {
      path: "components/ui/disclosure",
      symbol: "DisclosureToggle",
    },
    registryItems: ["disclosure"],
  },
  "empty-state": {
    packageImport: { path: "components/ui/empty-state", symbol: "EmptyState" },
    registryItems: ["empty-state"],
  },
  "file-preview": {
    packageImport: {
      path: "components/file-preview/file-preview-fallback",
      symbol: "FilePreviewFallback",
    },
    registryItems: ["file-preview"],
  },
  icon: {
    packageImport: { path: "components/icon", symbol: "CheckIcon" },
    registryItems: ["icon"],
  },
  "keyboard-shortcut": {
    packageImport: { path: "components/ui/keyboard-shortcut", symbol: "Kbd" },
    registryItems: ["keyboard-shortcut"],
  },
  layout: {
    packageImport: { path: "components/ui/layout", symbol: "Layout" },
    registryItems: ["layout"],
  },
  list: {
    packageImport: { path: "components/ui/list", symbol: "ListItem" },
    registryItems: ["list", "summary-list"],
  },
  markdown: {
    packageImport: { path: "components/ui/markdown", symbol: "Markdown" },
    registryItems: ["markdown"],
  },
  mention: {
    packageImport: { path: "components/ui/mention", symbol: "MentionPill" },
    registryItems: ["mention"],
  },
  menu: {
    packageImport: { path: "components/ui/menu", symbol: "Menu" },
    registryItems: ["menu", "menu-list"],
  },
  "message-turn": {
    packageImport: {
      path: "components/ui/message-bubble",
      symbol: "MessageBubble",
    },
    registryItems: [
      "assistant-message-body",
      "collapsible-user-message",
      "message-bubble",
      "message-citation",
      "message-turn-dividers",
      "request-action-chip",
      "streaming-text",
    ],
  },
  panes: {
    packageImport: { path: "components/ui/panes", symbol: "SidePanel" },
    registryItems: ["panes", "panel-resizer", "split-view"],
  },
  popover: {
    packageImport: { path: "components/ui/popover", symbol: "Popover" },
    registryItems: ["popover"],
  },
  progress: {
    packageImport: { path: "components/ui/progress", symbol: "Spinner" },
    registryItems: ["progress"],
  },
  "qr-code": {
    packageImport: { path: "components/ui/qr-code", symbol: "QrCode" },
    registryItems: ["qr-code"],
  },
  "radio-group": {
    packageImport: { path: "components/ui/radio-group", symbol: "RadioGroup" },
    registryItems: ["radio-group"],
  },
  "segmented-control": {
    packageImport: {
      path: "components/ui/segmented-control",
      symbol: "SegmentedControl",
    },
    registryItems: ["segmented-control"],
  },
  select: {
    packageImport: { path: "components/ui/select", symbol: "Select" },
    registryItems: ["select"],
  },
  settings: {
    packageImport: {
      path: "components/settings/page-frame",
      symbol: "SettingsPageFrame",
    },
    registryItems: ["settings"],
  },
  sidebar: {
    packageImport: {
      path: "components/ui/navigation-rail",
      symbol: "NavigationRail",
    },
    registryItems: ["navigation-rail"],
  },
  skeleton: {
    packageImport: {
      path: "components/ui/skeleton",
      symbol: "LoadingPlaceholder",
    },
    registryItems: ["skeleton"],
  },
  slider: {
    derivedProps: [
      {
        components: [
          "Slider",
          "SliderRange",
          "SliderRoot",
          "SliderThumb",
          "SliderTrack",
        ],
        item: "slider",
      },
    ],
    packageImport: { path: "components/ui/slider", symbol: "Slider" },
    registryItems: ["slider", "discrete-slider"],
  },
  switch: {
    packageImport: { path: "components/ui/switch", symbol: "Switch" },
    registryItems: ["switch", "labelled-switch"],
  },
  tabs: {
    packageImport: { path: "components/ui/tabs", symbol: "Tabs" },
    registryItems: ["tabs", "navigation-tabs"],
  },
  "text-field": {
    packageImport: { path: "components/ui/text-field", symbol: "TextInput" },
    registryItems: ["text-field", "phone-input"],
  },
  toast: {
    packageImport: { path: "components/ui/toast", symbol: "ToastProvider" },
    registryItems: ["toast"],
  },
  toolbar: {
    packageImport: { path: "components/ui/toolbar", symbol: "Toolbar" },
    registryItems: ["toolbar"],
  },
  tooltip: {
    packageImport: { path: "components/ui/tooltip", symbol: "Tooltip" },
    registryItems: ["tooltip"],
  },
  typography: {
    derivedProps: [
      {
        components: ["Heading", "MiddleTruncatedBranchLabel", "Text"],
        item: "typography",
      },
    ],
    packageImport: { path: "components/ui/typography", symbol: "Text" },
    registryItems: ["typography"],
  },
  reasoning: {
    packageImport: {
      path: "components/reasoning/reasoning",
      symbol: "ReasoningPart",
    },
    registryItems: ["reasoning", "chat-stream"],
  },
  "tool-call": {
    packageImport: {
      path: "components/tool-call/tool-call",
      symbol: "ToolCallPart",
    },
    registryItems: ["tool-call", "chat-stream"],
  },
};

interface RegistryFile {
  path: string;
}

interface RegistryItem {
  files?: RegistryFile[];
  name: string;
}

const registryItems: RegistryItem[] = registry.items;

const getRegistryItem = (name: string): RegistryItem => {
  const item = registryItems.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`Unknown registry item: ${name}`);
  return item;
};

export const registrySourcePaths = (name: string): string[] =>
  (getRegistryItem(name).files ?? [])
    .filter((file) => file.path.endsWith(".tsx"))
    .map((file) => path.resolve(docsRoot, file.path));

const exportedPropTypes = (
  filePath: string,
  sourceText: string
): PropTypeReference[] => {
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const names = new Set<string>();

  for (const statement of source.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
      if (exported && statement.name.text.endsWith("Props"))
        names.add(statement.name.text);
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text.endsWith("Props")) names.add(element.name.text);
      }
    }
  }

  return [...names].sort().map((name) => ({ name, path: filePath }));
};

const readDemos = async (name: string): Promise<DemoSource[]> => {
  const galleryPath = path.join(
    docsRoot,
    "app/(gallery)/gallery",
    name,
    "page.tsx"
  );
  const gallerySource = await readFile(galleryPath, "utf8");
  const imports = [
    ...gallerySource.matchAll(/from\s+["']@\/examples\/([^"']+)["']/gu),
  ];
  const exampleNames = [...new Set(imports.map((match) => match[1]))].sort();

  return Promise.all(
    exampleNames.map(async (exampleName) => {
      const examplePath = path.join(docsRoot, "examples", `${exampleName}.tsx`);
      return {
        name: `${exampleName}.tsx`,
        path: examplePath,
        source: await readFile(examplePath, "utf8"),
      };
    })
  );
};

export const loadComponentPage = async (
  name: string
): Promise<LoadedComponentPage> => {
  const page = componentPages[name];
  if (!page) throw new Error(`Unknown component page: ${name}`);

  const sourcePaths = [
    ...new Set(page.registryItems.flatMap(registrySourcePaths)),
  ].sort();
  const exportedProps = await Promise.all(
    sourcePaths.map(async (sourcePath) =>
      exportedPropTypes(sourcePath, await readFile(sourcePath, "utf8"))
    )
  );
  const derivedProps = (page.derivedProps ?? []).flatMap((derived) => {
    const [sourcePath] = registrySourcePaths(derived.item);
    if (!sourcePath) throw new Error(`No component source for ${derived.item}`);
    return derived.components.map((component) => ({
      name: `${component}Props`,
      path: sourcePath,
      type: `\nexport type ${component}Props = ComponentProps<typeof ${component}>`,
    }));
  });

  return {
    ...page,
    demos: await readDemos(name),
    name,
    props: [...exportedProps.flat(), ...derivedProps],
  };
};
