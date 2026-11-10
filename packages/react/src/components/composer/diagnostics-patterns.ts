/* oxlint-disable eslint/max-lines, eslint/no-useless-escape, eslint/no-control-regex, eslint/require-unicode-regexp, eslint/prefer-regex-literals, eslint/prefer-named-capture-group, unicorn/new-for-builtins -- Credential patterns and report classification rules share this module. */

/*
 * Detect credentials before diagnostics leave the composer. Format-specific
 * rules cover keys and service tokens; generic rules cover connection strings,
 * headers and assignments. Report scrubbers remove private details, while
 * classification rules identify likely causes of a failure.
 */

interface SecretRule {
  pattern: RegExp;
  prefilters: readonly string[];
  /** The capture group that holds the secret. Without one, the whole match is the secret. */
  secretGroup?: number;
  skipPlaceholderCheck?: boolean;
  validate?: (secret: string, match: RegExpMatchArray) => boolean;
}

const vendorRule = (pattern: RegExp, ...prefilters: string[]): SecretRule => ({
  pattern,
  prefilters,
});

/** Group 1 of the named secret pattern holds the name of the variable. */
const NAMED_SECRET_NAME_GROUP = 1;

/** A secret needs this many distinct characters at least and no placeholder look. */
const MIN_DISTINCT_CHARACTERS = 4;
const MAX_SECRET_LENGTH = 4096;
const MIN_URL_PASSWORD_LENGTH = 8;
const MIN_NAMED_SECRET_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PLACEHOLDER_DISTINCT_CHARACTERS = 3;

const PLACEHOLDER_WORDS = [
  "example",
  "dummy",
  "placeholder",
  "changeme",
  "replace_me",
  "redacted",
  "masked",
];

const PLACEHOLDER_NAMES = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "none",
  "null",
  "true",
  "false",
  "undefined",
]);

const stripQuotes = (value: string) =>
  value.trim().replaceAll(/^["']+|["']+$/g, "");

/** Text that looks like a placeholder, not a secret. */
const looksLikePlaceholder = (value: string) => {
  const text = stripQuotes(value);
  const lower = text.toLowerCase();

  if (
    lower.length === 0 ||
    lower.startsWith("${") ||
    lower.startsWith("$(") ||
    lower.startsWith("{{") ||
    lower.startsWith("<") ||
    lower.startsWith("[") ||
    lower.startsWith("process.env") ||
    lower.startsWith("os.environ") ||
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(text) ||
    PLACEHOLDER_WORDS.some((word) => lower.includes(word))
  ) {
    return true;
  }

  return (
    PLACEHOLDER_NAMES.has(lower) ||
    new Set(text).size <= MAX_PLACEHOLDER_DISTINCT_CHARACTERS
  );
};

const isStrongSecret = (value: string, minimumLength: number) => {
  const text = stripQuotes(value);

  return (
    text.length >= minimumLength &&
    text.length <= MAX_SECRET_LENGTH &&
    !looksLikePlaceholder(text) &&
    !/^\d+$/.test(text) &&
    new Set(text).size >= MIN_DISTINCT_CHARACTERS
  );
};

const validateLongSecret = (value: string) =>
  isStrongSecret(value, MIN_NAMED_SECRET_LENGTH);

/** A named secret (TOKEN=...) is not a URL and is long enough, passwords shorter. */
const validateNamedSecret = (value: string, match: RegExpMatchArray) => {
  const name = match[NAMED_SECRET_NAME_GROUP]?.toUpperCase();

  if (name === undefined || value.includes("://")) {
    return false;
  }

  const isPassword = ["PASSWORD", "PASSWD", "_PWD"].some((part) =>
    name.includes(part)
  );

  return isStrongSecret(
    value,
    isPassword ? MIN_PASSWORD_LENGTH : MIN_NAMED_SECRET_LENGTH
  );
};

/** Credentials in a URL, with a password of at least eight characters. */
const validateUrlCredentials = (value: string) => {
  const match = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^:/@]+):([^@]+)@/.exec(value);

  return match !== null && isStrongSecret(match[2], MIN_URL_PASSWORD_LENGTH);
};

/** Lines kept in a report message. */
const MAX_REPORT_LINES = 5;

/** Characters kept in a report message. */
const MAX_REPORT_LENGTH = 700;

/** Characters of the message that are scrubbed. */
const MAX_MESSAGE_LENGTH = 4096;

/** Characters of the message that are classified. */
const MAX_CLASSIFIED_LENGTH = 32_768;

/** A line that holds an email address. */
const EMAIL_LINE =
  /(?:"[^"\r\n]+"|[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-])(?:@|%40|\\u0040)/iu;

/** A line that holds an absolute or relative path. */
const PATH_LINE =
  /(?:^|[\s"'`(<=>:,])(?:file:\/\/|[a-z]:[\\/]|\\|\/(?!\/)|~[\\/]|\.{1,2}[\\/]|(?:[a-z]%3a)?%(?:2f|5c))/iu;

/** A line that holds a path segment. */
const RELATIVE_PATH_LINE = /(?:^|[\s"'`(<=>,])[\p{L}\p{N}_.-]+[\\/](?!\/)/iu;

/** The names that mark a value as secret. */
const SECRET_NAMES = String.raw`(?:authorization|token|secret|api[_-]?key|access[_-]?key|cookie|password|passwd|pwd|passcode|credential|private[_-]?key|otp|database[_-]?url|db[_-]?url|postgres[_-]?url|redis[_-]?url|mongodb[_-]?uri)`;

const JSON_SECRET_PAIR = new RegExp(
  String.raw`"([^"]*${SECRET_NAMES}[^"]*)"\s*:\s*"(?:\\.|[^"\\])*"`,
  `gi`
);

const SINGLE_QUOTED_SECRET_PAIR = new RegExp(
  String.raw`'([^']*${SECRET_NAMES}[^']*)'\s*:\s*'(?:\\.|[^'\\])*'`,
  `gi`
);

const ENV_SECRET_ASSIGNMENT = new RegExp(
  String.raw`\b([A-Z0-9_-]*${SECRET_NAMES}[A-Z0-9_-]*)\s*=\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)`,
  `gi`
);

const SECRET_HEADER_LINE = new RegExp(
  String.raw`\b(?!Authorization\s*:|Cookie\s*:)[A-Z0-9_-]*${SECRET_NAMES}[A-Z0-9_-]*\s*:\s*[^\n]+`,
  `gi`
);

const QUERY_SECRET_PAIR = new RegExp(
  String.raw`\b([A-Z0-9_-]*${SECRET_NAMES}[A-Z0-9_-]*)=([^&\s]+)`,
  `gi`
);

const URL_CREDENTIALS =
  /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^\s/?#:"<>]*:[^\s/?#"<>]*@/g;

const TRUNCATED_URL_CREDENTIALS =
  /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^\s/?#:"<>]*:[^\s/?#"<>]*$/g;

const TRUNCATED_JSON_SECRET = new RegExp(
  String.raw`((?:"[^"\r\n]*${SECRET_NAMES}[^"\r\n]*"|'[^'\r\n]*${SECRET_NAMES}[^'\r\n]*'|\b[A-Z0-9_-]*${SECRET_NAMES}[A-Z0-9_-]*\b)\s*[:=]\s*)"(?:\\[\s\S]|[^"\\])*\\?$`,
  `i`
);

const TRUNCATED_SINGLE_QUOTED_SECRET = new RegExp(
  String.raw`((?:"[^"\r\n]*${SECRET_NAMES}[^"\r\n]*"|'[^'\r\n]*${SECRET_NAMES}[^'\r\n]*'|\b[A-Z0-9_-]*${SECRET_NAMES}[A-Z0-9_-]*\b)\s*[:=]\s*)'(?:\\[\s\S]|[^'\\])*\\?$`,
  `i`
);

/** How specific a classification signal is. */
const SPECIFICITY = {
  broad: 55,
  contextual: 145,
  descriptive: 105,
  exact: 135,
  generic: 75,
  protocol: 125,
  strong: 115,
};

/** PEM and armored private keys, including encrypted key blocks. */
const PRIVATE_KEY_BLOCK = new RegExp(
  "-{5}BEGIN ((?:ENCRYPTED |OPENSSH |DSA |RSA |PGP |EC )?)PRIVATE KEY-{5}.{24,16384}?-{5}END \\1PRIVATE KEY-{5}",
  "gs"
);

/** Credential formats grouped by the service or resource they protect. */
const VENDOR_RULES: readonly SecretRule[] = [
  // Encryption and credential vaults.
  vendorRule(
    /\bAGE-SECRET-KEY-1[023456789ACDEFGHJKLMNPQRSTUVWXYZ]{58}\b/g,
    "secret-key-1"
  ),
  vendorRule(
    /\bA3-[0-9A-Z]{6}-[0-9A-Z]{6}-?[0-9A-Z]{5}(?:-[0-9A-Z]{5}){3}\b/g,
    "3-"
  ),
  vendorRule(/\bops_eyJ[+/0-9a-zA-Z]{250,4096}={0,3}/g, "ops_eyj"),
  vendorRule(/\bhv(?:s\.[\w-]{90,120}|b\.[\w-]{138,300})/g, "hv"),

  // Cloud access and deployment credentials.
  vendorRule(
    /\bA(?:CCA|BIA|SIA|KIA|3T[0-9A-Z])[2-7A-Z]{16}\b/g,
    "cca",
    "bia",
    "sia",
    "kia",
    "3t"
  ),
  vendorRule(/\bAIza[-_0-9a-zA-Z]{30,4096}\b/g, "iza"),
  vendorRule(/\bLTAI[0-9a-zA-Z]{20}\b/gi, "tai"),
  vendorRule(/\bABSK[+/0-9a-zA-Z]{109,269}={0,2}/g, "bsk"),
  {
    ...vendorRule(
      /(?:[\s\\'"`>=:(,)]|^)([.~_0-9a-zA-Z]{3}[0-9]Q~[.~_0-9a-zA-Z-]{31,34})(?=[\s\\'"`<),]|$)/g,
      "0q~",
      "1q~",
      "2q~",
      "3q~",
      "4q~",
      "5q~",
      "6q~",
      "7q~",
      "8q~",
      "9q~"
    ),
    secretGroup: 1,
  },
  vendorRule(/\bdapi[0-9a-f]{32}(?:-[0-9])?\b/gi, "dap"),
  vendorRule(/\bdo[rpo]_v1_[0-9a-f]{64}\b/gi, "_v1_"),
  vendorRule(/\bHRKU-AA[-_0-9a-zA-Z]{58}\b/g, "hrku"),
  vendorRule(/\bpul-[0-9a-f]{40}\b/gi, "pul"),

  // Source hosting, package registries and artifact repositories.
  vendorRule(
    /\b(?:gh[rsuop]_[0-9a-zA-Z]{20,4096}|github_pat_[_0-9a-zA-Z]{30,4096})\b/g,
    "ghr",
    "ghs",
    "ghu",
    "gho",
    "ghp",
    "github_pat"
  ),
  vendorRule(
    /\bgl(?:rt-[-_0-9a-z]{20,4096}|ptt-[0-9a-f]{40}|dt-[-_0-9a-z]{20}|pat-[-_0-9a-z]{20,4096})\b/gi,
    "glrt",
    "glptt",
    "gldt",
    "glpat"
  ),
  vendorRule(/\bpypi-[-_0-9a-z]{20,1000}\b/gi, "pypi"),
  vendorRule(/\bnpm_[0-9a-z]{20,4096}\b/gi, "npm"),
  vendorRule(/\brubygems_[0-9a-f]{48}\b/gi, "rubygems"),
  vendorRule(/\bAKCp[0-9a-zA-Z]{69}\b/g, "kcp"),
  vendorRule(/\bcmVmd[0-9a-zA-Z]{59}\b/g, "mvmd"),

  // Model providers.
  vendorRule(
    /\bsk-(?:[0-9a-zA-Z]{20}T3BlbkFJ[0-9a-zA-Z]{20}|(?:admin|svcacct|proj)-[-_0-9a-zA-Z]{20,4096})\b/g,
    "3blbkfj",
    "k-admin-",
    "k-svcacct-",
    "k-proj-"
  ),
  vendorRule(/\bsk-ant-(?:api03|admin01)-[-_0-9a-zA-Z]{93}AA\b/g, "k-ant-"),
  vendorRule(
    /\b(?:api_org_[a-zA-Z]{34}|hf_[0-9a-zA-Z]{20,4096})\b/g,
    "api_org",
    "hf"
  ),
  vendorRule(/\bpplx-[0-9a-zA-Z]{48}\b/g, "pplx"),

  // Messaging, email and social integrations.
  vendorRule(
    /\b(?:xoxe(?:-[0-9]-[0-9a-z]{146}|\.xox[pb]-[0-9]-[0-9a-z]{163,166})|xapp-[0-9]-[0-9a-z]+-[0-9]+-[0-9a-z]+|xox[srpab]-[-0-9a-z]{10,4096})\b/gi,
    "xox",
    "xapp"
  ),
  vendorRule(/\bSG\.[.=_0-9a-zA-Z-]{66,4096}(?![.=_0-9a-zA-Z-])/g, "sg"),
  vendorRule(/\b[0-9a-f]{32}-us[0-9]{1,3}\b/gi, "us"),
  vendorRule(/\bEAA[CM][0-9a-zA-Z]{100,4096}\b/g, "aac", "aam"),
  vendorRule(
    /\bSK[a-fA-F0-9]{32}\b/g,
    "sk0",
    "sk1",
    "sk2",
    "sk3",
    "sk4",
    "sk5",
    "sk6",
    "sk7",
    "sk8",
    "sk9",
    "ska",
    "skb",
    "skc",
    "skd",
    "ske",
    "skf"
  ),

  // Payments and storefronts.
  vendorRule(
    /\b[rs]k_(?:prod|live|test)_[0-9a-zA-Z]{10,99}\b/g,
    "k_prod_",
    "k_live_",
    "k_test_"
  ),
  vendorRule(/\b(?:sq0atp-|EAAA)[\w-]{22,60}\b/g, "q0atp-", "aaa"),
  vendorRule(/\bshp(?:ss|pa|ca|at)_[0-9a-f]{32}\b/gi, "shp"),

  // Database and data-service tokens.
  vendorRule(/\bpat[0-9a-zA-Z]{14}\.[0-9a-f]{64}\b/g, "at"),
  vendorRule(/\bpscale_(?:pw|oauth|tkn)_[.\w=-]{32,64}(?![.\w=-])/gi, "pscale"),
  vendorRule(
    /\bf(?:m(?:2_|1[ra]_)[+/0-9a-zA-Z]{100,4096}={0,3}|o1_[\w-]{43}\b)/g,
    "fm2",
    "fm1r_",
    "fm1a_",
    "fo1"
  ),
  vendorRule(
    /\b[0-9a-z]{14}\.atlasv1\.[=_0-9a-z-]{60,70}(?![=_0-9a-z-])/gi,
    ".atlasv1."
  ),

  // Monitoring and telemetry credentials.
  vendorRule(/\bdt0c01\.[0-9a-z]{24}\.[0-9a-z]{64}\b/gi, "dt0c01"),
  vendorRule(
    /\bgl(?:sa_[0-9a-zA-Z]{32}_[0-9a-fA-F]{8}\b|c_[+/0-9a-zA-Z]{32,400}={0,3})/g,
    "glsa",
    "glc"
  ),
  vendorRule(
    /\bNR(?:AK-[0-9a-z]{27}|II-[-0-9a-z]{32}|JS-[0-9a-f]{19})\b/gi,
    "nrak",
    "nrii",
    "nrjs"
  ),
  vendorRule(
    /\bsntry(?:s_eyJpYXQiO[+/0-9a-zA-Z]{10,200}(?:cmVnaW9uX3VybCI6|InJlZ2lvbl91cmwi|LCJyZWdpb25fdXJs)[+/0-9a-zA-Z]{10,200}={0,2}_[+/0-9a-zA-Z]{43}|u_[0-9a-f]{64}\b)/g,
    "sntry"
  ),

  // Application-specific access tokens.
  vendorRule(/\bv1[.]0-[0-9a-f]{24}-[0-9a-f]{146}\b/gi, "v1.0"),
  vendorRule(/\bdp[.]pt[.][0-9a-z]{43}\b/gi, "dp.pt"),
  vendorRule(/\bEZ[TA]K[0-9a-z]{54}\b/gi, "ez"),
  vendorRule(/\blin_api_[0-9a-z]{40}\b/gi, "lin_api"),
  vendorRule(/\bpk[.][0-9a-z]{60}[.][0-9a-z]{22}\b/gi, "pk"),
  vendorRule(/\b[0-9a-zA-Z]{6}_[0-9a-zA-Z]{29}_mmk\b/g, "mmk"),
  vendorRule(/\bntn_\d{11}[0-9a-zA-Z]{35}\b/g, "ntn"),
  vendorRule(/\bsha256~[-\w]{43}\b/g, "sha256"),
  vendorRule(/\bPMAK-[0-9a-f]{24}-[0-9a-f]{34}\b/gi, "pmak"),
  vendorRule(/\bpnu_[0-9a-zA-Z]{36}\b/g, "pnu"),
];

/** Connection strings, signed URLs, webhooks, headers and named secrets. */
const GENERIC_RULES: readonly SecretRule[] = [
  {
    pattern:
      /\b(?:redis|postgres(?:ql)?|mysql|mongodb|https?):\/\/[^\s:/@<>"']{1,80}:[^\s@<>"']{3,160}@[^\s<>"']+/gi,
    prefilters: [
      "redis:",
      "postgres:",
      "postgresql:",
      "mysql:",
      "mongodb:",
      "https:",
      "http:",
    ],
    skipPlaceholderCheck: true,
    validate: validateUrlCredentials,
  },
  {
    pattern:
      /https?:\/\/(?=[^\s<>"']{0,4096}[?&](?:X-Amz-Security-Token|X-Amz-Signature|sig|token)=)[^\s<>"']{1,4096}/gi,
    prefilters: ["https://", "http://"],
    skipPlaceholderCheck: true,
  },
  {
    pattern:
      /https:\/\/hooks[.]slack[.]com\/services\/(?:[0-9a-zA-Z]{8,128}\/){2}[0-9a-zA-Z]{16,512}/g,
    prefilters: ["slack.com/services"],
  },
  {
    pattern:
      /\bAuthorization\s*:\s*(?:Basic|Bearer)\s+([.=_~+/0-9a-zA-Z-]{16,4096})/gi,
    prefilters: ["basic", "bearer"],
    secretGroup: 1,
    validate: validateLongSecret,
  },
  {
    pattern:
      /\b(COOKIE|CREDENTIAL|PRIVATE_KEY|ACCESS_KEY|API_KEY|PASSWD|PASSWORD|SECRET|TOKEN|[A-Z][A-Z0-9_]{1,80}(?:_PAT|COOKIE|CREDENTIAL|PRIVATE_KEY|ACCESS_KEY|API_KEY|_PWD|PASSWD|PASSWORD|SECRET|TOKEN))\b[^\r\n]{0,30}?[:=]\s*["']?([._~+/=%:@!#$^&*?0-9a-zA-Z-]{8,4096})/gi,
    prefilters: [
      "toke",
      "secre",
      "passwor",
      "passw",
      "pwd",
      "api_ke",
      "access_ke",
      "private_ke",
      "credent",
      "cooki",
      "pat",
    ],
    secretGroup: 2,
    validate: validateNamedSecret,
  },
];

interface ClassificationRule {
  category: string;
  confidence: string;
  signals: readonly { pattern: RegExp; specificity: number; type: string }[];
}

const CLASSIFICATION_RULES: readonly ClassificationRule[] = [
  {
    category: `sandbox_approval`,
    confidence: `high`,
    signals: [
      {
        pattern:
          /\bsandbox\b[^\n]{0,80}\b(?:blocked|denied|not permitted|permission denied)\b|blocked by (?:sandbox|policy)/i,
        specificity: SPECIFICITY.contextual,
        type: `sandbox_denied`,
      },
      {
        pattern: /operation not permitted/i,
        specificity: SPECIFICITY.broad,
        type: `sandbox_denied`,
      },
      {
        pattern: /approval required|missing approval|requires approval/i,
        specificity: SPECIFICITY.exact,
        type: `approval_missing`,
      },
    ],
  },
  {
    category: `auth`,
    confidence: `high`,
    signals: [
      {
        pattern: /\b401\b|unauthori[sz]ed/i,
        specificity: SPECIFICITY.protocol,
        type: `http_unauthenticated`,
      },
      {
        pattern:
          /(?:expired|invalid)\s+(?:(?:access|refresh|id)\s+)?token|token\s+(?:has\s+)?expired|invalid_api_key/i,
        specificity: SPECIFICITY.exact,
        type: `token_rejected`,
      },
      {
        pattern: /failed refresh|refresh token|sign in/i,
        specificity: SPECIFICITY.strong,
        type: `session_refresh_error`,
      },
      {
        pattern: /account mismatch|wrong account/i,
        specificity: SPECIFICITY.strong,
        type: `account_mismatch`,
      },
    ],
  },
  {
    category: `permissions`,
    confidence: `high`,
    signals: [
      {
        pattern: /\b403\b|forbidden/i,
        specificity: SPECIFICITY.protocol,
        type: `http_forbidden`,
      },
      {
        pattern: /rbac|missing workspace access/i,
        specificity: SPECIFICITY.exact,
        type: `permission_denied`,
      },
      {
        pattern: /permission denied/i,
        specificity: SPECIFICITY.strong,
        type: `permission_denied`,
      },
      {
        pattern: /access denied/i,
        specificity: SPECIFICITY.strong,
        type: `access_missing`,
      },
      {
        pattern: /not allowed|requires[^\n]{0,80}access/i,
        specificity: SPECIFICITY.descriptive,
        type: `access_missing`,
      },
    ],
  },
  {
    category: `network`,
    confidence: `medium`,
    signals: [
      {
        pattern: /enotfound|getaddrinfo/i,
        specificity: SPECIFICITY.exact,
        type: `dns_lookup_failed`,
      },
      {
        pattern: /\bdns\b/i,
        specificity: SPECIFICITY.broad,
        type: `dns_lookup_failed`,
      },
      {
        pattern: /timed? out|timeout|deadline has elapsed/i,
        specificity: SPECIFICITY.descriptive,
        type: `timeout`,
      },
      {
        pattern: /econnreset|econnrefused|enetunreach|os error 51/i,
        specificity: SPECIFICITY.exact,
        type: `connection_failure`,
      },
      {
        pattern:
          /network error|network is unreachable|network unreachable|fetch failed/i,
        specificity: SPECIFICITY.generic,
        type: `connection_failure`,
      },
      {
        pattern: /certificate/i,
        specificity: SPECIFICITY.strong,
        type: `blocked_host`,
      },
      {
        pattern: /blocked host/i,
        specificity: SPECIFICITY.descriptive,
        type: `blocked_host`,
      },
      {
        pattern: /proxy|vpn/i,
        specificity: SPECIFICITY.broad,
        type: `blocked_host`,
      },
    ],
  },
  {
    category: `usage_caps`,
    confidence: `high`,
    signals: [
      {
        pattern: /\b429\b|too many requests/i,
        specificity: SPECIFICITY.protocol,
        type: `http_throttled`,
      },
      {
        pattern: /rate limit|rate_limit|rate-limit/i,
        specificity: SPECIFICITY.strong,
        type: `rate_limit`,
      },
      {
        pattern: /quota|usage limit|limit exceeded/i,
        specificity: SPECIFICITY.descriptive,
        type: `quota_exhausted`,
      },
    ],
  },
  {
    category: `workspace_setup`,
    confidence: `medium`,
    signals: [
      {
        pattern:
          /missing repo|repository [^\n]{0,120}not found|not a git repository/i,
        specificity: SPECIFICITY.strong,
        type: `missing_repo`,
      },
      {
        pattern: /missing dependency|module not found|command not found/i,
        specificity: SPECIFICITY.strong,
        type: `missing_dependency`,
      },
      {
        pattern: /unsupported environment|config [^\n]{0,120}missing|enoent/i,
        specificity: SPECIFICITY.generic,
        type: `unsupported_environment`,
      },
    ],
  },
];

export {
  CLASSIFICATION_RULES,
  EMAIL_LINE,
  ENV_SECRET_ASSIGNMENT,
  GENERIC_RULES,
  JSON_SECRET_PAIR,
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
  looksLikePlaceholder,
};

export type { ClassificationRule, SecretRule };
