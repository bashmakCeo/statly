import { Suspense, lazy, type ReactNode } from "react";

import { BottomNavigation } from "../../../widgets/bottom-navigation/BottomNavigation";

const DevUserSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import("../../../widgets/dev-user-switcher/DevUserSwitcher").then((module) => ({
        default: module.DevUserSwitcher,
      })),
    )
  : null;

type PageLayoutProps = {
  children: ReactNode;
  className?: string;
};

// Общий каркас экрана: ограничение ширины, фон и нижняя навигация.
export function PageLayout({ children, className }: PageLayoutProps) {
  const combinedClass = ["page", className].filter(Boolean).join(" ");

  return (
    <main className={combinedClass}>
      {DevUserSwitcher !== null ? (
        <Suspense fallback={null}>
          <DevUserSwitcher />
        </Suspense>
      ) : null}
      {children}
      <BottomNavigation />
    </main>
  );
}
