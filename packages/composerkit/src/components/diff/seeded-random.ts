/* oxlint-disable eslint/no-bitwise -- ARC4 is defined in bitwise arithmetic; this is the generator of the `seedrandom` package (MIT), used for shimmer widths. */

const WIDTH = 256;
const CHUNKS = 6;
const START_DENOMINATOR = WIDTH ** CHUNKS;
const SIGNIFICANCE = 2 ** 52;
const OVERFLOW = SIGNIFICANCE * 2;
const MASK = WIDTH - 1;

const mixKey = (seed: string) => {
  const key: number[] = [];
  let smear = 0;

  for (let index = 0; index < seed.length; index += 1) {
    smear ^= (key[MASK & index] ?? 0) * 19;
    key[MASK & index] = MASK & (smear + (seed.codePointAt(index) ?? 0));
  }

  return key.length === 0 ? [0] : key;
};

/** seedrandom's default generator: the same seed gives the same sequence in [0, 1). */
export const createSeededRandom = (seed: string) => {
  const key = mixKey(seed);
  const state: number[] = Array.from({ length: WIDTH }, (_, index) => index);
  let i = 0;
  let j = 0;

  for (let index = 0; index < WIDTH; index += 1) {
    const t = state[index];
    j = MASK & (j + key[index % key.length] + t);
    state[index] = state[j];
    state[j] = t;
  }

  const draw = (count: number) => {
    let result = 0;

    for (let step = 0; step < count; step += 1) {
      i = MASK & (i + 1);
      const t = state[i];
      j = MASK & (j + t);
      state[i] = state[j];
      state[j] = t;
      result = result * WIDTH + state[MASK & (state[i] + state[j])];
    }

    return result;
  };

  draw(WIDTH);

  return () => {
    let n = draw(CHUNKS);
    let d = START_DENOMINATOR;
    let x = 0;

    while (n < SIGNIFICANCE) {
      n = (n + x) * WIDTH;
      d *= WIDTH;
      x = draw(1);
    }

    while (n >= OVERFLOW) {
      n /= 2;
      d /= 2;
      x >>>= 1;
    }

    return (n + x) / d;
  };
};
