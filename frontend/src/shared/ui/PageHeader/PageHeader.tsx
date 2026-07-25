import type { ReactNode } from "react";

type PageHeaderProps = {
  children: ReactNode;
  className?: string;
};

// Шапка экрана: белая подложка с скруглением снизу. Содержимое произвольное.
export function PageHeader({ children, className }: PageHeaderProps) {
  const combinedClass = ["page-card", "page-card--hero", "page-header", className]
    .filter(Boolean)
    .join(" ");

  return <header className={combinedClass}>{children}</header>;
}
