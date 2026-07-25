import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { updateUserSettings } from "../../../features/profile/api";
import { invalidatePlacementCaches } from "../../../features/placements/placementDataVersion";
import { updateProfileUser, useProfile } from "../../../features/profile/profileCache";
import { ProfileTimezoneList } from "./ProfileTimezoneList";

const DEFAULT_TIMEZONE = "Europe/Moscow";
const SHEET_ANIMATION_MS = 220;

type ProfileSettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProfileSettingsSheet({ isOpen, onClose }: ProfileSettingsSheetProps) {
  const { user, timezoneOptions } = useProfile();
  const [selectedTimezone, setSelectedTimezone] = useState(DEFAULT_TIMEZONE);
  const [placementRemindersEnabled, setPlacementRemindersEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      return;
    }

    setIsAnimatedOpen(false);
    const closeTimer = window.setTimeout(() => setIsRendered(false), SHEET_ANIMATION_MS);

    return () => window.clearTimeout(closeTimer);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isRendered || !isOpen) {
      return;
    }

    setIsAnimatedOpen(false);

    let openFrame = 0;

    const startFrame = window.requestAnimationFrame(() => {
      openFrame = window.requestAnimationFrame(() => {
        setIsAnimatedOpen(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(startFrame);
      if (openFrame !== 0) {
        window.cancelAnimationFrame(openFrame);
      }
    };
  }, [isRendered, isOpen]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const scrollY = window.scrollY;
    const { style } = document.body;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.width = "";
      style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isRendered]);

  useEffect(() => {
    if (user?.timezone) {
      setSelectedTimezone(user.timezone);
    }

    if (user?.placement_reminders_enabled !== undefined) {
      setPlacementRemindersEnabled(user.placement_reminders_enabled);
    }
  }, [user?.timezone, user?.placement_reminders_enabled, isOpen]);

  if (!isRendered || user === null) {
    return null;
  }

  async function handleDone() {
    if (user === null || isSaving) {
      return;
    }

    const savedTimezone = user.timezone ?? DEFAULT_TIMEZONE;
    const timezoneChanged = selectedTimezone !== savedTimezone;
    const remindersChanged =
      placementRemindersEnabled !== user.placement_reminders_enabled;

    // Ничего не меняли — просто закрываем sheet.
    if (!timezoneChanged && !remindersChanged) {
      onClose();
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const updatedUser = await updateUserSettings({
        ...(timezoneChanged ? { timezone: selectedTimezone } : {}),
        ...(remindersChanged ? { placement_reminders_enabled: placementRemindersEnabled } : {}),
      });
      updateProfileUser(updatedUser);
      if (timezoneChanged) {
        invalidatePlacementCaches();
      }
      onClose();
    } catch (saveError: unknown) {
      console.error("User settings update failed", saveError);
      setSaveError("Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  }

  return createPortal(
    <div
      className={`profile-page__sheet${isAnimatedOpen ? " profile-page__sheet--open" : ""}`}
      role="presentation"
    >
      <button
        aria-label="Закрыть"
        className="profile-page__sheet-backdrop"
        disabled={isSaving}
        type="button"
        onClick={onClose}
      />

      <section
        aria-labelledby="profile-settings-title"
        className="profile-page__sheet-panel"
        role="dialog"
      >
        <h2 id="profile-settings-title">Настройки</h2>

        <div className="profile-page__sheet-field">
          <span className="profile-page__sheet-field-label">Часовой пояс</span>
          <ProfileTimezoneList
            disabled={isSaving}
            isSheetOpen={isOpen}
            options={timezoneOptions}
            selectedTimezone={selectedTimezone}
            onSelect={(timezoneId) => {
              setSelectedTimezone(timezoneId);
              setSaveError(null);
            }}
          />
        </div>

        <label className="profile-page__sheet-checkbox-row">
          <input
            checked={placementRemindersEnabled}
            className="profile-page__sheet-checkbox-input"
            disabled={isSaving}
            type="checkbox"
            onChange={(event) => {
              setPlacementRemindersEnabled(event.target.checked);
              setSaveError(null);
            }}
          />
          <span className="profile-page__sheet-checkbox" aria-hidden="true" />
          <span className="profile-page__sheet-checkbox-label">
            Отправлять уведомление за 2 часа до размещения
          </span>
        </label>

        {saveError !== null ? (
          <p className="profile-page__sheet-error">{saveError}</p>
        ) : null}

        <button
          className="profile-page__sheet-close"
          disabled={isSaving}
          type="button"
          onClick={() => {
            void handleDone();
          }}
        >
          {isSaving ? "..." : "Готово"}
        </button>
      </section>
    </div>,
    document.body,
  );
}
