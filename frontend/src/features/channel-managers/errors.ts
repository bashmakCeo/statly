export function isManagerAlreadyAddedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Manager already added");
}
