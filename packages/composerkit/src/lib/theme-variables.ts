// Desktop (Electron) theme generator with its defaults and input
// normalisation. Pure: settings in, CSS variable map out.

export type ThemeVariant = "light" | "dark";

export interface SemanticColors {
  readonly diffAdded: string;
  readonly diffRemoved: string;
  readonly skill: string;
}

export interface ThemeSettings {
  readonly accent: string;
  readonly contrast: number;
  readonly ink: string;
  readonly surface: string;
  readonly semanticColors: SemanticColors;
}

export type ThemeVariables = Readonly<Record<string, string>>;

export const defaultThemeSettings = {
  dark: {
    accent: "#2f8fff",
    contrast: 60,
    ink: "#ffffff",
    semanticColors: {
      diffAdded: "#4cc38a",
      diffRemoved: "#e5484d",
      skill: "#b794f6",
    },
    surface: "#181818",
  },
  light: {
    accent: "#2f8fff",
    contrast: 45,
    ink: "#1a1c1f",
    semanticColors: {
      diffAdded: "#00a04a",
      diffRemoved: "#b32420",
      skill: "#8f4ff2",
    },
    surface: "#ffffff",
  },
} as const satisfies Record<ThemeVariant, ThemeSettings>;

interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const BLACK: Rgb = { blue: 0, green: 0, red: 0 };
const WHITE: Rgb = { blue: 255, green: 255, red: 255 };
const LUMINANCE_THRESHOLD = 0.179;
const CONTRAST_SCALE = 0.72;
const CONTRAST_COMPRESSION = 2;

const REFERENCE_CONTRAST = {
  dark: defaultThemeSettings.dark.contrast,
  light: defaultThemeSettings.light.contrast,
} as const;

const UNDER_BASE = { dark: 0.16, light: 0.04 } as const;
const UNDER_SLOPE = { dark: 0.0016, light: 0.0013 } as const;
const PANEL_BASE = { dark: 0.03, light: 0.18 } as const;
const PANEL_SLOPE = { dark: 0.03, light: 0.0075 } as const;

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/u;
const TRAILING_ZEROS = /0+$/u;
const TRAILING_DOT = /\.$/u;

const parseHex = (value: string): Rgb => {
  const hex = value.trim().toLowerCase();

  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`Color input must use #rrggbb. Got "${value}"`);
  }

  return {
    blue: Number.parseInt(hex.slice(5, 7), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    red: Number.parseInt(hex.slice(1, 3), 16),
  };
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const mixChannel = (from: number, to: number, amount: number): number =>
  Math.round(from + (to - from) * amount);

// Channel-wise mix of two colors, amount clamped to 0..1.
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => {
  const t = clamp01(amount);

  return {
    blue: mixChannel(from.blue, to.blue, t),
    green: mixChannel(from.green, to.green, t),
    red: mixChannel(from.red, to.red, t),
  };
};

const hexByte = (value: number): string => value.toString(16).padStart(2, "0");

const toHex = (color: Rgb): string =>
  `#${hexByte(color.red)}${hexByte(color.green)}${hexByte(color.blue)}`;

const toRgb = (color: Rgb): string =>
  `rgb(${color.red}, ${color.green}, ${color.blue})`;

const formatAlpha = (alpha: number): string =>
  clamp01(alpha)
    .toFixed(3)
    .replace(TRAILING_ZEROS, "")
    .replace(TRAILING_DOT, "");

// Color with alpha.
const withAlpha = (color: Rgb, alpha: number): string =>
  `rgba(${color.red}, ${color.green}, ${color.blue}, ${formatAlpha(alpha)})`;

// Mix, returned as hex.
const mixHex = (from: Rgb, to: Rgb, amount: number): string =>
  toHex(mix(from, to, amount));

const linearize = (channel: number): number => {
  const unit = channel / 255;

  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

// Relative luminance.
const luminance = (color: Rgb): number =>
  linearize(color.red) * 0.2126 +
  linearize(color.green) * 0.7152 +
  linearize(color.blue) * 0.0722;

// Text color to put on the accent.
const onAccentColor = (accent: Rgb): Rgb => {
  if (accent.blue > accent.red && accent.blue > accent.green) {
    const chroma = accent.blue - Math.min(accent.red, accent.green);
    const hue = ((accent.red - accent.green) / chroma + 4) * 60;
    const saturated = chroma / accent.blue;
    const brightBlue = saturated >= 0.8 && hue >= 205 && hue <= 212;

    const deepBlue =
      saturated >= 0.6 && hue >= 218 && hue <= 233 && luminance(accent) <= 0.21;

    if (brightBlue || deepBlue) {
      return WHITE;
    }
  }

  return luminance(accent) > LUMINANCE_THRESHOLD ? BLACK : WHITE;
};

// Effective contrast factor.
const contrastFactor = (contrast: number, variant: ThemeVariant): number => {
  const reference = REFERENCE_CONTRAST[variant];
  const referenceUnit = reference / 100;

  const scaled =
    contrast / 100 + ((contrast - reference) / 60) * CONTRAST_SCALE;

  return contrast <= reference
    ? scaled
    : referenceUnit + (scaled - referenceUnit) * CONTRAST_COMPRESSION;
};

interface Base {
  readonly accent: Rgb;
  readonly contrast: number;
  readonly editorBackground: Rgb;
  readonly ink: Rgb;
  readonly surface: Rgb;
  readonly surfaceUnder: string;
  readonly settings: ThemeSettings;
  readonly variant: ThemeVariant;
}

// The surface one step below the main surface.
const surfaceUnder = (
  settings: ThemeSettings,
  surface: Rgb,
  ink: Rgb,
  variant: ThemeVariant
): string => {
  const amount =
    UNDER_BASE[variant] +
    (settings.contrast - REFERENCE_CONTRAST[variant]) * UNDER_SLOPE[variant];

  return variant === "light"
    ? mixHex(surface, ink, amount)
    : mixHex(surface, BLACK, amount);
};

// m
const deriveBase = (settings: ThemeSettings, variant: ThemeVariant): Base => {
  const surface = parseHex(settings.surface);
  const ink = parseHex(settings.ink);

  return {
    accent: parseHex(settings.accent),
    contrast: contrastFactor(settings.contrast, variant),
    editorBackground:
      variant === "light" ? mix(surface, WHITE, 0.12) : mix(surface, ink, 0.07),
    ink,
    settings,
    surface,
    surfaceUnder: surfaceUnder(settings, surface, ink, variant),
    variant,
  };
};

// Panel background.
const panelBackground = (base: Base): string => {
  const target = base.variant === "light" ? WHITE : base.ink;

  return mixHex(
    base.surface,
    target,
    PANEL_BASE[base.variant] + base.contrast * PANEL_SLOPE[base.variant]
  );
};

interface Roles {
  readonly accentBackground: string;
  readonly accentBackgroundActive: string;
  readonly accentBackgroundHover: string;
  readonly border: string;
  readonly borderFocus: string;
  readonly borderHeavy: string;
  readonly borderLight: string;
  readonly buttonPrimaryBackground: string;
  readonly buttonPrimaryBackgroundActive: string;
  readonly buttonPrimaryBackgroundHover: string;
  readonly buttonPrimaryBackgroundInactive: string;
  readonly buttonSecondaryBackground: string;
  readonly buttonSecondaryBackgroundActive: string;
  readonly buttonSecondaryBackgroundHover: string;
  readonly buttonSecondaryBackgroundInactive: string;
  readonly buttonTertiaryBackground: string;
  readonly buttonTertiaryBackgroundActive: string;
  readonly buttonTertiaryBackgroundHover: string;
  readonly controlBackground: string;
  readonly controlBackgroundOpaque: string;
  readonly elevatedPrimary: string;
  readonly elevatedPrimaryOpaque: string;
  readonly elevatedSecondary: string;
  readonly elevatedSecondaryOpaque: string;
  readonly elevatedTertiaryOpaque: string;
  readonly iconAccent: string;
  readonly iconPrimary: string;
  readonly iconSecondary: string;
  readonly iconTertiary: string;
  readonly simpleScrim: string;
  readonly textAccent: string;
  readonly textButtonPrimary: string;
  readonly textButtonSecondary: string;
  readonly textButtonTertiary: string;
  readonly textForeground: string;
  readonly textForegroundSecondary: string;
  readonly textForegroundTertiary: string;
}

// g
const lightRoles = (base: Base): Roles => {
  const { accent, contrast, ink, settings, surface } = base;
  const secondaryFill = 0.04 + contrast * 0.02;
  const control = mix(surface, WHITE, 0.09 + contrast * 0.04);
  const elevatedSecondary = mix(surface, WHITE, 0.08 + contrast * 0.08);
  const elevatedPrimary = mix(surface, WHITE, 0.16 + contrast * 0.12);

  return {
    accentBackground: mixHex(surface, accent, 0.11 + contrast * 0.04),
    accentBackgroundActive: mixHex(surface, accent, 0.13 + contrast * 0.05),
    accentBackgroundHover: mixHex(surface, accent, 0.12 + contrast * 0.045),
    border: withAlpha(ink, 0.06 + contrast * 0.04),
    borderFocus: settings.accent,
    borderHeavy: withAlpha(ink, 0.09 + contrast * 0.06),
    borderLight: withAlpha(ink, 0.04 + contrast * 0.02),
    buttonPrimaryBackground: settings.ink,
    buttonPrimaryBackgroundActive: withAlpha(ink, 0.1 + contrast * 0.12),
    buttonPrimaryBackgroundHover: withAlpha(ink, 0.05 + contrast * 0.06),
    buttonPrimaryBackgroundInactive: withAlpha(ink, 0.18 + contrast * 0.14),
    buttonSecondaryBackground: withAlpha(ink, secondaryFill),
    buttonSecondaryBackgroundActive: withAlpha(ink, 0.03 + contrast * 0.02),
    buttonSecondaryBackgroundHover: withAlpha(ink, 0.04 + contrast * 0.03),
    buttonSecondaryBackgroundInactive: withAlpha(ink, 0.01 + contrast * 0.02),
    buttonTertiaryBackground: withAlpha(ink, 0),
    buttonTertiaryBackgroundActive: withAlpha(ink, 0.16 + contrast * 0.08),
    buttonTertiaryBackgroundHover: withAlpha(ink, 0.08 + contrast * 0.04),
    controlBackground: withAlpha(control, 0.96),
    controlBackgroundOpaque: toRgb(control),
    elevatedPrimary: withAlpha(elevatedPrimary, 0.96),
    elevatedPrimaryOpaque: toRgb(elevatedPrimary),
    elevatedSecondary: withAlpha(elevatedSecondary, 0.96),
    elevatedSecondaryOpaque: toRgb(elevatedSecondary),
    elevatedTertiaryOpaque: mixHex(elevatedSecondary, ink, secondaryFill),
    iconAccent: settings.accent,
    iconPrimary: settings.ink,
    iconSecondary: withAlpha(ink, 0.65 + contrast * 0.1),
    iconTertiary: withAlpha(ink, 0.45 + contrast * 0.1),
    simpleScrim: withAlpha(BLACK, 0.08 + contrast * 0.04),
    textAccent: settings.accent,
    textButtonPrimary: settings.surface,
    textButtonSecondary: settings.ink,
    textButtonTertiary: withAlpha(ink, 0.45 + contrast * 0.1),
    textForeground: settings.ink,
    textForegroundSecondary: withAlpha(ink, 0.65 + contrast * 0.1),
    textForegroundTertiary: withAlpha(ink, 0.45 + contrast * 0.1),
  };
};

// v
const darkRoles = (base: Base): Roles => {
  const { accent, contrast, editorBackground, ink, settings, surface } = base;
  const control = mix(surface, ink, 0.06 + contrast * 0.05);
  const focus = mix(accent, WHITE, 0.3 + contrast * 0.15);
  const primary = mix(surface, BLACK, 0.38 + contrast * 0.12);
  const elevatedPrimary = mix(surface, ink, 0.08 + contrast * 0.08);

  const isDefaultDark =
    settings.ink === defaultThemeSettings.dark.ink &&
    settings.surface === defaultThemeSettings.dark.surface &&
    settings.accent === defaultThemeSettings.dark.accent &&
    settings.contrast === defaultThemeSettings.dark.contrast &&
    settings.semanticColors.diffAdded ===
      defaultThemeSettings.dark.semanticColors.diffAdded &&
    settings.semanticColors.diffRemoved ===
      defaultThemeSettings.dark.semanticColors.diffRemoved &&
    settings.semanticColors.skill ===
      defaultThemeSettings.dark.semanticColors.skill;

  return {
    accentBackground: mixHex(BLACK, accent, 0.2 + contrast * 0.08),
    accentBackgroundActive: mixHex(BLACK, accent, 0.22 + contrast * 0.12),
    accentBackgroundHover: mixHex(BLACK, accent, 0.21 + contrast * 0.1),
    border: withAlpha(ink, 0.06 + contrast * 0.04),
    borderFocus: withAlpha(focus, 0.7 + contrast * 0.1),
    borderHeavy: withAlpha(ink, 0.12 + contrast * 0.06),
    borderLight: withAlpha(ink, 0.03 + contrast * 0.02),
    buttonPrimaryBackground: toRgb(primary),
    buttonPrimaryBackgroundActive: withAlpha(ink, 0.07 + contrast * 0.05),
    buttonPrimaryBackgroundHover: withAlpha(ink, 0.04 + contrast * 0.03),
    buttonPrimaryBackgroundInactive: withAlpha(ink, 0.02 + contrast * 0.02),
    buttonSecondaryBackground: withAlpha(ink, 0.04 + contrast * 0.02),
    buttonSecondaryBackgroundActive: withAlpha(ink, 0.09 + contrast * 0.05),
    buttonSecondaryBackgroundHover: withAlpha(ink, 0.06 + contrast * 0.03),
    buttonSecondaryBackgroundInactive: withAlpha(ink, 0.02 + contrast * 0.03),
    buttonTertiaryBackground: withAlpha(ink, 0.02 + contrast * 0.015),
    buttonTertiaryBackgroundActive: withAlpha(ink, 0.07 + contrast * 0.05),
    buttonTertiaryBackgroundHover: withAlpha(ink, 0.05 + contrast * 0.03),
    controlBackground: withAlpha(control, 0.96),
    controlBackgroundOpaque: toRgb(control),
    elevatedPrimary: withAlpha(elevatedPrimary, 0.96),
    elevatedPrimaryOpaque: toRgb(elevatedPrimary),
    elevatedSecondary: withAlpha(ink, 0.02 + contrast * 0.02),
    elevatedSecondaryOpaque: mixHex(surface, ink, 0.04 + contrast * 0.05),
    elevatedTertiaryOpaque: toRgb(editorBackground),
    iconAccent: toRgb(focus),
    iconPrimary: withAlpha(ink, 0.82 + contrast * 0.14),
    iconSecondary: withAlpha(ink, 0.65 + contrast * 0.1),
    iconTertiary: withAlpha(ink, 0.45 + contrast * 0.1),
    simpleScrim: withAlpha(ink, 0.08 + contrast * 0.04),
    textAccent: toRgb(focus),
    textButtonPrimary: toRgb(primary),
    textButtonSecondary: mixHex(ink, surface, 0.7 + contrast * 0.1),
    textButtonTertiary: withAlpha(ink, 0.45 + contrast * 0.1),
    textForeground: isDefaultDark ? "var(--gray-pale-fixed)" : settings.ink,
    textForegroundSecondary: withAlpha(ink, 0.65 + contrast * 0.1),
    textForegroundTertiary: withAlpha(ink, 0.42 + contrast * 0.13),
  };
};

// The variable map, in a fixed order.
const buildVariables = (base: Base, roles: Roles) => {
  const { settings, variant } = base;

  const applicationMenu = mix(
    base.surface,
    base.ink,
    0.02 + base.contrast * 0.02
  );

  const light = variant === "light";

  return {
    "--ck-palette-accent-blue": settings.accent,
    "--ck-palette-accent-purple": settings.semanticColors.skill,
    "--ck-palette-border": roles.border,
    "--ck-palette-border-application-menu-separator": light
      ? roles.borderHeavy
      : mixHex(applicationMenu, base.ink, 0.28),
    "--ck-palette-border-focus": roles.borderFocus,
    "--ck-palette-border-heavy": roles.borderHeavy,
    "--ck-palette-border-light": roles.borderLight,
    "--ck-palette-decoration-added": settings.semanticColors.diffAdded,
    "--ck-palette-decoration-deleted": settings.semanticColors.diffRemoved,
    "--ck-palette-editor-added": withAlpha(
      parseHex(settings.semanticColors.diffAdded),
      light ? 0.15 : 0.23
    ),
    "--ck-palette-editor-deleted": withAlpha(
      parseHex(settings.semanticColors.diffRemoved),
      light ? 0.15 : 0.23
    ),
    "--ck-palette-foreground-application-menu": light
      ? roles.textForeground
      : mixHex(applicationMenu, base.ink, 0.875),
    "--ck-palette-icon-accent": roles.iconAccent,
    "--ck-palette-icon-primary": roles.iconPrimary,
    "--ck-palette-icon-secondary": roles.iconSecondary,
    "--ck-palette-icon-tertiary": roles.iconTertiary,
    "--ck-palette-ink": roles.textForeground,
    "--ck-palette-ink-secondary": roles.textForegroundSecondary,
    "--ck-palette-ink-tertiary": roles.textForegroundTertiary,
    "--ck-palette-label-accent": roles.textAccent,
    "--ck-palette-label-button-primary": roles.textButtonPrimary,
    "--ck-palette-label-button-secondary": roles.textButtonSecondary,
    "--ck-palette-label-button-tertiary": roles.textButtonTertiary,
    "--ck-palette-label-on-accent": toRgb(onAccentColor(base.accent)),
    "--ck-palette-simple-scrim": roles.simpleScrim,
    "--ck-palette-surface-accent": roles.accentBackground,
    "--ck-palette-surface-accent-active": roles.accentBackgroundActive,
    "--ck-palette-surface-accent-hover": roles.accentBackgroundHover,
    "--ck-palette-surface-application-menu": toHex(applicationMenu),
    "--ck-palette-surface-button-primary": roles.buttonPrimaryBackground,
    "--ck-palette-surface-button-primary-active":
      roles.buttonPrimaryBackgroundActive,
    "--ck-palette-surface-button-primary-hover":
      roles.buttonPrimaryBackgroundHover,
    "--ck-palette-surface-button-primary-inactive":
      roles.buttonPrimaryBackgroundInactive,
    "--ck-palette-surface-button-secondary": roles.buttonSecondaryBackground,
    "--ck-palette-surface-button-secondary-active":
      roles.buttonSecondaryBackgroundActive,
    "--ck-palette-surface-button-secondary-hover":
      roles.buttonSecondaryBackgroundHover,
    "--ck-palette-surface-button-secondary-inactive":
      roles.buttonSecondaryBackgroundInactive,
    "--ck-palette-surface-button-tertiary": roles.buttonTertiaryBackground,
    "--ck-palette-surface-button-tertiary-active":
      roles.buttonTertiaryBackgroundActive,
    "--ck-palette-surface-button-tertiary-hover":
      roles.buttonTertiaryBackgroundHover,
    "--ck-palette-surface-control": roles.controlBackground,
    "--ck-palette-surface-editor-opaque": toRgb(base.editorBackground),
    "--ck-palette-surface-elevated-primary": roles.elevatedPrimary,
    "--ck-palette-surface-elevated-primary-opaque": roles.elevatedPrimaryOpaque,
    "--ck-palette-surface-elevated-secondary": roles.elevatedSecondary,
    "--ck-palette-surface-elevated-secondary-opaque":
      roles.elevatedSecondaryOpaque,
    "--ck-palette-surface-elevated-tertiary-opaque":
      roles.elevatedTertiaryOpaque,
    "--ck-palette-surface-surface": settings.surface,
    "--ck-palette-surface-surface-under": base.surfaceUnder,
    "--color-fill-attribution-highlight": "var(--color-fill-info-soft)",
    "--color-fill-callout-surface": roles.elevatedPrimary,
    "--color-fill-composer-action-bar": light
      ? base.surfaceUnder
      : roles.elevatedSecondaryOpaque,
    "--color-fill-composer-primary": "var(--color-fill-primary-solid)",
    "--color-fill-control-opaque": roles.controlBackgroundOpaque,
    "--color-fill-mode-toggle-selected": light
      ? `color-mix(in oklab, ${roles.controlBackground} 90%, transparent)`
      : roles.controlBackgroundOpaque,
    "--color-fill-mode-toggle-track": light
      ? base.surfaceUnder
      : roles.buttonTertiaryBackgroundHover,
    "--color-fill-panel": panelBackground(base),
    "--color-fill-text-selection": "var(--color-fill-info-soft)",
    "--color-fill-user-message":
      "color-mix(in oklab, var(--color-text) 5%, transparent)",
    "--color-stroke-mode-toggle-selected": roles.border,
    "--color-text-composer-primary": "var(--color-text-strong-solid)",
    "--color-text-mode-toggle-inactive": `color-mix(in oklab, ${roles.textForeground} 80%, transparent)`,
    "--color-text-user-message": "var(--color-text)",
    "--shadow-mode-toggle-selected": "var(--shadow-md)",
    "--ui-theme-accent": settings.accent,
    "--ui-theme-background": settings.surface,
    "--ui-theme-contrast": String(settings.contrast),
    "--ui-theme-foreground": settings.ink,
  };
};

// SRGB hex to OKLab.
const toOklab = (hex: string) => {
  const color = parseHex(hex);

  const red = linearize(color.red);
  const green = linearize(color.green);
  const blue = linearize(color.blue);

  const lCone = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
  );

  const mCone = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
  );

  const sCone = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
  );

  return {
    a: 1.9779984951 * lCone - 2.428592205 * mCone + 0.4505937099 * sCone,
    b: 0.0259040371 * lCone + 0.7827717662 * mCone - 0.808675766 * sCone,
    l: 0.2104542553 * lCone + 0.793617785 * mCone - 0.0040720468 * sCone,
  };
};

const CONTENT_REFERENCE = {
  dark: { foreground: "#fcfcfc", surface: "#0e0e0e" },
  light: { foreground: "#0d0d0d", surface: "#f5f5f5" },
} as const;

// Content channel expressions derived from the under-surface and the ink.
const contentChannels = (
  surface: string,
  foreground: string,
  variant: ThemeVariant
) => {
  const reference = CONTENT_REFERENCE[variant];

  if (
    surface.toLowerCase() === reference.surface &&
    foreground.toLowerCase() === reference.foreground
  ) {
    return {
      "--ck-color-chromatic-channels": "l a b",
      "--ck-color-neutral-channels": "l a b",
    };
  }

  const own = toOklab(surface);
  const ownForeground = toOklab(foreground);
  const base = toOklab(reference.surface);
  const baseForeground = toOklab(reference.foreground);
  const ramp = `clamp(0, (l - ${base.l.toFixed(8)}) / ${(baseForeground.l - base.l).toFixed(8)}, 1)`;

  const shift = (axis: "l" | "a" | "b"): string => {
    const start = own[axis] - base[axis];
    const end = ownForeground[axis] - baseForeground[axis];

    return `${(0.12 * start).toFixed(8)} + ${ramp} * ${(0.12 * (end - start)).toFixed(8)}`;
  };

  const lightness = `clamp(0, l + clamp(-0.015, ${shift("l")}, 0.015), 1)`;

  const scale = Math.min(
    1.03,
    Math.max(
      0.97,
      1 +
        0.1 *
          (Math.abs(ownForeground.l - own.l) -
            Math.abs(baseForeground.l - base.l))
    )
  ).toFixed(8);

  const a = shift("a");
  const b = shift("b");
  const limit = `min(1, 0.01 / max(hypot((${a}), (${b})), 0.00000001))`;

  return {
    "--ck-color-chromatic-channels": `${lightness} calc(a * ${scale}) calc(b * ${scale})`,
    "--ck-color-neutral-channels": `${lightness} calc(a * ${scale} + (${a}) * ${limit}) calc(b * ${scale} + (${b}) * ${limit})`,
  };
};

// Generates the CSS variables the desktop app writes onto [data-theme] for one
// variant.
export const generateThemeVariables = (
  settings: ThemeSettings,
  variant: ThemeVariant
) => {
  const base = deriveBase(settings, variant);
  const roles = variant === "light" ? lightRoles(base) : darkRoles(base);

  return {
    ...buildVariables(base, roles),
    ...contentChannels(base.surfaceUnder, settings.ink, variant),
    "--ck-palette-label-unread-badge": toRgb(onAccentColor(base.accent)),
  };
};

// The generator emits one variable that the global stylesheet defines:
// --gray-pale-fixed is #dfdfdf.
const STATIC_VARIABLES = new Map([["var(--gray-pale-fixed)", "#dfdfdf"]]);

export const resolveStaticVariables = (
  variables: ThemeVariables
): ThemeVariables =>
  Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [
      name,
      STATIC_VARIABLES.get(value) ?? value,
    ])
  );

export const defaultThemeVariables = {
  dark: generateThemeVariables(defaultThemeSettings.dark, "dark"),
  light: generateThemeVariables(defaultThemeSettings.light, "light"),
} as const satisfies Record<ThemeVariant, ThemeVariables>;
