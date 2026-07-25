import { formatPrice, type MonthOverMonthComparison } from "../analyticsUtils";

type AnalyticsMonthComparisonProps = {
  comparison: MonthOverMonthComparison;
};

export function AnalyticsMonthComparison({ comparison }: AnalyticsMonthComparisonProps) {
  return (
    <p className="analytics-summary__comparison">
      <span
        className={`analytics-summary__comparison-value analytics-summary__comparison-value--${comparison.direction}`}
      >
        {comparison.arrow} {comparison.percentLabel}
      </span>
      <span className="analytics-summary__comparison-meta">
        {" "}
        к {comparison.previousMonthLabel} · {formatPrice(comparison.previousTotal)} ₽
      </span>
    </p>
  );
}
