import { QrCode } from "composerkit/components/ui/qr-code";
import Link from "next/link";

const EXAMPLE_URL = "https://example.com/request/0000";
const SOURCE_ARIA_LABEL = "QR code to open this request on your phone";
const TOO_LONG_VALUE = "x".repeat(3000);

const SILHOUETTE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240"><circle cx="100" cy="82" r="52" fill="#000" fill-opacity=".5"/><path d="M20 240c0-56 36-88 80-88s80 32 80 88z" fill="#000" fill-opacity=".5"/></svg>`
);

const PORTRAIT_SRC = `data:image/svg+xml,${SILHOUETTE}`;
const UNREACHABLE_PORTRAIT_SRC = "/gallery/qr-code/portrait-unavailable";

const SOURCE_TITLE = "Open this request on your phone";

const SOURCE_INSTRUCTIONS =
  "Scan the QR code with your phone’s camera and use the same account to continue";

const SOURCE_FALLBACK =
  "The QR code couldn’t be displayed. Copy the link to open this request on your phone.";

const SECTIONS = {
  errorCorrection: "qr-code-error-correction",
  fallback: "qr-code-fallback",
  portraitImage: "qr-code-portrait-image",
  renderSvg: "qr-code-render-svg",
  sizeVariants: "qr-code-size-variants",
  usageContext: "qr-code-usage-context",
} as const;

const Caption = ({ children }: { children: string }) => (
  <p className="text-sm text-muted-foreground select-none">{children}</p>
);

const QrCodeGalleryExample = () => (
  <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
    <header>
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">QR code</h1>
    </header>
    <section
      aria-label={SECTIONS.renderSvg}
      className="flex flex-col gap-4"
      id="render-svg"
    >
      <h2>{SECTIONS.renderSvg}</h2>
      <QrCode ariaLabel={SOURCE_ARIA_LABEL} value={EXAMPLE_URL}>
        <Caption>{SOURCE_TITLE}</Caption>
      </QrCode>
    </section>
    <section
      aria-label={SECTIONS.sizeVariants}
      className="flex flex-col gap-4"
      id="size-variants"
    >
      <h2>{SECTIONS.sizeVariants}</h2>
      <div className="flex flex-wrap items-start gap-6">
        {(["inline", "compact", "default"] as const).map((size) => (
          <QrCode
            ariaLabel={SOURCE_ARIA_LABEL}
            key={size}
            size={size}
            value={EXAMPLE_URL}
          >
            <Caption>{size}</Caption>
          </QrCode>
        ))}
      </div>
    </section>
    <section
      aria-label={SECTIONS.errorCorrection}
      className="flex flex-col gap-4"
      id="error-correction"
    >
      <h2>{SECTIONS.errorCorrection}</h2>
      <div className="flex flex-wrap items-start gap-6">
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          size="compact"
          value={EXAMPLE_URL}
        >
          <Caption>plain</Caption>
        </QrCode>
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          portrait={{ src: PORTRAIT_SRC }}
          size="compact"
          value={EXAMPLE_URL}
        >
          <Caption>portrait</Caption>
        </QrCode>
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          portrait={{ fillSilhouette: true, src: PORTRAIT_SRC }}
          size="compact"
          value={EXAMPLE_URL}
        >
          <Caption>fillSilhouette</Caption>
        </QrCode>
      </div>
    </section>
    <section
      aria-label={SECTIONS.portraitImage}
      className="flex flex-col gap-4"
      id="portrait-image"
    >
      <h2>{SECTIONS.portraitImage}</h2>
      <div className="flex flex-wrap items-start gap-6">
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          portrait={{
            crop: { height: 0.9, width: 0.8, x: 0.1, y: 0.05 },
            src: PORTRAIT_SRC,
          }}
          size="compact"
          value={EXAMPLE_URL}
        >
          <Caption>crop</Caption>
        </QrCode>
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          portrait={{ src: UNREACHABLE_PORTRAIT_SRC }}
          size="compact"
          value={EXAMPLE_URL}
        >
          <Caption>plain</Caption>
        </QrCode>
      </div>
    </section>
    <section
      aria-label={SECTIONS.fallback}
      className="flex flex-col gap-4"
      id="fallback"
    >
      <h2>{SECTIONS.fallback}</h2>
      <QrCode
        ariaLabel={SOURCE_ARIA_LABEL}
        fallback={
          <div className="flex min-w-0 flex-col gap-2">
            <output className="text-sm text-muted-foreground select-none">
              {SOURCE_FALLBACK}
            </output>
          </div>
        }
        value={TOO_LONG_VALUE}
      />
    </section>
    <section
      aria-label={SECTIONS.usageContext}
      className="flex flex-col gap-4"
      id="usage-context"
    >
      <h2>{SECTIONS.usageContext}</h2>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-medium select-none">{SOURCE_TITLE}</p>
        <Caption>{SOURCE_INSTRUCTIONS}</Caption>
        <QrCode
          ariaLabel={SOURCE_ARIA_LABEL}
          fallback={<Caption>{SOURCE_FALLBACK}</Caption>}
          size="compact"
          value={EXAMPLE_URL}
        />
      </div>
    </section>
  </main>
);

export { QrCodeGalleryExample };
