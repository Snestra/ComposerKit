"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const COMPOSER_SUBMIT_MORPH_ENABLED = false;

type ComposerFeatureGates = Readonly<Record<string, boolean>>;

const ComposerFeatureGatesContext = createContext<ComposerFeatureGates>({
  submitMorph: COMPOSER_SUBMIT_MORPH_ENABLED,
});

const ComposerFeatureGatesProvider = ({
  children,
  gates,
}: {
  children?: ReactNode;
  gates: ComposerFeatureGates;
}) => (
  <ComposerFeatureGatesContext.Provider value={gates}>
    {children}
  </ComposerFeatureGatesContext.Provider>
);

/** Capabilities that the host has not enabled remain off. */
const useComposerFeatureGate = (id: string | false) => {
  const gates = useContext(ComposerFeatureGatesContext);

  return id === false ? false : (gates[id] ?? false);
};

export {
  COMPOSER_SUBMIT_MORPH_ENABLED,
  ComposerFeatureGatesProvider,
  useComposerFeatureGate,
};

export type { ComposerFeatureGates };
