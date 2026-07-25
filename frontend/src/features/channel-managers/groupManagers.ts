import type { GroupedManager, ManagerListItem } from "./types";

export function groupManagersByUsername(managers: ManagerListItem[]): GroupedManager[] {
  const grouped = new Map<string, GroupedManager>();

  for (const manager of managers) {
    const existing = grouped.get(manager.username);

    if (existing === undefined) {
      grouped.set(manager.username, {
        username: manager.username,
        firstName: manager.firstName,
        photoUrl: manager.photoUrl,
        assignments: [
          {
            id: manager.id,
            channelId: manager.channelId,
            channelTitle: manager.channelTitle,
          },
        ],
      });
      continue;
    }

    existing.assignments.push({
      id: manager.id,
      channelId: manager.channelId,
      channelTitle: manager.channelTitle,
    });

    if (existing.firstName === null && manager.firstName !== null) {
      existing.firstName = manager.firstName;
    }

    if (existing.photoUrl === null && manager.photoUrl !== null) {
      existing.photoUrl = manager.photoUrl;
    }
  }

  return Array.from(grouped.values());
}
