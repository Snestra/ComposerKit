"use client";

import { Button } from "@workspace/react/components/ui/button";
import { DisclosureToggle } from "@workspace/react/components/ui/disclosure";
import { Folder } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const DisclosureGalleryExample = () => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spaceExpanded, setSpaceExpanded] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
      <header className="flex items-center gap-4">
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">Disclosure</h1>
      </header>
      <section className="flex flex-col gap-4" aria-label="Disclosure examples">
        <div className="flex items-center gap-2">
          <DisclosureToggle
            kind="page"
            expanded={expanded}
            isLoading={loading}
            title="Example"
            onClick={() => {
              setExpanded(!expanded);
            }}
            aria-controls="disclosure-content"
          />
          <span>Example</span>
        </div>
        {expanded && <p id="disclosure-content">Nested pages</p>}
        <Button
          color="outline"
          size="pageAction"
          onClick={() => {
            setLoading(!loading);
          }}
        >
          {loading ? "Stop loading" : "Start loading"}
        </Button>
        <div className="flex items-center gap-2">
          <DisclosureToggle
            kind="space"
            expanded={spaceExpanded}
            title="Workspace"
            onClick={() => {
              setSpaceExpanded(!spaceExpanded);
            }}
          >
            <Folder className="size-4" />
          </DisclosureToggle>
          <span>Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <DisclosureToggle
            disabled
            expanded={false}
            kind="page"
            title="Disabled"
          />
          <span>Disabled</span>
        </div>
        <Button
          color="outline"
          size="pageAction"
          onClick={() => {
            setShowInitialLoading(!showInitialLoading);
          }}
        >
          {showInitialLoading
            ? "Unmount loading disclosure"
            : "Mount loading disclosure"}
        </Button>
        <div className="flex items-center gap-2">
          {showInitialLoading && (
            <DisclosureToggle
              expanded={false}
              isLoading
              kind="page"
              title="Initial loading"
            />
          )}
          <DisclosureToggle
            expanded={false}
            kind="page"
            title="Localized example"
            label="Vis undersider"
          />
        </div>
      </section>
    </main>
  );
};

export { DisclosureGalleryExample };
