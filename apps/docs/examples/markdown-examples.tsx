"use client";

import { AnsiBlock } from "@workspace/react/components/markdown/ansi-block";
import { CodeEditor } from "@workspace/react/components/markdown/code-editor";
import {
  MarkdownFilePreview,
  MarkdownMetadata,
  MarkdownSurface,
} from "@workspace/react/components/markdown/metadata";
import type { HastNode } from "@workspace/react/components/markdown/parse";
import {
  MarkdownProse,
  MarkdownProseTable,
} from "@workspace/react/components/markdown/prose";
import type { HastRoot } from "@workspace/react/components/markdown/render";
import { Button } from "@workspace/react/components/ui/button";
import {
  CodeBlock,
  CodeBlockCode,
  CodeBlockCopyButton,
  CopyButton,
  Markdown,
  TextLink,
} from "@workspace/react/components/ui/markdown";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const Caption = ({ children }: { children: ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

const Toggle = ({
  label,
  onChange,
  pressed,
  testId,
}: {
  label: string;
  onChange: (next: boolean) => void;
  pressed: boolean;
  testId: string;
}) => (
  <Button
    aria-pressed={pressed}
    color={pressed ? "secondary" : "outline"}
    data-testid={testId}
    onClick={() => {
      onChange(!pressed);
    }}
    size="compact"
  >
    {label}
  </Button>
);

// ---------------------------------------------------------------------------
// Sample documents (short neutral text)
// ---------------------------------------------------------------------------

const TYPOGRAPHY = `# Heading one
## Heading two
### Heading three
#### Heading four
##### Heading five
###### Heading six

A paragraph with **strong**, *emphasis*, ~~strikethrough~~, ~single tildes~ that stay literal, \`inline code\`, and a [link](https://example.com).

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

1. One
2. Two
3. Three

- [x] Done task
- [ ] Open task

> A quoted paragraph.
>
> A second paragraph in the quote.

---

| Name | Count | Notes |
| :--- | ---: | :---: |
| Alpha | 1 | first<br>second line |
| Beta | 22 | plain |
| Gamma | 333 | plain |
`;

const CODE = `\`\`\`ts
export const add = (a: number, b: number): number => a + b; // sum
\`\`\`

\`\`\`json
{ "name": "example", "count": 3, "ok": true }
\`\`\`

\`\`\`bash
# list files
ls -la "$HOME" && echo done
\`\`\`

\`\`\`diff
@@ -1,2 +1,2 @@
-old line
+new line
\`\`\`

\`\`\`
plain text without a language
\`\`\`
`;

const LINKS = `Links: [secure](https://example.com), [relative](/gallery/markdown), [mail](mailto:person@example.com), [phone](tel:+15550100), [text](sms:+15550100), [image data](data:image/png;base64,AAAA), and [blocked](javascript:alert(1)).`;

const WITH_HTML = `Plain text before.

<div>raw html block</div>

A paragraph with inline <b>raw html</b> and a line<br>break.`;

const BREAKS = `first line
second line
third line`;

const DIRECTIVES = `Before.

:::note{tone=info}
Inside a container directive.
:::

An inline :badge[new]{kind=ok} directive and ::marker leaf below.

::marker[leaf label]

Unregistered :unknown[kept label] disappears.`;

const REFERENCES = `A [reference link][one] makes the document render as a single block.

[one]: https://example.com

A second paragraph.`;

const STREAM_SOURCE = `# Streaming

One short paragraph.

Two short paragraph.

Three short paragraph.

Four short paragraph.

Five short paragraph, still arriving word by word.

Six and last paragraph.
`;

const ARABIC = `# عنوان تجريبي

فقرة قصيرة من النص العربي مع \`كود\` و[رابط](https://example.com).

- عنصر أول
- عنصر ثان

> اقتباس قصير.
`;

const PROSE = `# Heading one
## Heading two
### Heading three
#### Heading four

A paragraph with **strong**, *emphasis*, ~~strikethrough~~ and \`inline code\`. Another sentence in the same paragraph so it wraps onto a second line when the column is narrow.

A second paragraph follows directly.

- Bullet item
  - Nested bullet
    - Third level
- Another bullet

1. First
2. Second

- [x] Done task
- [ ] Open task

> A quote with a bar at the start edge.

---

\`\`\`ts
const value = 1;
\`\`\`

| Name | Count | Notes |
| :--- | ---: | :---: |
| Alpha | 1 | first |
| Beta | 22 | second |

中文段落一。

中文段落二。
`;

const WIDE_TABLE = `| Column one | Column two | Column three | Column four | Column five | Column six |
| --- | --- | --- | --- | --- | --- |
| A long cell with a good deal of text so that the table is wider than its column | Second | Third | Fourth | Fifth | Sixth |
| Another long cell with a good deal of text so that the table is wider than its column | Second | Third | Fourth | Fifth | Sixth |
`;

const ESC = String.fromCodePoint(27);

const ANSI_SAMPLE = [
  `${ESC}[31mred${ESC}[0m ${ESC}[32mgreen${ESC}[0m ${ESC}[33myellow${ESC}[0m ${ESC}[34mblue${ESC}[0m ${ESC}[35mmagenta${ESC}[0m ${ESC}[36mcyan${ESC}[0m`,
  `${ESC}[90mbright black${ESC}[0m ${ESC}[91mbright red${ESC}[0m ${ESC}[92mbright green${ESC}[0m ${ESC}[97mbright white${ESC}[0m`,
  `${ESC}[41;37m white on red ${ESC}[0m ${ESC}[7mreverse${ESC}[0m ${ESC}[38;5;202mpalette${ESC}[0m ${ESC}[38;2;10;200;120mtruecolor${ESC}[0m`,
  `${ESC}[1mbold${ESC}[0m ${ESC}[2mdim${ESC}[0m ${ESC}[3mitalic${ESC}[0m ${ESC}[4munderline${ESC}[0m ${ESC}[9mstrike${ESC}[0m ${ESC}[8mhidden${ESC}[0m`,
  "progress 10%\rprogress 100%",
  `type\b\b\bpe done`,
].join("\n");

const FRONT_MATTER_SHORT = `---
title: Example document
tags: [alpha, beta, gamma]
draft: false
---

# Body heading

Body paragraph after the front matter.
`;

const FRONT_MATTER_LONG = `---
title: Example document
author: A. Person
version: "1.0"
tags:
  - alpha
  - beta
empty: ""
language: en
license: MIT
status: draft
created: 2026-01-01
updated: 2026-02-02
---

Body after a long front matter.
`;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

const TypographyExamples = () => (
  <Section
    description="The content styles of the app's markdown component: headings, paragraphs, lists, task lists, quotes, rules and a table whose cells convert a literal <br> to a line break."
    id="typography"
    title="Typography"
  >
    <div className="rounded-xl border p-4" data-testid="typography-content">
      <Markdown>{TYPOGRAPHY}</Markdown>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Code
// ---------------------------------------------------------------------------

const CodeExamples = () => {
  const [copyable, setCopyable] = useState(true);

  return (
    <Section
      description="Fenced code with the registered languages, the copy button (click it, the icon turns into a check for 1400ms and clicks are ignored meanwhile), and the block without the button."
      id="code"
      title="Code blocks and copy button"
    >
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="Copy buttons"
          onChange={setCopyable}
          pressed={copyable}
          testId="code-copyable"
        />
      </div>
      <div className="rounded-xl border p-4" data-testid="code-content">
        <Markdown copyableCodeBlocks={copyable}>{CODE}</Markdown>
      </div>
      <h3 className="text-sm font-semibold">Parts</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Caption>Line numbers</Caption>
          <CodeBlock data-testid="code-line-numbers">
            <CodeBlockCode language="python" showLineNumbers>
              {
                "def greet(name):\n    return f'hello {name}'\n\nprint(greet('world'))"
              }
            </CodeBlockCode>
            <CodeBlockCopyButton copyValue="def greet(name)" />
          </CodeBlock>
        </div>
        <div className="flex flex-col gap-2">
          <Caption>
            Copy button: normal, disabled, loading, with tooltip
          </Caption>
          <div className="flex items-center gap-2" data-testid="copy-buttons">
            <CopyButton
              aria-label="Copy normal"
              color="ghost"
              copyValue="normal"
              data-testid="copy-normal"
              size="iconMd"
              uniform
            />
            <CopyButton
              aria-label="Copy disabled"
              color="ghost"
              copyValue="disabled"
              disabled
              size="iconMd"
              uniform
            />
            <CopyButton
              aria-label="Copy loading"
              color="ghost"
              copyValue="loading"
              loading
              size="iconMd"
              uniform
            />
            <CopyButton
              aria-label="Copy with tooltip"
              color="ghost"
              copyValue="tooltip"
              size="iconMd"
              tooltip="Copy"
              uniform
            />
            <CopyButton
              color="outline"
              copyValue="labelled"
              data-testid="copy-labelled"
              size="compact"
            >
              {({ copied }) => (copied ? "Copied" : "Copy text")}
            </CopyButton>
          </div>
        </div>
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const LinkExamples = () => (
  <Section
    description="TextLink: underlined by default, underline on hover only, primary color, no destination (a span with role button) and http(s) destinations that open in a new tab. In markdown, the URL transform removes unsafe protocols and allows tel:, sms: and data:image/."
    id="links"
    title="Links"
  >
    <div
      className="flex flex-wrap items-center gap-4 rounded-xl border p-4"
      data-testid="links-text"
    >
      <TextLink data-testid="link-default" href="https://example.com">
        Default link
      </TextLink>
      <TextLink
        data-testid="link-hover"
        href="https://example.com"
        underline="hover"
      >
        Underline on hover
      </TextLink>
      <TextLink data-testid="link-primary" href="https://example.com" primary>
        Primary link
      </TextLink>
      <TextLink
        data-testid="link-primary-underlined"
        href="https://example.com"
        primary
        underline
      >
        Primary underlined
      </TextLink>
      <TextLink
        data-testid="link-none"
        underline={false}
        href="https://example.com"
      >
        No underline
      </TextLink>
      <TextLink data-testid="link-internal" href="/gallery/markdown">
        Internal link
      </TextLink>
      <TextLink data-testid="link-button">No destination</TextLink>
      <span className="text-sm text-text-muted">
        Inside secondary text:{" "}
        <TextLink href="https://example.com">hover me</TextLink>
      </span>
    </div>
    <div className="rounded-xl border p-4" data-testid="links-markdown">
      <Markdown>{LINKS}</Markdown>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const CountedParagraph = ({ children }: ComponentProps<"p">) => {
  const element = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const node = element.current;

    if (node) {
      node.dataset.renders = String(Number(node.dataset.renders ?? 0) + 1);
    }
  });

  return (
    <p
      className="after:ms-2 after:rounded-sm after:bg-text/10 after:px-1 after:text-xs after:content-['renders_'attr(data-renders)]"
      ref={element}
    >
      {children}
    </p>
  );
};

const COUNTED = { p: CountedParagraph };

const NoteDirective = ({
  children,
  tone,
}: {
  children?: ReactNode;
  tone?: string;
}) => (
  <div className="my-2 rounded-md border bg-text/5 px-3 py-2" data-tone={tone}>
    <strong>Note ({tone}):</strong> {children}
  </div>
);

const BadgeDirective = ({
  children,
  kind,
}: {
  children?: ReactNode;
  kind?: string;
}) => (
  <span className="rounded-sm bg-text/10 px-1" data-kind={kind}>
    {children}
  </span>
);

const MarkerDirective = ({ children }: { children?: ReactNode }) => (
  <span className="block font-mono text-xs">marker: {children}</span>
);

const DIRECTIVE_LIST = [
  { directiveName: "note", render: NoteDirective },
  { directiveName: "badge", render: BadgeDirective },
  { directiveName: "marker", render: MarkerDirective },
] as const;

const StreamingExample = () => {
  const [length, setLength] = useState(STREAM_SOURCE.length);
  const [streaming, setStreaming] = useState(false);
  const [incremental, setIncremental] = useState(true);
  const running = streaming && length < STREAM_SOURCE.length;

  useEffect(() => {
    const timer = running
      ? window.setInterval(() => {
          setLength((current) => Math.min(current + 6, STREAM_SOURCE.length));
        }, 120)
      : undefined;

    return () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  }, [running]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="stream-start"
          onClick={() => {
            setLength(0);
            setStreaming(true);
          }}
          size="compact"
        >
          Stream text
        </Button>
        <Toggle
          label="Incremental"
          onChange={setIncremental}
          pressed={incremental}
          testId="stream-incremental"
        />
      </div>
      <Caption>
        Each paragraph shows how many times it rendered. A block stops rendering
        again once two more blocks follow it, so with incremental rendering on
        the early paragraphs stop counting while the last ones grow. With it
        off, every paragraph renders on every chunk.
      </Caption>
      <div className="rounded-xl border p-4" data-testid="stream-content">
        <Markdown components={COUNTED} incremental={incremental}>
          {STREAM_SOURCE.slice(0, length)}
        </Markdown>
      </div>
    </div>
  );
};

const FeatureExamples = () => {
  const [gfm, setGfm] = useState(true);
  const [breaks, setBreaks] = useState(false);
  const [skipHtml, setSkipHtml] = useState(false);

  const [filter, setFilter] = useState<
    "allowed" | "disallowed" | "none" | "unwrap"
  >("none");

  return (
    <Section
      description="Parser options of the Markdown component: GFM on or off, hard line breaks, raw html as text or skipped, element filters, container, leaf and text directives, reference definitions (which render the document whole), and block-by-block streaming."
      id="features"
      title="Parsing and rendering options"
    >
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="GFM"
          onChange={setGfm}
          pressed={gfm}
          testId="feature-gfm"
        />
        <Toggle
          label="Break new lines"
          onChange={setBreaks}
          pressed={breaks}
          testId="feature-breaks"
        />
        <Toggle
          label="Skip html"
          onChange={setSkipHtml}
          pressed={skipHtml}
          testId="feature-skip-html"
        />
        {(
          [
            ["none", "No filter"],
            ["allowed", "Only p and strong"],
            ["disallowed", "No strong"],
            ["unwrap", "No strong, unwrapped"],
          ] as const
        ).map(([value, label]) => (
          <Button
            aria-pressed={filter === value}
            color={filter === value ? "secondary" : "outline"}
            data-testid={`feature-filter-${value}`}
            key={value}
            onClick={() => {
              setFilter(value);
            }}
            size="compact"
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-gfm-content"
        >
          <Caption>GFM: table, task list, strikethrough, autolink</Caption>
          <Markdown
            allowedElements={filter === "allowed" ? ["p", "strong"] : undefined}
            disallowedElements={
              filter === "disallowed" || filter === "unwrap"
                ? ["strong"]
                : undefined
            }
            gfm={gfm}
            unwrapDisallowed={filter === "unwrap"}
          >
            {
              "**Strong text** with ~~struck~~ and www.example.com\n\n- [x] done\n- [ ] open\n\n| a | b |\n| - | - |\n| 1 | 2 |"
            }
          </Markdown>
        </div>
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-breaks-content"
        >
          <Caption>Soft line breaks</Caption>
          <Markdown breakNewLines={breaks}>{BREAKS}</Markdown>
        </div>
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-html-content"
        >
          <Caption>Raw html</Caption>
          <Markdown skipHtml={skipHtml}>{WITH_HTML}</Markdown>
        </div>
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-directives-content"
        >
          <Caption>Directives</Caption>
          <Markdown directives={DIRECTIVE_LIST}>{DIRECTIVES}</Markdown>
        </div>
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-references-content"
        >
          <Caption>Reference definition: rendered whole</Caption>
          <Markdown components={COUNTED}>{REFERENCES}</Markdown>
        </div>
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          data-testid="feature-unstyled-content"
        >
          <Caption>Unstyled</Caption>
          <Markdown unstyled>{"# Unstyled heading\n\nA paragraph."}</Markdown>
        </div>
      </div>
      <h3 className="text-sm font-semibold">Streaming</h3>
      <StreamingExample />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// Prose (app flavour)
// ---------------------------------------------------------------------------

const ProseExamples = () => {
  const [animated, setAnimated] = useState(false);
  const [hideCode, setHideCode] = useState(false);
  const [wide, setWide] = useState(false);

  return (
    <Section
      description="The app flavour of the chat prose: every size derives from one font size and spacing is a quarter of it. Text styles and tones, the table container with a scroller that becomes a labelled region when the table is wider than its column, task lists with the checkbox, and the fade-in of list items, rules, rows and quotes."
      id="prose"
      title="Chat prose"
    >
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="Animated"
          onChange={setAnimated}
          pressed={animated}
          testId="prose-animated"
        />
        <Toggle
          label="Hide code blocks"
          onChange={setHideCode}
          pressed={hideCode}
          testId="prose-hide-code"
        />
        <Toggle
          label="Wide blocks"
          onChange={setWide}
          pressed={wide}
          testId="prose-wide"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4" data-testid="prose-default">
          <MarkdownProse
            allowWideBlocks={wide}
            animated={animated}
            hideCodeBlocks={hideCode}
            key={animated ? "animated" : "static"}
          >
            {PROSE}
          </MarkdownProse>
        </div>
        <div className="flex flex-col gap-4">
          {(["base", "large", "small", "inherit"] as const).map((kind) => (
            <div
              className="rounded-xl border p-4"
              data-testid={`prose-style-${kind}`}
              key={kind}
            >
              <MarkdownProse textStyle={{ kind }}>
                {`Text style **${kind}** with \`code\` and a [link](https://example.com).\n\n- item`}
              </MarkdownProse>
            </div>
          ))}
          {(["tertiary", "user-message", "inherit"] as const).map((tone) => (
            <div
              className="rounded-xl border p-4 text-text-notice"
              data-testid={`prose-tone-${tone}`}
              key={tone}
            >
              <MarkdownProse textStyle={{ linkColor: "currentColor", tone }}>
                {`Tone **${tone}** with \`code\` and a [link](https://example.com).\n\nSecond paragraph.`}
              </MarkdownProse>
            </div>
          ))}
        </div>
      </div>
      <div
        className="w-72 rounded-xl border p-4"
        data-testid="prose-narrow-table"
      >
        <Caption>Narrow column: the table scrolls inside a region</Caption>
        <MarkdownProse>{WIDE_TABLE}</MarkdownProse>
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// ANSI
// ---------------------------------------------------------------------------

const AnsiExamples = () => (
  <Section
    description="Terminal output: the normal and bright colors, background, reverse, palette and truecolor (which the stylesheet leaves unstyled), one decoration per run, carriage-return overwrites and backspaces."
    id="ansi"
    title="ANSI block"
  >
    <pre
      className="rounded-xl border p-4 text-sm whitespace-pre-wrap"
      data-testid="ansi-content"
    >
      <AnsiBlock>{ANSI_SAMPLE}</AnsiBlock>
    </pre>
  </Section>
);

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const MetadataExamples = () => (
  <Section
    description="A markdown file with front matter shows a metadata card above the body. More than 8 entries hide behind Show more."
    id="metadata"
    title="Markdown file preview"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <MarkdownSurface data-testid="metadata-short">
        <MarkdownFilePreview
          enableMetadataPreview
          markdown={FRONT_MATTER_SHORT}
        />
      </MarkdownSurface>
      <MarkdownSurface
        background="normal"
        className="border"
        data-testid="metadata-long"
      >
        <MarkdownFilePreview
          enableMetadataPreview
          markdown={FRONT_MATTER_LONG}
        />
      </MarkdownSurface>
      <MarkdownSurface data-testid="metadata-off">
        <MarkdownFilePreview markdown={FRONT_MATTER_SHORT} />
      </MarkdownSurface>
      <MarkdownSurface overflow="auto" data-testid="metadata-card">
        <div className="p-4">
          <MarkdownMetadata
            entries={[
              { key: "title", value: "Card only" },
              { key: "empty", value: "" },
              { key: "tags", value: ["one", "two", ""] },
            ]}
          />
        </div>
      </MarkdownSurface>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Right to left
// ---------------------------------------------------------------------------

const RtlExample = () => (
  <Section
    description="Right to left text in both flavours: lists and quotes mirror, the quote bar sits at the start edge, code stays left to right."
    id="rtl"
    title="Right to left"
  >
    <div className="grid gap-4 md:grid-cols-2" dir="rtl" lang="ar">
      <div className="rounded-xl border p-4" data-testid="rtl-content">
        <Markdown dir="rtl">{ARABIC}</Markdown>
      </div>
      <div className="rounded-xl border p-4" data-testid="rtl-prose">
        <MarkdownProse direction="rtl">{ARABIC}</MarkdownProse>
      </div>
    </div>
  </Section>
);

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3" data-testid={`${prefix}-content`}>
    <Markdown>{TYPOGRAPHY}</Markdown>
    <Markdown>{CODE}</Markdown>
    <MarkdownProse>{PROSE}</MarkdownProse>
    <pre className="text-sm whitespace-pre-wrap">
      <AnsiBlock>{ANSI_SAMPLE}</AnsiBlock>
    </pre>
    <MarkdownSurface>
      <MarkdownFilePreview
        enableMetadataPreview
        markdown={FRONT_MATTER_SHORT}
      />
    </MarkdownSurface>
  </div>
);

// A theme scope sets color-scheme, so every theme-dependent value inside
// resolves at its nearest scope, at any depth.
const AppearancePanel = ({
  id,
  nested,
  scope,
}: {
  id: string;
  nested?: Scope;
  scope: Scope;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-semibold" id={`${id}-heading`}>
      {scopeTitle(scope)}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <PanelContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

// ---------------------------------------------------------------------------
// Second review round: parsing, footnotes, plugins, streaming fade, links,
// the chat code block and the table actions
// ---------------------------------------------------------------------------

const BLOCK_INTERRUPTION = `| h |
| - |
row
- list item

| h2 |
| - |
row2
---

![**bold** alt](https://example.com/a.png) and ![plain](https://example.com/b.png "Title")`;

const FOOTNOTES = `A claim with a note[^1] and a second note[^note], then the first again[^1].

[^1]: The first note, with **strong** text.
[^note]: The second note.

    A second paragraph of the second note.

- A list item stays outside the notes.`;

const PLUGIN_SOURCE =
  "Text with **strong** words and a [link](https://example.com). ";

// A rehype plugin: the hast tree is the plugin's input, as in unified.
const rehypeStrongToMark = () => (tree: HastRoot) => {
  const walk = (nodes: HastNode[]) => {
    for (const node of nodes) {
      if (node.type === "element") {
        if (node.tagName === "strong") {
          node.tagName = "mark";
        }

        walk(node.children);
      }
    }
  };

  walk(tree.children);
};

const FADE_CHUNKS = [
  "# Streaming a reply\n\n",
  "The first paragraph arrives ",
  "word by word, and each new ",
  "segment fades in as it lands.\n\n",
  "- A list item whose marker fades\n",
  "- A second item\n",
  "- A third item\n\n",
  "A task list follows:\n\n- [ ] A task item\n\n",
  "```ts\nconst partial = 1;\n",
  "const done = true;\n```\n\n",
  "The last paragraph.",
];

const FadeRun = ({ adaptive }: { adaptive: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((value) => {
        if (value >= FADE_CHUNKS.length) {
          clearInterval(timer);

          return value;
        }

        return value + 1;
      });
    }, 450);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const streaming = count < FADE_CHUNKS.length;

  return (
    <>
      <Caption>
        {streaming ? `Streaming ${count} of ${FADE_CHUNKS.length}` : "Done"}
      </Caption>
      <div className="rounded-xl border p-4">
        <MarkdownProse
          adaptiveStreaming={adaptive}
          fadeSegmentDelayMs={60}
          isStreaming={streaming}
        >
          {FADE_CHUNKS.slice(0, count).join("")}
        </MarkdownProse>
      </div>
    </>
  );
};

const FadeStreaming = ({ adaptive }: { adaptive: boolean }) => {
  const [run, setRun] = useState(0);

  return (
    <div className="flex flex-col gap-2" data-testid="fade-stream">
      <div className="flex items-center gap-2">
        <Button
          color="outline"
          data-testid="fade-restart"
          onClick={() => {
            setRun((value) => value + 1);
          }}
          size="compact"
        >
          Stream again
        </Button>
      </div>
      <FadeRun adaptive={adaptive} key={run} />
    </div>
  );
};

const CHAT_CODE = `Prose with code blocks:

\`\`\`ts
export const add = (a: number, b: number): number => a + b; // a long line that does not fit the column of this card and needs the wrap button
\`\`\`

\`\`\`python
print("hello")
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Start] --> B[End]
\`\`\`

\`\`\`
no language
\`\`\`

\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18"/></svg>
\`\`\``;

const TALL_TABLE = `| Name | Count | Notes |
| :--- | ---: | :---: |
${Array.from({ length: 24 }, (_, index) => `| Row ${index + 1} | ${index + 1} | note ${index + 1} |`).join("\n")}
`;

const StickyHeaderTable = ({ children }: { children?: ReactNode }) => (
  <MarkdownProseTable allowWideBlocks stickyHeader>
    {children}
  </MarkdownProseTable>
);

const PlainTable = ({ children }: { children?: ReactNode }) => (
  <MarkdownProseTable allowWideBlocks>{children}</MarkdownProseTable>
);

const Round2Examples = () => {
  const [adaptive, setAdaptive] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [copyLog, setCopyLog] = useState("");

  return (
    <Section
      description="Parsing fixes, footnotes, the plugin props, the streaming text fade, prose links, the chat code block and the table copy and expand actions."
      id="round2"
      title="Footnotes, plugins, streaming fade, links, chat code block, table actions"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4" data-testid="r2-interruption">
          <Caption>
            A table ends at a list item or a rule; an image keeps its formatted
            description
          </Caption>
          <Markdown>{BLOCK_INTERRUPTION}</Markdown>
        </div>
        <div className="rounded-xl border p-4" data-testid="r2-footnotes">
          <Caption>Footnotes (default labels)</Caption>
          <Markdown>{FOOTNOTES}</Markdown>
        </div>
        <div
          className="rounded-xl border p-4"
          data-testid="r2-footnotes-options"
        >
          <Caption>Footnotes with remarkRehypeOptions</Caption>
          <Markdown
            remarkRehypeOptions={{
              clobberPrefix: "demo-",
              footnoteBackContent: "back",
              footnoteBackLabel: (reference, rereference) =>
                `Return to ${reference + 1}.${rereference}`,
              footnoteLabel: "Notes",
              footnoteLabelProperties: {},
              footnoteLabelTagName: "h3",
            }}
          >
            {FOOTNOTES}
          </Markdown>
        </div>
        <div className="rounded-xl border p-4" data-testid="r2-plugins">
          <Caption>rehypePlugins turns strong into mark</Caption>
          <Markdown rehypePlugins={[rehypeStrongToMark]}>
            {PLUGIN_SOURCE}
          </Markdown>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          label="Adaptive streaming"
          onChange={setAdaptive}
          pressed={adaptive}
          testId="r2-adaptive"
        />
      </div>
      <FadeStreaming adaptive={adaptive} key={String(adaptive)} />
      <div className="grid gap-4 md:grid-cols-2">
        {(["decorated", "inline-mention", "underlined-text"] as const).map(
          (appearance) => (
            <div
              className="rounded-xl border p-4"
              data-testid={`r2-links-${appearance}`}
              key={appearance}
            >
              <Caption>externalLinkAppearance {appearance}</Caption>
              <MarkdownProse externalLinkAppearance={appearance}>
                A [web link](https://example.com/path?query=1) and a [second
                link](https://example.org).
              </MarkdownProse>
            </div>
          )
        )}
        <div className="rounded-xl border p-4" data-testid="r2-code">
          <Caption>Chat code block</Caption>
          <MarkdownProse>{CHAT_CODE}</MarkdownProse>
        </div>
        <div className="rounded-xl border p-4" data-testid="r2-code-forced">
          <Caption>Word wrap forced, sticky header</Caption>
          <MarkdownProse forceCodeBlockWordWrap stickyCodeBlockHeader>
            {CHAT_CODE}
          </MarkdownProse>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          label="Sticky header"
          onChange={setSticky}
          pressed={sticky}
          testId="r2-sticky"
        />
        <span
          className="text-xs text-muted-foreground"
          data-testid="r2-copy-log"
        >
          {copyLog}
        </span>
      </div>
      <div
        className="w-80 rounded-xl border p-4"
        data-testid="r2-table-actions"
      >
        <Caption>Table actions: hover for copy and expand</Caption>
        <MarkdownProse
          tableActions={{
            onCopy: () => {
              setCopyLog("onCopy ran");
            },
          }}
        >
          {WIDE_TABLE}
        </MarkdownProse>
      </div>
      <div
        className="[container-type:inline-size] rounded-xl border p-4 [--ck-chat-content-margin:24px] [--ck-chat-content-max-width:20rem] [--ck-chat-wide-block-inline-shift:0px] [--ck-toolbar-padding:0px]"
        data-testid="r2-wide"
      >
        <Caption>Wide block in a 20rem column inside a wider container</Caption>
        <div className="max-w-[20rem]" data-testid="r2-wide-column">
          <MarkdownProse allowWideBlocks>{WIDE_TABLE}</MarkdownProse>
        </div>
      </div>
      <div className="w-80 rounded-xl border p-4" data-testid="r2-sticky-table">
        <Caption>Tall table: expand it to see the header stay in view</Caption>
        <MarkdownProse
          components={{ table: sticky ? StickyHeaderTable : PlainTable }}
        >
          {TALL_TABLE}
        </MarkdownProse>
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// requirement:markdown-math, requirement:markdown-code-editor,
// requirement:markdown-prism-grammars
// ---------------------------------------------------------------------------

const MATH_SOURCE = String.raw`Inline math with two dollars: $$E = mc^2$$ and a single $dollar$ pair stays text.

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

A parse error keeps the source: $$\frac{1}{$$`;

const MathExamples = () => (
  <Section
    description="includeMath loads KaTeX on first use. Only $$ blocks and runs are math."
    id="math"
    title="requirement:markdown-math"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border p-4" data-testid="math-prose-on">
        <Caption>MarkdownProse</Caption>
        <MarkdownProse>{MATH_SOURCE}</MarkdownProse>
      </div>
      <div className="rounded-xl border p-4" data-testid="math-prose-off">
        <Caption>MarkdownProse, renderMath off</Caption>
        <MarkdownProse renderMath={false}>{MATH_SOURCE}</MarkdownProse>
      </div>
      <div className="rounded-xl border p-4" data-testid="math-on">
        <Caption>includeMath</Caption>
        <Markdown includeMath>{MATH_SOURCE}</Markdown>
      </div>
      <div className="rounded-xl border p-4" data-testid="math-off">
        <Caption>includeMath off</Caption>
        <Markdown>{MATH_SOURCE}</Markdown>
      </div>
    </div>
  </Section>
);

const PROSE_LINKS = `Visit [the example site](https://example.com/docs) or open [a relative page](/gallery/markdown).`;

const WRITING_BLOCKS = `A fence without a language:

\`\`\`
Dear team,

Here is the draft of the announcement.
\`\`\`

A markdown fence:

\`\`\`md
# Draft

- first point
- second point
\`\`\`

A code fence stays a code block:

\`\`\`ts
export const one = 1;
\`\`\`
`;

const ProseBlocksExamples = () => {
  const [added, setAdded] = useState<string | null>(null);

  return (
    <Section
      description="Links in prose go through the link component. Under the restricted policy a click asks before the link opens. Code fences without a language, or with text, md or markdown, render as writing blocks."
      id="prose-blocks"
      title="Chat prose links and writing blocks"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4" data-testid="prose-links-allow">
          <Caption>Policy allow</Caption>
          <MarkdownProse>{PROSE_LINKS}</MarkdownProse>
        </div>
        <div
          className="rounded-xl border p-4"
          data-testid="prose-links-restricted"
        >
          <Caption>Policy restricted</Caption>
          <MarkdownProse externalResourcePolicy="restricted">
            {PROSE_LINKS}
          </MarkdownProse>
        </div>
      </div>
      <div className="rounded-xl border p-4" data-testid="prose-writing-blocks">
        <MarkdownProse
          onAddSelectedTextToChat={(text) => {
            setAdded(text);
          }}
          renderCodeBlocksAsWritingBlocks
          renderCodeBlocksImmediately
        >
          {WRITING_BLOCKS}
        </MarkdownProse>
        <Caption>
          <span data-testid="prose-writing-added">{added ?? "none"}</span>
        </Caption>
      </div>
    </Section>
  );
};

const EDITOR_SOURCE = `export const total = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0);

// A long comment line so wrapping has something to wrap: the editor keeps one line per source line until wrapping is on.
`;

const BASH_SOURCE = `#!/bin/bash
# count the lines
for file in "$@"; do
  echo "$file: $(wc -l < "$file")"
done`;

const PYTHON_SOURCE = `def total(values):
    # sum the values
    label = "total"
    return label, sum(values) + 1`;

const LATEX_SOURCE = String.raw`\documentclass{article}
\begin{document}
Euler: $e^{i\pi} + 1 = 0$ % a comment
\end{document}`;

const CodeEditorExamples = () => {
  const [wrap, setWrap] = useState(false);
  const [code, setCode] = useState(EDITOR_SOURCE);

  return (
    <Section
      description="Click into an editor and press Mod-f for the find panel. The key bindings are the CodeMirror default, fold, completion, history, indent-with-Tab and find keymaps."
      id="code-editor"
      title="requirement:markdown-code-editor"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          label="Wrap lines"
          onChange={setWrap}
          pressed={wrap}
          testId="editor-wrap"
        />
        <Caption>{code.length} characters</Caption>
      </div>
      <div
        className="relative rounded-md border border-border"
        data-testid="editor-plain"
      >
        <CodeEditor
          autoFocus={false}
          code={code}
          language="ts"
          onChange={setCode}
          wrapLines={wrap}
        />
      </div>
      <div
        className="relative rounded-md border border-border"
        data-testid="editor-empty"
      >
        <CodeEditor autoFocus={false} code="" placeholder="" />
      </div>
      <div
        className="relative rounded-md border border-border"
        data-testid="editor-bash"
      >
        <CodeEditor autoFocus={false} code={BASH_SOURCE} language="bash" />
      </div>
      <div
        className="relative rounded-md border border-border"
        data-testid="editor-python"
      >
        <CodeEditor autoFocus={false} code={PYTHON_SOURCE} language="python" />
      </div>
      <div
        className="relative rounded-md border border-border"
        data-testid="editor-latex"
      >
        <CodeEditor autoFocus={false} code={LATEX_SOURCE} language="latex" />
      </div>
    </Section>
  );
};

const PRISM_SAMPLES = {
  bash: 'echo "hi" | grep -c h # count',
  c: "int main(void) { return 0; }",
  clike: "class A { int x = 1; }",
  css: "a:hover { color: #fff; margin: 0 auto; }",
  diff: "- old line\n+ new line",
  docker: "FROM node:20\nRUN npm ci",
  go: 'func main() { fmt.Println("hi") }',
  java: "public class A { void run() {} }",
  javascript: "const f = (a) => a + 1; // add",
  json: '{"a": [1, true, null]}',
  jsonc: '{"a": 1}',
  jsx: 'const a = <div className="x">{y}</div>;',
  kotlin: 'fun main() { println("hi") }',
  markdown: "# Title\n\n- item with `code`",
  markup: '<a href="/x">link</a>',
  php: "<?php echo strlen($a); ?>",
  python: "def f(x):\n    return x ** 2",
  ruby: "def f(x) = x.map { |y| y + 1 }",
  scss: "$c: red; a { &:hover { color: $c; } }",
  sql: "SELECT id FROM t WHERE n > 1;",
  toml: "[a]\nb = true",
  tsx: "const A = ({ n }: { n: number }) => <b>{n}</b>;",
  typescript: "type T = { a: string }; const t: T = { a: 'x' };",
  yaml: "a:\n  - b\n  - c: 1",
} as const satisfies Record<string, string>;

const PrismExamples = () => (
  <Section
    description="The 24 registered languages tokenized by Prism grammars (refractor)."
    id="prism"
    title="requirement:markdown-prism-grammars"
  >
    <div className="grid gap-4 md:grid-cols-2" data-testid="prism-languages">
      {Object.entries(PRISM_SAMPLES).map(([language, sample]) => (
        <div className="flex flex-col gap-1" key={language}>
          <Caption>{language}</Caption>
          <CodeBlock data-testid={`prism-${language}`}>
            <CodeBlockCode language={language}>{sample}</CodeBlockCode>
          </CodeBlock>
        </div>
      ))}
    </div>
  </Section>
);

const AppearanceExamples = () => (
  <Section
    description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested parts follow the nearest scope."
    id="appearance"
    title="Light and dark"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <AppearancePanel id="appearance-light" scope="light" />
      <AppearancePanel id="appearance-dark" scope="dark" />
      <AppearancePanel id="appearance-dark-light" nested="light" scope="dark" />
      <AppearancePanel id="appearance-light-dark" nested="dark" scope="light" />
    </div>
  </Section>
);

const MarkdownGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Markdown</h1>
      <AppearanceControl id="markdown-appearance" />
    </header>
    <TypographyExamples />
    <CodeExamples />
    <LinkExamples />
    <FeatureExamples />
    <ProseExamples />
    <ProseBlocksExamples />
    <Round2Examples />
    <MathExamples />
    <CodeEditorExamples />
    <PrismExamples />
    <AnsiExamples />
    <MetadataExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { MarkdownGalleryExample };
