"use client";

/*
 * The tokens of a diff, as the app's worker pool delivers them: a diff renders
 * as plain text first (the pending state), and the lines are replaced by their
 * tokens when the pool answers.
 *
 * The component tokenizes each side of the diff as one document.
 * A complete diff is two documents, the whole old file and the whole new file.
 * A partial diff is one document per hunk and side, because only those lines
 * are known. The old side is tokenized in the language of the old file name
 * and a diff whose both sides have no language stays plain. A
 * diff of more than `tokenizeMaxLength` lines on a side stays plain.
 */

import { useEffect, useState } from "react";

import type { FileDiffMetadata } from "./diff-model";
import type { RoleToken } from "./syntax-highlight";
import { languageForFileName } from "./syntax-languages";
import { requestRoleLines } from "./syntax-pool";

/** Library default `tokenizeMaxLineLength`. */
export const TOKENIZE_MAX_LINE_LENGTH = 1000;

/** Library default `tokenizeMaxLength`. */
export const TOKENIZE_MAX_LENGTH = 100_000;

export interface DiffTokens {
  additions: readonly (readonly RoleToken[] | undefined)[];
  deletions: readonly (readonly RoleToken[] | undefined)[];
}

interface MutableDiffTokens {
  additions: (readonly RoleToken[] | undefined)[];
  deletions: (readonly RoleToken[] | undefined)[];
}

export interface DiffTokenOptions {
  tokenizeMaxLength?: number;
  tokenizeMaxLineLength?: number;
}

interface Segment {
  language: string;
  lines: readonly string[];
  side: keyof DiffTokens;
  start: number;
}

const isPlainDiff = (diff: FileDiffMetadata) => {
  const language = diff.lang ?? languageForFileName(diff.name);

  const previous =
    diff.lang ??
    (diff.prevName === undefined ? "text" : languageForFileName(diff.prevName));

  return language === "text" && previous === "text";
};

const segmentsOf = (diff: FileDiffMetadata): Segment[] => {
  const additionLanguage = diff.lang ?? languageForFileName(diff.name);

  const deletionLanguage =
    diff.lang ?? languageForFileName(diff.prevName ?? diff.name);

  if (!diff.isPartial) {
    return [
      {
        language: deletionLanguage,
        lines: diff.deletionLines,
        side: "deletions",
        start: 0,
      },
      {
        language: additionLanguage,
        lines: diff.additionLines,
        side: "additions",
        start: 0,
      },
    ];
  }

  return diff.hunks.flatMap((hunk) => [
    {
      language: deletionLanguage,
      lines: diff.deletionLines.slice(
        hunk.deletionLineIndex,
        hunk.deletionLineIndex + hunk.deletionCount
      ),
      side: "deletions" as const,
      start: hunk.deletionLineIndex,
    },
    {
      language: additionLanguage,
      lines: diff.additionLines.slice(
        hunk.additionLineIndex,
        hunk.additionLineIndex + hunk.additionCount
      ),
      side: "additions" as const,
      start: hunk.additionLineIndex,
    },
  ]);
};

/** The tokens of a diff, or undefined while they are pending or when the diff stays plain. */
export const useDiffTokens = (
  diff: FileDiffMetadata,
  {
    tokenizeMaxLength = TOKENIZE_MAX_LENGTH,
    tokenizeMaxLineLength = TOKENIZE_MAX_LINE_LENGTH,
  }: DiffTokenOptions = {}
) => {
  const [result, setResult] = useState<{
    diff: FileDiffMetadata;
    tokens: DiffTokens;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const plain =
      Math.max(diff.additionLines.length, diff.deletionLines.length) >
        tokenizeMaxLength || isPlainDiff(diff);

    const load = async () => {
      const tokens: MutableDiffTokens = { additions: [], deletions: [] };

      try {
        await Promise.all(
          segmentsOf(diff).map(async (segment) => {
            if (segment.lines.length === 0) {
              return;
            }

            const lines = await requestRoleLines(
              segment.lines.join(""),
              segment.language,
              tokenizeMaxLineLength
            );

            for (const [index, line] of (lines ?? []).entries()) {
              if (index < segment.lines.length) {
                tokens[segment.side][segment.start + index] = line;
              }
            }
          })
        );

        if (!cancelled) {
          setResult({ diff, tokens });
        }
      } catch (error) {
        // The app logs a highlight error and keeps the plain lines (`onHighlightError`).
        console.error(error);
      }
    };

    if (!plain) {
      load().catch(console.error);
    }

    return () => {
      cancelled = true;
    };
  }, [diff, tokenizeMaxLength, tokenizeMaxLineLength]);

  return result !== null && result.diff === diff ? result.tokens : undefined;
};
