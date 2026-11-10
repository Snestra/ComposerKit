"use client";

import { Button } from "@workspace/react/components/ui/button";
import { useEffect, useRef, useState } from "react";

import { PreferencesScreen } from "@/components/preferences-screen";

type Playback = "playing" | "interrupted" | "finished";

const DemoScene = ({ onFinish }: { onFinish: (state: Playback) => void }) => {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const cursor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pointer = cursor.current;

    if (!pointer?.parentElement) {
      throw new Error("The preferences demo could not locate its controls");
    }

    const root = pointer.parentElement;
    let stopped = false;
    let activeTarget: HTMLElement | null = null;
    const timers: number[] = [];

    const schedule = (delay: number, action: () => void) => {
      timers.push(
        window.setTimeout(() => {
          if (!stopped) {
            action();
          }
        }, delay)
      );
    };

    const stop = () => {
      stopped = true;

      for (const timer of timers) {
        window.clearTimeout(timer);
      }

      pointer.hidden = true;
    };

    const interrupt = (event: Event) => {
      if (event.isTrusted && !stopped) {
        stop();
        onFinish("interrupted");
      }
    };

    const target = (selector: string) =>
      root.querySelector<HTMLElement>(selector);

    const move = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      activeTarget = element;
      const bounds = element.getBoundingClientRect();
      const parent = root.getBoundingClientRect();
      pointer.style.transform = `translate(${bounds.left - parent.left - root.clientLeft + bounds.width / 2 - 2}px, ${bounds.top - parent.top - root.clientTop + bounds.height / 2 - 2}px)`;
      pointer.hidden = false;
    };

    // The cursor follows its target's live rect, not a single sample. A resize
    // can start a CSS transition on an ancestor of the target (the centred
    // toast list slides when it crosses 600px), so the target keeps moving after
    // the resize callback. Re-place the cursor every frame until the resize
    // frames have passed and no transition is running under the stage.
    const settleFrames = 3;
    let running = 0;
    let framesLeft = 0;
    let frame = 0;

    const place = () => {
      if (stopped || activeTarget?.isConnected !== true) {
        return;
      }

      move(activeTarget);

      for (const animation of pointer.getAnimations()) {
        animation.finish();
      }
    };

    const follow = () => {
      frame = 0;
      place();
      framesLeft -= 1;

      if (!stopped && (framesLeft > 0 || running > 0)) {
        frame = window.requestAnimationFrame(follow);
      }
    };

    const startFollowing = () => {
      framesLeft = settleFrames;

      if (frame === 0 && !stopped) {
        frame = window.requestAnimationFrame(follow);
      }
    };

    const ownsTransition = (event: TransitionEvent) =>
      event.target instanceof Node && !pointer.contains(event.target);

    const onTransitionRun = (event: TransitionEvent) => {
      if (ownsTransition(event)) {
        running += 1;
        startFollowing();
      }
    };

    const onTransitionDone = (event: TransitionEvent) => {
      if (ownsTransition(event)) {
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        running = Math.max(0, running - 1);
        startFollowing();
      }
    };

    const resize = new ResizeObserver(() => {
      if (!stopped && activeTarget?.isConnected === true) {
        place();
        startFollowing();
      }
    });

    resize.observe(root);
    root.addEventListener("transitionrun", onTransitionRun);
    root.addEventListener("transitionend", onTransitionDone);
    root.addEventListener("transitioncancel", onTransitionDone);

    const sound = () => target('[data-target="sound"]');

    const undo = () => target('[data-target="undo"]');

    const press = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      pointer.dataset.pressed = "true";
      schedule(300, () => {
        element.click();
        delete pointer.dataset.pressed;
      });
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const showPoster = () => {
      stop();

      if (sound()?.getAttribute("aria-checked") === "true") {
        sound()?.click();
      }

      onFinish("finished");
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches && !stopped) {
        showPoster();
      }
    };

    reduced.addEventListener("change", onMotionChange);
    root.addEventListener("pointerdown", interrupt, true);
    root.addEventListener("keydown", interrupt, true);

    if (reduced.matches) {
      schedule(100, showPoster);
    } else {
      schedule(500, () => {
        move(sound());
      });
      schedule(2500, () => {
        press(sound());
      });
      schedule(5000, () => {
        move(undo());
      });
      schedule(7000, () => {
        press(undo());
      });
      schedule(11_000, () => {
        stop();
        onFinish("finished");
      });
    }

    return () => {
      stop();
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      root.removeEventListener("transitionrun", onTransitionRun);
      root.removeEventListener("transitionend", onTransitionDone);
      root.removeEventListener("transitioncancel", onTransitionDone);
      root.removeEventListener("pointerdown", interrupt, true);
      root.removeEventListener("keydown", interrupt, true);
      reduced.removeEventListener("change", onMotionChange);
    };
  }, [onFinish]);

  return (
    <div className="preferences-demo-stage" ref={setStage}>
      {stage && (
        <PreferencesScreen
          initialKeyCommands={false}
          initialAlerts
          toastContainer={stage}
        />
      )}
      <div
        aria-hidden="true"
        className="preferences-demo-cursor"
        data-cursor="demo"
        hidden
        ref={cursor}
      >
        <svg width="25" height="31" viewBox="0 0 25 31" fill="none">
          <path
            d="M2 2v22l6-5 4 9 4-2-4-9h8L2 2Z"
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export const PreferencesDemo = () => {
  const [run, setRun] = useState(0);
  const [playback, setPlayback] = useState<Playback>("playing");

  const status: Record<Playback, string> = {
    finished: "Demonstration complete.",
    interrupted: "Demonstration paused. Use Replay to start again.",
    playing: "Demonstration playing",
  };

  return (
    <div className="preferences-demo-page">
      <div className="preferences-demo-header">
        <div>
          <h1>Preferences</h1>
          <p>Change a setting, then undo it.</p>
        </div>
        <Button
          onClick={() => {
            setPlayback("playing");
            setRun((value) => value + 1);
          }}
          color="outline"
          size="dialog"
        >
          Replay
        </Button>
      </div>
      <DemoScene key={run} onFinish={setPlayback} />
      <p aria-live="polite" className="preferences-demo-status">
        {status[playback]}
      </p>
    </div>
  );
};
