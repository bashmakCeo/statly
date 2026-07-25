import { useEffect, useMemo, useState } from "react";

import { useAnalytics } from "../../features/analytics/analyticsCache";
import { useChannels } from "../../features/channels/useChannels";
import {
  getOnboardingMockYear,
  ONBOARDING_MOCK_BUCKETS,
  ONBOARDING_MOCK_CHANNELS,
} from "../../features/onboarding/onboardingAnalyticsMock";
import { useOnboarding } from "../../features/onboarding/useOnboarding";
import { getPlacementAnalytics } from "../../features/placements/api";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { AnalyticsChannelStatsList } from "./components/AnalyticsChannelStatsList";
import { AnalyticsChart } from "./components/AnalyticsChart";
import { AnalyticsFilterDropdown } from "./components/AnalyticsFilterDropdown";
import { AnalyticsMonthComparison } from "./components/AnalyticsMonthComparison";
import {
  AnalyticsChannelsSkeleton,
  AnalyticsSummarySkeleton,
} from "./components/AnalyticsSkeleton";
import { AnalyticsSummarySettings } from "./components/AnalyticsSummarySettings";
import {
  MONTH_FULL_LABELS,
  buildYearOverYearComparison,
  formatPrice,
  getChannelsFilterLabel,
  getEmptySummary,
  getPlacementsWord,
  getVisibleYearOptions,
  getYearRangeLabel,
  readAnalyticsByPurchaseDatePreference,
  readAnalyticsPaidOnlyPreference,
  summarizeAnalytics,
  writeAnalyticsByPurchaseDatePreference,
  writeAnalyticsPaidOnlyPreference,
} from "./analyticsUtils";
import { OnboardingAnalyticsOverlay } from "../../widgets/onboarding/OnboardingAnalyticsOverlay";

type ActiveDropdown = "channels" | "year" | null;

export function AnalyticsPage() {
  const { dismissAnalyticsOverlay, isAnalyticsDemoActive, isAnalyticsOverlayVisible } = useOnboarding();
  const isOnboardingDemo = isAnalyticsDemoActive;
  const { channels: realChannels, error: channelsError, isLoading: isChannelsLoading } = useChannels();
  const channels = isOnboardingDemo ? ONBOARDING_MOCK_CHANNELS : realChannels;
  const today = useMemo(() => new Date(), []);
  const onboardingDemoYear = getOnboardingMockYear();
  const [year, setYear] = useState(today.getFullYear());
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [isSummarySettingsOpen, setIsSummarySettingsOpen] = useState(false);
  const [paidOnly, setPaidOnly] = useState(readAnalyticsPaidOnlyPreference);
  const [byPurchaseDate, setByPurchaseDate] = useState(readAnalyticsByPurchaseDatePreference);
  const analyticsQuery = useMemo(
    () => ({
      byPurchaseDate,
      paidOnly,
    }),
    [byPurchaseDate, paidOnly],
  );
  const {
    analyticsBuckets,
    analyticsError,
    isAnalyticsLoading,
    yearsWithPlacements,
  } = useAnalytics(year, selectedChannelIds, analyticsQuery);
  const demoAnalyticsBuckets = useMemo(() => ONBOARDING_MOCK_BUCKETS, []);
  const activeAnalyticsBuckets = isOnboardingDemo ? demoAnalyticsBuckets : analyticsBuckets;
  const activeYear = isOnboardingDemo ? onboardingDemoYear : year;
  const activeIsAnalyticsLoading = isOnboardingDemo ? false : isAnalyticsLoading;
  const activeAnalyticsError = isOnboardingDemo ? null : analyticsError;
  const [previousYearMonthTotal, setPreviousYearMonthTotal] = useState<number | null>(null);
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(
    () => getVisibleYearOptions(currentYear, yearsWithPlacements),
    [currentYear, yearsWithPlacements],
  );

  useEffect(() => {
    if (isOnboardingDemo) {
      setYear(onboardingDemoYear);
    }
  }, [isOnboardingDemo, onboardingDemoYear]);

  useEffect(() => {
    if (yearOptions.length > 0 && !yearOptions.includes(year)) {
      setYear(currentYear);
    }
  }, [yearOptions, year, currentYear]);

  // При смене года или каналов выбранный месяц теряет смысл, поэтому сбрасываем.
  useEffect(() => {
    setSelectedMonth(null);
  }, [year, selectedChannelIds, analyticsQuery]);

  function handlePaidOnlyChange(nextPaidOnly: boolean) {
    setPaidOnly(nextPaidOnly);
    writeAnalyticsPaidOnlyPreference(nextPaidOnly);
  }

  function handleByPurchaseDateChange(nextByPurchaseDate: boolean) {
    setByPurchaseDate(nextByPurchaseDate);
    writeAnalyticsByPurchaseDatePreference(nextByPurchaseDate);
  }

  const summary = useMemo(() => {
    if (activeAnalyticsBuckets.length === 0) {
      return getEmptySummary();
    }

    return summarizeAnalytics(activeAnalyticsBuckets, selectedMonth);
  }, [activeAnalyticsBuckets, selectedMonth]);

  const yearSummary = useMemo(() => {
    if (activeAnalyticsBuckets.length === 0) {
      return getEmptySummary();
    }

    return summarizeAnalytics(activeAnalyticsBuckets, null);
  }, [activeAnalyticsBuckets]);

  useEffect(() => {
    if (isOnboardingDemo || selectedMonth === null) {
      setPreviousYearMonthTotal(null);
      return;
    }

    setPreviousYearMonthTotal(null);

    let ignoreResult = false;
    const monthToCompare = selectedMonth;

    getPlacementAnalytics(year - 1, selectedChannelIds ?? [], analyticsQuery)
      .then((analytics) => {
        if (!ignoreResult) {
          const previousYearSummary = summarizeAnalytics(analytics.buckets, monthToCompare);
          setPreviousYearMonthTotal(previousYearSummary.totalPrice);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Previous year analytics loading failed", loadError);
        if (!ignoreResult) {
          setPreviousYearMonthTotal(0);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [isOnboardingDemo, selectedMonth, year, selectedChannelIds, analyticsQuery]);

  const monthComparison = useMemo(() => {
    if (selectedMonth === null || previousYearMonthTotal === null) {
      return null;
    }

    const currentTotal = yearSummary.monthlyTotals[selectedMonth - 1].totalPrice;

    return buildYearOverYearComparison(
      currentTotal,
      previousYearMonthTotal,
      selectedMonth,
      year,
    );
  }, [selectedMonth, year, yearSummary, previousYearMonthTotal]);

  const headerTotalLabel =
    selectedMonth !== null
      ? `${summary.placementsCount} ${getPlacementsWord(summary.placementsCount)} за ${MONTH_FULL_LABELS[selectedMonth - 1]} ${activeYear}`
      : `${summary.placementsCount} ${getPlacementsWord(summary.placementsCount)} за ${getYearRangeLabel(activeYear)}`;
  const channelsFilterLabel = getChannelsFilterLabel(selectedChannelIds, channels);

  function handleToggleDropdown(dropdown: Exclude<ActiveDropdown, null>) {
    if (isOnboardingDemo) {
      return;
    }

    setIsSummarySettingsOpen(false);
    setActiveDropdown((current) => (current === dropdown ? null : dropdown));
  }

  function handleSelectAllChannels() {
    setSelectedChannelIds(null);
    setActiveDropdown(null);
  }

  function handleToggleChannel(channelId: number) {
    setSelectedChannelIds((currentSelection) => {
      if (currentSelection === null) {
        return [channelId];
      }

      if (currentSelection.includes(channelId)) {
        const nextSelection = currentSelection.filter((id) => id !== channelId);
        return nextSelection.length === 0 ? null : nextSelection;
      }

      const nextSelection = [...currentSelection, channelId];

      return nextSelection.length === channels.length ? null : nextSelection;
    });
  }

  function handleSelectYear(nextYear: number) {
    setYear(nextYear);
    setActiveDropdown(null);
  }

  function handleMonthSelect(month: number) {
    setSelectedMonth((currentMonth) => (currentMonth === month ? null : month));
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="analytics-page__filters">
          <AnalyticsFilterDropdown
            ariaLabel="Фильтр по каналам"
            isOpen={activeDropdown === "channels"}
            label={channelsFilterLabel}
            onClose={() => setActiveDropdown(null)}
            onToggle={() => handleToggleDropdown("channels")}
          >
            <button
              className={
                selectedChannelIds === null
                  ? "analytics-filter__option analytics-filter__option--selected"
                  : "analytics-filter__option"
              }
              type="button"
              onClick={handleSelectAllChannels}
            >
              <span>Все каналы</span>
              {selectedChannelIds === null ? <CheckMark /> : null}
            </button>
            {channels.map((channel) => {
              const isChecked =
                selectedChannelIds === null
                  ? false
                  : selectedChannelIds.includes(channel.id);

              return (
                <button
                  className={
                    isChecked
                      ? "analytics-filter__option analytics-filter__option--selected"
                      : "analytics-filter__option"
                  }
                  key={channel.id}
                  type="button"
                  onClick={() => handleToggleChannel(channel.id)}
                >
                  <span>{channel.title}</span>
                  {isChecked ? <CheckMark /> : null}
                </button>
              );
            })}
          </AnalyticsFilterDropdown>

          <AnalyticsFilterDropdown
            ariaLabel="Фильтр по году"
            isOpen={activeDropdown === "year"}
            label={String(activeYear)}
            onClose={() => setActiveDropdown(null)}
            onToggle={() => handleToggleDropdown("year")}
          >
            {(isOnboardingDemo ? [onboardingDemoYear] : yearOptions).map((yearOption) => (
              <button
                className={
                  yearOption === activeYear
                    ? "analytics-filter__option analytics-filter__option--selected"
                    : "analytics-filter__option"
                }
                key={yearOption}
                type="button"
                onClick={() => handleSelectYear(yearOption)}
              >
                <span>{yearOption}</span>
                {yearOption === activeYear ? <CheckMark /> : null}
              </button>
            ))}
          </AnalyticsFilterDropdown>
        </div>
      </PageHeader>

      <PageContent ariaLabel="Аналитика" className="analytics-page__content">
        <section className="analytics-summary">
          {activeIsAnalyticsLoading ? (
            <AnalyticsSummarySkeleton />
          ) : (
            <>
              <div className="analytics-summary__total-row">
                <p className="analytics-summary__total">{formatPrice(summary.totalPrice)} ₽</p>
                <AnalyticsSummarySettings
                  byPurchaseDate={byPurchaseDate}
                  isOpen={isSummarySettingsOpen}
                  paidOnly={paidOnly}
                  onByPurchaseDateChange={handleByPurchaseDateChange}
                  onClose={() => setIsSummarySettingsOpen(false)}
                  onPaidOnlyChange={handlePaidOnlyChange}
                  onToggle={() => {
                    if (isOnboardingDemo) {
                      return;
                    }

                    setActiveDropdown(null);
                    setIsSummarySettingsOpen((current) => !current);
                  }}
                />
              </div>
              <p className="analytics-summary__subtitle">{headerTotalLabel}</p>
              {monthComparison !== null ? (
                <AnalyticsMonthComparison comparison={monthComparison} />
              ) : null}

              {activeAnalyticsError !== null ? (
                <StateMessage variant="error">{activeAnalyticsError}</StateMessage>
              ) : (
                <AnalyticsChart
                  monthlyTotals={summary.monthlyTotals}
                  selectedMonth={selectedMonth}
                  onMonthSelect={handleMonthSelect}
                />
              )}
            </>
          )}
        </section>

        <section className="analytics-channels-section" aria-label="Доход по каналам">
          {!isOnboardingDemo && isChannelsLoading ? (
            <AnalyticsChannelsSkeleton />
          ) : !isOnboardingDemo && channelsError !== null ? (
            <StateMessage variant="error">{channelsError}</StateMessage>
          ) : (
            <AnalyticsChannelStatsList
              channels={channels}
              stats={summary.channelStats}
            />
          )}
        </section>
      </PageContent>

      {isAnalyticsOverlayVisible ? (
        <OnboardingAnalyticsOverlay onComplete={dismissAnalyticsOverlay} />
      ) : null}
    </PageLayout>
  );
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      className="analytics-filter__check"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 8.5L6.75 11.5L12.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
