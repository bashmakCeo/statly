import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { addChannelToCache } from "../../features/channels/channelsCache";
import { invalidatePlacementCaches } from "../../features/placements/placementDataVersion";
import { createChannel } from "../../features/channels/api";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { Toast } from "../../shared/ui/Toast";
import { ChannelFormFields } from "../../widgets/channel-form/ChannelFormFields";
import { useChannelForm } from "../../widgets/channel-form/useChannelForm";

type ChannelCreatePageProps = {
  onBack: () => void;
};

export function ChannelCreatePage({ onBack }: ChannelCreatePageProps) {
  const navigate = useNavigate();
  const form = useChannelForm();
  const { guardAction, handleMutationError } = useSubscriptionAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!form.isTitleValid || !form.isLinkValid || isSubmitting || form.isUploadingPicture) {
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
      const createdChannel = await createChannel({
        link: form.link.trim(),
        picture: form.picture,
        title: form.title.trim(),
      });
      addChannelToCache(createdChannel);
      invalidatePlacementCaches();
      navigate("/", {
        replace: true,
        state: { popupMessage: "Канал добавлен" },
      });
    } catch (error) {
      console.error("Channel creation failed", error);
      handleMutationError(error, "Не удалось добавить канал", form.showToast, {
        requireOwnSubscription: true,
      });
    } finally {
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting || form.isUploadingPicture}
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting || form.isUploadingPicture ? "..." : "Готово"}
          </button>
        </div>
      </PageHeader>

      <PageContent ariaLabel="Добавление канала" className="channel-create-page__content">
        <ChannelFormFields
          title={form.title}
          link={form.link}
          displayedPictureUrl={form.displayedPictureUrl}
          isUploadingPicture={form.isUploadingPicture}
          photoLabel="Выбрать фотографию"
          shouldShowTitleError={form.shouldShowErrors && !form.isTitleValid}
          shouldShowLinkError={form.shouldShowErrors && !form.isLinkValid}
          onTitleChange={form.setTitle}
          onLinkChange={form.setLink}
          onPictureSelect={form.handlePictureSelect}
        />
      </PageContent>

      <Toast state={form.toast} />
    </PageLayout>
  );
}
