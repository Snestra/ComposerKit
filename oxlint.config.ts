import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

export default defineConfig({
  env: core.env,
  extends: [core, react, next, shadcn, antiSlop],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "packages/composerkit/src/components/diff/syntax-refractor.js",
  ],
  jsPlugins: shadcn.jsPlugins,
  options: { typeAware: true },
  overrides: [
    {
      // shadcn generates these files. Keep its code style so `shadcn add` updates merge cleanly.
      files: ["packages/composerkit/src/components/ui/**"],
      rules: {
        "func-style": "off",
        "import/consistent-type-specifier-style": "off",
        "react/function-component-definition": "off",
        "sort-keys": "off",
      },
    },
  ],
});
