import { useEffect, useRef, useState } from "react";

import plusIcon from "../../shared/assets/icons/Plus.svg";

type FloatingActionButtonProps = {
  onAddChannel?: () => void;
  onAddPlacement?: () => void;
  canAddChannel?: boolean;
  hasAnyChannels?: boolean;
};

export function FloatingActionButton({
  onAddChannel,
  onAddPlacement,
  canAddChannel = true,
  hasAnyChannels = true,
}: FloatingActionButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const floatingActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (target === floatingActionRef.current || !floatingActionRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [isMenuOpen]);

  function handleToggleMenu() {
    if (!hasAnyChannels) {
      onAddChannel?.();
      return;
    }

    if (!canAddChannel) {
      onAddPlacement?.();
      return;
    }

    setIsMenuOpen((currentValue) => !currentValue);
  }

  function handleMenuAction(action?: () => void) {
    setIsMenuOpen(false);
    action?.();
  }

  return (
    <>
      {isMenuOpen ? (
        <button
          className="floating-action__backdrop"
          type="button"
          aria-label="Закрыть меню действий"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <div className="floating-action" ref={floatingActionRef}>
        {isMenuOpen ? (
          <div className="floating-action__menu" role="menu" aria-label="Быстрые действия">
            <button
              className="floating-action__menu-button"
              type="button"
              role="menuitem"
              onClick={() => handleMenuAction(onAddChannel)}
            >
              <ChannelActionIcon />
              Добавить канал
            </button>
            <button
              className="floating-action__menu-button"
              type="button"
              role="menuitem"
              onClick={() => handleMenuAction(onAddPlacement)}
            >
              <PlacementActionIcon />
              Добавить размещение
            </button>
          </div>
        ) : null}

        <button
          className="floating-action-button"
          type="button"
          aria-label={isMenuOpen ? "Закрыть меню действий" : "Открыть меню действий"}
          aria-expanded={isMenuOpen}
          onClick={handleToggleMenu}
        >
          <img alt="" className="floating-action-button__icon" src={plusIcon} />
        </button>
      </div>
    </>
  );
}
function ChannelActionIcon() {
  return (
    <svg
      className="floating-action__menu-icon"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 10.5v3h3.2L17 17.8V6.2l-8.8 4.3H5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 13.5 9.4 18h2.2l-1.4-3.7" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M19 10v4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function PlacementActionIcon() {
  return (
    <svg
      className="floating-action__menu-icon"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 5h12v14H6z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 3.8v2.8M15 3.8v2.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
