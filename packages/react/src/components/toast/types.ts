import type { ReactNode } from "react";

export type ToastLevel = "danger" | "info" | "success" | "warning";

export type ToastVariant =
  | "successSolid"
  | "dangerSolid"
  | "default"
  | "successNeutral";

/** A toast action: The toast renders a Button with this label and click handler. */
export interface ToastAction {
  /** Extra data attributes for the button, for callers that locate it. */
  dataAttributes?: Readonly<Record<`data-${string}`, string>>;
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}
