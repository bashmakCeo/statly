import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_DELAY_MS = 2300;
const UNMOUNT_DELAY_MS = 2480;

export type ToastState = {
  message: string;
  isClosing: boolean;
};

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimers();
    setToast(null);
  }, [clearTimers]);

  const showToast = useCallback(
    (message: string) => {
      // Сначала плавно закрываем (toast--closing), и только потом убираем из DOM.
      clearTimers();
      setToast({ message, isClosing: false });

      closeTimerRef.current = window.setTimeout(() => {
        setToast((current) => (current === null ? null : { ...current, isClosing: true }));
      }, CLOSE_DELAY_MS);

      unmountTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, UNMOUNT_DELAY_MS);
    },
    [clearTimers],
  );

  // Чистим таймеры при размонтировании, чтобы не трогать состояние удалённого компонента.
  useEffect(() => clearTimers, [clearTimers]);

  return { toast, showToast, hideToast };
}
