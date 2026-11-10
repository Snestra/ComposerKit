"use client";

import { Button } from "composerkit/components/ui/button";
import {
  supportsTextClipboard,
  copyEncodedImage,
  copyToClipboard,
  writeTextToClipboard,
} from "composerkit/lib/clipboard";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ClipboardEvent } from "react";

const IMAGE_SIZE = 64;

type SampleType = "image/jpeg" | "image/png";

const subscribeNothing = () => () => {
  // Clipboard support does not change while the page is open.
};

const encodeSample = async (type: SampleType) => {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("The demo could not open a drawing canvas.");
  }

  const gradient = context.createLinearGradient(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  gradient.addColorStop(0, "#339cff");
  gradient.addColorStop(1, "#8b5cf6");
  context.fillStyle = gradient;
  context.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);

  // oxlint-disable-next-line promise/avoid-new -- canvas.toBlob only reports through a callback.
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type);
  });

  if (blob === null) {
    throw new Error("The demo could not encode its sample image.");
  }

  return new Uint8Array(await blob.arrayBuffer());
};

const copyText = async (text: string) => {
  try {
    await writeTextToClipboard(text);

    return "writeTextToClipboard resolved. The text is on the clipboard.";
  } catch (error) {
    return `writeTextToClipboard rejected: ${error instanceof Error ? error.message : "unknown error"}`;
  }
};

const copySample = async (type: SampleType, label: string) => {
  try {
    copyEncodedImage(await encodeSample(type));

    return `${label} requested. Paste below to check it.`;
  } catch (error) {
    return `${label} failed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
};

const copyEmpty = () => {
  try {
    copyEncodedImage(new Uint8Array(0));

    return "Empty bytes were accepted.";
  } catch (error) {
    return `Empty bytes threw: ${error instanceof Error ? error.message : "unknown error"}`;
  }
};

interface Pasted {
  imageUrl?: string;
  summary: string;
}

const ClipboardExample = () => {
  const [text, setText] = useState("Example text to copy");
  const [status, setStatus] = useState("Nothing copied yet.");
  const [pasted, setPasted] = useState<Pasted | null>(null);
  const pastedImageUrl = pasted?.imageUrl;

  // Free the pasted file when a new paste replaces it or the page unmounts.
  useEffect(
    () => () => {
      if (pastedImageUrl !== undefined) {
        URL.revokeObjectURL(pastedImageUrl);
      }
    },
    [pastedImageUrl]
  );

  const asyncApi = useSyncExternalStore(
    subscribeNothing,
    supportsTextClipboard,
    () => null
  );

  const show = async (result: Promise<string>) => {
    setStatus(await result);
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const [file] = [...event.clipboardData.files];

    if (file === undefined) {
      setPasted({
        summary: `Pasted text, ${event.clipboardData.getData("text/plain").length} characters`,
      });

      return;
    }

    event.preventDefault();
    setPasted({
      imageUrl: URL.createObjectURL(file),
      summary: `Pasted ${file.type}, ${file.size} bytes`,
    });
  };

  return (
    <section
      aria-labelledby="clipboard-heading"
      className="flex flex-col gap-3"
      id="clipboard"
    >
      <h2 className="text-title-md font-semibold" id="clipboard-heading">
        Clipboard
      </h2>
      <p className="text-sm text-muted-foreground">
        copyToClipboard reports nothing, so paste into the box at the bottom to
        see what landed. writeTextToClipboard waits and tells you the result.
        Where the page has no async clipboard API, copyToClipboard uses a hidden
        textarea and the copy command.
      </p>
      <label className="flex flex-col gap-1 text-sm" htmlFor="clipboard-text">
        Text to copy
        <input
          className="max-w-md rounded-lg border bg-background px-3 py-2 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          id="clipboard-text"
          onChange={(event) => {
            setText(event.target.value);
          }}
          value={text}
        />
      </label>
      <p className="m-0 text-sm" data-testid="clipboard-api">
        navigator.clipboard.writeText: {asyncApi === null && "checking"}
        {asyncApi === true && "available"}
        {asyncApi === false && "unavailable, using the textarea fallback"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            copyToClipboard(text);
            setStatus("copyToClipboard called. It reports no result.");
          }}
          color="outline"
          size="dialog"
        >
          Copy text
        </Button>
        <Button
          onClick={() => {
            void show(copyText(text));
          }}
          color="outline"
          size="dialog"
        >
          Copy text and wait
        </Button>
        <Button
          onClick={() => {
            void show(copySample("image/png", "PNG copy"));
          }}
          color="outline"
          size="dialog"
        >
          Copy PNG image
        </Button>
        <Button
          onClick={() => {
            void show(copySample("image/jpeg", "JPEG copy"));
          }}
          color="outline"
          size="dialog"
        >
          Copy JPEG image
        </Button>
        <Button
          onClick={() => {
            setStatus(copyEmpty());
          }}
          color="outline"
          size="dialog"
        >
          Copy empty bytes
        </Button>
      </div>
      <output className="block text-sm" data-testid="clipboard-status">
        {status}
      </output>
      <label className="flex flex-col gap-1 text-sm" htmlFor="clipboard-paste">
        Paste here
        <textarea
          className="min-h-20 max-w-md rounded-lg border bg-background px-3 py-2 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          id="clipboard-paste"
          onPaste={onPaste}
        />
      </label>
      {pasted !== null && (
        <div
          className="flex flex-col gap-2 text-sm"
          data-testid="clipboard-pasted"
        >
          <span>{pasted.summary}</span>
          {pasted.imageUrl !== undefined && (
            // oxlint-disable-next-line @next/next/no-img-element -- A blob URL preview cannot use next/image.
            <img
              alt="Pasted clipboard content"
              height={IMAGE_SIZE}
              src={pasted.imageUrl}
              width={IMAGE_SIZE}
            />
          )}
        </div>
      )}
    </section>
  );
};

export { ClipboardExample };
