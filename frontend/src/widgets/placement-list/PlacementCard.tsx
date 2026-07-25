import type { Placement } from "../../entities/placement/model";
import { getPlacementLocalPublish } from "../../entities/placement/publish";
import { useProfile } from "../../features/profile/profileCache";
import { resolveTimezone } from "../../shared/lib/timezone";
import editPlacementIcon from "../../shared/assets/icons/EditPlacement.svg";
import noIcon from "../../shared/assets/icons/no.svg";
import yesIcon from "../../shared/assets/icons/yes.svg";

type PlacementCardProps = {
  placement: Placement;
  onEdit?: (placement: Placement) => void;
};

export function PlacementCard({ placement, onEdit }: PlacementCardProps) {
  const { user } = useProfile();
  const timezone = resolveTimezone(user?.timezone);
  const { publishTime } = getPlacementLocalPublish(placement, timezone);

  return (
    <article className="placement-card">
      <div className="placement-card__header">
        <h2>{placement.buyerName}</h2>
        <button
          className="placement-card__edit"
          type="button"
          aria-label="Изменить размещение"
          onClick={() => onEdit?.(placement)}
        >
          <img alt="" className="placement-card__edit-icon" src={editPlacementIcon} />
        </button>
      </div>

      <div className="placement-card__row">
        <span>{publishTime || "—"}</span>
        <span>{placement.format}</span>
      </div>

      <div className="placement-card__row">
        <span className="placement-card__contact">
          {placement.buyerContact ?? "—"}
        </span>
        <span className="placement-card__price-row">
          <span>{formatPlacementPrice(placement.price)}</span>
          <img
            alt=""
            aria-hidden="true"
            className="placement-card__status"
            src={placement.status === "paid" ? yesIcon : noIcon}
          />
        </span>
      </div>
    </article>
  );
}

function formatPlacementPrice(price: string) {
  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice)) {
    return price;
  }

  return `${numericPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₽`;
}
