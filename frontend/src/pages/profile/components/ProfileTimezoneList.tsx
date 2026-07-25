import { useEffect, useRef, useState } from "react";

type TimezoneOption = {
  id: string;
  label: string;
};

type ProfileTimezoneListProps = {
  disabled?: boolean;
  isSheetOpen: boolean;
  options: TimezoneOption[];
  selectedTimezone: string;
  onSelect: (timezoneId: string) => void;
};

export function ProfileTimezoneList({
  disabled = false,
  isSheetOpen,
  options,
  selectedTimezone,
  onSelect,
}: ProfileTimezoneListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const selectedOption =
    options.find((option) => option.id === selectedTimezone) ?? null;

  useEffect(() => {
    if (!isSheetOpen) {
      setIsExpanded(false);
    }
  }, [isSheetOpen]);

  useEffect(() => {
    if (!isExpanded || selectedItemRef.current === null || listRef.current === null) {
      return;
    }

    selectedItemRef.current.scrollIntoView({
      block: "nearest",
    });
  }, [isExpanded, options.length, selectedTimezone]);

  function handleSelect(timezoneId: string) {
    onSelect(timezoneId);
    setIsExpanded(false);
  }

  return (
    <div
      className={
        isExpanded
          ? "profile-page__timezone-picker profile-page__timezone-picker--open"
          : "profile-page__timezone-picker"
      }
    >
      <button
        aria-expanded={isExpanded}
        className="profile-page__timezone-trigger"
        disabled={disabled}
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span>{selectedOption?.label ?? "Выберите часовой пояс"}</span>
        <ChevronIcon isOpen={isExpanded} />
      </button>

      {isExpanded ? (
        <div className="profile-page__timezone-list" ref={listRef}>
          {options.map((option) => {
            const isSelected = option.id === selectedTimezone;

            return (
              <button
                className={
                  isSelected
                    ? "profile-page__timezone-option profile-page__timezone-option--selected"
                    : "profile-page__timezone-option"
                }
                disabled={disabled}
                key={option.id}
                ref={isSelected ? selectedItemRef : undefined}
                type="button"
                onClick={() => handleSelect(option.id)}
              >
                <span>{option.label}</span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        isOpen
          ? "profile-page__timezone-chevron profile-page__timezone-chevron--open"
          : "profile-page__timezone-chevron"
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

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="profile-page__timezone-check"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
