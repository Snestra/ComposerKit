"use client";

import { useMergedRef } from "composerkit/components/ui/text-field";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactElement, RefObject } from "react";

/*
 * Presence and a motion div on the Web Animations API, for the layout family:
 * the searchable page layout header and OnboardingPage.
 */

interface MotionValues {
  opacity: number;
  y: number;
}

type MotionTransition =
  | { bounce: number; duration: number; kind: "spring" }
  | { duration: number; easing: string; kind: "tween" };

const MILLISECONDS = 1000;
const SPRING_REST_DELTA = 0.001;
const SPRING_NEWTON_STEPS = 11;
const SPRING_MIN_DAMPING = 0.05;
const SPRING_MAX_DAMPING = 1;
const SPRING_SAMPLE_MS = 4;

// The undamped frequency of the spring with
// the given duration and bounce, found by Newton's method from 5 / duration.
const springFrequency = (duration: number, damping: number) => {
  const decayAt = (frequency: number) => {
    const rate = frequency * damping;
    const root = frequency * Math.sqrt(1 - damping * damping);

    return SPRING_REST_DELTA - (rate / root) * Math.exp(-rate * duration);
  };

  const slopeAt = (frequency: number) => {
    const rate = frequency * damping * duration;
    const stiffness = damping ** 2 * frequency ** 2 * duration;
    const root = frequency ** 2 * Math.sqrt(1 - damping * damping);
    const direction = -decayAt(frequency) + SPRING_REST_DELTA > 0 ? -1 : 1;

    return (direction * (-stiffness * Math.exp(-rate))) / root;
  };

  let frequency = 5 / duration;

  for (let step = 0; step < SPRING_NEWTON_STEPS; step += 1) {
    frequency -= decayAt(frequency) / slopeAt(frequency);
  }

  return frequency;
};

// The underdamped spring from 0 to 1 released at rest, snapping to 1 at the duration.
const springProgressAt = (
  seconds: number,
  duration: number,
  bounce: number
) => {
  if (seconds >= duration) {
    return 1;
  }

  const damping = Math.min(
    SPRING_MAX_DAMPING,
    Math.max(SPRING_MIN_DAMPING, 1 - bounce)
  );

  const frequency = springFrequency(duration, damping);

  if (damping >= 1) {
    return 1 - (1 + frequency * seconds) * Math.exp(-frequency * seconds);
  }

  const dampedFrequency = frequency * Math.sqrt(1 - damping * damping);
  const decay = Math.exp(-damping * frequency * seconds);

  return (
    1 -
    decay *
      (Math.cos(dampedFrequency * seconds) +
        ((damping * frequency) / dampedFrequency) *
          Math.sin(dampedFrequency * seconds))
  );
};

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const toKeyframe = (from: MotionValues, to: MotionValues, progress: number) => {
  const opacity = Math.min(
    1,
    Math.max(0, mix(from.opacity, to.opacity, progress))
  );

  return {
    opacity,
    transform: `translateY(${mix(from.y, to.y, progress)}px)`,
  } satisfies Keyframe;
};

/** Plays `from` to `to` on the element; null when the duration is 0. */
const animateMotion = (
  element: HTMLElement,
  from: MotionValues,
  to: MotionValues,
  transition: MotionTransition,
  fill: FillMode
): Animation | null => {
  if (transition.duration <= 0) {
    return null;
  }

  if (transition.kind === "tween") {
    return element.animate([toKeyframe(from, to, 0), toKeyframe(from, to, 1)], {
      duration: transition.duration * MILLISECONDS,
      easing: transition.easing,
      fill,
    });
  }

  const total = transition.duration * MILLISECONDS;
  const samples = Math.max(2, Math.ceil(total / SPRING_SAMPLE_MS));

  const keyframes = Array.from({ length: samples + 1 }, (_, index) =>
    toKeyframe(
      from,
      to,
      springProgressAt(
        (index / samples) * transition.duration,
        transition.duration,
        transition.bounce
      )
    )
  );

  return element.animate(keyframes, {
    duration: total,
    easing: "linear",
    fill,
  });
};

interface PresenceValue {
  isPresent: boolean;
  /** True until the Presence commits when `initial` is false. */
  skipInitial: RefObject<boolean>;
  safeToRemove: () => void;
}

const PresenceContext = createContext<PresenceValue | null>(null);

/** UsePresence: true outside a Presence. */
const useIsPresent = () => useContext(PresenceContext)?.isPresent ?? true;

interface PresenceProps {
  children: ReactElement | null | false;
  /** False skips the enter animation of children present on the first render. */
  initial?: boolean;
}

/**
 * AnimatePresence for one child: when the child goes away, the last child
 * stays mounted with isPresent false until its motion div finishes its exit.
 */
const Presence = ({ children, initial = true }: PresenceProps) => {
  const current = children === false ? null : children;
  const skipInitial = useRef(!initial);
  const [kept, setKept] = useState<ReactElement | null>(current);

  useEffect(() => {
    skipInitial.current = false;
  }, []);

  if (current !== null && kept !== current) {
    setKept(current);
  }

  const safeToRemove = useCallback(() => {
    setKept(null);
  }, []);

  const value = useMemo(
    () => ({ isPresent: current !== null, safeToRemove, skipInitial }),
    [current, safeToRemove]
  );

  const shown = current ?? kept;

  return shown === null ? null : (
    <PresenceContext value={value}>{shown}</PresenceContext>
  );
};

interface MotionDivProps extends Omit<ComponentProps<"div">, "children"> {
  animate: MotionValues;
  children?: ComponentProps<"div">["children"];
  exit?: MotionValues;
  initial?: MotionValues | false;
  /** Takes the leaving element out of the flow while it exits (AnimatePresence mode popLayout). */
  popLayout?: boolean;
  transition: MotionTransition;
}

const noCleanup = () => {
  // The element had no animation to stop.
};

/** Pins the element where it is, out of the flow; the returned function puts its inline styles back. */
const takeOutOfFlow = (element: HTMLElement) => {
  const { height, left, position, top, width } = element.style;

  element.style.position = "absolute";
  element.style.top = `${element.offsetTop}px`;
  element.style.left = `${element.offsetLeft}px`;
  element.style.width = `${element.offsetWidth}px`;
  element.style.height = `${element.offsetHeight}px`;

  return () => {
    Object.assign(element.style, { height, left, position, top, width });
  };
};

/**
 * motion.div: plays initial to animate on mount, and animate to exit when its
 * Presence drops it. Without exit the element leaves at once.
 */
const MotionDiv = ({
  animate,
  exit,
  initial = false,
  popLayout = false,
  ref,
  transition,
  ...props
}: MotionDivProps) => {
  const presence = useContext(PresenceContext);
  const isPresent = presence?.isPresent ?? true;
  const local = useRef<HTMLDivElement | null>(null);
  const merged = useMergedRef(ref, local);

  const enter = useEffectEvent(() => {
    const element = local.current;

    if (
      element === null ||
      initial === false ||
      presence?.skipInitial.current === true
    ) {
      return null;
    }

    return animateMotion(element, initial, animate, transition, "backwards");
  });

  const leave = useEffectEvent(() => {
    const element = local.current;

    if (element === null) {
      return null;
    }

    const putBack = popLayout ? takeOutOfFlow(element) : noCleanup;

    const running = exit
      ? animateMotion(element, animate, exit, transition, "forwards")
      : null;

    return { putBack, running };
  });

  useLayoutEffect(() => {
    const running = enter();

    return () => {
      running?.cancel();
    };
  }, []);

  useLayoutEffect(() => {
    if (isPresent || presence === null) {
      return noCleanup;
    }

    const left = leave();

    if (left === null || left.running === null) {
      presence.safeToRemove();

      return noCleanup;
    }

    const { putBack, running } = left;
    let cancelled = false;

    const finish = async () => {
      try {
        await running.finished;

        if (!cancelled) {
          presence.safeToRemove();
        }
      } catch {
        // Cancelling the animation rejects finished, and the element stays.
      }
    };

    void finish();

    return () => {
      cancelled = true;
      running.cancel();
      putBack();
    };
  }, [isPresent, presence]);

  return <div {...props} ref={merged} />;
};

export { animateMotion, MotionDiv, Presence, useIsPresent };

export type { MotionDivProps, MotionTransition, MotionValues, PresenceProps };
