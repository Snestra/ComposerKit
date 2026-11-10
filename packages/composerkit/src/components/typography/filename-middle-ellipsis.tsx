"use client";

import { useCallback } from "react";

import styles from "./typography.module.css";

/*
 * Filename middle ellipsis. Without Intl.Segmenter the text is shown unchanged.
 */

const ELLIPSIS = "\u2026";
const WHITESPACE = /\s/u;

const segmenter =
  "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const graphemes = (text: string) =>
  Array.from(segmenter?.segment(text) ?? [], ({ segment }) => segment);

const fitFilename = (name: string, fits: (candidate: string) => boolean) => {
  if (segmenter === null) {
    return name;
  }

  const dot = name.lastIndexOf(".");

  const extension =
    dot > 0 && dot < name.length - 1 && !WHITESPACE.test(name.slice(dot))
      ? name.slice(dot)
      : "";

  const segments = graphemes(name);
  const tailCount = extension ? graphemes(extension).length + 1 : 0;
  const tail = extension ? segments.slice(-tailCount).join("") : "";
  const firstAndExtension = `${segments[0] ?? ""}${ELLIPSIS}${extension}`;
  let best = extension;

  if (fits(`${ELLIPSIS}${tail}`)) {
    best = `${ELLIPSIS}${tail}`;
  } else if (fits(firstAndExtension)) {
    best = firstAndExtension;
  }

  let low = extension ? tailCount + 1 : 1;
  let high = segments.length - 1;

  while (low <= high) {
    const total = Math.floor((low + high) / 2);
    const trailing = extension ? Math.max(tailCount, Math.floor(total / 2)) : 0;
    const leading = total - trailing;

    const candidate = `${segments.slice(0, leading).join("")}${ELLIPSIS}${
      trailing > 0 ? segments.slice(-trailing).join("") : ""
    }`;

    if (fits(candidate)) {
      best = candidate;
      low = total + 1;
    } else {
      high = total - 1;
    }
  }

  return best;
};

/** Rebuilds `element` into the fitted structure and returns the disposer. */
const mountFilenameMiddleEllipsis = (element: HTMLElement) => {
  const text = element.textContent ?? "";
  const doc = element.ownerDocument;
  const root = doc.createElement("span");
  root.className = styles.fileRoot;
  const fullText = doc.createElement("span");
  fullText.className = styles.fileFullText;
  fullText.dataset.fileName = text;
  const display = doc.createElement("span");
  display.className = styles.fileDisplay;
  display.textContent = text;
  const measurement = doc.createElement("span");
  measurement.className = styles.fileMeasurement;
  const measured = doc.createTextNode("");
  measurement.append(measured);
  root.setAttribute("aria-hidden", "true");
  root.append(fullText, display, measurement);
  element.replaceChildren(root);

  const range = doc.createRange();
  let lastRootWidth: number | undefined;
  let lastFullWidth: number | undefined;

  const fit = (force = false) => {
    const rootWidth = root.getBoundingClientRect().width;
    const fullWidth = fullText.getBoundingClientRect().width;

    if (!force && rootWidth === lastRootWidth && fullWidth === lastFullWidth) {
      return;
    }

    lastRootWidth = rootWidth;
    lastFullWidth = fullWidth;

    const next =
      rootWidth <= 0 || fullWidth <= rootWidth
        ? text
        : fitFilename(text, (candidate) => {
            measured.data = candidate;
            range.selectNodeContents(measurement);

            return range.getBoundingClientRect().width <= rootWidth;
          });

    measured.data = "";

    if (display.textContent !== next) {
      display.textContent = next;
    }
  };

  const observer = new ResizeObserver(() => {
    fit();
  });

  observer.observe(root);
  observer.observe(fullText);
  fit();

  const refit = () => {
    fit(true);
  };

  doc.fonts?.addEventListener("loadingdone", refit);

  return () => {
    observer.disconnect();
    doc.fonts?.removeEventListener("loadingdone", refit);
  };
};

const FilenameMiddleEllipsis = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => {
  const mount = useCallback(
    (element: HTMLSpanElement | null) => {
      if (element !== null) {
        element.textContent = children;
      }

      const dispose =
        element === null ? null : mountFilenameMiddleEllipsis(element);

      return () => {
        dispose?.();
      };
    },
    [children]
  );

  return <span ref={mount} className={className} />;
};

export { FilenameMiddleEllipsis, mountFilenameMiddleEllipsis };
