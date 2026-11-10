"use client";

import { ImageViewerDialog } from "@workspace/react/components/carousel/image-viewer";
import { MarkdownProseCodeBlock } from "@workspace/react/components/markdown/chat-code-block";
import { Button } from "@workspace/react/components/ui/button";
import { copyMarkdownText } from "@workspace/react/components/ui/markdown";
import { Menu, MenuItem } from "@workspace/react/components/ui/menu";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

let renderQueue = Promise.resolve();
const loadMermaid = async () => await import("mermaid");

export const MermaidDiagram = ({ code }: { code: string }) => {
  const id = useId().replaceAll(":", "");
  const { resolvedTheme } = useTheme();

  const [result, setResult] = useState<{
    code: string;
    theme: string | undefined;
    svg: string | null;
  }>();

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const { default: mermaid } = await loadMermaid();
        mermaid.initialize({
          securityLevel: "strict",
          startOnLoad: false,
          theme: resolvedTheme === "dark" ? "dark" : "default",
        });
        const rendered = await mermaid.render(`mermaid-${id}`, code);

        if (!cancelled) {
          setResult({ code, svg: rendered.svg, theme: resolvedTheme });
        }
      } catch {
        if (!cancelled) {
          setResult({ code, svg: null, theme: resolvedTheme });
        }
      }
    };

    renderQueue = renderQueue.then(render, render);

    return () => {
      // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
      cancelled = true;
    };
  }, [code, id, resolvedTheme]);

  if (result?.code !== code || result.theme !== resolvedTheme) {
    return <div className="my-4" />;
  }

  if (result.svg === null) {
    return <MarkdownProseCodeBlock code={code} language="mermaid" />;
  }

  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`;

  const download = () => {
    const image = new Image();
    image.addEventListener(
      "load",
      () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "mermaid-diagram.png";
          link.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      },
      { once: true }
    );

    image.src = src;
  };

  return (
    <div
      className="group/app-widget relative my-4"
      data-ck-markdown-copy="code-block"
      data-markdown-copy-text={`\`\`\`mermaid\n${code}\n\`\`\``}
    >
      {/* Mermaid returns sanitized SVG under its strict security policy. */}
      {/* oxlint-disable-next-line next/no-img-element */}
      <img alt="Mermaid" className="mx-auto max-w-full" src={src} />
      <div
        className="absolute end-0 top-0 flex items-center gap-1 opacity-0 group-hover/app-widget:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
        data-ck-markdown-copy="exclude"
      >
        <Menu
          align="end"
          contentWidth="xs"
          triggerButton={
            <Button
              aria-label="Diagram options"
              color="blockAction"
              radius="full"
              size="inputIcon"
            >
              ⋯
            </Button>
          }
        >
          <MenuItem
            onSelect={() => {
              void copyMarkdownText(code);
            }}
          >
            Copy as code
          </MenuItem>
          <MenuItem onSelect={download}>Download image</MenuItem>
        </Menu>
        <Button
          aria-label="Expand diagram"
          color="blockAction"
          onClick={() => {
            setExpanded(true);
          }}
          radius="full"
          size="inputIcon"
        >
          ⛶
        </Button>
      </div>
      <ImageViewerDialog
        alt="Mermaid"
        dialogAriaLabel="Expand diagram"
        onDownload={download}
        onOpenChange={setExpanded}
        open={expanded}
        showZoomControls
        src={src}
      />
    </div>
  );
};
