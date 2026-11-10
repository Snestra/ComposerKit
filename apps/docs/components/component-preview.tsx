'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { galleryRoute } from '@/lib/shared';
import { withBasePath } from '@/lib/site';

// Same messages as components/gallery-frame-theme.tsx.
const pingMessage = 'composerkit:gallery-ping';
const readyMessage = 'composerkit:gallery-ready';
const themeMessage = 'composerkit:theme';

// A gallery page that has not said it is ready by then failed to load.
const readyTimeoutMs = 8000;

export function ComponentPreview({ name }: { name: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const src = withBasePath(`${galleryRoute}/${name}/`);

  useEffect(() => {
    // The gallery is served by this app, so the frame shares this origin.
    const galleryOrigin = window.location.origin;

    function sendTheme() {
      if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return;
      frame.current?.contentWindow?.postMessage(
        { type: themeMessage, theme: resolvedTheme },
        galleryOrigin,
      );
    }

    // The gallery page says it is ready on every load, including links
    // followed inside the frame.
    function onMessage(event: MessageEvent) {
      if (
        event.origin === galleryOrigin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === readyMessage
      ) {
        setReady(true);
        sendTheme();
      }
    }

    // The frame may have loaded before this page started listening, so ask
    // it now and on every later load.
    function ping() {
      frame.current?.contentWindow?.postMessage(
        { type: pingMessage },
        galleryOrigin,
      );
    }

    const iframe = frame.current;
    window.addEventListener('message', onMessage);
    iframe?.addEventListener('load', ping);
    ping();
    return () => {
      window.removeEventListener('message', onMessage);
      iframe?.removeEventListener('load', ping);
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setTimedOut(true), readyTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className="relative preview-panel">
      <iframe
        ref={frame}
        src={src}
        title={`${name} gallery page`}
        className="h-[calc(100dvh-13rem)] min-h-[32rem] w-full rounded-xl border"
      />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-fd-card p-6 text-center text-sm text-fd-muted-foreground">
          {timedOut ? (
            <>
              <p className="font-medium text-fd-foreground">
                The {name} gallery page didn&apos;t load.
              </p>
              <p>
                Open <a href={src}>{src}</a> directly to see its error.
              </p>
            </>
          ) : (
            <p>Loading the component gallery…</p>
          )}
        </div>
      )}
    </div>
  );
}
