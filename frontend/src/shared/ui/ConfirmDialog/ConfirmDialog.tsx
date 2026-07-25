import "./ConfirmDialog.css";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  // danger — красная кнопка (удаление), primary — синяя (подтверждение настроек).
  confirmVariant?: "danger" | "primary";
  // Пока идёт действие, блокируем обе кнопки.
  isProcessing?: boolean;
  // Если задан, во время isProcessing показываем его вместо confirmLabel (обычно "...").
  processingLabel?: string;
  // Широкая панель (confirm-dialog__panel--wide) для длинных описаний.
  wide?: boolean;
  // Поднимаем z-index, когда диалог должен быть поверх другого оверлея.
  elevated?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  confirmVariant = "danger",
  isProcessing = false,
  processingLabel,
  wide = false,
  elevated = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmButtonLabel =
    isProcessing && processingLabel !== undefined ? processingLabel : confirmLabel;
  const confirmButtonClassName =
    confirmVariant === "primary" ? "confirm-dialog__confirm" : "confirm-dialog__delete";

  return (
    <div
      className={elevated ? "confirm-dialog confirm-dialog--elevated" : "confirm-dialog"}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="confirm-dialog__backdrop"
        type="button"
        aria-label="Закрыть"
        onClick={onCancel}
      />
      <div
        className={
          wide ? "confirm-dialog__panel confirm-dialog__panel--wide" : "confirm-dialog__panel"
        }
      >
        <h2>{title}</h2>
        {description !== undefined ? <p>{description}</p> : null}
        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__cancel"
            disabled={isProcessing}
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={confirmButtonClassName}
            disabled={isProcessing}
            type="button"
            onClick={onConfirm}
          >
            {confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
