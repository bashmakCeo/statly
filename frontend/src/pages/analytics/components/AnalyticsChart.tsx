import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { MONTH_SHORT_LABELS, formatPriceCompact, type MonthlyTotal } from "../analyticsUtils";

type AnalyticsChartProps = {
  monthlyTotals: MonthlyTotal[];
  selectedMonth: number | null;
  onMonthSelect: (month: number) => void;
};

const Y_AXIS_TICKS_COUNT = 6;
const MIN_SCROLLBAR_THUMB_PX = 32;
const BAR_GROW_STAGGER_MS = 40;

type ScrollbarMetrics = {
  canScroll: boolean;
  thumbWidth: number;
  thumbOffset: number;
};

type ScrollbarDragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  maxScrollLeft: number;
  maxThumbOffset: number;
};

export function AnalyticsChart({
  monthlyTotals,
  selectedMonth,
  onMonthSelect,
}: AnalyticsChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const chartDragStateRef = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const scrollbarDragStateRef = useRef<ScrollbarDragState | null>(null);
  const [isChartDragging, setIsChartDragging] = useState(false);
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const [scrollbarMetrics, setScrollbarMetrics] = useState<ScrollbarMetrics>({
    canScroll: false,
    thumbOffset: 0,
    thumbWidth: 0,
  });
  const [barsAnimationRun, setBarsAnimationRun] = useState(0);
  const maxValue = monthlyTotals.reduce(
    (max, item) => (item.totalPrice > max ? item.totalPrice : max),
    0,
  );
  const yAxisMax = maxValue > 0 ? maxValue : 1;
  const yAxisTicks = buildYAxisTicks(yAxisMax);
  const hasSelectedMonth = selectedMonth !== null;
  const barsDataKey = monthlyTotals
    .map((item) => `${item.month}:${item.totalPrice}`)
    .join("|");

  useEffect(() => {
    setBarsAnimationRun((currentRun) => currentRun + 1);
  }, [barsDataKey]);

  function syncScrollbarMetrics() {
    const scrollElement = scrollRef.current;

    if (scrollElement === null) {
      return;
    }

    const { clientWidth, scrollLeft, scrollWidth } = scrollElement;

    if (scrollWidth <= clientWidth) {
      setScrollbarMetrics({ canScroll: false, thumbOffset: 0, thumbWidth: 0 });
      return;
    }

    const thumbWidth = Math.max(
      (clientWidth / scrollWidth) * clientWidth,
      MIN_SCROLLBAR_THUMB_PX,
    );
    const maxScrollLeft = scrollWidth - clientWidth;
    const maxThumbOffset = clientWidth - thumbWidth;
    const thumbOffset =
      maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbOffset : 0;

    setScrollbarMetrics({ canScroll: true, thumbOffset, thumbWidth });
  }

  function setScrollFromThumbOffset(thumbOffset: number) {
    const scrollElement = scrollRef.current;

    if (scrollElement === null || scrollElement.scrollWidth <= scrollElement.clientWidth) {
      return;
    }

    const { clientWidth, scrollWidth } = scrollElement;
    const thumbWidth = Math.max(
      (clientWidth / scrollWidth) * clientWidth,
      MIN_SCROLLBAR_THUMB_PX,
    );
    const maxScrollLeft = scrollWidth - clientWidth;
    const maxThumbOffset = clientWidth - thumbWidth;
    const clampedThumbOffset = Math.max(0, Math.min(maxThumbOffset, thumbOffset));
    const scrollLeft =
      maxThumbOffset > 0 ? (clampedThumbOffset / maxThumbOffset) * maxScrollLeft : 0;

    scrollElement.scrollLeft = scrollLeft;
  }

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (scrollElement === null) {
      return;
    }

    syncScrollbarMetrics();

    const resizeObserver = new ResizeObserver(syncScrollbarMetrics);

    resizeObserver.observe(scrollElement);
    scrollElement.addEventListener("scroll", syncScrollbarMetrics);

    function handleWheel(event: WheelEvent) {
      const element = scrollRef.current;

      if (element === null || element.scrollWidth <= element.clientWidth) {
        return;
      }

      const horizontalDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (horizontalDelta === 0) {
        return;
      }

      event.preventDefault();
      element.scrollLeft += horizontalDelta;
    }

    scrollElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      scrollElement.removeEventListener("scroll", syncScrollbarMetrics);
      scrollElement.removeEventListener("wheel", handleWheel);
    };
  }, [monthlyTotals]);

  function handleChartMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const scrollElement = scrollRef.current;

    if (scrollElement === null) {
      return;
    }

    chartDragStateRef.current = {
      startX: event.clientX,
      scrollLeft: scrollElement.scrollLeft,
    };
    setIsChartDragging(true);
  }

  function handleChartMouseMove(event: MouseEvent<HTMLDivElement>) {
    const dragState = chartDragStateRef.current;
    const scrollElement = scrollRef.current;

    if (dragState === null || scrollElement === null) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;

    scrollElement.scrollLeft = dragState.scrollLeft - deltaX;
  }

  function stopChartDragging() {
    chartDragStateRef.current = null;
    setIsChartDragging(false);
  }

  function handleScrollbarThumbPointerDown(event: PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;

    if (scrollElement === null || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const { clientWidth, scrollLeft, scrollWidth } = scrollElement;
    const thumbWidth = Math.max(
      (clientWidth / scrollWidth) * clientWidth,
      MIN_SCROLLBAR_THUMB_PX,
    );
    const maxScrollLeft = scrollWidth - clientWidth;
    const maxThumbOffset = clientWidth - thumbWidth;

    scrollbarDragStateRef.current = {
      maxScrollLeft,
      maxThumbOffset,
      pointerId: event.pointerId,
      startScrollLeft: scrollLeft,
      startX: event.clientX,
    };
    setIsScrollbarDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleScrollbarThumbPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragStateRef.current;
    const scrollElement = scrollRef.current;

    if (
      dragState === null ||
      scrollElement === null ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const scrollDelta =
      dragState.maxThumbOffset > 0
        ? (deltaX / dragState.maxThumbOffset) * dragState.maxScrollLeft
        : 0;

    scrollElement.scrollLeft = dragState.startScrollLeft + scrollDelta;
  }

  function handleScrollbarThumbPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragStateRef.current;

    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    scrollbarDragStateRef.current = null;
    setIsScrollbarDragging(false);
  }

  function handleScrollbarTrackPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).classList.contains("analytics-chart__scrollbar-thumb")
    ) {
      return;
    }

    const trackElement = scrollbarTrackRef.current;
    const scrollElement = scrollRef.current;

    if (trackElement === null || scrollElement === null) {
      return;
    }

    const { clientWidth, scrollWidth } = scrollElement;
    const thumbWidth = Math.max(
      (clientWidth / scrollWidth) * clientWidth,
      MIN_SCROLLBAR_THUMB_PX,
    );
    const clickX = event.clientX - trackElement.getBoundingClientRect().left;
    const maxThumbOffset = clientWidth - thumbWidth;

    setScrollFromThumbOffset(clickX - thumbWidth / 2);
  }

  return (
    <div
      className={
        hasSelectedMonth
          ? "analytics-chart analytics-chart--month-selected"
          : "analytics-chart"
      }
    >
      <div className="analytics-chart__y-axis">
        {yAxisTicks
          .slice()
          .reverse()
          .map((tick) => (
            <span key={tick}>
              {tick === yAxisMax ? formatPriceCompact(tick) : tick === 0 ? "0" : formatPriceCompact(tick)}
            </span>
          ))}
      </div>

      <div className="analytics-chart__scroll-area">
        <div
          className={
            isChartDragging
              ? "analytics-chart__scroll analytics-chart__scroll--dragging"
              : "analytics-chart__scroll"
          }
          ref={scrollRef}
          onMouseDown={handleChartMouseDown}
          onMouseLeave={stopChartDragging}
          onMouseMove={handleChartMouseMove}
          onMouseUp={stopChartDragging}
        >
          <div className="analytics-chart__track">
            <div className="analytics-chart__grid" aria-hidden="true">
              {yAxisTicks.map((tick) => (
                <span key={tick} className="analytics-chart__grid-line" />
              ))}
            </div>
            {monthlyTotals.map((monthlyTotal, monthIndex) => {
              const ratio = monthlyTotal.totalPrice / yAxisMax;
              const heightPercent = ratio > 0 ? ratio * 100 : 0;
              const isSelected = selectedMonth === monthlyTotal.month;

              return (
                <div className="analytics-chart__month" key={monthlyTotal.month}>
                  <div className="analytics-chart__plot">
                    <button
                      aria-label={MONTH_SHORT_LABELS[monthlyTotal.month - 1]}
                      aria-pressed={isSelected}
                      className="analytics-chart__bar-cell"
                      type="button"
                      onClick={() => onMonthSelect(monthlyTotal.month)}
                    >
                      <span
                        className={
                          "analytics-chart__bar analytics-chart__bar--enter" +
                          (isSelected ? " analytics-chart__bar--selected" : "")
                        }
                        key={`${monthlyTotal.month}-${barsAnimationRun}`}
                        style={{
                          animationDelay: `${monthIndex * BAR_GROW_STAGGER_MS}ms`,
                          height: `${heightPercent}%`,
                        }}
                      />
                    </button>
                  </div>
                  <span
                    className={
                      isSelected
                        ? "analytics-chart__x-label analytics-chart__x-label--selected"
                        : "analytics-chart__x-label"
                    }
                  >
                    {MONTH_SHORT_LABELS[monthlyTotal.month - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          aria-hidden="true"
          className={
            (isScrollbarDragging ? "analytics-chart__scrollbar analytics-chart__scrollbar--dragging " : "analytics-chart__scrollbar ") +
            (scrollbarMetrics.canScroll
              ? ""
              : "analytics-chart__scrollbar--hidden")
          }
        >
          <div
            className="analytics-chart__scrollbar-track"
            ref={scrollbarTrackRef}
            onPointerDown={handleScrollbarTrackPointerDown}
          >
            <div
              className="analytics-chart__scrollbar-thumb"
              style={{
                transform: `translateY(-50%) translateX(${scrollbarMetrics.thumbOffset}px)`,
                width: `${scrollbarMetrics.thumbWidth}px`,
              }}
              onPointerCancel={handleScrollbarThumbPointerUp}
              onPointerDown={handleScrollbarThumbPointerDown}
              onPointerMove={handleScrollbarThumbPointerMove}
              onPointerUp={handleScrollbarThumbPointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildYAxisTicks(max: number) {
  const ticks = Array.from({ length: Y_AXIS_TICKS_COUNT }, (_, index) =>
    Math.round((max * index) / (Y_AXIS_TICKS_COUNT - 1)),
  );

  ticks[ticks.length - 1] = max;

  return ticks;
}
