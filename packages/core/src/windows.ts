export const WINDOWS_KEY = "windows";

export const WINDOW_MINUTES = 5;

export type Windows = Record<string, number>;

export async function getWindows(): Promise<Windows> {
  const result = await chrome.storage.local.get(WINDOWS_KEY);
  return result[WINDOWS_KEY] ?? {};
}

export async function grantWindow(surface: string, now = Date.now()): Promise<number> {
  const windows = await getWindows();
  const expiresAt = now + WINDOW_MINUTES * 60_000;
  windows[surface] = expiresAt;
  await chrome.storage.local.set({ [WINDOWS_KEY]: windows });
  return expiresAt;
}
