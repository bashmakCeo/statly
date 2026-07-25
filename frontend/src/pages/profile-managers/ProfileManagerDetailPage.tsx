import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  addChannelManager,
  removeChannelManager,
} from "../../features/channel-managers/api";
import { isManagerAlreadyAddedError } from "../../features/channel-managers/errors";
import { useOwnedChannelManagers } from "../../features/channel-managers/useOwnedChannelManagers";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ProfilePageSkeleton } from "../profile/ProfilePageSkeleton";
import { ChannelMultiSelect } from "../../widgets/channel-multi-select/ChannelMultiSelect";

type ProfileManagerDetailPageProps = {
  onBack: () => void;
};

export function ProfileManagerDetailPage({ onBack }: ProfileManagerDetailPageProps) {
  const navigate = useNavigate();
  const { username: usernameParam } = useParams<{ username: string }>();
  const username = usernameParam === undefined ? "" : decodeURIComponent(usernameParam);
  const {
    groupedManagers,
    isLoading,
    managersError,
    ownedChannels,
    reloadManagers,
  } = useOwnedChannelManagers();
  const manager = useMemo(
    () => groupedManagers.find((item) => item.username === username),
    [groupedManagers, username],
  );
  const initialChannelIds = useMemo(
    () => manager?.assignments.map((assignment) => assignment.channelId) ?? [],
    [manager],
  );
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const areAllChannelsSelected =
    ownedChannels.length > 0 && selectedChannelIds.length === ownedChannels.length;
  const hasChanges =
    initialChannelIds.length !== selectedChannelIds.length ||
    initialChannelIds.some((channelId) => !selectedChannelIds.includes(channelId));

  useEffect(() => {
    setSelectedChannelIds(initialChannelIds);
  }, [initialChannelIds]);

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

  async function handleSave() {
    if (isSubmitting || manager === undefined) {
      return;
    }

    if (selectedChannelIds.length === 0) {
      setFormError("Выберите хотя бы один канал");
      return;
    }

    const initialIds = new Set(initialChannelIds);
    const selectedIds = new Set(selectedChannelIds);
    const channelIdsToAdd = selectedChannelIds.filter((channelId) => !initialIds.has(channelId));
    const assignmentsToRemove = manager.assignments.filter(
      (assignment) => !selectedIds.has(assignment.channelId),
    );

    if (channelIdsToAdd.length === 0 && assignmentsToRemove.length === 0) {
      onBack();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const addResults = await Promise.allSettled(
        channelIdsToAdd.map((channelId) => addChannelManager(channelId, manager.username)),
      );
      const addFailedCount = addResults.filter(
        (result) =>
          result.status === "rejected" && !isManagerAlreadyAddedError(result.reason),
      ).length;

      if (assignmentsToRemove.length > 0) {
        await Promise.all(
          assignmentsToRemove.map((assignment) =>
            removeChannelManager(assignment.channelId, assignment.id),
          ),
        );
      }

      if (addFailedCount > 0) {
        setFormError("Не удалось сохранить изменения");
        setIsSubmitting(false);
        await reloadManagers();
        return;
      }

      navigate("/profile/managers", {
        replace: true,
        state: { popupMessage: "Доступ менеджера обновлён" },
      });
    } catch (saveError: unknown) {
      console.error("Channel manager update failed", saveError);
      setFormError("Не удалось сохранить изменения");
      setIsSubmitting(false);
      await reloadManagers();
    }
  }

  async function handleRemoveManager() {
    if (isRemoving || manager === undefined) {
      return;
    }

    setIsRemoving(true);
    setFormError(null);

    try {
      await Promise.all(
        manager.assignments.map((assignment) =>
          removeChannelManager(assignment.channelId, assignment.id),
        ),
      );

      navigate("/profile/managers", {
        replace: true,
        state: { popupMessage: "Менеджер убран" },
      });
    } catch (removeError: unknown) {
      console.error("Channel manager remove failed", removeError);
      setIsDeleteModalOpen(false);
      setFormError("Не удалось убрать менеджера");
      setIsRemoving(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="page-header__title-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Назад
          </button>
          <h1 className="page-header__title">Менеджеры</h1>
          <button
            className="nav-button"
            disabled={!hasChanges || isSubmitting || isRemoving || manager === undefined}
            type="button"
            onClick={() => void handleSave()}
          >
            Сохранить
          </button>
        </div>
      </PageHeader>

      <PageContent ariaLabel="Менеджер" className="profile-manager-detail-page">
        {isLoading ? <ProfilePageSkeleton /> : null}
        {managersError !== null ? <StateMessage variant="error">{managersError}</StateMessage> : null}

        {!isLoading && managersError === null && manager === undefined ? (
          <StateMessage>Менеджер не найден</StateMessage>
        ) : null}

        {!isLoading && managersError === null && manager !== undefined ? (
          <>
            <section className="profile-manager-detail-page__profile">
              {manager.photoUrl ? (
                <img
                  alt=""
                  className="profile-manager-detail-page__avatar"
                  src={manager.photoUrl}
                />
              ) : (
                <div className="profile-manager-detail-page__avatar profile-manager-detail-page__avatar--fallback">
                  {(manager.firstName?.slice(0, 1) ?? manager.username.slice(0, 1)).toUpperCase()}
                </div>
              )}
              <div className="profile-manager-detail-page__profile-content">
                <span className="profile-manager-detail-page__name">
                  {manager.firstName ?? `@${manager.username}`}
                </span>
                {manager.firstName !== null ? (
                  <span className="profile-manager-detail-page__username">
                    @{manager.username}
                  </span>
                ) : null}
              </div>
            </section>

            <div className="profile-manager-detail-page__channels">
              <span className="profile-manager-detail-page__channels-label">
                Доступные каналы
              </span>
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
              className="profile-manager-detail-page__delete"
              disabled={isSubmitting || isRemoving}
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Убрать менеджера
            </button>
          </>
        ) : null}
      </PageContent>

      {isDeleteModalOpen ? (
        <ConfirmDialog
          title="Убрать менеджера?"
          description="Менеджер потеряет доступ ко всем каналам"
          confirmLabel="Убрать"
          processingLabel="..."
          isProcessing={isRemoving}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => void handleRemoveManager()}
        />
      ) : null}
    </PageLayout>
  );
}
