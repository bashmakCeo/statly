import type { ReactNode } from "react";

import type { Channel } from "../../../entities/channel/model";
import calendarIcon from "../../../shared/assets/icons/calendar.svg";
import clockIcon from "../../../shared/assets/icons/clock.svg";
import noIcon from "../../../shared/assets/icons/no.svg";
import yesIcon from "../../../shared/assets/icons/yes.svg";
import type { PlacementForm, PriceMode } from "../model";
import { getChannelPricesTotalValue, getSplitPriceHint } from "../placementCreateUtils";
import { PerChannelPrices } from "./PerChannelPrices";
import { PlacementInput } from "./PlacementInput";

type RequiredFields = {
  date: boolean;
  format: boolean;
  price: boolean;
};

type PriceSplitProps = {
  channelPrices: Record<number, string>;
  priceMode: PriceMode;
  selectedChannelIds: number[];
  selectedChannels: Channel[];
  onChannelPriceChange: (channelId: number, value: string) => void;
  onUsePerChannelPrices: () => void;
  onUseTotalPrice: () => void;
};

type PlacementFormFieldsProps = {
  action?: ReactNode;
  form: PlacementForm;
  formatSuggestions: string[];
  isFormatSuggestionsOpen: boolean;
  isPaid: boolean;
  priceSplit?: PriceSplitProps;
  requiredFields: RequiredFields;
  shouldShowErrors: boolean;
  onCalendarOpen: () => void;
  onDateChange: (value: string) => void;
  onFieldChange: (field: keyof PlacementForm, value: string) => void;
  onFormatBlur: () => void;
  onFormatFocus: () => void;
  onFormatSuggestionSelect: (format: string) => void;
  onPaidChange: (isPaid: boolean) => void;
  onPriceChange: (value: string) => void;
  onTimePickerOpen: () => void;
};

export function PlacementFormFields({
  action,
  form,
  formatSuggestions,
  isFormatSuggestionsOpen,
  isPaid,
  priceSplit,
  requiredFields,
  shouldShowErrors,
  onCalendarOpen,
  onDateChange,
  onFieldChange,
  onFormatBlur,
  onFormatFocus,
  onFormatSuggestionSelect,
  onPaidChange,
  onPriceChange,
  onTimePickerOpen,
}: PlacementFormFieldsProps) {
  const selectedChannelCount = priceSplit?.selectedChannelIds.length ?? 1;
  const hasMultipleSelectedChannels = selectedChannelCount > 1;
  const usesPerChannelPrices = hasMultipleSelectedChannels && priceSplit?.priceMode === "perChannel";

  return (
    <>
      <PlacementInput
        label="Укажите название рекламной кампании"
        placeholder="Название рекламной кампании"
        value={form.campaignName}
        onChange={(value) => onFieldChange("campaignName", value)}
      />
      <PlacementInput
        hasError={shouldShowErrors && !requiredFields.date}
        inputMode="numeric"
        label="Укажите дату размещения"
        maxLength={10}
        placeholder="01.01.2025"
        required
        rightIconSrc={calendarIcon}
        rightIconLabel="Выбрать дату"
        value={form.date}
        onChange={onDateChange}
        onRightIconClick={onCalendarOpen}
      />
      <PlacementInput
        label="Укажите время размещения"
        placeholder="9:00"
        rightIconSrc={clockIcon}
        rightIconLabel="Выбрать время"
        value={form.time}
        onChange={(value) => onFieldChange("time", value)}
        onRightIconClick={onTimePickerOpen}
      />
      <PlacementInput
        hasError={shouldShowErrors && !requiredFields.format}
        isSuggestionsOpen={isFormatSuggestionsOpen}
        label="Укажите формат размещения"
        placeholder="3/72"
        required
        suggestions={formatSuggestions}
        value={form.format}
        onChange={(value) => onFieldChange("format", value)}
        onBlur={onFormatBlur}
        onFocus={onFormatFocus}
        onSuggestionSelect={onFormatSuggestionSelect}
      />
      <PlacementInput
        label="Укажите контакт рекламодателя"
        placeholder="@username"
        value={form.advertiserContact}
        onChange={(value) => onFieldChange("advertiserContact", value)}
      />
      {!usesPerChannelPrices ? (
        <PlacementInput
          hasError={shouldShowErrors && !requiredFields.price}
          inputMode="decimal"
          label={
            hasMultipleSelectedChannels
              ? "Укажите общую стоимость рекламы"
              : "Укажите стоимость рекламы"
          }
          placeholder="6500"
          required
          value={form.price}
          onChange={onPriceChange}
        />
      ) : null}
      {priceSplit !== undefined && hasMultipleSelectedChannels ? (
        usesPerChannelPrices ? (
          <PerChannelPrices
            channels={priceSplit.selectedChannels}
            hasError={shouldShowErrors && !requiredFields.price}
            pricesByChannelId={priceSplit.channelPrices}
            totalPrice={getChannelPricesTotalValue(
              priceSplit.selectedChannelIds,
              priceSplit.channelPrices,
            )}
            onPriceChange={priceSplit.onChannelPriceChange}
            onUseTotalPrice={priceSplit.onUseTotalPrice}
          />
        ) : (
          <div className="placement-create-page__price-summary">
            <span>{getSplitPriceHint(selectedChannelCount)}</span>
            <button type="button" onClick={priceSplit.onUsePerChannelPrices}>
              Указать цены по каналам
            </button>
          </div>
        )
      ) : null}

      <label className="placement-create-page__paid">
        <span>Оплачено</span>
        <input
          checked={isPaid}
          type="checkbox"
          onChange={(event) => onPaidChange(event.target.checked)}
        />
        <span className="placement-create-page__checkbox" aria-hidden="true">
          <img alt="" src={isPaid ? yesIcon : noIcon} />
        </span>
      </label>

      <PlacementInput
        label="Укажите дополнительную информацию"
        placeholder="Комментарий"
        value={form.comment}
        onChange={(value) => onFieldChange("comment", value)}
      />
      {action}
    </>
  );
}
