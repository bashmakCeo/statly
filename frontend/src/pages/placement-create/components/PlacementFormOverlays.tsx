import { Toast, type ToastState } from "../../../shared/ui/Toast";
import type { PlacementForm } from "../model";
import { parseDisplayDate } from "../placementCreateUtils";
import { CalendarModal } from "./CalendarModal";
import { TimePickerModal } from "./TimePickerModal";

type PlacementFormOverlaysProps = {
  calendarMonth: Date;
  form: PlacementForm;
  isCalendarOpen: boolean;
  isTimePickerOpen: boolean;
  toast: ToastState | null;
  onCalendarClose: () => void;
  onCalendarDateSelect: (date: Date) => void;
  onCalendarMonthChange: (month: Date) => void;
  onTimeClear: () => void;
  onTimeClose: () => void;
  onTimeSelect: (time: string) => void;
};

export function PlacementFormOverlays({
  calendarMonth,
  form,
  isCalendarOpen,
  isTimePickerOpen,
  toast,
  onCalendarClose,
  onCalendarDateSelect,
  onCalendarMonthChange,
  onTimeClear,
  onTimeClose,
  onTimeSelect,
}: PlacementFormOverlaysProps) {
  return (
    <>
      <Toast state={toast} />

      {isCalendarOpen ? (
        <CalendarModal
          month={calendarMonth}
          selectedDate={parseDisplayDate(form.date)}
          onClose={onCalendarClose}
          onMonthChange={onCalendarMonthChange}
          onSelectDate={onCalendarDateSelect}
        />
      ) : null}

      {isTimePickerOpen ? (
        <TimePickerModal
          value={form.time}
          onClear={onTimeClear}
          onClose={onTimeClose}
          onSelect={onTimeSelect}
        />
      ) : null}
    </>
  );
}
