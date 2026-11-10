"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role, shadcn/no-inline-styles -- The callers give a static mention role=group and an interactive one role=button with tabIndex 0, and the style colour is a MentionPill prop that feeds --ck-mention-color. */

import {
  InlineMention,
  MentionPill,
  MentionText,
  UnderlinedMentionScope,
} from "@workspace/react/components/ui/mention";
import type { MentionTone } from "@workspace/react/components/ui/mention";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import { FileText, Folder, Globe } from "lucide-react";
import Link from "next/link";

const tooltipText = "Control desktop apps with the assistant";
const loadingLabel = "Loading app";
const longRun = 6;

const breakableUrl =
  "https://example.com/a/very/long/path/that/must/wrap/inside/a/narrow/column?query=breakable-url";

const tones: readonly MentionTone[] = [
  "accent",
  "subtle-accent",
  "neutral",
  "composer-reference",
  "file-reference",
];

const repeated = (label: string) =>
  Array.from({ length: longRun }, () => label).join(" ");

const Section = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <section aria-label={title} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold">{title}</h2>
    {children}
  </section>
);

const MentionGalleryExample = () => (
  <TooltipProvider>
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
      <header className="flex items-center gap-4">
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">Mention</h1>
      </header>
      <Section title="layout inline-flow">
        <p>
          <InlineMention icon={FileText}>inline-flow</InlineMention>{" "}
          <InlineMention icon={Folder}>{repeated("inline-flow")}</InlineMention>{" "}
          <InlineMention icon={FileText}>
            {repeated("inline-flow")}
          </InlineMention>
        </p>
        <p>
          <InlineMention>no icon</InlineMention>
        </p>
      </Section>
      <Section title="breakable-url">
        <p className="max-w-xs">
          <InlineMention data-ck-breakable-url="" text-link-href={breakableUrl}>
            {breakableUrl}
          </InlineMention>
        </p>
      </Section>
      <Section title="layout wrapped-label">
        <p className="max-w-xs">
          <InlineMention icon={FileText} layout="wrapped-label">
            {repeated("wrapped-label")}
          </InlineMention>
        </p>
      </Section>
      <Section title="layout selection-pill">
        <p className="flex flex-wrap items-center gap-2">
          <InlineMention icon={FileText} layout="selection-pill">
            selection-pill
          </InlineMention>
          <InlineMention icon={Folder} layout="selection-pill">
            {repeated("selection-pill")}
          </InlineMention>
        </p>
      </Section>
      <Section title="layout thumbnail">
        <p>
          <InlineMention
            icon={<Globe className="size-full" />}
            iconSizing="authored"
            layout="thumbnail"
          >
            thumbnail
          </InlineMention>
        </p>
      </Section>
      <Section title="appearance pill">
        <p className="flex max-w-sm flex-wrap items-center gap-2">
          <InlineMention appearance="pill" icon={FileText}>
            pill
          </InlineMention>
          <InlineMention appearance="pill" icon={Folder}>
            {repeated("pill")}
          </InlineMention>
        </p>
        <table className="w-fit">
          <tbody>
            <tr>
              <td>
                <InlineMention appearance="pill" icon={FileText}>
                  td pill
                </InlineMention>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
      <Section title="appearance underlined-text">
        <p>
          <UnderlinedMentionScope appearance="underlined-text">
            <span>
              <InlineMention appearance="underlined-text" icon={FileText}>
                underlined-text
              </InlineMention>{" "}
              <MentionText>underlined-text</MentionText>
            </span>
          </UnderlinedMentionScope>
        </p>
      </Section>
      <Section title="tone">
        <p className="flex flex-wrap items-center gap-4">
          {tones.map((tone) => (
            <InlineMention icon={FileText} key={tone} tone={tone}>
              {tone}
            </InlineMention>
          ))}
        </p>
      </Section>
      <Section title="font-weight">
        <p>
          <InlineMention fontWeight="medium">medium</InlineMention>{" "}
          <InlineMention fontWeight="inherit">inherit</InlineMention>
        </p>
      </Section>
      <Section title="brand-color">
        <p className="flex flex-wrap items-center gap-4">
          <MentionPill brandColor="#c2410c" icon={Globe} text="brand-color" />
          <MentionPill
            icon={Globe}
            style={{ color: "light-dark(#7c3fda, #b793f4)" }}
            text="style.color"
          />
        </p>
      </Section>
      <Section title="interactive">
        <p className="flex flex-wrap items-center gap-4">
          <MentionPill icon={FileText} role="group" text="role=group" />
          <MentionPill
            icon={FileText}
            interactive
            role="button"
            tabIndex={0}
            text="role=button"
          />
          <InlineMention
            icon={FileText}
            interactive
            role="button"
            tabIndex={0}
            underlineOnHover={false}
          >
            underline-on-hover
          </InlineMention>
        </p>
      </Section>
      <Section title="tooltipText">
        <p className="flex flex-wrap items-center gap-4">
          <MentionPill
            ariaLabel={loadingLabel}
            icon={Globe}
            interactive
            role="button"
            tabIndex={0}
            text={loadingLabel}
            tooltipText={tooltipText}
          />
          <MentionPill
            icon={Globe}
            role="group"
            text="role=group"
            tooltipText={tooltipText}
          />
        </p>
      </Section>
    </main>
  </TooltipProvider>
);

export { MentionGalleryExample };
