import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useChannels } from "../../features/channels/useChannels";
import { createPlacement, getPlacementFormatSuggestions } from "../../features/placements/api";
import { invalidatePlacementCaches } from "../../features/placements/placementDataVersion";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";
import { PlacementFormFields } from "./components/PlacementFormFields";
import { PlacementFormOverlays } from "./components/PlacementFormOverlays";
import { SelectedChannelsHeader } from "./components/SelectedChannelsHeader";
import type { PriceMode } from "./model";
import {
  areChannelPricesFilled,
  getChannelPricesTotalValue,
  getInitialChannelPrices,
  getOptionalValue,
  getPlacementCreatedMessage,
  getPlacementPricesByChannel,
  formatPriceInput,
  validatePublishDateTime,
} from "./placementCreateUtils";
import { usePlacementFormState } from "./usePlacementFormState";

type PlacementCreatePageProps = {
  onBack: () => void;
};

type PlacementCreateLocationState = {
  selectedChannelIds?: number[];
};

export function PlacementCreatePage({ onBack }: PlacementCreatePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // ID выбранных каналов приходят с предыдущего экрана через router state.
  const selectedChannelIds = (location.state as PlacementCreateLocationState | null)
    ?.selectedChannelIds;
  const { channels, error, isLoading } = useChannels();
  const { guardAction, handleMutationError } = useSubscriptionAccess();
  const placementForm = usePlacementFormState();
  const {
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
    hidePopup,
    isCalendarOpen,
    isFormatSuggestionsOpen,
    isPaid,
    isTimePickerOpen,
    setCalendarMonth,
    setFormatSuggestions,
    setIsCalendarOpen,
    setIsFormatSuggestionsOpen,
    setIsPaid,
    setIsTimePickerOpen,
    setShouldShowErrors,
    shouldShowErrors,
    showPopup,
    toast,
  } = placementForm;
  const [priceMode, setPriceMode] = useState<PriceMode>("total");
  const [channelPrices, setChannelPrices] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Для шапки формы показываем только каналы, которые пользователь выбрал на прошлом шаге.
  const selectedChannels = useMemo(
    () => channels.filter((channel) => selectedChannelIds?.includes(channel.id)),
    [channels, selectedChannelIds],
  );
  const selectedChannelCount = selectedChannelIds?.length ?? 0;
  const hasMultipleSelectedChannels = selectedChannelCount > 1;
  const usesPerChannelPrices = hasMultipleSelectedChannels && priceMode === "perChannel";
  // Эти поля обязательны для backend и подсвечиваются, если пользователь пытается отправить пустую форму.
  const requiredFields = {
    date: form.date.trim() !== "",
    format: form.format.trim() !== "",
    price: usesPerChannelPrices
      ? areChannelPricesFilled(selectedChannelIds, channelPrices)
      : form.price.trim() !== "",
  };
  const hasRequiredFields = Object.values(requiredFields).every(Boolean);

  function handleUsePerChannelPrices() {
    setPriceMode("perChannel");
    setChannelPrices((currentPrices) =>
      getInitialChannelPrices(selectedChannelIds, form.price, currentPrices),
    );
  }

  function handleUseTotalPrice() {
    const totalPrice = getChannelPricesTotalValue(selectedChannelIds, channelPrices);

    if (totalPrice !== null) {
      handleFieldChange("price", totalPrice);
    }

    setPriceMode("total");
  }

  function handleChannelPriceChange(channelId: number, value: string) {
    setChannelPrices((currentPrices) => ({
      ...currentPrices,
      [channelId]: formatPriceInput(value),
    }));
  }

  async function handleSubmitPlacement() {
    // Сначала проверяем обязательные поля на фронте, чтобы не отправлять заведомо битый запрос.
    if (!hasRequiredFields) {
      setShouldShowErrors(true);
      showPopup("Заполните обязательные данные");
      return;
    }

    if (selectedChannelIds === undefined || isSubmitting) {
      return;
    }

    guardAction(
      () => {
        void submitPlacement();
      },
      { channelIds: selectedChannelIds },
    );
  }

  async function submitPlacement() {
    const publishDateTimeValidation = validatePublishDateTime(form.date, form.time);
    const placementPrices = getPlacementPricesByChannel(
      selectedChannelIds!,
      form.price,
      channelPrices,
      usesPerChannelPrices,
    );

    // Дата и цена требуют отдельной проверки: поле может быть не пустым, но в неверном формате.
    if (!publishDateTimeValidation.ok) {
      setShouldShowErrors(true);
      showPopup(
        publishDateTimeValidation.reason === "date"
          ? "Проверьте дату размещения"
          : "Проверьте время размещения",
      );
      return;
    }

    if (placementPrices === null) {
      setShouldShowErrors(true);
      showPopup("Проверьте стоимость размещения");
      return;
    }

    const publishDateTime = publishDateTimeValidation.value;

    try {
      setIsSubmitting(true);
      setShouldShowErrors(false);
      hidePopup();

      await Promise.all(
        // Backend создает одно размещение на один канал, поэтому для мультивыбора отправляем пачку запросов.
        selectedChannelIds!.map((channelId) =>
          createPlacement({
            buyerContact: getOptionalValue(form.advertiserContact),
            buyerName: form.campaignName.trim() || "Реклама",
            channelId,
            comment: getOptionalValue(form.comment),
            format: form.format.trim(),
            price: placementPrices[channelId],
            publishDate: publishDateTime.publishDate,
            publishTime: publishDateTime.publishTime,
            status: isPaid ? "paid" : "unpaid",
          }),
        ),
      );

      invalidatePlacementCaches();

      navigate("/", {
        replace: true,
        state: {
          // Сообщение передаем через router state, чтобы показать popup уже на главной странице.
          popupMessage: getPlacementCreatedMessage(selectedChannelIds!.length),
        },
      });
    } catch (submitError) {
      console.error("Placement creation failed", submitError);
      handleMutationError(
        submitError,
        "Не удалось добавить размещение",
        showPopup,
        { channelIds: selectedChannelIds },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    let ignoreResult = false;

    if (selectedChannelIds === undefined) {
      return;
    }

    // Подгружаем форматы, которые пользователь уже использовал именно в выбранных каналах.
    getPlacementFormatSuggestions(selectedChannelIds)
      .then((loadedFormats) => {
        if (!ignoreResult) {
          setFormatSuggestions(loadedFormats);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Placement format suggestions loading failed", loadError);
      });

    return () => {
      ignoreResult = true;
    };
  }, [selectedChannelIds]);

  // На форму нельзя попасть напрямую без выбранных каналов.
  if (selectedChannelIds === undefined || selectedChannelIds.length === 0) {
    return <Navigate to="/placements/channels" replace />;
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="page-header__nav-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Отмена
          </button>
          <button
            className="nav-button"
            disabled={isSubmitting}
            type="button"
            onClick={handleSubmitPlacement}
          >
            {isSubmitting ? "..." : "Готово"}
          </button>
        </div>

        {isLoading ? <ChannelListSkeleton rows={1} /> : null}
        {error !== null ? <StateMessage variant="error">{error}</StateMessage> : null}
        {!isLoading && error === null ? (
          <SelectedChannelsHeader channels={selectedChannels} />
        ) : null}
      </PageHeader>

      <PageContent ariaLabel="Информация о размещении" className="placement-create-page__content">
        <PlacementFormFields
          action={
            <div className="placement-create-page__actions">
              <button
                className="placement-create-page__submit"
                disabled={isSubmitting}
                type="button"
                onClick={handleSubmitPlacement}
              >
                {isSubmitting ? "Добавляем..." : "Добавить размещение"}
              </button>
            </div>
          }
          form={form}
          formatSuggestions={formatSuggestions}
          isFormatSuggestionsOpen={isFormatSuggestionsOpen}
          isPaid={isPaid}
          priceSplit={{
            channelPrices,
            priceMode,
            selectedChannelIds,
            selectedChannels,
            onChannelPriceChange: handleChannelPriceChange,
            onUsePerChannelPrices: handleUsePerChannelPrices,
            onUseTotalPrice: handleUseTotalPrice,
          }}
          requiredFields={requiredFields}
          shouldShowErrors={shouldShowErrors}
          onCalendarOpen={handleCalendarOpen}
          onDateChange={handleDateChange}
          onFieldChange={handleFieldChange}
          onFormatBlur={handleFormatSuggestionsBlur}
          onFormatFocus={() => setIsFormatSuggestionsOpen(true)}
          onFormatSuggestionSelect={handleFormatSuggestionSelect}
          onPaidChange={setIsPaid}
          onPriceChange={handlePriceChange}
          onTimePickerOpen={handleTimePickerOpen}
        />
      </PageContent>

      <PlacementFormOverlays
        calendarMonth={calendarMonth}
        form={form}
        isCalendarOpen={isCalendarOpen}
        isTimePickerOpen={isTimePickerOpen}
        toast={toast}
        onCalendarClose={() => setIsCalendarOpen(false)}
        onCalendarDateSelect={handleCalendarDateSelect}
        onCalendarMonthChange={setCalendarMonth}
        onTimeClear={handleTimeClear}
        onTimeClose={() => setIsTimePickerOpen(false)}
        onTimeSelect={handleTimeSelect}
      />
    </PageLayout>
  );
}