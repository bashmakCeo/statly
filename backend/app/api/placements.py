from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.placement import (
    PlacementAnalytics,
    PlacementAnalyticsYears,
    PlacementCountsByDateRange,
    PlacementCreate,
    PlacementFormatSuggestions,
    PlacementRead,
    PlacementUpdate,
)
from app.services.placement_service import (
    create_user_placement,
    delete_user_placement,
    get_user_placement,
    get_user_placement_analytics,
    get_user_placement_analytics_years,
    get_user_placement_counts_by_date_range,
    get_user_placement_format_suggestions,
    get_user_placements_by_channel_and_date,
    get_user_placements_by_channel_and_date_range,
    get_user_placements_by_date_range,
    update_user_placement,
)


router = APIRouter(prefix="/api/placements", tags=["placements"])


@router.post("", response_model=PlacementRead, status_code=status.HTTP_201_CREATED)
async def create_placement(
    payload: PlacementCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> PlacementRead:
    return await create_user_placement(db, current_user, payload)


@router.get("", response_model=list[PlacementRead])
async def get_placements(
    db: DbSession,
    current_user: CurrentUser,
    channel_id: int | None = Query(default=None, alias="channel_id"),
    target_date: date | None = Query(default=None, alias="date"),
    start_date: date | None = Query(default=None, alias="start_date"),
    end_date: date | None = Query(default=None, alias="end_date"),
) -> list[PlacementRead]:
    if start_date is not None and end_date is not None:
        if channel_id is not None:
            return await get_user_placements_by_channel_and_date_range(
                db,
                current_user,
                channel_id,
                start_date,
                end_date,
            )

        return await get_user_placements_by_date_range(
            db,
            current_user,
            start_date,
            end_date,
        )

    if target_date is not None:
        if channel_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите channel_id",
            )

        return await get_user_placements_by_channel_and_date(
            db,
            current_user,
            channel_id,
            target_date,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Укажите date или start_date и end_date",
    )


@router.get("/counts/range", response_model=PlacementCountsByDateRange)
async def get_placement_counts_range(
    db: DbSession,
    current_user: CurrentUser,
    start_date: date = Query(alias="start_date"),
    end_date: date = Query(alias="end_date"),
    channel_id: int | None = Query(default=None, alias="channel_id"),
) -> PlacementCountsByDateRange:
    return await get_user_placement_counts_by_date_range(
        db,
        current_user,
        start_date,
        end_date,
        channel_id,
    )


@router.get("/analytics", response_model=PlacementAnalytics)
async def get_placement_analytics(
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(..., ge=1970, le=9999),
    channel_ids: list[int] = Query(default=[], alias="channel_id"),
    paid_only: bool = Query(default=False),
    by_purchase_date: bool = Query(default=False),
) -> PlacementAnalytics:
    return await get_user_placement_analytics(
        db,
        current_user,
        year,
        channel_ids,
        paid_only,
        by_purchase_date,
    )


@router.get("/analytics/years", response_model=PlacementAnalyticsYears)
async def get_placement_analytics_years(
    db: DbSession,
    current_user: CurrentUser,
    paid_only: bool = Query(default=False),
    by_purchase_date: bool = Query(default=False),
) -> PlacementAnalyticsYears:
    years = await get_user_placement_analytics_years(
        db,
        current_user,
        paid_only,
        by_purchase_date,
    )
    return PlacementAnalyticsYears(years=years)


@router.get("/formats", response_model=PlacementFormatSuggestions)
async def get_placement_format_suggestions(
    db: DbSession,
    current_user: CurrentUser,
    channel_ids: list[int] = Query(default=[], alias="channel_id"),
) -> PlacementFormatSuggestions:
    return await get_user_placement_format_suggestions(db, current_user, channel_ids)


@router.get("/{placement_id}", response_model=PlacementRead)
async def get_placement(
    placement_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> PlacementRead:
    return await get_user_placement(db, current_user, placement_id)


@router.patch("/{placement_id}", response_model=PlacementRead)
async def update_placement(
    placement_id: int,
    payload: PlacementUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> PlacementRead:
    return await update_user_placement(db, current_user, placement_id, payload)


@router.delete("/{placement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_placement(
    placement_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    await delete_user_placement(db, current_user, placement_id)
