"use client";

import { preload } from "react-dom";

export const FontPreloads = () => {
  preload(
    new URL(
      "../../public/fonts/07c7676b89ed2778-s.p.2bn3s6zvc0dyp.woff2",
      import.meta.url
    ).toString(),
    {
      as: "font",
      crossOrigin: "anonymous",
      type: "font/woff2",
    }
  );
  preload(
    new URL(
      "../../public/fonts/07a39a8a4660cc7c-s.p.0r6juujl39pe6.woff2",
      import.meta.url
    ).toString(),
    {
      as: "font",
      crossOrigin: "anonymous",
      type: "font/woff2",
    }
  );

  return null;
};
