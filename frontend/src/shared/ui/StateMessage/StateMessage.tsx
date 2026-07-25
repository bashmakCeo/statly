import type { ReactNode } from "react";

type StateMessageVariant = "default" | "error";

type StateMessageProps = {
  children: ReactNode;
  variant?: StateMessageVariant;
};

// Универсальное серое сообщение для состояний loading / error / empty.
export function StateMessage({ children, variant = "default" }: StateMessageProps) {
  const className =
    variant === "error" ? "state-message state-message--error" : "state-message";

  return <p className={className}>{children}</p>;
}
