import type { ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
};

// Белая нижняя подложка экрана со скруглением сверху и отступом под нижнее меню.
export function PageContent({ children, ariaLabel, className }: PageContentProps) {
  const combinedClass = ["page-card", "page-card--content", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-label={ariaLabel} className={combinedClass}>
      {children}
    </section>
  );
}
