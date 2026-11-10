import { site } from '@/lib/site';
import { source } from '@/lib/source';
import { renderLlmsIndex } from '@/lib/llms';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pages = source.getPages().map((page) => ({
    description: page.data.description,
    locale: page.locale,
    slugs: page.slugs,
    title: page.data.title,
  }));

  return new Response(renderLlmsIndex(pages, site.url));
}
