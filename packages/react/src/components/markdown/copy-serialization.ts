/* oxlint-disable anti-slop/no-array-filter-map, eslint/no-unused-vars, eslint/no-use-before-define -- The serializer functions call each other recursively, as the do. */
/* oxlint-disable unicorn/no-useless-spread, unicorn/prefer-dom-node-dataset, unicorn/prefer-ternary -- The spreads copy live NodeLists; attributes are read with getAttribute because the nodes are Element, not HTMLElement. */
/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables are typed by their string keys. */
/* oxlint-disable eslint/complexity -- The serializer follows the branch for branch. */
/* oxlint-disable eslint/prefer-destructuring -- Stylistic. */
/* oxlint-disable typescript/prefer-nullish-coalescing, typescript/strict-boolean-expressions -- Branches test optional values by truthiness. */
/* oxlint-disable unicorn/no-array-for-each, unicorn/prefer-dom-node-append -- Stylistic; the calls stay as written. */

/**
 * The selection and element serializer of the chat prose: the selection, the
 * element, the copy event, rich HTML, plain text and the HTML string.
 *
 * KaTeX and math source, inline visualizations, `data-ck-d-component` images and
 * host inline mentions are not handled, because the library renders none of
 * them.
 */

const COPY_ATTRIBUTE = "data-ck-markdown-copy";
const CONTENT_ATTRIBUTE = "data-markdown-copy-content";
const TEXT_ATTRIBUTE = "data-markdown-copy-text";
const COPY_SELECTOR = `[${COPY_ATTRIBUTE}]`;
const CONTENT_SELECTOR = `[${CONTENT_ATTRIBUTE}]`;

const EDITABLE_SELECTOR =
  '[contenteditable="true"], [contenteditable="plaintext-only"]';

const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

const BLOCK_TAGS = new Set([
  "BLOCKQUOTE",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "P",
  "PRE",
]);

// Attributes the rich html keeps, by tag.
const KEPT_ATTRIBUTES: Record<string, string[]> = {
  A: ["href", "title"],
  BLOCKQUOTE: ["cite"],
  CODE: ["data-language", TEXT_ATTRIBUTE],
  IMG: ["src", "srcset", "sizes", "alt", "title", "width", "height"],
  LI: ["value"],
  OL: ["start"],
  Q: ["cite"],
  TD: ["colspan", "rowspan"],
  TH: ["colspan", "rowspan"],
  TIME: ["datetime"],
};

export interface SerializedCopy {
  htmlText: string;
  plainText: string;
}

type CopyMode =
  | "blank-lines"
  | "code-block"
  | "contents"
  | "exclude"
  | "inline-code"
  | "rich-block";

const closestElement = (node: Node, selector: string): Element | null =>
  (node instanceof Element ? node : node.parentElement)?.closest(selector) ??
  null;

const copyMode = (element: Element | null): CopyMode | null => {
  const value = element?.getAttribute(COPY_ATTRIBUTE);

  return value === "exclude" ||
    value === "contents" ||
    value === "inline-code" ||
    value === "code-block" ||
    value === "rich-block" ||
    value === "blank-lines"
    ? value
    : null;
};

const rangeInside = (range: Range, root: Element): boolean =>
  root.contains(range.startContainer) && root.contains(range.endContainer);

/** Widens the range to take a whole matching ancestor. */
const widenRange = (range: Range, selector: string) => {
  const start = closestElement(range.startContainer, selector);

  if (start !== null) {
    range.setStartBefore(start);
  }

  const end = closestElement(range.endContainer, selector);

  if (end !== null) {
    range.setEndAfter(end);
  }
};

/** The marked element that holds both ends of the range. */
const markedAncestor = (range: Range, root: Element): Element | null => {
  const start = closestElement(range.startContainer, COPY_SELECTOR);
  const end = closestElement(range.endContainer, COPY_SELECTOR);

  return start !== null && start === end && root.contains(start) ? start : null;
};

/** A newline in preformatted text becomes a `<br>` in the clone. */
const breakNewlines = (range: Range, fragment: DocumentFragment) => {
  const original = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    }
  );

  const cloned = document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT);
  const replacements = new Map<Node, string[]>();

  for (let node = cloned.nextNode(); node !== null; node = cloned.nextNode()) {
    const parent = original.nextNode()?.parentElement;
    const value = node.nodeValue;

    if (
      parent !== null &&
      parent !== undefined &&
      value !== null &&
      value.includes("\n") &&
      parent.closest(
        `pre, [data-ck-markdown-copy="code-block"], [data-ck-markdown-copy="inline-code"], [data-ck-markdown-copy="blank-lines"]`
      ) === null &&
      ["pre", "pre-wrap", "pre-line", "break-spaces"].includes(
        window.getComputedStyle(parent).whiteSpace
      )
    ) {
      replacements.set(node, value.split("\n"));
    }
  }

  for (const [node, parts] of replacements) {
    const replacement = document.createDocumentFragment();
    parts.forEach((part, index) => {
      if (index > 0) {
        replacement.append(document.createElement("br"));
      }

      replacement.append(part);
    });
    node.parentNode?.replaceChild(replacement, node);
  }
};

const cloneRange = (range: Range): DocumentFragment => {
  const contents = range.cloneContents();
  breakNewlines(range, contents);

  return contents;
};

/** A preformatted block with the text as its code. */
const preformatted = (document_: Document, value: string): HTMLPreElement => {
  const pre = document_.createElement("pre");
  pre.dir = "ltr";
  const code = document_.createElement("code");
  code.textContent = value;
  pre.append(code);

  return pre;
};

/** The text of an element, preferring `data-markdown-copy-text`. */
const copyText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node instanceof Element) {
    return (
      node.getAttribute(TEXT_ATTRIBUTE) ??
      (copyMode(node) === "exclude"
        ? ""
        : [...node.childNodes].map(copyText).join(""))
    );
  }

  return "";
};

const skipped = (element: Element): boolean =>
  element.classList.contains("sr-only") ||
  element.getAttribute("aria-hidden") === "true" ||
  (element.tagName === "IMG" && element.getAttribute("alt") === "");

// Rich HTML.

const appendRich = (parent: Node, node: Node, document_: Document) => {
  if (node.nodeType === Node.TEXT_NODE) {
    parent.appendChild(document_.createTextNode(node.textContent ?? ""));

    return;
  }

  if (!(node instanceof Element) || skipped(node)) {
    return;
  }

  const mode = copyMode(node);

  if (mode === "exclude") {
    return;
  }

  if (mode === "contents") {
    for (const child of [...node.childNodes]) {
      appendRich(parent, child, document_);
    }

    return;
  }

  if (mode === "blank-lines") {
    for (let index = 0; index < (node.textContent?.length ?? 0); index += 1) {
      parent.appendChild(document_.createElement("p"));
    }

    return;
  }

  if (node.matches('[role="checkbox"]')) {
    const input = document_.createElement("input");
    input.type = "checkbox";
    input.disabled = true;

    if (node.getAttribute("aria-checked") === "true") {
      input.setAttribute("checked", "");
    }

    parent.appendChild(input);

    return;
  }

  if (node.matches("button, [data-file-reference]")) {
    // A button with no mention inside is its copy text; otherwise its children.
    parent.appendChild(
      document_.createTextNode(
        node.getAttribute(TEXT_ATTRIBUTE) ?? node.textContent ?? ""
      )
    );

    return;
  }

  if (mode === "code-block") {
    const content = node.querySelector(`code${CONTENT_SELECTOR}`);

    if (content !== null) {
      const pre = document_.createElement("pre");
      pre.dir = "ltr";
      appendRich(pre, content, document_);
      parent.appendChild(pre);

      return;
    }

    parent.appendChild(preformatted(document_, copyText(node)));

    return;
  }

  if (mode === "rich-block") {
    const content = node.querySelector(CONTENT_SELECTOR);

    if (content !== null) {
      appendRich(parent, content, document_);
    }

    return;
  }

  if (mode === "inline-code") {
    const code = document_.createElement("code");
    code.dir = "ltr";

    for (const child of [...node.childNodes]) {
      appendRich(code, child, document_);
    }

    parent.appendChild(code);

    return;
  }

  if (node.namespaceURI !== XHTML_NAMESPACE) {
    // Foreign content (svg) keeps only its text.
    const value = node.textContent;

    if (value !== null && value.length > 0) {
      parent.appendChild(document_.createTextNode(value));
    }

    return;
  }

  const copy = document_.createElement(node.localName);

  for (const name of KEPT_ATTRIBUTES[node.tagName] ?? []) {
    const value = node.getAttribute(name);

    if (value !== null) {
      copy.setAttribute(name, value);
    }
  }

  for (const child of [...node.childNodes]) {
    appendRich(copy, child, document_);
  }

  parent.appendChild(copy);
};

const richFragment = (root: Node): DocumentFragment => {
  const document_ = root.ownerDocument ?? document;
  const fragment = document_.createDocumentFragment();

  for (const child of [...root.childNodes]) {
    appendRich(fragment, child, document_);
  }

  return fragment;
};

/** The html string, without the code text markers. */
const htmlOf = (fragment: DocumentFragment): string => {
  const holder = (fragment.ownerDocument ?? document).createElement("div");
  holder.append(fragment.cloneNode(true));

  for (const code of holder.querySelectorAll(`code[${TEXT_ATTRIBUTE}]`)) {
    code.removeAttribute(TEXT_ATTRIBUTE);
  }

  return holder.innerHTML;
};

// Plain text.

interface PlainState {
  end: number;
  nextRowOffset: number | null;
  start: number | null;
}

/** Records the span of the text that belongs to the selection. */
const mark = (
  value: string,
  state: PlainState | undefined,
  offset: number
): string => {
  if (state !== undefined && value.length > 0) {
    state.start ??= offset;
    state.end = offset + value.length;
  }

  return value;
};

const plainChildren = (
  nodes: Iterable<Node>,
  state?: PlainState,
  offset = 0
): string => {
  let result = "";

  for (const node of nodes) {
    result += plainNode(node, state, offset + result.length);
  }

  return result;
};

const rowText = (row: Element): string =>
  [...row.children]
    .filter((cell) => cell.tagName === "TH" || cell.tagName === "TD")
    .map((cell) => plainChildren(cell.childNodes).trim())
    .join("\t");

const listText = (list: Element, indent: string): string => {
  const ordered = list.tagName === "OL";
  const items = [...list.children].filter((child) => child.tagName === "LI");
  let counter = list instanceof HTMLOListElement ? list.start : 1;
  let result = "";

  for (const item of items) {
    if (
      ordered &&
      item instanceof HTMLLIElement &&
      item.hasAttribute("value")
    ) {
      counter = item.value;
    }

    const marker = ordered ? `${counter}. ` : "- ";
    counter += ordered ? 1 : 0;
    result += itemText(item, indent, marker);
  }

  return result;
};

const itemText = (item: Element, indent: string, marker: string): string => {
  const continuation = indent + " ".repeat(marker.length);
  let started = false;
  let buffer = "";
  let result = "";

  const flush = () => {
    const lines = buffer.trim().split("\n");
    buffer = "";

    if (lines.length !== 1 || lines[0] !== "") {
      for (const line of lines) {
        result += `${started ? continuation : indent + marker}${line}\n`;
        started = true;
      }
    }
  };

  for (const child of item.childNodes) {
    if (
      child instanceof Element &&
      (child.tagName === "OL" || child.tagName === "UL")
    ) {
      flush();

      if (!started) {
        result += `${indent}${marker.trimEnd()}\n`;
        started = true;
      }

      result += listText(child, continuation);
    } else {
      buffer += plainNode(child);
    }
  }

  flush();

  return started ? result : `${indent}${marker.trimEnd()}\n`;
};

const plainNode = (node: Node, state?: PlainState, offset = 0): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof Element)) {
    return "";
  }

  switch (node.tagName) {
    case "INPUT": {
      return node.getAttribute("type") === "checkbox"
        ? `[${node.hasAttribute("checked") ? "x" : " "}] `
        : "";
    }

    case "TABLE": {
      return mark(
        [...node.querySelectorAll("tr")].map(rowText).join("\n"),
        state,
        offset
      );
    }

    case "TR": {
      const row = rowText(node);

      if (state !== undefined) {
        if (state.nextRowOffset === offset) {
          mark("\n", state, offset - 1);
        }

        state.nextRowOffset = offset + row.length + 1;
      }

      return `${mark(row, state, offset)}\n`;
    }

    case "TD":
    case "TH": {
      const cell = plainChildren(node.childNodes).trim();

      if (node.nextElementSibling?.matches("td, th")) {
        mark("\t", state, offset + cell.length);
      }

      return `${cell}\t`;
    }

    case "THEAD":
    case "TBODY":
    case "TFOOT": {
      return plainChildren(node.children, state, offset);
    }

    case "BR": {
      return "\n";
    }

    case "P": {
      const previous = node.previousElementSibling;

      const gap =
        previous?.tagName === "P" &&
        previous.textContent?.trim() &&
        node.textContent?.trim() &&
        node.parentElement?.tagName !== "LI"
          ? "\n"
          : "";

      return `${gap}${plainChildren(node.childNodes, state, offset + gap.length)}\n`;
    }

    case "OL":
    case "UL": {
      return listText(node, "");
    }

    default: {
      const value = plainChildren(node.childNodes, state, offset);

      return BLOCK_TAGS.has(node.tagName) ||
        node.getAttribute("data-ck-math-display") === "true"
        ? `${value}\n`
        : value;
    }
  }
};

/** Trims the text to the span the selection covers. */
const plainText = (root: Node): string => {
  const state: PlainState = { end: 0, nextRowOffset: null, start: null };
  const value = plainChildren(root.childNodes, state);

  return state.start === null
    ? value.trim()
    : value.slice(0, state.start).trimStart() +
        value.slice(state.start, state.end) +
        value.slice(state.end).trimEnd();
};

const plainOf = (fragment: DocumentFragment, range: Range): string => {
  let value = plainText(fragment);

  const first = closestElement(
    range.startContainer,
    '[data-ck-markdown-copy="blank-lines"]'
  );

  if (first !== null) {
    const before = range.cloneRange();
    before.setEndAfter(first);
    value = before.toString() + value;
  }

  const last = closestElement(
    range.endContainer,
    '[data-ck-markdown-copy="blank-lines"]'
  );

  if (last !== null) {
    const after = range.cloneRange();
    after.setStartBefore(last);
    value += `\n${after.toString()}`;
  }

  return value;
};

// Ranges.

const wrapIn = (fragment: DocumentFragment, tag: string) => {
  const wrapper = (fragment.ownerDocument ?? document).createElement(tag);
  wrapper.append(...fragment.childNodes);
  fragment.append(wrapper);
};

/** A range inside the root. */
const serializeRange = (
  root: Element,
  source: Range,
  includeCollapsed = false,
  isElement = false
): SerializedCopy | null => {
  const range = source.cloneRange();

  if (!rangeInside(range, root)) {
    return null;
  }

  if (!includeCollapsed) {
    // Math widening is skipped: there is no math markup to widen to.
  }

  const marked = markedAncestor(range, root);
  const mode = copyMode(marked);

  if (mode === "exclude") {
    return null;
  }

  if (mode === "code-block") {
    const selected = range.toString();

    const whole =
      range.startContainer === range.endContainer &&
      range.startOffset === 0 &&
      range.endOffset === range.startContainer.childNodes.length &&
      (range.startContainer === marked ||
        closestElement(range.startContainer, "svg") === range.startContainer);

    const value =
      (whole || selected.length === 0
        ? marked?.getAttribute(TEXT_ATTRIBUTE)
        : null) ?? selected;

    const pre = preformatted(root.ownerDocument, value);

    const language = marked
      ?.querySelector("code[data-language]")
      ?.getAttribute("data-language");

    if (language !== null && language !== undefined) {
      pre.querySelector("code")?.setAttribute("data-language", language);
    }

    return { htmlText: pre.outerHTML, plainText: value };
  }

  if (mode === "blank-lines") {
    const value = range.toString();

    return { htmlText: "<p></p>".repeat(value.length), plainText: value };
  }

  const cloned = cloneRange(range);
  const link = closestElement(range.commonAncestorContainer, "a[href]");

  if (link !== null && root.contains(link)) {
    const wrapper = link.cloneNode(false);
    wrapper.appendChild(cloned);
    cloned.appendChild(wrapper);
  }

  if (includeCollapsed) {
    for (const hidden of cloned.querySelectorAll(
      '[inert][aria-hidden="true"]'
    )) {
      hidden.removeAttribute("aria-hidden");
    }
  }

  // Image replacement only acts on images inside host image components, so the rich
  // fragment is always the one built from the clone.
  const rich = richFragment(cloned);

  if (mode === "inline-code") {
    wrapIn(rich, "code");
  }

  const html = htmlOf(rich);

  if (isElement) {
    for (const code of rich.querySelectorAll(`code[${TEXT_ATTRIBUTE}]`)) {
      code.textContent = code.getAttribute(TEXT_ATTRIBUTE);
    }
  }

  const plain = plainOf(rich, range);

  return plain.length === 0 ? null : { htmlText: html, plainText: plain };
};

/** A selection that starts in the root and ends outside it. */
const serializeAcross = (source: Range): SerializedCopy | null => {
  const range = source.cloneRange();
  const rich = richFragment(cloneRange(range));
  const plain = plainOf(rich, range);

  return plain.length === 0
    ? null
    : { htmlText: htmlOf(rich), plainText: plain };
};

/** The current selection as html and text, or null. */
export const serializeSelection = (
  root: Element,
  selection: Selection | null = root.ownerDocument.getSelection()
): SerializedCopy | null => {
  if (
    selection === null ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (rangeInside(range, root)) {
    const editable = closestElement(range.startContainer, EDITABLE_SELECTOR);

    return editable !== null &&
      editable === closestElement(range.endContainer, EDITABLE_SELECTOR)
      ? null
      : serializeRange(root, range);
  }

  return root.contains(range.startContainer) ? serializeAcross(range) : null;
};

/** The whole content of an element as html and text. */
export const serializeElement = (root: Element): SerializedCopy | null => {
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);

  return serializeRange(root, range, false, true);
};

/** Writes the selection to a copy event as html and text. */
export const writeSelectionToCopyEvent = (
  event: ClipboardEvent,
  root: Element
): void => {
  if (event.defaultPrevented || event.clipboardData === null) {
    return;
  }

  const copy = serializeSelection(root);

  if (copy === null) {
    return;
  }

  event.clipboardData.setData("text/html", copy.htmlText);
  event.clipboardData.setData("text/plain", copy.plainText);
  event.preventDefault();
};

/**
 * Writes a map of formats: one `ClipboardItem`
 * with a blob per type, or only `text/plain` through `writeText` where the
 * async clipboard has no `write`. Resolves false when the clipboard is missing
 * or the write is rejected.
 */
export const writeClipboardFormats = async (
  formats: Record<string, string>
): Promise<boolean> => {
  const clipboard =
    typeof navigator === "undefined" ? undefined : navigator.clipboard;

  if (clipboard === undefined) {
    return false;
  }

  try {
    if ("write" in clipboard && typeof ClipboardItem !== "undefined") {
      await clipboard.write([
        new ClipboardItem(
          Object.fromEntries(
            Object.entries(formats).map(([type, value]) => [
              type,
              new Blob([value], { type }),
            ])
          )
        ),
      ]);
    } else {
      await clipboard.writeText(formats["text/plain"] ?? "");
    }

    return true;
  } catch {
    return false;
  }
};
