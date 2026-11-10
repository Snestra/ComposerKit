/*
 * Split-view sizing: drawer width, ratio helpers, bounds and layout.
 */

export const HANDLE_WIDTH = 14;
export const MIN_PANE_WIDTH = 156;
export const DEFAULT_LEFT_RATIO = 0.5;
export const KEYBOARD_STEP = 12;
export const DRAWER_BREAKPOINT = 736;
export const RIGHT_FADE_IN_DELAY_MS = 160;
const DRAWER_MAX_RATIO = 0.9;

export const nonNegative = (value: number) => Math.max(0, value);

export const clampRatio = (value: number) => Math.min(Math.max(value, 0), 1);

export const clampTo = (value: number, max: number) =>
  Math.min(Math.max(value, 0), max);

export const ratioFromPercent = (percent: number | undefined) =>
  percent === undefined ? DEFAULT_LEFT_RATIO : clampRatio(percent / 100);

export const ratioOf = (container: number, left: number) =>
  container === 0 ? 0 : clampRatio(left / container);

export const maxLeftWidth = (
  container: number,
  minLeft: number,
  minRight: number
) => {
  const width = nonNegative(container);
  const room = width - minRight;

  return room <= minLeft ? Math.max(0, width) : Math.max(minLeft, room);
};

export const boundLeftWidth = (
  left: number,
  container: number,
  minLeft: number,
  minRight: number
) => {
  const width = nonNegative(container);

  if (width === 0) {
    return 0;
  }

  const lower = Math.min(minLeft, width);
  const upper = maxLeftWidth(container, minLeft, minRight);

  return upper <= lower
    ? Math.max(0, width)
    : Math.min(Math.max(left, lower), upper);
};

export interface PaneLayout {
  boundedLeftRatio: number;
  boundedLeftWidth: number;
  rightWidth: number;
}

export const layoutPanes = (
  container: number,
  minLeft: number,
  minRight: number,
  left: number
): PaneLayout => {
  const width = nonNegative(container);
  const boundedLeftWidth = boundLeftWidth(left, container, minLeft, minRight);

  return {
    boundedLeftRatio: ratioOf(width, boundedLeftWidth),
    boundedLeftWidth,
    rightWidth: clampTo(Math.max(0, width - boundedLeftWidth), width),
  };
};

export const drawerWidth = (
  container: number,
  minWidth: number,
  maxWidth: number | undefined,
  visibleInset: number
) => {
  const lower = Math.min(minWidth, container);

  const upper = Math.min(
    maxWidth ?? container,
    Math.max(0, container - visibleInset)
  );

  const preferred = Math.min(container * DRAWER_MAX_RATIO, upper);

  return Math.min(container, Math.max(lower, preferred));
};
