// Берем первые буквы первых двух слов как fallback для аватарки канала.
export function getChannelInitials(title: string) {
  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// Правильное склонение слова "пост" по количеству.
export function getPostsWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "пост";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "поста";
  }

  return "постов";
}

export function getPlannedPostVerb(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "запланирован";
  }

  return "запланировано";
}
