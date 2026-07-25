export function disableZoom() {
  const preventGesture = (event: Event) => {
    event.preventDefault();
  };

  const preventPinchOnTouchMove = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  let lastTouchEnd = 0;

  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  };

  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
  document.addEventListener("touchmove", preventPinchOnTouchMove, { passive: false });
  document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
}
