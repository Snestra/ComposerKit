"use client";

import { useEffect, useRef, useState } from "react";

import { galleryRoute } from "@/lib/shared";
import type { Mode } from "@/lib/theme/model.ts";

// Same messages as components/gallery-frame-theme.tsx.
const pingMessage = "composerkit:gallery-ping";
const readyMessage = "composerkit:gallery-ready";
const themeMessage = "composerkit:theme";
const styleId = "composerkit-theme-editor";

export const previewPages = [
  "composer",
  "conversation-view",
  "badge",
  "banner",
  "button",
  "markdown",
  "settings",
] as const;

interface ThemePreviewProps {
  css: string;
  mode: Mode;
  page: string;
}

export const ThemePreview = ({ css, mode, page }: ThemePreviewProps) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loads, setLoads] = useState(0);

  // The gallery is served by this app, so the frame shares this origin and
  // the editor can write the theme into its document.
  useEffect(() => {
    const document = frame.current?.contentDocument;
    if (!document?.head) {
      return;
    }
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.append(style);
    }
    style.textContent = css;
  }, [css, loads]);

  useEffect(() => {
    const origin = window.location.origin;
    const sendMode = () =>
      frame.current?.contentWindow?.postMessage(
        { theme: mode, type: themeMessage },
        origin
      );
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === readyMessage
      ) {
        sendMode();
      }
    };
    window.addEventListener("message", onMessage);
    frame.current?.contentWindow?.postMessage({ type: pingMessage }, origin);
    sendMode();
    return () => window.removeEventListener("message", onMessage);
  }, [mode, loads]);

  return (
    <iframe
      className="h-[36rem] w-full rounded-xl border"
      onLoad={() => setLoads((count) => count + 1)}
      ref={frame}
      src={`${galleryRoute}/${page}`}
      title={`${page} gallery page with the edited theme`}
    />
  );
};
