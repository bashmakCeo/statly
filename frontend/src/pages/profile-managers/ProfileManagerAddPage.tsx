import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { addChannelManager } from "../../features/channel-managers/api";
import { isManagerAlreadyAddedError } from "../../features/channel-managers/errors";
import { useChannels } from "../../features/channels/useChannels";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";
import { ChannelMultiSelect } from "../../widgets/channel-multi-select/ChannelMultiSelect";

type ProfileManagerAddPageProps = {
  onBack: () => void;
};

export function ProfileManagerAddPage({ onBack }: ProfileManagerAddPageProps) {
  const navigate = useNavigate();
  const { channels, isLoading: isChannelsLoading } = useChannels();
  const ownedChannels = useMemo(
    () => channels.filter((channel) => channel.accessRole === "owner"),
    [channels],
  );
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const areAllChannelsSelected =
    ownedChannels.length > 0 && selectedChannelIds.length === ownedChannels.length;

  function handleToggleChannel(channelId: number) {
    setSelectedChannelIds((currentIds) =>
      currentIds.includes(channelId)
        ? currentIds.filter((id) => id !== channelId)
        : [...currentIds, channelId],
    );
    setFormError(null);
  }

  function handleToggleAllChannels() {
    setSelectedChannelIds(
      areAllChannelsSelected ? [] : ownedChannels.map((channel) => channel.id),
    );
    setFormError(null);
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    const trimmedUsername = usernameInput.trim();

    if (trimmedUsername === "") {
      setFormError("Введите username");
      return;
    }

    if (selectedChannelIds.length === 0) {
      setFormError("Выберите хотя бы один канал");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const results = await Promise.allSettled(
        selectedChannelIds.map((channelId) => addChannelManager(channelId, trimmedUsername)),
      );

      const createdManagers = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const alreadyAddedCount = results.filter(
        (result) =>
          result.status === "rejected" && isManagerAlreadyAddedError(result.reason),
      ).length;
      const failedCount = results.filter(
        (result) =>
          result.status === "rejected" && !isManagerAlreadyAddedError(result.reason),
      ).length;

      if (createdManagers.length === 0 && alreadyAddedCount === 0) {
        setFormError("Не удалось добавить менеджера");
        setIsSubmitting(false);
        return;
      }

      const needsFirstLogin =
        createdManagers.length > 0 &&
        createdManagers.every(
          (manager) => manager.firstName === null && manager.photoUrl === null,
        );

      let popupMessage = "Менеджер добавлен";

      if (createdManagers.length === 0 && alreadyAddedCount > 0) {
        popupMessage = "Менеджер уже назначен на выбранные каналы";
      } else if (needsFirstLogin) {
        popupMessage =
          "Менеджер добавлен. Доступ появится после первого входа в приложение";
      } else if (failedCount > 0) {
        popupMessage = "Менеджер добавлен на часть каналов";
      }

      navigate("/profile/managers", {
        replace: true,
        state: { popupMessage },
      });
    } catch (addError: unknown) {
      console.error("Channel manager add failed", addError);
      setFormError("Не удалось добавить менеджера");
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="page-header__title-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Назад
          </button>
          <h1 className="page-header__title">Добавить менеджера</h1>
          <span aria-hidden="true" className="nav-button nav-button--spacer" />
        </div>
      </PageHeader>

      <PageContent ariaLabel="Добавить менеджера" className="profile-manager-add-page">
        {isChannelsLoading ? <ChannelListSkeleton rows={3} /> : null}

        {!isChannelsLoading && ownedChannels.length === 0 ? (
          <StateMessage>Добавьте канал, чтобы назначить менеджеров</StateMessage>
        ) : null}

        {!isChannelsLoading && ownedChannels.length > 0 ? (
          <>
            <label className="profile-managers-page__field">
              <span>Username</span>
              <input
                className="profile-managers-page__input"
                placeholder="@username"
                type="text"
                value={usernameInput}
                onChange={(event) => {
                  setUsernameInput(event.target.value);
                  setFormError(null);
                }}
              />
            </label>

            <div className="profile-manager-add-page__channels">
              <span className="profile-manager-add-page__channels-label">Каналы</span>
              <ChannelMultiSelect
                channels={ownedChannels}
                selectedChannelIds={selectedChannelIds}
                onToggle={handleToggleChannel}
                onToggleAll={handleToggleAllChannels}
              />
            </div>

            {formError !== null ? (
              <p className="profile-managers-page__form-error">{formError}</p>
            ) : null}

            <button
              className="profile-manager-add-page__submit"
              disabled={isSubmitting}
              type="button"
              onClick={() => void handleSubmit()}
            >
              Добавить
            </button>
          </>
        ) : null}
      </PageContent>
    </PageLayout>
  );
}
