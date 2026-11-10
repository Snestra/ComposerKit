// The import graph of src, read by scripts/source-files.ts to split the shadcn
// registry into items. Run `pnpm exec depcruise src` here to list its cycles.
export const TS_CONFIG = "tsconfig.json";

/** @type {import("dependency-cruiser").IConfiguration} */
export default {
  forbidden: [
    {
      from: {},
      name: "no-circular",
      severity: "warn",
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      conditionNames: ["import", "types", "default"],
      exportsFields: ["exports"],
      mainFields: ["module", "main", "types"],
    },
    extraExtensionsToScan: [".css", ".json", ".svg", ".license"],
    tsConfig: { fileName: TS_CONFIG },
    tsPreCompilationDeps: true,
  },
};
