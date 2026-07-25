import "./Toast.css";

import type { ToastState } from "./useToast";

export type ToastVariant = "default" | "low" | "low-elevated" | "muted";

const VARIANT_CLASS_NAME: Record<ToastVariant, string> = {
  default: "toast",
  low: "toast toast--low",
  "low-elevated": "toast toast--low toast--elevated",
  muted: "toast toast--muted toast--low toast--elevated",
};

type ToastProps = {
  state: ToastState | null;
  variant?: ToastVariant;
};

export function Toast({ state, variant = "default" }: ToastProps) {
  if (state === null) {
    return null;
  }

  const baseClassName = VARIANT_CLASS_NAME[variant];
  const className = state.isClosing ? `${baseClassName} toast--closing` : baseClassName;

  return (
    <div className={className} role="status">
      {state.message}
    </div>
  );
}
