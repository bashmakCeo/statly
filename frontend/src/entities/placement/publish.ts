import type { Placement } from "./model";
import { utcPublishPartsToLocal } from "../../shared/lib/timezone";

export function getPlacementLocalPublish(
  placement: Pick<Placement, "publishDateUtc" | "publishTimeUtc">,
  timezone: string,
) {
  return utcPublishPartsToLocal(
    placement.publishDateUtc,
    placement.publishTimeUtc,
    timezone,
  );
}
