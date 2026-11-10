import { site } from "@/lib/site";
import { getPageMarkdownUrl } from "@/lib/shared";

export interface LlmsIndexPage {
  description?: string;
  locale?: string;
  slugs: string[];
  title: string;
}

export const renderLlmsIndex = (
  pages: readonly LlmsIndexPage[],
  origin: string
): string => {
  const links = pages.map((page) => {
    const url = getPageMarkdownUrl(page).url;
    const description = page.description ? `: ${page.description}` : "";
    return `- [${page.title}](${origin}${url})${description}`;
  });

  return `# ComposerKit

${site.llmsIntro}

- [HTML documentation](${origin}/docs)
${links.join("\n")}
`;
};
