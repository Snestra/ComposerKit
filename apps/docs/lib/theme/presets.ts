import type { RoleId } from "./model.ts";

export interface Preset {
  id: string;
  label: string;
  /** Seeds that differ from the DESIGN.md defaults. */
  seeds: Partial<Record<RoleId, string>>;
}

// Three brands far apart in hue and tint. The theme check exports each one
// and runs the gallery's contrast check under it.
export const presets: readonly Preset[] = [
  {
    id: "lemon",
    label: "Lemon",
    seeds: {
      accent: "#f5c400",
      message: "#a3e635",
      neutral: "#1c1a10",
      syntax: "#ca8a04",
    },
  },
  {
    id: "orchid",
    label: "Orchid",
    seeds: {
      accent: "#d6249f",
      discovery: "#e11d48",
      info: "#6366f1",
      message: "#7c3aed",
      neutral: "#2a1630",
      syntax: "#9333ea",
    },
  },
  {
    id: "lagoon",
    label: "Lagoon",
    seeds: {
      accent: "#0f9d8a",
      caution: "#eab308",
      danger: "#be123c",
      discovery: "#db2777",
      info: "#0891b2",
      message: "#0e7490",
      neutral: "#10201e",
      success: "#65a30d",
      syntax: "#0ea5e9",
      warning: "#ea580c",
    },
  },
];
