import type { Channel } from "../../../entities/channel/model";
import { ChannelAvatar } from "../../../shared/ui/ChannelAvatar/ChannelAvatar";
import {
  formatPrice,
  getPlacementsWord,
  type ChannelStats,
} from "../analyticsUtils";

type AnalyticsChannelStatsListProps = {
  channels: Channel[];
  stats: ChannelStats[];
};

export function AnalyticsChannelStatsList({
  channels,
  stats,
}: AnalyticsChannelStatsListProps) {
  if (channels.length === 0) {
    return (
      <p className="analytics-channels__empty">Добавьте канал, чтобы видеть аналитику.</p>
    );
  }

  if (stats.length === 0) {
    return (
      <p className="analytics-channels__empty">Нет размещений за выбранный период.</p>
    );
  }

  const sortedStats = [...stats].sort(
    (firstStats, secondStats) => secondStats.totalPrice - firstStats.totalPrice,
  );

  return (
    <ul className="analytics-channels">
      {sortedStats.map((channelStats) => {
        const channel = channels.find((item) => item.id === channelStats.channelId);

        if (channel === undefined) {
          return null;
        }

        return (
          <li className="analytics-channels__item" key={channelStats.channelId}>
            <ChannelAvatar channel={channel} size="md" />
            <div className="analytics-channels__info">
              <h3>{channel.title}</h3>
              <p>
                {channelStats.placementsCount}{" "}
                {getPlacementsWord(channelStats.placementsCount)}
              </p>
            </div>
            <span className="analytics-channels__price">
              {formatPrice(channelStats.totalPrice)} ₽
            </span>
          </li>
        );
      })}
    </ul>
  );
}
