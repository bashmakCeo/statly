import { useEffect, useRef } from "react";
import lottie from "lottie-web";

import type { Channel } from "../../entities/channel/model";
import emptyChannelsAnimation from "../../shared/assets/images/utka_no_channel.json";
import { CHANNEL_TEXTS } from "../../shared/config/app";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelCard } from "./ChannelCard";
import { ChannelListSkeleton } from "./ChannelListSkeleton";

type ChannelListProps = {
  channels: Channel[];
  dateLabel: string;
  error: string | null;
  isLoading: boolean;
  title?: string;
  onChannelSelect?: (channelId: number) => void;
};

export function ChannelList({
  channels,
  dateLabel,
  error,
  isLoading,
  title,
  onChannelSelect,
}: ChannelListProps) {
  if (isLoading) {
    return <ChannelListSkeleton title={title !== undefined} />;
  }

  if (error !== null) {
    return <StateMessage variant="error">{error}</StateMessage>;
  }

  if (channels.length === 0) {
    return title === undefined ? <EmptyChannelsState /> : null;
  }

  return (
    <section className="channel-list" aria-label={title ?? "Каналы"}>
      {title !== undefined ? <h2 className="channel-list__title">{title}</h2> : null}
      {channels.map((channel) => (
        <ChannelCard
          channel={channel}
          dateLabel={dateLabel}
          key={channel.id}
          onSelect={onChannelSelect}
        />
      ))}
    </section>
  );
}

function EmptyChannelsState() {
  const animationContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (animationContainerRef.current === null) {
      return;
    }

    const animation = lottie.loadAnimation({
      animationData: emptyChannelsAnimation,
      autoplay: true,
      container: animationContainerRef.current,
      loop: true,
      renderer: "svg",
    });

    return () => {
      animation.destroy();
    };
  }, []);

  return (
    <div className="channel-list__empty">
      <div className="channel-list__empty-animation" ref={animationContainerRef} />
      <p>{CHANNEL_TEXTS.empty}</p>
    </div>
  );
}
