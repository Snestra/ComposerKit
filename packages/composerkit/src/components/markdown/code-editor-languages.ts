/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables are typed by their string keys. */
/* oxlint-disable eslint/complexity, eslint/func-style, eslint/no-nested-ternary, eslint/no-use-before-define -- The shell tokenizers call one another and follow the branches. */
/* oxlint-disable eslint/prefer-named-capture-group -- The heredoc pattern keeps the positional groups. */
/* oxlint-disable typescript/prefer-nullish-coalescing -- An empty quoted heredoc marker falls through to the second group. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test stream results by truthiness. */
/* oxlint-disable unicorn/prefer-regexp-test -- CodeMirror's stream.match consumes the match; the patterns are not tests. */

import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { vue } from "@codemirror/lang-vue";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import type { StreamParser, StringStream } from "@codemirror/language";
import {
  c,
  csharp,
  dart,
  kotlin,
  objectiveC,
  scala,
} from "@codemirror/legacy-modes/mode/clike";
import { clojure } from "@codemirror/legacy-modes/mode/clojure";
import { commonLisp } from "@codemirror/legacy-modes/mode/commonlisp";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { oCaml } from "@codemirror/legacy-modes/mode/mllike";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { powerShell } from "@codemirror/legacy-modes/mode/powershell";
import { r } from "@codemirror/legacy-modes/mode/r";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { vb } from "@codemirror/legacy-modes/mode/vb";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";

/** Language modes from ``. */

type Tokenizer = (stream: StringStream, state: ShellState) => string | null;

interface ShellState {
  tokens: Tokenizer[];
}

const ATOMS = ["true", "false"];

const KEYWORDS = [
  "if",
  "then",
  "do",
  "else",
  "elif",
  "while",
  "until",
  "for",
  "in",
  "esac",
  "fi",
  "fin",
  "fil",
  "done",
  "exit",
  "set",
  "unset",
  "export",
  "function",
];

const BUILTINS =
  "ab.awk.bash.beep.cat.cc.cd.chown.chmod.chroot.clear.cp.curl.cut.diff.echo.find.gawk.gcc.get.git.grep.hg.kill.killall.ln.ls.make.mkdir.openssl.mv.nc.nl.node.npm.ping.ps.restart.rm.rmdir.sed.service.sh.shopt.shred.source.sort.sleep.ssh.start.stop.su.sudo.svn.tee.telnet.top.touch.vi.vim.wall.wc.wget.who.write.yes.zsh".split(
    "."
  );

const WORD_STYLES = new Map<string, string>([
  ...ATOMS.map((word): [string, string] => [word, "atom"]),
  ...KEYWORDS.map((word): [string, string] => [word, "keyword"]),
  ...BUILTINS.map((word): [string, string] => [word, "builtin"]),
]);

const WORD = /\w/u;
const WORD_OR_DASH = /[\w-]/u;
const DIGIT = /\d/u;
const QUOTE = /['"]/u;
const OPENER = /['"({]/u;
const HEREDOC_MARKER = /^<-?\s*(?:['"]([^'"]*)['"]|([^'"\s]*))/u;

const tokenize: Tokenizer = (stream, state) =>
  (state.tokens[0] ?? tokenBase)(stream, state);

const tokenHereDoc =
  (delimiter: string): Tokenizer =>
  (stream, state) => {
    if (stream.sol() && stream.string === delimiter) {
      state.tokens.shift();
    }

    stream.skipToEnd();

    return "string.special";
  };

const tokenStringStart =
  (quote: string, style: string): Tokenizer =>
  (stream, state) => {
    state.tokens[0] = tokenString(quote, style);
    stream.next();

    return tokenize(stream, state);
  };

const tokenDollar: Tokenizer = (stream, state) => {
  if (state.tokens.length > 1) {
    stream.eat("$");
  }

  const char = stream.next() ?? "";

  if (OPENER.test(char)) {
    state.tokens[0] = tokenString(
      char,
      char === "(" ? "quote" : char === "{" ? "def" : "string"
    );

    return tokenize(stream, state);
  }

  if (!DIGIT.test(char)) {
    stream.eatWhile(WORD);
  }

  state.tokens.shift();

  return "def";
};

function tokenString(quote: string, style: string): Tokenizer {
  let close = quote;

  if (quote === "(") {
    close = ")";
  } else if (quote === "{") {
    close = "}";
  }

  return (stream, state) => {
    let escaped = false;
    let char = stream.next();

    while (char !== null && char !== undefined) {
      if (char === close && !escaped) {
        state.tokens.shift();
        break;
      }

      if (
        char === "$" &&
        !escaped &&
        quote !== "'" &&
        stream.peek() !== close
      ) {
        escaped = true;
        stream.backUp(1);
        state.tokens.unshift(tokenDollar);
        break;
      }

      if (!escaped && quote !== close && char === quote) {
        state.tokens.unshift(tokenString(quote, style));

        return tokenize(stream, state);
      }

      if (!escaped && QUOTE.test(char) && !QUOTE.test(quote)) {
        state.tokens.unshift(tokenStringStart(char, "string"));
        stream.backUp(1);
        break;
      }

      escaped = !escaped && char === "\\";
      char = stream.next();
    }

    return style;
  };
}

function tokenBase(stream: StringStream, state: ShellState): string | null {
  if (stream.eatSpace()) {
    return null;
  }

  const atLineStart = stream.sol();
  const char = stream.next() ?? "";

  if (char === "\\") {
    stream.next();

    return null;
  }

  if (char === "'" || char === '"' || char === "`") {
    state.tokens.unshift(tokenString(char, char === "`" ? "quote" : "string"));

    return tokenize(stream, state);
  }

  if (char === "#") {
    if (atLineStart && stream.eat("!")) {
      stream.skipToEnd();

      return "meta";
    }

    stream.skipToEnd();

    return "comment";
  }

  if (char === "$") {
    state.tokens.unshift(tokenDollar);

    return tokenize(stream, state);
  }

  if (char === "+" || char === "=") {
    return "operator";
  }

  if (char === "-") {
    stream.eat("-");
    stream.eatWhile(WORD);

    return "attribute";
  }

  if (char === "<") {
    if (stream.match("<<")) {
      return "operator";
    }

    const marker = stream.match(HEREDOC_MARKER);

    if (Array.isArray(marker)) {
      state.tokens.unshift(tokenHereDoc(marker[1] || marker[2] || ""));

      return "string.special";
    }
  }

  if (DIGIT.test(char)) {
    stream.eatWhile(DIGIT);

    if (stream.eol() || !WORD.test(stream.peek() ?? "")) {
      return "number";
    }
  }

  stream.eatWhile(WORD_OR_DASH);

  const word = stream.current();

  if (stream.peek() === "=" && WORD.test(word)) {
    return "def";
  }

  return WORD_STYLES.get(word) ?? null;
}

const shellParser: StreamParser<ShellState> = {
  languageData: {
    autocomplete: [...ATOMS, ...KEYWORDS, ...BUILTINS],
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
    commentTokens: { line: "#" },
  },
  name: "shell",
  startState: () => ({ tokens: [] }),
  token: (stream, state) => tokenize(stream, state),
};

const shell = (): LanguageSupport =>
  new LanguageSupport(StreamLanguage.define(shellParser));

const stream =
  (parser: StreamParser<unknown>): (() => LanguageSupport) =>
  () =>
    new LanguageSupport(StreamLanguage.define(parser));

/** The fence languages that have a mode. */
const MODES: Readonly<Record<string, () => LanguageSupport>> = {
  bash: shell,
  c: stream(c),
  clojure: stream(clojure),
  commonlisp: stream(commonLisp),
  cpp,
  csharp: stream(csharp),
  css,
  dart: stream(dart),
  dockerfile: stream(dockerFile),
  go,
  haskell: stream(haskell),
  html,
  java,
  javascript: () => javascript({ jsx: true, typescript: false }),
  json,
  kotlin: stream(kotlin),
  lua: stream(lua),
  objectivec: stream(objectiveC),
  ocaml: stream(oCaml),
  perl: stream(perl),
  php,
  powershell: stream(powerShell),
  python,
  r: stream(r),
  ruby: stream(ruby),
  rust,
  scala: stream(scala),
  sql,
  swift: stream(swift),
  typescript: () => javascript({ jsx: true, typescript: true }),
  vb: stream(vb),
  verilog: stream(verilog),
  vue,
  xml,
  yaml,
  zsh: shell,
};

const built = new Map<string, LanguageSupport>();

/**
 * The mode of a fence language, built once. A name
 * without a mode gives null, and the editor stays plain. The component loads each
 * mode from its own chunk; this lookup is synchronous.
 */
export const languageSupport = (language: string): LanguageSupport | null => {
  const ready = built.get(language);

  if (ready) {
    return ready;
  }

  const create = Object.hasOwn(MODES, language) ? MODES[language] : undefined;

  if (!create) {
    return null;
  }

  const support = create();

  built.set(language, support);

  return support;
};
