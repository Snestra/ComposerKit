"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PreferencesScreen } from "@/components/preferences-screen";

// The static export has no request, so the page reads ?panel in the browser.
const PreferencesFromQuery = () => {
  const panel = useSearchParams().get("panel");

  return (
    <PreferencesScreen
      initialKeyCommands={panel === "key-commands"}
      key={panel ?? ""}
    />
  );
};

const PreferencesPage = () => (
  <Suspense fallback={<PreferencesScreen initialKeyCommands={false} />}>
    <PreferencesFromQuery />
  </Suspense>
);

export default PreferencesPage;
