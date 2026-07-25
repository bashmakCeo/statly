import { useEffect, useState } from "react";

import { uploadChannelPicture } from "../../features/channels/api";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { getMediaUrl } from "../../shared/lib/media";
import { prepareChannelPictureFile } from "../../shared/lib/prepareChannelPicture";
import { useToast } from "../../shared/ui/Toast";

export const telegramLinkPrefix = "https://t.me/";

// Общее состояние формы канала: используется и при создании, и при редактировании.
export function useChannelForm() {
  const { handleMutationError, requestSubscription } = useSubscriptionAccess();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState(telegramLinkPrefix);
  const [picture, setPicture] = useState<string | null>(null);
  // previewUrl — локальный objectURL выбранного файла, показываем сразу, до завершения загрузки.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shouldShowErrors, setShouldShowErrors] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const isTitleValid = title.trim() !== "";
  const isLinkValid = link.trim() !== "" && link.trim() !== telegramLinkPrefix;
  const displayedPictureUrl = previewUrl ?? getMediaUrl(picture);

  function replacePreviewUrl(nextPreviewUrl: string | null) {
    setPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl !== null) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return nextPreviewUrl;
    });
  }

  async function handlePictureSelect(file: File | undefined) {
    if (file === undefined) {
      return;
    }

    if (!requestSubscription({ requireOwnSubscription: true })) {
      return;
    }

    replacePreviewUrl(URL.createObjectURL(file));

    try {
      setIsUploadingPicture(true);
      hideToast();
      setPicture(await uploadChannelPicture(await prepareChannelPictureFile(file)));
    } catch (error) {
      console.error("Channel picture upload failed", error);
      // Откатываем превью: при редактировании останется ранее сохранённое фото (picture не трогаем).
      replacePreviewUrl(null);
      handleMutationError(error, "Не удалось загрузить фото", showToast);
    } finally {
      setIsUploadingPicture(false);
    }
  }

  // Чистим objectURL при размонтировании и при смене файла, чтобы не текла память.
  useEffect(
    () => () => {
      if (previewUrl !== null) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  return {
    title,
    setTitle,
    link,
    setLink,
    picture,
    setPicture,
    isTitleValid,
    isLinkValid,
    displayedPictureUrl,
    isUploadingPicture,
    shouldShowErrors,
    setShouldShowErrors,
    handlePictureSelect,
    toast,
    showToast,
  };
}
