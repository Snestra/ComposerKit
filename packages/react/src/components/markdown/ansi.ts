/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable eslint/complexity -- The parsers are single-pass state machines that follow the reference algorithms branch for branch. */
/* oxlint-disable eslint/prefer-named-capture-group -- The grammars are written with positional groups, as the reference parsers do. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */
/* oxlint-disable unicorn/prefer-code-point -- Stylistic; the code compares UTF-16 code units of the escape and BOM characters. */
/* oxlint-disable unicorn/prefer-number-coercion -- Stylistic; parseInt reads the leading digits of an escape parameter. */

/**
 * ANSI escape handling for the ANSI block.
 * Preprocessing (carriage-return overwrites, backspace removal) and the SGR
 * parsing of the `anser` library (MIT) in
 * its `ansiToJson({ use_classes: true, remove_empty: true })` mode.
 */

export interface AnsiSpan {
  bg: string | null;
  content: string;
  /** Only the last decoration is kept, as the span styles do. */
  decoration: string | null;
  fg: string | null;
}

const COLOR_CLASSES = [
  [
    "ansi-black",
    "ansi-red",
    "ansi-green",
    "ansi-yellow",
    "ansi-blue",
    "ansi-magenta",
    "ansi-cyan",
    "ansi-white",
  ],
  [
    "ansi-bright-black",
    "ansi-bright-red",
    "ansi-bright-green",
    "ansi-bright-yellow",
    "ansi-bright-blue",
    "ansi-bright-magenta",
    "ansi-bright-cyan",
    "ansi-bright-white",
  ],
] as const;

const ESC = String.fromCharCode(27);
const BACKSPACE = String.fromCharCode(8);
const ANY_ESCAPE = new RegExp(`${ESC}\\[[\\d;]*[A-Za-z]`, "g");
const SGR_ESCAPE = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const CLEAR_LINE = new RegExp(`${ESC}\\[(?:0|2)?K`);
const SPLIT_ESCAPE = new RegExp(`${ESC}\\[`);

const CHUNK =
  /^([!\u003C-\u003F]*)([\d;]*)([\u0020-\u002C]*[\u0040-\u007E])([\s\S]*)/m;

const BACKSPACE_PAIR = new RegExp(`[^\\n]${BACKSPACE}`, "gm");
const CRLF = /\r+\n/gm;
const OVERWRITE = /^([^\r\n]*)\r+([^\r\n]+)/gm;
const CARRIAGE_RETURN_TEXT = /\r./;

/** Removes `<char><backspace>` pairs until none are left. */
const applyBackspaces = (value: string): string => {
  let current = value;
  let next = current;

  do {
    current = next;
    next = current.replaceAll(BACKSPACE_PAIR, "");
  } while (next.length < current.length);

  return current;
};

/** Applies carriage-return overwrites line by line. */
const applyCarriageReturns = (value: string): string => {
  if (!value) {
    return "";
  }

  if (!value.includes("\r")) {
    return value;
  }

  let result = value.replaceAll(CRLF, "\n");

  while (CARRIAGE_RETURN_TEXT.test(result)) {
    result = result.replaceAll(
      OVERWRITE,
      (_whole, before: string, after: string) => {
        const visible = after.replaceAll(ANY_ESCAPE, "").length;
        const sgr = before.match(SGR_ESCAPE)?.join("") ?? "";
        let seen = 0;
        const clears = CLEAR_LINE.test(after);

        const kept = clears
          ? ""
          : before.replaceAll(
              new RegExp(`${ANY_ESCAPE.source}|.`, "g"),
              (piece) => {
                if (piece.startsWith(ESC)) {
                  return piece;
                }

                const keep = seen >= visible;
                seen += 1;

                return keep ? piece : "";
              }
            );

        return (
          sgr +
          after +
          (kept && SGR_ESCAPE.test(after) ? `${ESC}[0m` : "") +
          kept
        );
      }
    );
  }

  return result;
};

interface State {
  bg: string | null;
  decorations: string[];
  fg: string | null;
}

const removeDecoration = (state: State, name: string): void => {
  const at = state.decorations.indexOf(name);

  if (at !== -1) {
    state.decorations.splice(at, 1);
  }
};

const applyCode = (state: State, codes: string[], first: string): void => {
  const code = Number.parseInt(first, 10);

  if (Number.isNaN(code) || code === 0) {
    state.fg = null;
    state.bg = null;
    state.decorations = [];

    return;
  }

  const decorationOn: Record<number, string> = {
    1: "bold",
    2: "dim",
    3: "italic",
    4: "underline",
    5: "blink",
    7: "reverse",
    8: "hidden",
    9: "strikethrough",
  };

  const decorationOff: Record<number, string[]> = {
    21: ["bold"],
    22: ["bold", "dim"],
    23: ["italic"],
    24: ["underline"],
    25: ["blink"],
    27: ["reverse"],
    28: ["hidden"],
    29: ["strikethrough"],
  };

  const on = decorationOn[code];

  if (on) {
    state.decorations.push(on);

    return;
  }

  const off = decorationOff[code];

  if (off) {
    for (const name of off) {
      removeDecoration(state, name);
    }

    return;
  }

  if (code === 39) {
    state.fg = null;
  } else if (code === 49) {
    state.bg = null;
  } else if (code >= 30 && code < 38) {
    state.fg = COLOR_CLASSES[0][code % 10] ?? null;
  } else if (code >= 90 && code < 98) {
    state.fg = COLOR_CLASSES[1][code % 10] ?? null;
  } else if (code >= 40 && code < 48) {
    state.bg = COLOR_CLASSES[0][code % 10] ?? null;
  } else if (code >= 100 && code < 108) {
    state.bg = COLOR_CLASSES[1][code % 10] ?? null;
  } else if ((code === 38 || code === 48) && codes.length >= 1) {
    const foreground = code === 38;
    const mode = codes.shift();

    if (mode === "5" && codes.length >= 1) {
      const index = Number.parseInt(codes.shift() ?? "", 10);

      if (index >= 0 && index <= 255) {
        const name =
          index >= 16
            ? `ansi-palette-${index}`
            : (COLOR_CLASSES[Number(index > 7)][index % 8] ?? null);

        if (foreground) {
          state.fg = name;
        } else {
          state.bg = name;
        }
      }
    } else if (mode === "2" && codes.length >= 3) {
      const red = Number.parseInt(codes.shift() ?? "", 10);
      const green = Number.parseInt(codes.shift() ?? "", 10);
      const blue = Number.parseInt(codes.shift() ?? "", 10);
      const valid = [red, green, blue].every((v) => v >= 0 && v <= 255);

      if (valid) {
        if (foreground) {
          state.fg = "ansi-truecolor";
        } else {
          state.bg = "ansi-truecolor";
        }
      }
    }
  }
};

const processChunk = (chunk: string, state: State): AnsiSpan => {
  const result: AnsiSpan = {
    bg: null,
    content: chunk,
    decoration: null,
    fg: null,
  };

  const match = CHUNK.exec(chunk);

  if (!match) {
    return result;
  }

  result.content = match[4] ?? "";

  if ((match[1] ?? "") !== "" || match[3] !== "m") {
    return result;
  }

  const codes = (match[2] ?? "").split(";");

  while (codes.length > 0) {
    applyCode(state, codes, codes.shift() ?? "");
  }

  if (
    state.fg === null &&
    state.bg === null &&
    state.decorations.length === 0
  ) {
    return result;
  }

  let { fg, bg } = state;

  const decorations = state.decorations.filter((name) => {
    if (name === "reverse") {
      fg ??= COLOR_CLASSES[0][7];
      bg ??= COLOR_CLASSES[0][0];
      [fg, bg] = [bg, fg];

      return false;
    }

    return true;
  });

  result.fg = fg;
  result.bg = bg;
  result.decoration = decorations.at(-1) ?? null;

  return result;
};

/** The AnsiBlock data path: the spans for one terminal output. */
export const parseAnsi = (input: string | undefined | null): AnsiSpan[] => {
  const prepared = applyCarriageReturns(applyBackspaces(input ?? ""));
  const [lead = "", ...chunks] = prepared.split(SPLIT_ESCAPE);
  const state: State = { bg: null, decorations: [], fg: null };

  const spans: AnsiSpan[] = [
    { bg: null, content: lead, decoration: null, fg: null },
    ...chunks.map((chunk) => processChunk(chunk, state)),
  ];

  return spans.filter((span) => span.content !== "");
};
