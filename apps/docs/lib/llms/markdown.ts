import { createGenerator } from "fumadocs-typescript";
import type { DocEntry, GeneratedDoc } from "fumadocs-typescript";

import {
  componentPages,
  docsRoot,
  loadComponentPage,
} from "@/components/component-docs-data";
import {
  registryCommand,
  registrySetupCommands,
} from "@/lib/llms/install";

export interface DocsMarkdownPage {
  description?: string;
  slugs: string[];
  text: string;
  title: string;
  url: string;
}

const generator = createGenerator({
  tsconfigPath: `${docsRoot}/tsconfig.json`,
});

const INHERITED_TAG = "composerkit-inherited";

// A prop that only React or the DOM declares, such as aria-label or onKeyDown,
// adds nothing an agent needs and buries the component's own props.
interface DeclaredSymbol {
  readonly declarations: readonly { readonly path: string }[];
}

const markInherited = (entry: DocEntry, symbol: DeclaredSymbol): void => {
  const { declarations } = symbol;
  const inherited =
    declarations.length > 0 &&
    declarations.every((declaration) =>
      declaration.path.includes("/node_modules/")
    );
  if (inherited) {
    entry.tags.push({ name: INHERITED_TAG, text: "" });
  }
};

const isOwn = (entry: DocEntry): boolean =>
  !entry.tags.some((tag) => tag.name === INHERITED_TAG);

const cell = (value: string): string =>
  value.replaceAll("|", String.raw`\|`).replaceAll(/\r?\n/gu, "<br>");

const codeCell = (value: string): string => cell(`\`${value}\``);

const propRow = (entry: DocEntry): string => {
  const defaultValue = entry.tags.find((tag) => tag.name === "default")?.text;
  const description = entry.deprecated
    ? `Deprecated. ${entry.description}`
    : entry.description;

  return `| ${codeCell(entry.name)} | ${codeCell(entry.type)} | ${entry.required ? "Yes" : "No"} | ${defaultValue === undefined ? "" : codeCell(defaultValue)} | ${cell(description)} |`;
};

const propsTable = (doc: GeneratedDoc): string => {
  const description = doc.description ? `${doc.description.trim()}\n\n` : "";
  const own = doc.entries.filter(isOwn);
  const inheritedCount = doc.entries.length - own.length;
  const inherited =
    inheritedCount > 0
      ? `\n\nIt also accepts ${inheritedCount} standard React and HTML props, such as \`className\` and \`aria-*\`.`
      : "";

  if (own.length === 0) {
    return `### ${doc.name}\n\n${description}It takes only standard React and HTML props (${inheritedCount}).`;
  }

  const rows = own.map(propRow).join("\n");

  return `### ${doc.name}\n\n${description}| Name | Type | Required | Default | Description |\n| --- | --- | --- | --- | --- |\n${rows}${inherited}`;
};

const renderComponent = async (
  name: string,
  page: DocsMarkdownPage,
  origin: string
): Promise<string> => {
  const component = await loadComponentPage(name);
  const purpose =
    page.description ??
    (name === "foundations"
      ? "Set up the ComposerKit foundations in a React app."
      : `Use the ComposerKit ${page.title} component in a React app.`);
  const install = component.registryItems.map((item) =>
    registryCommand(origin, item)
  );
  const demos = component.demos.map(
    (demo) =>
      `### ${demo.name}\n\n\`\`\`tsx\n${demo.source.replaceAll(/@workspace\/react\//gu, "@/").trimEnd()}\n\`\`\``
  );
  const tables = await Promise.all(
    component.props.map(async (reference) => {
      const docs = await generator.generateTypeTable(reference, {
        transform(entry, _type, symbol) {
          markInherited(entry, symbol);
        },
      });
      return docs.map(propsTable).join("\n\n");
    })
  );

  return `# ${page.title}

${purpose}

## Install

Run these commands in the root of a Next.js app with Tailwind CSS. Set up the namespace once per project; \`add\` fails without it.

\`\`\`bash
${registrySetupCommands(origin).join("\n")}
\`\`\`

The files land in \`src/components\`, imported as \`@/components/...\`.

\`\`\`bash
${install.join("\n")}
\`\`\`

The npm package \`composerkit\` lags these docs and has a different API. Do not mix it with the registry source.

## Usage

${demos.join("\n\n")}

## Props

${tables.join("\n\n")}
`;
};

export const renderDocsMarkdown = async (
  page: DocsMarkdownPage,
  origin: string
): Promise<string> => {
  const [section, name, ...rest] = page.slugs;
  if (
    section === "components" &&
    name !== undefined &&
    rest.length === 0 &&
    name in componentPages
  ) {
    return renderComponent(name, page, origin);
  }

  return `# ${page.title} (${origin}${page.url})\n\n${page.text}`;
};
