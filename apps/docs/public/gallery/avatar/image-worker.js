// Answers the avatar gallery's picture requests in the browser, because the
// static site has no server. A request to .../gallery/avatar/image takes
// these query parameters:
//   delay   milliseconds to wait before the answer, at most 10000
//   tone    picks the color
//   format  "png" for a PNG, which the profile picture cache turns into an
//           object URL, and anything else for an SVG

const MAX_DELAY_MS = 10_000;
const COLORS = ["#0485ff", "#07b84c", "#ae7bf9", "#ffc304", "#ff7419"];
const SIZE = 96;
const BACKGROUND = "#e8e8e8";
const BODY = "M12 96c0-24 16-36 36-36s36 12 36 36z";

const svgOf = (tone) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 96 96"><rect width="96" height="96" fill="${BACKGROUND}"/><circle cx="48" cy="38" r="18" fill="${tone}"/><path d="${BODY}" fill="${tone}"/></svg>`;

const pngOf = async (tone) => {
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const context = canvas.getContext("2d");

  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, SIZE, SIZE);
  context.fillStyle = tone;
  context.beginPath();
  context.arc(48, 38, 18, 0, Math.PI * 2);
  context.fill();
  context.fill(new Path2D(BODY));

  return await canvas.convertToBlob({ type: "image/png" });
};

const answer = async (url) => {
  const query = url.searchParams;

  const delay = Math.min(
    Math.max(Number(query.get("delay")) || 0, 0),
    MAX_DELAY_MS
  );

  const tone = COLORS[Math.abs(Number(query.get("tone")) || 0) % COLORS.length];

  await new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

  const headers = { "Cache-Control": "no-store" };

  if (query.get("format") === "png") {
    return new Response(await pngOf(tone), {
      headers: { ...headers, "Content-Type": "image/png" },
    });
  }

  return new Response(svgOf(tone), {
    headers: { ...headers, "Content-Type": "image/svg+xml" },
  });
};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    url.origin === self.location.origin &&
    url.pathname.endsWith("/gallery/avatar/image")
  ) {
    event.respondWith(answer(url));
  }
});
