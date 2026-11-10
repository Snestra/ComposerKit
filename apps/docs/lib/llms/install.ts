// The registry items depend on each other as @composerkit/<item>, so shadcn
// needs a components.json with that namespace before any item installs.
// This sequence was run in a fresh create-next-app app: init, registry add,
// add composer, then tsc and next build both passed. Init installs shadcn
// into the project, so the later commands use that local copy.

export const registrySetupCommands = (origin: string): string[] => [
  "npx shadcn@latest init --defaults --yes",
  `npx shadcn registry add '@composerkit=${origin}/r/{name}.json'`,
];

export const registryCommand = (origin: string, item: string): string =>
  `npx shadcn add ${origin}/r/${item}.json --overwrite`;

export const registryNamespaceConfig = (origin: string): string =>
  JSON.stringify(
    {
      registries: {
        "@composerkit": `${origin}/r/{name}.json`,
      },
    },
    null,
    2
  );
