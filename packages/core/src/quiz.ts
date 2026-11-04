export interface WordItem {
  prompt: string;
  gloss: string;
  pos: string;
}

export interface ChallengeItem {
  prompt: string;
  options: string[];
  correctIndex: number;
}

const OPTIONS_PER_ITEM = 5;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawChallenge(wordlist: WordItem[], itemCount = 5): ChallengeItem[] {
  const distinctGlosses = new Set(wordlist.map((item) => item.gloss)).size;
  if (wordlist.length < itemCount || distinctGlosses < OPTIONS_PER_ITEM) {
    throw new Error("Wordlist too small for a Challenge");
  }

  return shuffle(wordlist)
    .slice(0, itemCount)
    .map((item) => {
      const distractors: string[] = [];
      while (distractors.length < OPTIONS_PER_ITEM - 1) {
        const candidate = wordlist[Math.floor(Math.random() * wordlist.length)];
        if (candidate.gloss !== item.gloss && !distractors.includes(candidate.gloss)) {
          distractors.push(candidate.gloss);
        }
      }
      const options = shuffle([item.gloss, ...distractors]);
      return {
        prompt: item.prompt,
        options,
        correctIndex: options.indexOf(item.gloss),
      };
    });
}
