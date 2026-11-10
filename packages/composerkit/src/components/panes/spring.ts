/* A critically damped spring sampled into a CSS linear easing. */

const STIFFNESS = 380;
const DAMPING = 38;
const MASS = DAMPING ** 2 / (4 * STIFFNESS);
const SAMPLES = 48;
const SETTLED_FRACTION = 0.001;

const omega = Math.sqrt(STIFFNESS / MASS);

const remaining = (seconds: number) =>
  (1 + omega * seconds) * Math.exp(-omega * seconds);

const settleSeconds = () => {
  let seconds = 0;

  while (remaining(seconds) > SETTLED_FRACTION) {
    seconds += 0.01;
  }

  return seconds;
};

const stops = (duration: number) =>
  Array.from({ length: SAMPLES + 1 }, (_, index) =>
    index === SAMPLES
      ? 1
      : Number((1 - remaining((duration * index) / SAMPLES)).toFixed(4))
  );

if (DAMPING !== 2 * Math.sqrt(STIFFNESS * MASS)) {
  throw new Error(
    "The panel motion calculation does not accept critical damping."
  );
}

const SIDE_PANEL_SPRING_SECONDS = settleSeconds();

const SIDE_PANEL_SPRING_EASING = `linear(${stops(SIDE_PANEL_SPRING_SECONDS).join(", ")})`;

export { SIDE_PANEL_SPRING_EASING, SIDE_PANEL_SPRING_SECONDS };
