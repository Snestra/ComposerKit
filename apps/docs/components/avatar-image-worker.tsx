"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { withBasePath } from "@/lib/site";

const subscribeNothing = () => () => {
  /* Service worker support does not change while the page is open. */
};

const hasServiceWorker = () => "serviceWorker" in navigator;

// The avatar gallery loads its pictures from .../gallery/avatar/image, which
// public/gallery/avatar/image-worker.js answers in the browser. The children
// render once that worker controls the page, so no picture request misses it.
const AvatarImageWorker = ({ children }: { children: ReactNode }) => {
  const supported = useSyncExternalStore(
    subscribeNothing,
    hasServiceWorker,
    () => true
  );

  const [controlled, setControlled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasServiceWorker()) {
      return;
    }

    const { serviceWorker } = navigator;

    const update = () => {
      setControlled(serviceWorker.controller !== null);
    };

    serviceWorker.addEventListener("controllerchange", update);
    serviceWorker
      .register(withBasePath("/gallery/avatar/image-worker.js"))
      .then(async () => {
        await serviceWorker.ready;
        update();
      })
      .catch(() => {
        setFailed(true);
      });

    return () => {
      serviceWorker.removeEventListener("controllerchange", update);
    };
  }, []);

  if (!supported || failed) {
    return (
      <p className="text-sm text-muted-foreground" role="alert">
        This browser blocks service workers here, so the avatar pictures cannot
        load. Open the page over HTTPS or on localhost.
      </p>
    );
  }

  return controlled ? children : null;
};

export { AvatarImageWorker };
