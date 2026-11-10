import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// The static export writes the search index as a file, and the browser searches it.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
