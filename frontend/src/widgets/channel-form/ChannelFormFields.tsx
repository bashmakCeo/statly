import { useRef } from "react";

import { telegramLinkPrefix } from "./useChannelForm";

type ChannelFormFieldsProps = {
  title: string;
  link: string;
  displayedPictureUrl: string | null;
  isUploadingPicture: boolean;
  // Текст под фото: "Выбрать фотографию" (создание) или "Заменить фотографию" (редактирование).
  photoLabel: string;
  shouldShowTitleError: boolean;
  shouldShowLinkError: boolean;
  onTitleChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onPictureSelect: (file: File | undefined) => void;
};

// Презентационная часть формы канала: фото, название и ссылка. Логика — в useChannelForm.
export function ChannelFormFields({
  title,
  link,
  displayedPictureUrl,
  isUploadingPicture,
  photoLabel,
  shouldShowTitleError,
  shouldShowLinkError,
  onTitleChange,
  onLinkChange,
  onPictureSelect,
}: ChannelFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        className="channel-create-page__photo"
        disabled={isUploadingPicture}
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="channel-create-page__photo-placeholder" aria-hidden="true">
          {displayedPictureUrl !== null ? <img alt="" src={displayedPictureUrl} /> : <ImageIcon />}
        </span>
        <span>{isUploadingPicture ? "Загружаем..." : photoLabel}</span>
      </button>
      <input
        ref={fileInputRef}
        className="channel-create-page__file-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          onPictureSelect(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <ChannelTextField
        hasError={shouldShowTitleError}
        label="Укажите название канала"
        placeholder="Название канала"
        value={title}
        onChange={onTitleChange}
      />

      <ChannelTextField
        hasError={shouldShowLinkError}
        label="Укажите ссылку на канал"
        placeholder={telegramLinkPrefix}
        value={link}
        onChange={onLinkChange}
      />
    </>
  );
}

type ChannelTextFieldProps = {
  hasError: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function ChannelTextField({ hasError, label, placeholder, value, onChange }: ChannelTextFieldProps) {
  return (
    <label
      className={
        hasError
          ? "channel-create-page__field channel-create-page__field--error"
          : "channel-create-page__field"
      }
    >
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span>{label}</span>
    </label>
  );
}

function ImageIcon() {
  return (
    <svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="22" x="5" y="6" />
      <circle cx="12" cy="13" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="m7 24 6.5-6.5 4.2 4.2 2.8-2.8L25 23.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
