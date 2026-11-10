"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

// The docs site shows gallery pages in a frame. It answers the ready message
// with its theme, and sends the theme again whenever it changes. Either side
// can load first, so the docs page also asks with a ping.
const PING_MESSAGE = "composerkit:gallery-ping";
const READY_MESSAGE = "composerkit:gallery-ready";
const THEME_MESSAGE = "composerkit:theme";

const isPingMessage = (data: unknown): data is { type: typeof PING_MESSAGE } =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === PING_MESSAGE;

interface ThemeMessage {
  theme: "dark" | "light";
  type: typeof THEME_MESSAGE;
}

const isThemeMessage = (data: unknown): data is ThemeMessage =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === THEME_MESSAGE &&
  "theme" in data &&
  (data.theme === "dark" || data.theme === "light");

const GalleryFrameTheme = () => {
  const { setTheme } = useTheme();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }

      if (isThemeMessage(event.data)) {
        setTheme(event.data.theme);
      } else if (isPingMessage(event.data)) {
        window.parent.postMessage({ type: READY_MESSAGE }, event.origin);
      }
    };

    window.addEventListener("message", onMessage);
    // Outside a frame, window.parent is this window and nothing answers.
    window.parent.postMessage({ type: READY_MESSAGE }, "*");

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [setTheme]);

  return null;
};

export { GalleryFrameTheme };
