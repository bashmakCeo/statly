import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import type { Placement } from "../../entities/placement/model";
import { getPlacementLocalPublish } from "../../entities/placement/publish";
import { useChannels } from "../../features/channels/useChannels";
import {
  deletePlacement,
  getPlacement,
  getPlacementFormatSuggestions,
  updatePlacement,
} from "../../features/placements/api";
import { invalidatePlacementCaches } from "../../features/placements/placementDataVersion";
import { useProfile } from "../../features/profile/profileCache";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { resolveTimezone } from "../../shared/lib/timezone";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";
import { PlacementFormFields } from "../placement-create/components/PlacementFormFields";
import { PlacementFormOverlays } from "../placement-create/components/PlacementFormOverlays";
import { SelectedChannelsHeader } from "../placement-create/components/SelectedChannelsHeader";
import {
  getCalendarMonthFromInput,
  getOptionalValue,
  getPlacementDeletedMessage,
  getPlacementUpdatedMessage,
  mapPlacementToForm,
  normalizePlacementPrice,
  validatePublishDateTime,
} from "../placement-create/placementCreateUtils";
import { usePlacementFormState } from "../placement-create/usePlacementFormState";

type PlacementEditPageProps = {
  onBack: () => void;
};

type PlacementEditLocationState = {
  channelId?: number;
  selectedDate?: string;
};

export function PlacementEditPage({ onBack }: PlacementEditPageProps) {
  const { placementId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as PlacementEditLocationState | null;
  const parsedPlacementId = Number(placementId);
  const { user } = useProfile();
  const { guardAction, handleMutationError } = useSubscriptionAccess();
  const { channels, error: channelsError, isLoading: isChannelsLoading } = useChannels();
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
    setForm,
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
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [isPlacementLoading, setIsPlacementLoading] = useState(true);
  const [placementLoadError, setPlacementLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const timezone = resolveTimezone(user?.timezone);
  const channel = channels.find((item) => item.id === placement?.channelId);
  const returnChannelId = locationState?.channelId ?? placement?.channelId;
  const returnDateKey =
    locationState?.selectedDate ??
    (placement ? getPlacementLocalPublish(placement, timezone).publishDate : undefined);
  const requiredFields = {
    date: form.date.trim() !== "",
    format: form.format.trim() !== "",
    price: form.price.trim() !== "",
  };
  const hasRequiredFields = Object.values(requiredFields).every(Boolean);
  const isPageLoading = isChannelsLoading || isPlacementLoading;

  function navigateBackToChannel(popupMessageText?: string) {
    if (returnChannelId === undefined) {
      navigate("/", { replace: true, state: popupMessageText ? { popupMessage: popupMessageText } : null });
      return;
    }

    navigate(`/channels/${returnChannelId}`, {
      replace: true,
      state: {
        selectedDate: returnDateKey,
        popupMessage: popupMessageText,
      },
    });
  }

  async function handleSubmitPlacement() {
    if (!hasRequiredFields || placement === null || isSubmitting || isDeleting) {
      setShouldShowErrors(true);
      showPopup("Заполните обязательные данные");
      return;
    }

    guardAction(
      () => {
        void submitPlacement();
      },
      placement !== null ? { channelIds: [placement.channelId] } : undefined,
    );
  }

  async function submitPlacement() {
    const publishDateTimeValidation = validatePublishDateTime(form.date, form.time);
    const normalizedPrice = normalizePlacementPrice(form.price);

    if (!publishDateTimeValidation.ok) {
      setShouldShowErrors(true);
      showPopup(
        publishDateTimeValidation.reason === "date"
          ? "Проверьте дату размещения"
          : "Проверьте время размещения",
      );
      return;
    }

    if (normalizedPrice === null) {
      setShouldShowErrors(true);
      showPopup("Проверьте стоимость размещения");
      return;
    }

    const publishDateTime = publishDateTimeValidation.value;

    try {
      setIsSubmitting(true);
      setShouldShowErrors(false);
      hidePopup();

      await updatePlacement(placement!.id, {
        buyerContact: getOptionalValue(form.advertiserContact),
        buyerName: form.campaignName.trim() || "Реклама",
        comment: getOptionalValue(form.comment),
        format: form.format.trim(),
        price: normalizedPrice,
        publishDate: publishDateTime.publishDate,
        publishTime: publishDateTime.publishTime,
        status: isPaid ? "paid" : "unpaid",
      });

      invalidatePlacementCaches();
      navigateBackToChannel(getPlacementUpdatedMessage());
    } catch (submitError) {
      console.error("Placement update failed", submitError);
      handleMutationError(
        submitError,
        "Не удалось сохранить размещение",
        showPopup,
        placement !== null ? { channelIds: [placement.channelId] } : undefined,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePlacement() {
    if (placement === null || isDeleting || isSubmitting) {
      return;
    }

    guardAction(
      () => {
        void deletePlacementAction();
      },
      placement !== null ? { channelIds: [placement.channelId] } : undefined,
    );
  }

  async function deletePlacementAction() {
    try {
      setIsDeleting(true);
      await deletePlacement(placement!.id);
      invalidatePlacementCaches();
      navigateBackToChannel(getPlacementDeletedMessage());
    } catch (deleteError) {
      console.error("Placement deletion failed", deleteError);
      setIsDeleteModalOpen(false);
      handleMutationError(
        deleteError,
        "Не удалось удалить размещение",
        showPopup,
        placement !== null ? { channelIds: [placement.channelId] } : undefined,
      );
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (Number.isNaN(parsedPlacementId)) {
      return;
    }

    let ignoreResult = false;

    setIsPlacementLoading(true);
    setPlacementLoadError(null);

    getPlacement(parsedPlacementId)
      .then((loadedPlacement) => {
        if (!ignoreResult) {
          const loadedForm = mapPlacementToForm(loadedPlacement);

          setPlacement(loadedPlacement);
          setForm(loadedForm);
          setIsPaid(loadedPlacement.status === "paid");
          setCalendarMonth(getCalendarMonthFromInput(loadedForm.date));
        }
      })
      .catch((loadError: unknown) => {
        if (!ignoreResult) {
          setPlacement(null);
          setPlacementLoadError("Не удалось загрузить размещение");
          console.error("Placement loading failed", loadError);
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsPlacementLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [parsedPlacementId]);

  useEffect(() => {
    if (placement === null) {
      return;
    }

    let ignoreResult = false;

    getPlacementFormatSuggestions([placement.channelId])
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
  }, [placement]);

  if (Number.isNaN(parsedPlacementId)) {
    return <Navigate to="/" replace />;
  }

  if (!isPageLoading && placementLoadError !== null) {
    return <Navigate to="/" replace />;
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
            disabled={isPageLoading || placement === null || isSubmitting || isDeleting}
            type="button"
            onClick={() => {
              void handleSubmitPlacement();
            }}
          >
            {isSubmitting ? "..." : "Готово"}
          </button>
        </div>

        {isPageLoading ? <ChannelListSkeleton rows={1} /> : null}
        {channelsError !== null ? <StateMessage variant="error">{channelsError}</StateMessage> : null}
        {!isPageLoading && channelsError === null && channel !== undefined ? (
          <SelectedChannelsHeader channels={[channel]} />
        ) : null}
      </PageHeader>

      <PageContent
        ariaLabel="Редактирование размещения"
        className="placement-create-page__content placement-edit-page__content"
      >
        {!isPageLoading && channelsError === null && placement !== null ? (
          <>
            <PlacementFormFields
              action={
                <button
                  className="channel-edit-page__delete"
                  disabled={isSubmitting || isDeleting}
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Удалить размещение
                </button>
              }
              form={form}
              formatSuggestions={formatSuggestions}
              isFormatSuggestionsOpen={isFormatSuggestionsOpen}
              isPaid={isPaid}
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
          </>
        ) : null}
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

      {isDeleteModalOpen ? (
        <ConfirmDialog
          title="Удалить размещение?"
          description="Размещение пропадет из календаря"
          confirmLabel="Удалить"
          processingLabel="..."
          isProcessing={isDeleting}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => void handleDeletePlacement()}
        />
      ) : null}
    </PageLayout>
  );
}
