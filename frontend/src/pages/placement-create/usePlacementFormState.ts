import { useState } from "react";

import { useToast } from "../../shared/ui/Toast";
import { initialPlacementForm, type PlacementForm } from "./model";
import {
  formatDateInput,
  formatPriceInput,
  getCalendarMonthFromInput,
  getDisplayDateValue,
  getInitialCalendarMonth,
} from "./placementCreateUtils";

export function usePlacementFormState() {
  const [form, setForm] = useState<PlacementForm>(initialPlacementForm);
  const [isPaid, setIsPaid] = useState(false);
  const [shouldShowErrors, setShouldShowErrors] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getInitialCalendarMonth());
  const [formatSuggestions, setFormatSuggestions] = useState<string[]>([]);
  const [isFormatSuggestionsOpen, setIsFormatSuggestionsOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  function handleFieldChange(field: keyof PlacementForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleDateChange(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      // Дату форматируем отдельно, чтобы в поле нельзя было сохранить буквы.
      date: formatDateInput(value, currentForm.date),
    }));
  }

  function handleCalendarOpen() {
    setCalendarMonth(getCalendarMonthFromInput(form.date));
    setIsCalendarOpen(true);
  }

  function handleCalendarDateSelect(date: Date) {
    handleFieldChange("date", getDisplayDateValue(date));
    setIsCalendarOpen(false);
  }

  function handleTimePickerOpen() {
    setIsTimePickerOpen(true);
  }

  function handleTimeSelect(time: string) {
    handleFieldChange("time", time);
    setIsTimePickerOpen(false);
  }

  function handleTimeClear() {
    handleFieldChange("time", "");
    setIsTimePickerOpen(false);
  }

  function handleFormatSuggestionSelect(format: string) {
    handleFieldChange("format", format);
    setIsFormatSuggestionsOpen(false);
  }

  function handlePriceChange(value: string) {
    handleFieldChange("price", formatPriceInput(value));
  }

  function handleFormatSuggestionsBlur() {
    window.setTimeout(() => setIsFormatSuggestionsOpen(false), 100);
  }

  return {
    calendarMonth,
    form,
    formatSuggestions,
    handleCalendarDateSelect,
    handleCalendarOpen,
    handleDateChange,
    handleFieldChange,
    handleFormatSuggestionSelect,
    handleFormatSuggestionsBlur,
    handlePriceChange,
    handleTimeClear,
    handleTimePickerOpen,
    handleTimeSelect,
    hidePopup: hideToast,
    isCalendarOpen,
    isFormatSuggestionsOpen,
    isPaid,
    isTimePickerOpen,
    setCalendarMonth,
    setForm,
    setFormatSuggestions,
    setIsCalendarOpen,
    setIsFormatSuggestionsOpen,
    setIsPaid,
    setIsTimePickerOpen,
    setShouldShowErrors,
    shouldShowErrors,
    showPopup: showToast,
    toast,
  };
}
