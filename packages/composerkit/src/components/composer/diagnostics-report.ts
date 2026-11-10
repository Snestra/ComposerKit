import {
  CLASSIFICATION_RULES,
  EMAIL_LINE,
  ENV_SECRET_ASSIGNMENT,
  GENERIC_RULES,
  JSON_SECRET_PAIR,
  looksLikePlaceholder,
  MAX_CLASSIFIED_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_REPORT_LENGTH,
  MAX_REPORT_LINES,
  PATH_LINE,
  PRIVATE_KEY_BLOCK,
  QUERY_SECRET_PAIR,
  RELATIVE_PATH_LINE,
  SECRET_HEADER_LINE,
  SINGLE_QUOTED_SECRET_PAIR,
  TRUNCATED_JSON_SECRET,
  TRUNCATED_SINGLE_QUOTED_SECRET,
  TRUNCATED_URL_CREDENTIALS,
  URL_CREDENTIALS,
  VENDOR_RULES,
} from "composerkit/components/composer/diagnostics-patterns";
import type { SecretRule } from "composerkit/components/composer/diagnostics-patterns";

/*
 * Builds the report for the diagnostics view. It classifies the failure,
 * scrubs secrets and private details from the message, and keeps the
 * conversation id only when it is a plain id. The tables are in
 * diagnostics-patterns.ts.
 */

const REDACTION_TOKEN = "<SECRET>";
const LOOSE_PREFILTERS = new Set(["us", "at"]);
const REDACTED = "[removed_secret]";
const CONVERSATION_ID = /^[a-z0-9][a-z0-9_.-]{0,127}$/iu;
const API_KEY_PREFIX = /^sk-/iu;

interface Range {
  end: number;
  start: number;
}

const escapeForPattern = (text: string) =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

/** Every vendor prefix, longest first, as one scan of the lowercased text. */
const PREFILTER_SCAN = new RegExp(
  [
    ...new Set(
      VENDOR_RULES.flatMap((rule) => rule.prefilters).filter(
        (prefilter) => !LOOSE_PREFILTERS.has(prefilter)
      )
    ),
  ]
    .toSorted((first, second) => second.length - first.length)
    .map(escapeForPattern)
    .join("|"),
  "gu"
);

const hasPrefilter = (
  lower: string,
  prefilter: string,
  present: ReadonlySet<string> | null
) =>
  present === null || LOOSE_PREFILTERS.has(prefilter)
    ? lower.includes(prefilter)
    : present.has(prefilter);

/** Where one rule finds a secret. */
const ruleRanges = (
  text: string,
  lower: string,
  rule: SecretRule,
  present: ReadonlySet<string> | null = null
): Range[] => {
  if (
    !rule.prefilters.some((prefilter) =>
      hasPrefilter(lower, prefilter, present)
    )
  ) {
    return [];
  }

  const ranges: Range[] = [];

  for (const match of text.matchAll(rule.pattern)) {
    const secret = match[rule.secretGroup ?? 0];

    if (rule.skipPlaceholderCheck !== true && looksLikePlaceholder(secret)) {
      continue;
    }

    if (rule.validate !== undefined && !rule.validate(secret, match)) {
      continue;
    }

    const offset = match[0].lastIndexOf(secret);

    if (offset === -1) {
      continue;
    }

    const start = (match.index ?? 0) + offset;
    ranges.push({ end: start + secret.length, start });
  }

  return ranges;
};

/** Sorts ranges and joins the ones that overlap. */
const mergeRanges = (ranges: readonly Range[]) => {
  const merged: Range[] = [];

  for (const range of ranges.toSorted(
    (first, second) => first.start - second.start || first.end - second.end
  )) {
    const last = merged.at(-1);

    if (last === undefined || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  return merged;
};

const privateKeyRanges = (text: string): Range[] =>
  text.includes("-----BEGIN")
    ? [...text.matchAll(PRIVATE_KEY_BLOCK)].map((match) => ({
        end: (match.index ?? 0) + match[0].length,
        start: match.index ?? 0,
      }))
    : [];

const DATA_IMAGE = /^data:image\/[A-Za-z0-9.+-]+;base64,/iu;

/** For a string: the findings and the text with each one replaced. */
const scanSecrets = (text: string) => {
  if (DATA_IMAGE.test(text)) {
    return { findingCount: 0, redacted: text };
  }

  const lower = text.toLowerCase();
  const present = new Set([...lower.matchAll(PREFILTER_SCAN)].map((m) => m[0]));

  const ranges = mergeRanges([
    ...privateKeyRanges(text),
    ...VENDOR_RULES.flatMap((rule) => ruleRanges(text, lower, rule, present)),
    ...GENERIC_RULES.flatMap((rule) => ruleRanges(text, lower, rule)),
  ]);

  if (ranges.length === 0) {
    return { findingCount: 0, redacted: text };
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const range of ranges) {
    parts.push(text.slice(cursor, range.start), REDACTION_TOKEN);
    cursor = range.end;
  }

  parts.push(text.slice(cursor));

  return { findingCount: ranges.length, redacted: parts.join("") };
};

/** An id that is a plain token and holds no secret, or null. */
const normalizeDiagnosticsId = (id: string | null | undefined) =>
  id !== null &&
  id !== undefined &&
  CONVERSATION_ID.test(id) &&
  !API_KEY_PREFIX.test(id) &&
  scanSecrets(id).findingCount === 0
    ? id
    : null;

/** A message cut at the limit may end inside a secret. */
const scrubTruncatedSecrets = (text: string, truncated: boolean) => {
  const quoted = truncated
    ? text
        .replace(TRUNCATED_JSON_SECRET, `$1"${REDACTED}"`)
        .replace(TRUNCATED_SINGLE_QUOTED_SECRET, `$1'${REDACTED}'`)
    : text;

  const urls = truncated
    ? quoted.replace(TRUNCATED_URL_CREDENTIALS, `$1${REDACTED}`)
    : quoted;

  return urls.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
};

/** The message of the report, scrubbed of secrets, addresses and paths. */
const redactReportMessage = (message: string) => {
  const head = message.slice(0, MAX_MESSAGE_LENGTH);

  const scrubbed = scanSecrets(
    scrubTruncatedSecrets(head, message.length > head.length)
  )
    .redacted.replaceAll(
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*/gu,
      "[removed_private_key]"
    )
    .replaceAll(
      /\bAuthorization:\s*Bearer\s+[^\s]+/giu,
      "Authorization: Bearer [removed_bearer_token]"
    )
    .replaceAll(
      /\bAuthorization:(?![ \t]*Bearer\b)[^\n]+/giu,
      `Authorization: ${REDACTED}`
    )
    .replaceAll(/\bBearer\s+[^\s]+/giu, "Bearer [removed_bearer_token]")
    .replaceAll(/\bCookie:\s*[^\n]+/giu, "Cookie: [removed_cookie]")
    .replace(JSON_SECRET_PAIR, `"$1": "${REDACTED}"`)
    .replace(SINGLE_QUOTED_SECRET_PAIR, `'$1': '${REDACTED}'`)
    .replace(ENV_SECRET_ASSIGNMENT, `$1=${REDACTED}`)
    .replace(
      SECRET_HEADER_LINE,
      (line) => `${line.slice(0, line.indexOf(":"))}: ${REDACTED}`
    )
    .replace(QUERY_SECRET_PAIR, `$1=${REDACTED}`)
    .replaceAll(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, "[removed_api_key]");

  const text = scrubbed
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      EMAIL_LINE.test(line) ||
      PATH_LINE.test(line) ||
      RELATIVE_PATH_LINE.test(line)
        ? "[removed_private_details]"
        : line
    )
    .slice(0, MAX_REPORT_LINES)
    .join("\n");

  return text.length <= MAX_REPORT_LENGTH
    ? text
    : `${text.slice(0, MAX_REPORT_LENGTH)}…`;
};

type DiagnosticsSurface = "chat" | "code";

interface FailureClassification {
  category: string;
  confidence: string;
  matchedSignal: string | null;
}

/**
 * The category of the signal with the highest specificity that
 * matches the message. The chat surface skips workspace setup and sandbox
 * approval rules.
 */
const classifyFailure = (
  message: string,
  detail: string | undefined,
  surface: DiagnosticsSurface = "code"
): FailureClassification => {
  const text = [message, detail ?? ""]
    .map((part) => part.slice(0, MAX_CLASSIFIED_LENGTH))
    .join("\n");

  let best: {
    confidence: string;
    category: string;
    specificity: number;
    type: string;
  } | null = null;

  for (const rule of CLASSIFICATION_RULES) {
    if (
      surface === "chat" &&
      (rule.category === "workspace_setup" ||
        rule.category === "sandbox_approval")
    ) {
      continue;
    }

    for (const signal of rule.signals) {
      if (
        signal.pattern.test(text) &&
        (best === null || signal.specificity > best.specificity)
      ) {
        best = {
          category: rule.category,
          confidence: rule.confidence,
          specificity: signal.specificity,
          type: signal.type,
        };
      }
    }
  }

  return best === null
    ? { category: "unknown", confidence: "low", matchedSignal: null }
    : {
        category: best.category,
        confidence: best.confidence,
        matchedSignal: best.type,
      };
};

export {
  classifyFailure,
  normalizeDiagnosticsId,
  redactReportMessage,
  scanSecrets,
};

export type { DiagnosticsSurface, FailureClassification };
