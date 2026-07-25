import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

const ITEM_HEIGHT = 44;
const CYCLE_COUNT = 9;
const CENTER_CYCLE = Math.floor(CYCLE_COUNT / 2);
const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 60 }, (_, index) => index);

type HapticWindow = Window & {
  Telegram?: {
    WebApp?: {
      HapticFeedback?: {
        selectionChanged?: () => void;
      };
    };
  };
};

type TimePickerModalProps = {
  value: string;
  onClear: () => void;
  onClose: () => void;
  onSelect: (time: string) => void;
};

export function TimePickerModal({
  value,
  onClear,
  onClose,
  onSelect,
}: TimePickerModalProps) {
  const initialTime = useMemo(() => parseTimeValue(value), [value]);
  const [selectedHour, setSelectedHour] = useState(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTime.minute);

  function handleDone() {
    onSelect(`${padTimePart(selectedHour)}:${padTimePart(selectedMinute)}`);
  }

  return (
    <div className="placement-time-picker" role="dialog" aria-modal="true">
      <button
        className="placement-time-picker__backdrop"
        type="button"
        aria-label="Закрыть выбор времени"
        onClick={onClose}
      />
      <div className="placement-time-picker__panel">
        <header className="placement-time-picker__header">
          <button type="button" onClick={onClear}>
            Без времени
          </button>
          <h2>Время</h2>
          <button type="button" onClick={handleDone}>
            Готово
          </button>
        </header>

        <div className="placement-time-picker__wheels" aria-label="Выбор времени">
          <TimeWheel
            label="Часы"
            selectedValue={selectedHour}
            values={hours}
            onChange={setSelectedHour}
          />
          <span className="placement-time-picker__separator" aria-hidden="true">
            :
          </span>
          <TimeWheel
            label="Минуты"
            selectedValue={selectedMinute}
            values={minutes}
            onChange={setSelectedMinute}
          />
        </div>
      </div>
    </div>
  );
}

type TimeWheelProps = {
  label: string;
  selectedValue: number;
  values: number[];
  onChange: (value: number) => void;
};

function TimeWheel({ label, selectedValue, values, onChange }: TimeWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastHapticValueRef = useRef(selectedValue);
  const dragRef = useRef<{
    pointerId: number;
    startScrollTop: number;
    startY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const virtualIndexes = useMemo(
    () => Array.from({ length: values.length * CYCLE_COUNT }, (_, index) => index),
    [values.length],
  );

  useEffect(() => {
    const selectedIndex = values.indexOf(selectedValue);
    const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

    wheelRef.current?.scrollTo({
      top: (CENTER_CYCLE * values.length + safeSelectedIndex) * ITEM_HEIGHT,
    });
    // Нужно только при открытии: дальше позицию контролирует сам scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function handleScroll() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      const wheel = wheelRef.current;

      if (wheel === null) {
        return;
      }

      const index = Math.min(
        virtualIndexes.length - 1,
        Math.max(0, Math.round(wheel.scrollTop / ITEM_HEIGHT)),
      );
      const valueIndex = positiveModulo(index, values.length);

      updateValue(values[valueIndex]);

      if (index < values.length * 2 || index > values.length * (CYCLE_COUNT - 2)) {
        wheel.scrollTop = (CENTER_CYCLE * values.length + valueIndex) * ITEM_HEIGHT;
      }
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const wheel = wheelRef.current;

    if (wheel === null || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startScrollTop: wheel.scrollTop,
      startY: event.clientY,
    };
    wheel.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const wheel = wheelRef.current;
    const drag = dragRef.current;

    if (wheel === null || drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - drag.startY;

    if (Math.abs(deltaY) > 3) {
      didDragRef.current = true;
    }

    wheel.scrollTop = drag.startScrollTop - deltaY;
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const wheel = wheelRef.current;
    const drag = dragRef.current;

    if (wheel !== null && drag !== null && drag.pointerId === event.pointerId) {
      wheel.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  return (
    <div className="placement-time-picker__wheel-wrap">
      <span>{label}</span>
      <div
        ref={wheelRef}
        className="placement-time-picker__wheel"
        role="listbox"
        tabIndex={0}
        aria-label={label}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {virtualIndexes.map((virtualIndex) => {
          const value = values[virtualIndex % values.length];

          return (
            <div
              className={
                value === selectedValue
                  ? "placement-time-picker__item placement-time-picker__item--selected"
                  : "placement-time-picker__item"
              }
              key={`${label}-${virtualIndex}`}
              role="option"
              aria-selected={value === selectedValue}
              onClick={() => {
                if (didDragRef.current) {
                  return;
                }

                const wheel = wheelRef.current;

                updateValue(value);

                if (wheel === null) {
                  return;
                }

                const currentIndex = Math.round(wheel.scrollTop / ITEM_HEIGHT);
                const targetIndex = getClosestVirtualIndex(
                  currentIndex,
                  virtualIndex,
                  values.length,
                );

                wheel.scrollTo({ top: targetIndex * ITEM_HEIGHT, behavior: "smooth" });
              }}
            >
              {padTimePart(value)}
            </div>
          );
        })}
      </div>
    </div>
  );

  function updateValue(value: number) {
    onChange(value);

    if (lastHapticValueRef.current === value) {
      return;
    }

    lastHapticValueRef.current = value;
    triggerSelectionHaptic();
  }
}

function getClosestVirtualIndex(
  currentIndex: number,
  selectedVirtualIndex: number,
  cycleLength: number,
) {
  const selectedValueIndex = positiveModulo(selectedVirtualIndex, cycleLength);
  const currentCycle = Math.round(currentIndex / cycleLength);
  const candidates = [currentCycle - 1, currentCycle, currentCycle + 1].map(
    (cycle) => cycle * cycleLength + selectedValueIndex,
  );

  return candidates.reduce((closestIndex, candidateIndex) =>
    Math.abs(candidateIndex - currentIndex) < Math.abs(closestIndex - currentIndex)
      ? candidateIndex
      : closestIndex,
  );
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function triggerSelectionHaptic() {
  const hapticFeedback = (window as HapticWindow).Telegram?.WebApp?.HapticFeedback;

  if (hapticFeedback?.selectionChanged !== undefined) {
    hapticFeedback.selectionChanged();
    return;
  }

  navigator.vibrate?.(8);
}

function parseTimeValue(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (match === null) {
    return { hour: 9, minute: 0 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { hour: 9, minute: 0 };
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}
