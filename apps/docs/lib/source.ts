import { docs } from 'collections/server';
import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
import { renderDocsMarkdown } from './llms/markdown';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const createDocsLlms = (origin: string) =>
  llms(source, {
    renderPage: async (page) =>
      renderDocsMarkdown(
        {
          description: page.data.description,
          slugs: page.slugs,
          text: await page.data.getText('processed'),
          title: page.data.title,
          url: page.url,
        },
        origin
      ),
  });
