import { readFileSync, writeFileSync } from "node:fs";

const tokens = readFileSync(
  new URL("../src/styles/design-tokens.css", import.meta.url),
  "utf-8"
);

const colors = new Map(
  [...tokens.matchAll(/--color-(?<name>[\w-]+): (?<color>#[\da-f]+);/gu)].map(
    ({ groups }) => [groups?.name, groups?.color]
  )
);

const artwork = {
  arch: '<rect x="8" y="7" width="16" height="18" rx="8"/><rect x="13" y="14" width="6" height="13" rx="3" fill="url(#background)"/>',
  blocks:
    '<rect x="7" y="7" width="8" height="8" rx="2"/><rect x="17" y="17" width="8" height="8" rx="2"/><circle cx="21" cy="11" r="4"/>',
  diamond:
    '<polygon points="16,6 26,16 16,26 6,16"/><circle cx="16" cy="16" r="4" fill="url(#background)"/>',
  orbit: '<circle cx="14" cy="18" r="8"/><circle cx="23" cy="8" r="3"/>',
  rings:
    '<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="16" cy="16" r="3"/>',
  steps:
    '<rect x="6" y="18" width="6" height="8" rx="2"/><rect x="13" y="12" width="6" height="14" rx="2"/><rect x="20" y="6" width="6" height="20" rx="2"/>',
};

for (const theme of ["light", "dark"] as const) {
  const start = colors.get(`${theme}-app-accent-blue`);
  const end = colors.get(`${theme}-app-accent-purple`);
  const foreground = colors.get(`${theme}-app-text-on-accent`);

  if (start === undefined || end === undefined || foreground === undefined) {
    throw new Error(`No avatar palette is registered for ${theme}`);
  }

  for (const [name, body] of Object.entries(artwork)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="${foreground}" color="${foreground}"><defs><linearGradient id="background" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#background)"/>${body}</svg>\n`;

    writeFileSync(
      new URL(
        `../src/components/list/avatars/${name}-${theme}.svg`,
        import.meta.url
      ),
      svg
    );
  }
}
