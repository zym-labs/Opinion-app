// Push notifications are mobile-only; web builds (used for previews) get no-ops.
export async function enablePush(): Promise<boolean> {
  return false;
}

export function useNotificationRouting(_enabled: boolean) {}
