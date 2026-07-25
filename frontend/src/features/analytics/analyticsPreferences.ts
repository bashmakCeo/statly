export const ANALYTICS_PAID_ONLY_STORAGE_KEY = "statly-analytics-paid-only";
export const ANALYTICS_BY_PURCHASE_DATE_STORAGE_KEY = "statly-analytics-by-purchase-date";

export function readAnalyticsPaidOnlyPreference() {
  try {
    return localStorage.getItem(ANALYTICS_PAID_ONLY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeAnalyticsPaidOnlyPreference(paidOnly: boolean) {
  try {
    localStorage.setItem(ANALYTICS_PAID_ONLY_STORAGE_KEY, paidOnly ? "true" : "false");
  } catch {
    // localStorage может быть недоступен в части webview
  }
}

export function readAnalyticsByPurchaseDatePreference() {
  try {
    return localStorage.getItem(ANALYTICS_BY_PURCHASE_DATE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeAnalyticsByPurchaseDatePreference(byPurchaseDate: boolean) {
  try {
    localStorage.setItem(
      ANALYTICS_BY_PURCHASE_DATE_STORAGE_KEY,
      byPurchaseDate ? "true" : "false",
    );
  } catch {
    // localStorage может быть недоступен в части webview
  }
}

export function readDefaultAnalyticsQuery() {
  return {
    byPurchaseDate: readAnalyticsByPurchaseDatePreference(),
    paidOnly: readAnalyticsPaidOnlyPreference(),
  };
}
