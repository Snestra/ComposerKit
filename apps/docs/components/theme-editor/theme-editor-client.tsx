"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { toDesignMd, toDtcg, toThemeCss } from "@/lib/theme/export.ts";
import {
  buildTheme,
  defaultSeeds,
  modes,
  parseDesignColors,
  ramp,
  roles,
} from "@/lib/theme/model.ts";
import type { Mode, PairResult, RoleId, Seeds } from "@/lib/theme/model.ts";
import { presets } from "@/lib/theme/presets.ts";

import { previewPages, ThemePreview } from "./theme-preview";

const hexColor = /^#[0-9a-f]{6}$/iu;

const download = (fileName: string, type: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const fileSlug = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "") || "theme";

interface SeedFieldProps {
  label: string;
  role: RoleId;
  value: string;
  onChange: (role: RoleId, value: string) => void;
}

const SeedField = ({ label, onChange, role, value }: SeedFieldProps) => {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }
  const valid = hexColor.test(draft);
  const textId = `seed-${role}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={textId}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          aria-label={`${label} color picker`}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
          onChange={(event) => onChange(role, event.target.value)}
          type="color"
          value={value}
        />
        <input
          aria-invalid={!valid}
          className="bg-fd-background h-9 w-full min-w-0 rounded-md border px-2 font-mono text-sm aria-invalid:border-red-600"
          id={textId}
          onChange={(event) => {
            setDraft(event.target.value);
            if (hexColor.test(event.target.value)) {
              onChange(role, event.target.value.toLowerCase());
            }
          }}
          spellCheck={false}
          value={draft}
        />
      </div>
      <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-sm">
        {ramp(value).map((step) => (
          <span
            className="flex-1"
            key={step}
            style={{ backgroundColor: step }}
            title={step}
          />
        ))}
      </div>
    </div>
  );
};

const formatPair = (pair: PairResult) =>
  `${pair.final.wcag.toFixed(2)}:1, Lc ${pair.final.apca.toFixed(1)}`;

const PairRow = ({
  pair,
  tokens,
}: {
  pair: PairResult;
  tokens: Map<string, string>;
}) => (
  <li className="flex items-center gap-3 py-1.5 text-sm">
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border font-semibold"
      style={{
        backgroundColor: tokens.get(pair.background),
        color: tokens.get(pair.text),
      }}
    >
      Aa
    </span>
    <span className="min-w-0 flex-1">
      <code className="break-all">{pair.text}</code> on{" "}
      <code className="break-all">{pair.background}</code>
      <span className="text-fd-muted-foreground block">
        {pair.ok
          ? `Before correction: ${pair.raw.wcag.toFixed(2)}:1, Lc ${pair.raw.apca.toFixed(1)}. Corrected to ${formatPair(pair)}.`
          : `Still ${formatPair(pair)}. Needs ${pair.limit.wcag}:1 and Lc ${pair.limit.apca.toFixed(1)}.`}
      </span>
    </span>
  </li>
);

export const ThemeEditorClient = ({ designMd }: { designMd: string }) => {
  const source = useMemo(() => parseDesignColors(designMd), [designMd]);
  const defaults = useMemo(() => defaultSeeds(source), [source]);
  const [seeds, setSeeds] = useState<Seeds>(defaults);
  const [name, setName] = useState("My brand");
  const [mode, setMode] = useState<Mode>("light");
  const [page, setPage] = useState<string>(previewPages[0]);
  const deferredSeeds = useDeferredValue(seeds);
  const theme = useMemo(
    () => buildTheme(source, deferredSeeds),
    [source, deferredSeeds]
  );
  const css = useMemo(() => toThemeCss(theme), [theme]);
  const tokenValues = useMemo(
    () => new Map(theme.tokens.map((token) => [token.name, token.value])),
    [theme]
  );
  const corrected = theme.pairs.filter((pair) => pair.corrected);
  const broken = theme.pairs.filter((pair) => !pair.ok);
  const changedCount = theme.tokens.filter(
    (token) => token.value !== token.source
  ).length;
  const setSeed = (role: RoleId, value: string) =>
    setSeeds((current) => ({ ...current, [role]: value }));

  return (
    <div className="not-prose flex flex-col gap-8">
      <section aria-labelledby="theme-seeds" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" id="theme-seeds">
            Seed colors
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="hover:bg-fd-accent rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setSeeds(defaults)}
              type="button"
            >
              Default
            </button>
            {presets.map((preset) => (
              <button
                className="hover:bg-fd-accent rounded-md border px-3 py-1.5 text-sm"
                key={preset.id}
                onClick={() => {
                  setSeeds({ ...defaults, ...preset.seeds });
                  setName(preset.label);
                }}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
          {roles.map((role) => (
            <SeedField
              key={role.id}
              label={role.label}
              onChange={setSeed}
              role={role.id}
              value={seeds[role.id]}
            />
          ))}
        </div>
        <p className="text-fd-muted-foreground text-sm">
          Each token takes its role&apos;s hue and chroma. Its lightness then
          moves until its luminance matches the default theme. The bar under
          each seed is its OKLCH ramp. {changedCount} of {theme.tokens.length}{" "}
          tokens differ from the default.
        </p>
      </section>

      <section aria-labelledby="theme-preview" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" id="theme-preview">
            Preview
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="theme-preview-page">
              Page
            </label>
            <select
              className="bg-fd-background h-8 rounded-md border px-2 text-sm"
              id="theme-preview-page"
              onChange={(event) => setPage(event.target.value)}
              value={page}
            >
              {previewPages.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <fieldset className="flex overflow-hidden rounded-md border">
              <legend className="sr-only">Preview mode</legend>
              {modes.map((option) => (
                <label
                  className="has-checked:bg-fd-primary has-checked:text-fd-primary-foreground cursor-pointer px-3 py-1 text-sm"
                  key={option}
                >
                  <input
                    checked={mode === option}
                    className="sr-only"
                    name="theme-preview-mode"
                    onChange={() => setMode(option)}
                    type="radio"
                    value={option}
                  />
                  {option === "light" ? "Light" : "Dark"}
                </label>
              ))}
            </fieldset>
          </div>
        </div>
        <ThemePreview css={css} mode={mode} page={page} />
      </section>

      <section aria-labelledby="theme-limits" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold" id="theme-limits">
          Contrast limits
        </h2>
        <p aria-live="polite" className="text-sm">
          {broken.length === 0
            ? `All ${theme.pairs.length} text and surface pairs meet WCAG 4.5:1 and their APCA limit.`
            : `${broken.length} pairs still break their limit, so export is off.`}{" "}
          {corrected.length === 0
            ? "No pair needed a correction."
            : `${corrected.length} pairs broke a limit before correction and were corrected.`}
        </p>
        <p className="text-fd-muted-foreground text-sm">
          The APCA limit is Lc 60, or the default theme&apos;s value where that
          is lower, so a brand theme never reads worse than the default.
        </p>
        {broken.length + corrected.length > 0 && (
          <ul className="divide-y">
            {[...broken, ...corrected].map((pair) => (
              <PairRow
                key={`${pair.text} ${pair.background}`}
                pair={pair}
                tokens={tokenValues}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="theme-export" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" id="theme-export">
          Export
        </h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="theme-name">
            Theme name
          </label>
          <input
            className="bg-fd-background h-9 max-w-sm rounded-md border px-2 text-sm"
            id="theme-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="bg-fd-primary text-fd-primary-foreground rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={!theme.exportable}
            onClick={() =>
              download(
                "DESIGN.md",
                "text/markdown",
                toDesignMd(designMd, theme, name.trim() || undefined)
              )
            }
            type="button"
          >
            Download DESIGN.md
          </button>
          <button
            className="hover:bg-fd-accent rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={!theme.exportable}
            onClick={() =>
              download(
                `${fileSlug(name)}.tokens.json`,
                "application/json",
                `${JSON.stringify(toDtcg(theme, name), null, 2)}\n`
              )
            }
            type="button"
          >
            Download DTCG tokens
          </button>
          <button
            className="hover:bg-fd-accent rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={!theme.exportable}
            onClick={() => download(`${fileSlug(name)}.css`, "text/css", css)}
            type="button"
          >
            Download theme CSS
          </button>
        </div>
      </section>
    </div>
  );
};
