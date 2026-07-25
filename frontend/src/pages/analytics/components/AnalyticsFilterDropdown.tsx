import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type AnalyticsFilterDropdownProps = {
  ariaLabel: string;
  children: ReactNode;
  isOpen: boolean;
  label: string;
  onClose: () => void;
  onToggle: () => void;
};

export function AnalyticsFilterDropdown({
  ariaLabel,
  children,
  isOpen,
  label,
  onClose,
  onToggle,
}: AnalyticsFilterDropdownProps) {
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
          ? "analytics-filter analytics-filter--open"
          : "analytics-filter"
      }
      ref={containerRef}
    >
      <button
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="analytics-filter__trigger"
        type="button"
        onClick={onToggle}
      >
        <span className="analytics-filter__trigger-label">{label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen ? <div className="analytics-filter__menu">{children}</div> : null}
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        isOpen
          ? "analytics-filter__chevron analytics-filter__chevron--open"
          : "analytics-filter__chevron"
      }
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
