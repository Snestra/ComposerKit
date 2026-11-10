import { siteImage } from '@/lib/og-image';

export const dynamic = 'force-static';

export function GET() {
  return siteImage('React components for chat interfaces');
}
