import {
  DEV_TELEGRAM_USERS,
  resolveDevUserKey,
  switchDevUser,
} from "../../shared/telegram/devUsers";

export function DevUserSwitcher() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const currentKey = resolveDevUserKey();

  return (
    <div className="dev-user-switcher" role="region" aria-label="Dev: переключение пользователя">
      <label className="dev-user-switcher__label">
        <span>Dev</span>
        <select
          className="dev-user-switcher__select"
          value={currentKey}
          onChange={(event) => switchDevUser(event.target.value)}
        >
          {DEV_TELEGRAM_USERS.map((user) => (
            <option key={user.key} value={user.key}>
              {user.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
