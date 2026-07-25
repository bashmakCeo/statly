import { useEffect, useRef } from "react";

type AnalyticsSummarySettingsProps = {
  byPurchaseDate: boolean;
  isOpen: boolean;
  paidOnly: boolean;
  onByPurchaseDateChange: (byPurchaseDate: boolean) => void;
  onClose: () => void;
  onPaidOnlyChange: (paidOnly: boolean) => void;
  onToggle: () => void;
};

export function AnalyticsSummarySettings({
  byPurchaseDate,
  isOpen,
  paidOnly,
  onByPurchaseDateChange,
  onClose,
  onPaidOnlyChange,
  onToggle,
}: AnalyticsSummarySettingsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (containerRef.current === null) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={
        isOpen
          ? "analytics-summary__settings analytics-summary__settings--open"
          : "analytics-summary__settings"
      }
      ref={containerRef}
    >
      <button
        aria-expanded={isOpen}
        aria-label="Настройки аналитики"
        className="analytics-summary__settings-trigger"
        type="button"
        onClick={onToggle}
      >
        <GearIcon />
      </button>

      {isOpen ? (
        <div className="analytics-summary__settings-menu" role="dialog">
          <label className="analytics-summary__settings-option">
            <input
              checked={paidOnly}
              type="checkbox"
              onChange={(event) => onPaidOnlyChange(event.target.checked)}
            />
            <span className="analytics-summary__settings-checkbox" aria-hidden="true" />
            <span className="analytics-summary__settings-label">
              Считать только оплаченные размещения
            </span>
          </label>
          <label className="analytics-summary__settings-option">
            <input
              checked={byPurchaseDate}
              type="checkbox"
              onChange={(event) => onByPurchaseDateChange(event.target.checked)}
            />
            <span className="analytics-summary__settings-checkbox" aria-hidden="true" />
            <span className="analytics-summary__settings-label">
              Считать по дате покупки
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      className="analytics-summary__settings-icon"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
