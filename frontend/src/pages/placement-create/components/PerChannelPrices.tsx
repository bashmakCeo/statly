import type { Channel } from "../../../entities/channel/model";
import { ChannelAvatar } from "../../../shared/ui/ChannelAvatar/ChannelAvatar";

type PerChannelPricesProps = {
  channels: Channel[];
  hasError: boolean;
  pricesByChannelId: Record<number, string>;
  totalPrice: string | null;
  onPriceChange: (channelId: number, value: string) => void;
  onUseTotalPrice: () => void;
};

export function PerChannelPrices({
  channels,
  hasError,
  pricesByChannelId,
  totalPrice,
  onPriceChange,
  onUseTotalPrice,
}: PerChannelPricesProps) {
  const className = hasError
    ? "placement-create-page__channel-prices placement-create-page__channel-prices--error"
    : "placement-create-page__channel-prices";

  return (
    <section className={className} aria-label="Стоимость по каналам">
      <div className="placement-create-page__channel-prices-header">
        <div>
          <h2>
            Стоимость по каналам
            <span className="placement-create-page__required">*</span>
          </h2>
          <p>Можно указать разную цену для каждого размещения.</p>
        </div>
        <button type="button" onClick={onUseTotalPrice}>
          Общая сумма
        </button>
      </div>

      <div className="placement-create-page__channel-prices-list">
        {channels.map((channel) => (
          <label className="placement-create-page__channel-price" key={channel.id}>
            <span className="placement-create-page__channel-price-info">
              <ChannelAvatar channel={channel} size="md" />
              <span>{channel.title}</span>
            </span>
            <input
              inputMode="decimal"
              placeholder="0"
              value={pricesByChannelId[channel.id] ?? ""}
              onChange={(event) => onPriceChange(channel.id, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="placement-create-page__channel-prices-footer">
        <span>Итого: {totalPrice ?? "0"}</span>
      </div>
    </section>
  );
}
