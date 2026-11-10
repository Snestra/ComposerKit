/**
 * Whether the href resolves to an http or https origin other than the page
 * origin. A raw scheme regex misses protocol-relative links, leading or
 * trailing whitespace, and backslash separators, which browsers still resolve
 * to an external http or https destination. Server render returns false, and
 * callers use the result only in event handlers, so hydration output is
 * unchanged.
 */
export const resolvesToExternalWeb = (href: string): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const url = new URL(href.trim(), window.location.href);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin !== window.location.origin
    );
  } catch {
    return false;
  }
};
