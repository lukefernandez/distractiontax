export interface ChallengeTarget {
  surface: string;
  name: string;
  returnUrl: string;
  label: string;
}

export function resolveTarget(params: URLSearchParams, hash: string): ChallengeTarget | null {
  const surface = params.get("surface");
  if (!surface) return null;
  const requested = params.get("return") ?? hash.replace(/^#/, "");
  return {
    surface,
    name: params.get("name") ?? surface,
    returnUrl: /^https?:\/\//i.test(requested) ? requested : `https://${surface}/`,
    label: params.get("label") ?? `${surface} is blocked.`,
  };
}
