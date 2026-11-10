const COUNTRY_CODE = /^[A-Za-z]{2}$/u;

// A small neutral stand-in for a country flag, so the demonstration route
// needs no live service. The label is the country code.
const flagSvg = (code: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="2" fill="#8f8f8f"/><text x="10" y="12.6" font-family="sans-serif" font-size="6" font-weight="700" text-anchor="middle" fill="#ffffff">${code}</text></svg>`;

export const GET = async (
  _request: Request,
  context: RouteContext<"/gallery/text-field/flags/[code]">
) => {
  const { code } = await context.params;

  if (!COUNTRY_CODE.test(code)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(flagSvg(code.toUpperCase()), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml",
    },
  });
};
