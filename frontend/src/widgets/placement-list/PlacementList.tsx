import type { Placement } from "../../entities/placement/model";
import { PlacementCard } from "./PlacementCard";

type PlacementListProps = {
  emptyLabel: string;
  placements: Placement[];
  onEditPlacement?: (placement: Placement) => void;
};

export function PlacementList({ emptyLabel, placements, onEditPlacement }: PlacementListProps) {
  if (placements.length === 0) {
    return <p className="placement-list__empty">{emptyLabel}</p>;
  }

  return (
    <section className="placement-list" aria-label="Размещения канала">
      {placements.map((placement) => (
        <PlacementCard key={placement.id} placement={placement} onEdit={onEditPlacement} />
      ))}
    </section>
  );
}
