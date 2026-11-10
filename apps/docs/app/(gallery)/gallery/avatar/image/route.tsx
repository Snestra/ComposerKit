import { setTimeout as wait } from "node:timers/promises";

import { ImageResponse } from "next/og";

const MAX_DELAY_MS = 10_000;
const COLORS = ["#0485ff", "#07b84c", "#ae7bf9", "#ffc304", "#ff7419"];
const SIZE = 96;
const BACKGROUND = "#e8e8e8";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// Serves a small picture after `delay` milliseconds so the gallery can hold
// the loading state of an avatar image open. `tone` picks the color. The
// picture is an SVG, or a PNG with `format=png`, which is one of the types
// that the profile picture cache gives an object URL.
export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);

  const delay = Math.min(
    Math.max(Number(searchParams.get("delay")) || 0, 0),
    MAX_DELAY_MS
  );

  const tone =
    COLORS[Math.abs(Number(searchParams.get("tone")) || 0) % COLORS.length];

  await wait(delay);

  // Demonstrates an HTTP download failure for the retry rules.
  const status = Number(searchParams.get("status"));

  if (status >= 400 && status <= 599) {
    return new Response(null, { status });
  }

  if (searchParams.get("format") === "png") {
    return new ImageResponse(
      <svg height={SIZE} viewBox="0 0 96 96" width={SIZE} xmlns={SVG_NAMESPACE}>
        <rect fill={BACKGROUND} height={SIZE} width={SIZE} />
        <circle cx="48" cy="38" fill={tone} r="18" />
        <path d="M12 96c0-24 16-36 36-36s36 12 36 36z" fill={tone} />
      </svg>,
      {
        headers: { "Cache-Control": "no-store" },
        height: SIZE,
        width: SIZE,
      }
    );
  }

  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${BACKGROUND}"/><circle cx="48" cy="38" r="18" fill="${tone}"/><path d="M12 96c0-24 16-36 36-36s36 12 36 36z" fill="${tone}"/></svg>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/svg+xml",
      },
    }
  );
};
