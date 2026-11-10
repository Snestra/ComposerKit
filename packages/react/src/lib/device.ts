export interface BrowserListener {
  cancel: () => void;
}

export type ColorSchemeListener = (dark: boolean) => void;

export type SafeAreaEdge = "bottom" | "left" | "right" | "top";

export type SafeAreaInsets = Record<SafeAreaEdge, number>;

const MEDIA = {
  dark: "(prefers-color-scheme: dark)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

const RIGHT_TO_LEFT = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "yi",
  "ps",
  "sd",
  "ckb",
]);

const APPLE_HANDHELD = /\b(?:iPad|iPhone|iPod)\b/u;
const APPLE_DESKTOP = /\bMacintosh\b/u;
const ANDROID = /\bAndroid\b/iu;

const browserWindow = (): Window | undefined =>
  "window" in globalThis && "document" in globalThis ? window : undefined;

const subscribeEvents = (
  target: EventTarget | undefined,
  events: readonly string[],
  listener: () => void
): BrowserListener => {
  for (const event of events) {
    target?.addEventListener(event, listener);
  }

  return {
    cancel: () => {
      for (const event of events) {
        target?.removeEventListener(event, listener);
      }
    },
  };
};

export const hasReducedMotion = () =>
  browserWindow()?.matchMedia(MEDIA.reducedMotion).matches ?? true;

export const watchReducedMotion = (listener: () => void): BrowserListener =>
  subscribeEvents(
    browserWindow()?.matchMedia(MEDIA.reducedMotion),
    ["change"],
    listener
  );

export const motionDuration = (milliseconds: number) =>
  hasReducedMotion() ? 0 : milliseconds;

interface AppearanceState {
  listeners: Set<ColorSchemeListener>;
  preference: boolean | undefined;
  query: MediaQueryList | undefined;
  value: boolean;
}

const appearance: AppearanceState = {
  listeners: new Set(),
  preference: undefined,
  query: undefined,
  value: false,
};

const deliverAppearance = (listener: ColorSchemeListener, dark: boolean) => {
  try {
    listener(dark);
  } catch (error) {
    console.warn(
      "A color-scheme listener threw while handling an update.",
      error
    );
  }
};

const publishAppearance = () => {
  const dark = appearance.preference ?? appearance.query?.matches ?? false;

  if (appearance.value !== dark) {
    appearance.value = dark;

    // Snapshot membership so additions wait for the next update and removals take effect now.
    const pending = [...appearance.listeners];

    for (const listener of pending) {
      if (appearance.listeners.has(listener)) {
        deliverAppearance(listener, dark);
      }
    }
  }
};

const connectAppearance = () => {
  const page = browserWindow();

  if (appearance.query === undefined && page !== undefined) {
    appearance.query = page.matchMedia(MEDIA.dark);
    appearance.value = appearance.preference ?? appearance.query.matches;
    appearance.query.addEventListener("change", publishAppearance);
  }
};

export const readDarkAppearance = () => {
  connectAppearance();

  return appearance.value;
};

/** Undefined restores the system preference. */
export const setAppearancePreference = (dark: boolean | undefined) => {
  connectAppearance();

  if (appearance.preference !== dark) {
    appearance.preference = dark;
    publishAppearance();
  }
};

export const getAppearancePreference = () => appearance.preference;

/** Browser listeners receive the current value immediately, then each change. */
export const watchDarkAppearance = (
  listener: ColorSchemeListener
): BrowserListener => {
  if (browserWindow() !== undefined) {
    connectAppearance();
    appearance.listeners.add(listener);
    deliverAppearance(listener, appearance.value);
  }

  return {
    cancel: () => {
      appearance.listeners.delete(listener);
    },
  };
};

export const readPreferredLocales = (): string[] => {
  const agent = browserWindow()?.navigator;

  if (agent === undefined) {
    return [];
  }

  const preferred =
    agent.languages.length > 0
      ? agent.languages
      : [agent.language].filter(Boolean);

  return preferred.map((locale) => locale.replace("_", "-"));
};

export const localeIsRightToLeft = (locale: string) => {
  const [language] = locale.replace("_", "-").toLowerCase().split("-");

  return RIGHT_TO_LEFT.has(language);
};

export const prefersRightToLeft = (
  locales: readonly string[] = readPreferredLocales()
) => locales.length > 0 && localeIsRightToLeft(locales[0]);

const viewportDimension = (axis: "innerHeight" | "innerWidth") =>
  Math.max(0, Math.floor(browserWindow()?.[axis] ?? 0));

export const readViewportWidth = () => viewportDimension("innerWidth");
export const readViewportHeight = () => viewportDimension("innerHeight");

export const readPixelRatio = () => {
  const ratio = browserWindow()?.devicePixelRatio;

  return ratio === undefined || ratio === 0 || Number.isNaN(ratio) ? 1 : ratio;
};

/** Reads computed environment padding without leaving a node in the document. */
export const readSafeAreaInset = (edge: SafeAreaEdge): number => {
  const page = browserWindow();

  if (page === undefined) {
    return 0;
  }

  const marker = page.document.createElement("div");
  Object.assign(marker.style, {
    height: "0",
    position: "absolute",
    visibility: "hidden",
    width: "0",
  });
  marker.style.setProperty(edge, "0");
  marker.style.setProperty(`padding-${edge}`, `env(safe-area-inset-${edge})`);
  page.document.body.append(marker);

  try {
    // oxlint-disable-next-line unicorn/prefer-number-coercion -- Computed padding includes a px suffix.
    const pixels = Number.parseFloat(
      page.getComputedStyle(marker).getPropertyValue(`padding-${edge}`)
    );

    return Number.isFinite(pixels) ? pixels : 0;
  } finally {
    marker.remove();
  }
};

export const readSafeAreaInsets = (): SafeAreaInsets => ({
  bottom: readSafeAreaInset("bottom"),
  left: readSafeAreaInset("left"),
  right: readSafeAreaInset("right"),
  top: readSafeAreaInset("top"),
});

export const watchViewportSize = (listener: () => void): BrowserListener =>
  subscribeEvents(browserWindow(), ["resize"], listener);

export const watchSafeArea = (listener: () => void): BrowserListener =>
  subscribeEvents(browserWindow(), ["resize", "orientationchange"], listener);

export const isDesktopPlatform = () => {
  const page = browserWindow();

  if (page === undefined) {
    return true;
  }

  const agent = page.navigator.userAgent;
  const touchMac = APPLE_DESKTOP.test(agent) && "ontouchend" in page;

  return !(touchMac || APPLE_HANDHELD.test(agent) || ANDROID.test(agent));
};
