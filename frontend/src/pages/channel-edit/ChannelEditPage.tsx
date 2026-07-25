import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { removeChannelFromCache, updateChannelInCache } from "../../features/channels/channelsCache";
import { invalidatePlacementCaches } from "../../features/placements/placementDataVersion";
import { deactivateChannel, getChannel, updateChannel } from "../../features/channels/api";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { Toast } from "../../shared/ui/Toast";
import { ChannelFormSkeleton } from "../../shared/ui/ChannelFormSkeleton/ChannelFormSkeleton";
import { ChannelFormFields } from "../../widgets/channel-form/ChannelFormFields";
import { telegramLinkPrefix, useChannelForm } from "../../widgets/channel-form/useChannelForm";

type ChannelEditPageProps = {
  onBack: () => void;
};

export function ChannelEditPage({ onBack }: ChannelEditPageProps) {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const parsedChannelId = Number(channelId);
  const form = useChannelForm();
  const { guardAction, handleMutationError } = useSubscriptionAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { setTitle, setLink, setPicture } = form;

  async function handleSubmit() {
    if (
      !form.isTitleValid ||
      !form.isLinkValid ||
      isSubmitting ||
      form.isUploadingPicture ||
      isDeleting
    ) {
      form.setShouldShowErrors(true);
      form.showToast("Заполните обязательные данные");
      return;
    }

    guardAction(
      () => {
        void submitChannel();
      },
      { requireOwnSubscription: true },
    );
  }

  async function submitChannel() {
    try {
      setIsSubmitting(true);
      const updatedChannel = await updateChannel(parsedChannelId, {
        link: form.link.trim(),
        picture: form.picture,
        title: form.title.trim(),
      });
      updateChannelInCache(updatedChannel);
      navigate(`/channels/${parsedChannelId}`, { replace: true });
    } catch (error) {
      console.error("Channel update failed", error);
      handleMutationError(error, "Не удалось сохранить канал", form.showToast);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (isDeleting || isSubmitting || form.isUploadingPicture) {
      return;
    }

    guardAction(
      () => {
        void deactivateChannelAction();
      },
      { requireOwnSubscription: true },
    );
  }

  async function deactivateChannelAction() {
    try {
      setIsDeleting(true);
      await deactivateChannel(parsedChannelId);
      removeChannelFromCache(parsedChannelId);
      invalidatePlacementCaches();
      navigate("/", {
        replace: true,
        state: { popupMessage: "Канал удален" },
      });
    } catch (error) {
      console.error("Channel deactivation failed", error);
      setIsDeleteModalOpen(false);
      handleMutationError(error, "Не удалось удалить канал", form.showToast);
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (Number.isNaN(parsedChannelId)) {
      return;
    }

    let ignoreResult = false;

    getChannel(parsedChannelId)
      .then((channel) => {
        if (ignoreResult) {
          return;
        }

        // Редактировать канал может только владелец — остальных отправляем на просмотр.
        if (channel.accessRole !== "owner") {
          navigate(`/channels/${parsedChannelId}`, { replace: true });
          return;
        }

        setTitle(channel.title);
        setLink(channel.link || telegramLinkPrefix);
        setPicture(channel.picture);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!ignoreResult) {
          console.error("Channel loading failed", error);
          setLoadError("Не удалось загрузить канал");
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [parsedChannelId, navigate, setTitle, setLink, setPicture]);

  if (Number.isNaN(parsedChannelId)) {
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
            disabled={isSubmitting || form.isUploadingPicture || isDeleting || isLoading}
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting || form.isUploadingPicture ? "..." : "Готово"}
          </button>
        </div>
      </PageHeader>

      <PageContent ariaLabel="Изменение канала" className="channel-edit-page__content">
        {isLoading ? <ChannelFormSkeleton /> : null}
        {loadError !== null ? <StateMessage variant="error">{loadError}</StateMessage> : null}
        {!isLoading && loadError === null ? (
          <>
            <ChannelFormFields
              title={form.title}
              link={form.link}
              displayedPictureUrl={form.displayedPictureUrl}
              isUploadingPicture={form.isUploadingPicture}
              photoLabel="Заменить фотографию"
              shouldShowTitleError={form.shouldShowErrors && !form.isTitleValid}
              shouldShowLinkError={form.shouldShowErrors && !form.isLinkValid}
              onTitleChange={form.setTitle}
              onLinkChange={form.setLink}
              onPictureSelect={form.handlePictureSelect}
            />

            <button
              className="channel-edit-page__delete"
              disabled={isSubmitting || form.isUploadingPicture || isDeleting}
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Удалить канал
            </button>
          </>
        ) : null}
      </PageContent>

      <Toast state={form.toast} />

      {isDeleteModalOpen ? (
        <ConfirmDialog
          title="Удалить канал?"
          description="Канал пропадет из статистики"
          confirmLabel="Удалить"
          isProcessing={isDeleting}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => void handleDeactivate()}
        />
      ) : null}
    </PageLayout>
  );
}
