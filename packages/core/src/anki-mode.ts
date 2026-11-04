export const ANKI_MODE_KEY = "ankiMode";

export async function getAnkiMode(): Promise<boolean> {
  const stored = await chrome.storage.local.get(ANKI_MODE_KEY);
  return stored[ANKI_MODE_KEY] === true;
}

export async function setAnkiMode(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ANKI_MODE_KEY]: enabled });
}
