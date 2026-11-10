"use client";

import { PlatformProvider } from "@workspace/react/components/platform-provider";
import { ButtonLink } from "@workspace/react/components/ui/button";
import Link from "next/link";
import type { ComponentProps } from "react";

const NextAnchor = ({ href = "", ...props }: ComponentProps<"a">) => (
  <Link href={href} {...props} />
);

export const ButtonScrollExample = ({ page }: { page: "one" | "two" }) => (
  <main className="gallery">
    <h1>Button link scroll: page {page}</h1>
    <p>
      Scroll down and follow the button link. The next page keeps the same
      position.
    </p>
    <div className="h-[900px]" />
    <PlatformProvider linkComponent={NextAnchor}>
      <ButtonLink
        to={`/gallery/button/scroll/${page === "one" ? "two" : "one"}`}
      >
        Go to page {page === "one" ? "two" : "one"}
      </ButtonLink>
    </PlatformProvider>
    <div className="h-[1500px]" />
  </main>
);
