import { blurActiveElement } from "../placementCreateUtils";

type PlacementInputProps = {
  hasError?: boolean;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  isSuggestionsOpen?: boolean;
  label: string;
  maxLength?: number;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onClick?: () => void;
  onRightIconClick?: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
  placeholder: string;
  readOnly?: boolean;
  required?: boolean;
  rightIconLabel?: string;
  rightIconSrc?: string;
  suggestions?: string[];
  value: string;
};

export function PlacementInput({
  hasError = false,
  inputMode,
  isSuggestionsOpen = false,
  label,
  maxLength,
  onBlur,
  onChange,
  onClick,
  onFocus,
  onRightIconClick,
  onSuggestionSelect,
  placeholder,
  readOnly = false,
  required = false,
  rightIconLabel,
  rightIconSrc,
  suggestions = [],
  value,
}: PlacementInputProps) {
  const shouldShowSuggestions = isSuggestionsOpen && suggestions.length > 0;

  return (
    <div
      className={
        hasError
          ? "placement-create-page__field placement-create-page__field--error"
          : "placement-create-page__field"
      }
    >
      <div className="placement-create-page__field-control">
        <input
          aria-label={label}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readOnly}
          required={required}
          value={value}
          onBlur={onBlur}
          onClick={onClick}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
        {rightIconSrc !== undefined ? (
          <button
            className="placement-create-page__field-icon"
            type="button"
            aria-label={rightIconLabel}
            onClick={onRightIconClick}
          >
            <img alt="" src={rightIconSrc} />
          </button>
        ) : null}
      </div>
      {shouldShowSuggestions ? (
        <div className="placement-create-page__suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect?.(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <span onPointerDown={blurActiveElement}>
        {label}
        {required ? <span className="placement-create-page__required">*</span> : null}
      </span>
    </div>
  );
}
