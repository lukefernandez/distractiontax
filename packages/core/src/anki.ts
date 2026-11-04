const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
const API_VERSION = 6;

async function request<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANKI_CONNECT_URL, {
    method: "POST",
    body: JSON.stringify({ action, version: API_VERSION, params }),
  });
  const payload = (await response.json()) as { result: T; error: string | null };
  if (payload.error !== null) throw new Error(payload.error);
  return payload.result;
}

export async function ankiGateReady(minimumDue: number): Promise<boolean> {
  try {
    const { permission } = await request<{ permission: string }>("requestPermission");
    if (permission !== "granted") return false;
    const due = await request<number[]>("findCards", { query: "is:due" });
    return due.length >= minimumDue;
  } catch {
    return false;
  }
}

export function reviewedToday(): Promise<number> {
  return request<number>("getNumCardsReviewedToday");
}
interface ReviewProgress {
  baseline: number;
  done: number;
}

export function startProgress(count: number): ReviewProgress {
  return { baseline: count, done: 0 };
}

export function updateProgress(progress: ReviewProgress, count: number): ReviewProgress {
  const done = count - progress.baseline;
  if (done < progress.done) return { baseline: count - progress.done, done: progress.done };
  return { baseline: progress.baseline, done };
}
