import { getCountries } from "composerkit/lib/phone-input-state";

const FILE_NAME = /^(?<code>[A-Z]{2})\.svg$/u;

// A small neutral stand-in for a country flag, so the demonstration needs no
// live service. The label is the country code. The static export writes one
// file per country, named like US.svg, so the host sends it as an SVG.
const flagSvg = (code: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="2" fill="#8f8f8f"/><text x="10" y="12.6" font-family="sans-serif" font-size="6" font-weight="700" text-anchor="middle" fill="#ffffff">${code}</text></svg>`;

export const dynamic = "force-static";

export const generateStaticParams = () =>
  getCountries().map((code) => ({ file: `${code}.svg` }));

export const GET = async (
  _request: Request,
  context: RouteContext<"/gallery/text-field/flags/[file]">
) => {
  const { file } = await context.params;
  const code = FILE_NAME.exec(file)?.groups?.code;

  if (code === undefined) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(flagSvg(code), {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
