import { createGenerator } from "fumadocs-typescript";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import {
  registryCommand,
  registryNamespaceConfig,
  registrySetupCommands,
} from "@/lib/llms/install";
import { site } from "@/lib/site";

import type { PropTypeReference } from "./component-docs-data";
import {
  docsRoot,
  loadComponentPage,
  packageImportSource,
} from "./component-docs-data";
import { ComponentPreview } from "./component-preview";

const registryOrigin = site.url;
const generator = createGenerator({
  tsconfigPath: `${docsRoot}/tsconfig.json`,
});

const namespaceDiff = (origin: string): string => {
  const config = registryNamespaceConfig(origin)
    .split("\n")
    .map((line) => `+${line}`)
    .join("\n");

  return `{\n${config}\n}`;
};

const GeneratedPropsTable = async ({
  reference,
}: {
  reference: PropTypeReference;
}) => {
  const tables = await AutoTypeTable({
    generator,
    name: reference.name,
    path: reference.path,
    type: reference.type,
  });

  return <>{await Promise.all(tables)}</>;
};

export async function ComponentDoc({ name }: { name: string }) {
  const page = await loadComponentPage(name);
  const packageImport = packageImportSource(page);

  return (
    <>
      <ComponentPreview name={name} />

      <section id="install">
        <h2>Install</h2>
        <h3>shadcn registry</h3>
        <DynamicCodeBlock
          code={registrySetupCommands(registryOrigin).join("\n")}
          codeblock={{ title: "Set up once" }}
          lang="bash"
        />
        {page.registryItems.map((item) => (
          <DynamicCodeBlock
            code={registryCommand(registryOrigin, item)}
            codeblock={{ title: item }}
            key={item}
            lang="bash"
          />
        ))}
        <DynamicCodeBlock
          code={namespaceDiff(registryOrigin)}
          codeblock={{ title: "components.json" }}
          lang="diff"
        />

        <h3>Import</h3>
        <DynamicCodeBlock code={packageImport} lang="tsx" />
      </section>

      <section id="demo-code">
        <h2>Demo code</h2>
        {page.demos.map((demo) => (
          <DynamicCodeBlock
            code={demo.source}
            codeblock={{ title: demo.name }}
            key={demo.path}
            lang="tsx"
          />
        ))}
      </section>

      <section id="props">
        <h2>Props</h2>
        {page.props.map((reference) => (
          <section
            id={reference.name}
            key={`${reference.path}:${reference.name}`}
          >
            <h3>{reference.name}</h3>
            <GeneratedPropsTable reference={reference} />
          </section>
        ))}
      </section>
    </>
  );
}
