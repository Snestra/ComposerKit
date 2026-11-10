const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const pageClipboard = (): Clipboard | undefined =>
  "window" in globalThis && "document" in globalThis
    ? navigator.clipboard
    : undefined;

export const supportsTextClipboard = () => {
  const api = pageClipboard();

  return api !== undefined && "writeText" in api;
};

/** Rejects when the async clipboard API is missing or refuses the text. */
export const writeTextToClipboard = async (text: string): Promise<void> => {
  if (!supportsTextClipboard()) {
    throw new Error("This page has no async text-copy API.");
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error("Text copy was refused by the browser.");
  }
};

const copySelectedText = (text: string) => {
  const selection = document.createElement("textarea");
  selection.readOnly = true;
  selection.value = text;
  Object.assign(selection.style, { opacity: "0", position: "fixed" });
  document.body.append(selection);

  try {
    selection.select();
    // oxlint-disable-next-line typescript/no-deprecated -- Older browsers only expose the selection-based copy command.
    document.execCommand("copy");
  } catch {
    // Best-effort copying does not report a refused write.
  } finally {
    selection.remove();
  }
};

const copyTextQuietly = async (text: string) => {
  try {
    await writeTextToClipboard(text);
  } catch {
    // Call writeTextToClipboard when the caller needs the failure reason.
  }
};

/** Best-effort copy with a selection-based fallback when the async API is absent. */
export const copyToClipboard = (text: string): void => {
  if (!("window" in globalThis && "document" in globalThis)) {
    return;
  }

  if (supportsTextClipboard()) {
    void copyTextQuietly(text);
  } else {
    copySelectedText(text);
  }
};

const renderClipboardPng = async (source: Blob): Promise<Blob> => {
  if (!("createImageBitmap" in globalThis)) {
    throw new Error("PNG conversion needs an image decoder in this browser.");
  }

  const image = await createImageBitmap(source);

  try {
    if (image.width <= 0 || image.height <= 0) {
      throw new Error("The decoded copy image has no drawable pixels.");
    }

    const surface = document.createElement("canvas");
    Object.assign(surface, { height: image.height, width: image.width });
    const painter = surface.getContext("2d");

    if (painter === null) {
      throw new Error("A drawing surface could not be opened for image copy.");
    }

    painter.drawImage(image, 0, 0);

    // oxlint-disable-next-line promise/avoid-new -- Canvas encoding exposes only a callback.
    return await new Promise<Blob>((resolve, reject) => {
      surface.toBlob((png) => {
        if (png) {
          resolve(png);
        } else {
          reject(new Error("PNG encoding returned no data for image copy."));
        }
      }, "image/png");
    });
  } finally {
    image.close();
  }
};

const clipboardImage = async (bytes: Uint8Array): Promise<Blob> => {
  const png = PNG_HEADER.every((byte, offset) => bytes[offset] === byte);

  const source = new Blob([new Uint8Array(bytes)], {
    type: png ? "image/png" : "application/octet-stream",
  });

  return png ? await Promise.resolve(source) : await renderClipboardPng(source);
};

const sendImage = async (api: Clipboard, bytes: Uint8Array) => {
  try {
    // Keep the write in the user gesture. Conversion may finish afterwards.
    await api.write([
      new ClipboardItem({ "image/png": clipboardImage(bytes) }),
    ]);
  } catch (error) {
    console.warn("Image copy did not complete.", error);
  }
};

/** Accepts encoded bytes, retaining PNGs and converting other image formats to PNG. */
export const copyEncodedImage = (bytes: Uint8Array): void => {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new TypeError(
      "Image copy needs a Uint8Array with encoded image data."
    );
  }

  const api = pageClipboard();

  if (
    api === undefined ||
    !("write" in api) ||
    !("ClipboardItem" in globalThis)
  ) {
    throw new Error("This page has no image-copy API.");
  }

  void sendImage(api, bytes);
};
