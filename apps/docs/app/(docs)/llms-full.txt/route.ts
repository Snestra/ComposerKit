import { site } from '@/lib/site';
import { createDocsLlms } from '@/lib/source';

export const dynamic = 'force-static';

export async function GET() {
  const content = await createDocsLlms(site.url).full();
  return new Response(`# ${site.name}\n\n${site.llmsIntro}\n\n${content}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
