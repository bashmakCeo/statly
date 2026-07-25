import type { ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ChartIcon, HomeIcon, ProfileIcon } from "../../shared/assets/icons/NavigationIcons";

type NavigationItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path?: string;
  matchPathPrefix?: string;
};

const navigationItems: NavigationItem[] = [
  { id: "channels", label: "Мои каналы", icon: HomeIcon, path: "/", matchPathPrefix: "/" },
  { id: "analytics", label: "Аналитика", icon: ChartIcon, path: "/analytics" },
  { id: "profile", label: "Профиль", icon: ProfileIcon, path: "/profile" },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeItemId = getActiveItemId(location.pathname);

  function handleItemClick(item: NavigationItem) {
    if (item.path !== undefined) {
      navigate(item.path);
    }
  }

  return (
    <nav className="bottom-navigation" aria-label="Основная навигация">
      {navigationItems.map((item) => {
        const isActive = item.id === activeItemId;
        const Icon = item.icon;

        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "bottom-navigation__item bottom-navigation__item--active"
                : "bottom-navigation__item"
            }
            key={item.id}
            onClick={() => handleItemClick(item)}
            type="button"
          >
            <Icon className="bottom-navigation__icon" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function getActiveItemId(pathname: string) {
  if (pathname.startsWith("/analytics")) {
    return "analytics";
  }

  if (pathname.startsWith("/profile")) {
    return "profile";
  }

  return "channels";
}
