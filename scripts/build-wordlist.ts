// The generated wordlist.json is CC BY-SA 4.0 (Wiktionary-derived); see DATA-LICENSE.

import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { createGunzip } from "node:zlib";
import type { WordItem } from "../packages/core/src/quiz.ts";

const FREQUENCY_URL = "https://raw.githubusercontent.com/doozan/spanish_data/master/frequency.csv";
const KAIKKI_URL = "https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl.gz";

const topFlagIndex = process.argv.indexOf("--top");
const TOP = topFlagIndex === -1 ? 2000 : Number(process.argv[topFlagIndex + 1]);
if (!Number.isInteger(TOP) || TOP < 1) {
  console.error("Usage: bun scripts/build-wordlist.ts [--top 2000]");
  process.exit(1);
}

const CONTENT_POS = new Set(["n", "v", "adj", "adv"]);
const KAIKKI_POS: Record<string, string> = { n: "noun", v: "verb", adj: "adj", adv: "adv" };
const CONTENT_KAIKKI_POS = new Set(Object.values(KAIKKI_POS));
const WORD_RE = /^[a-záéíóúñü]+$/;

const SKIP_TAGS = new Set([
  "archaic",
  "obsolete",
  "dated",
  "historical",
  "rare",
  "misspelling",
  "vulgar",
  "offensive",
  "derogatory",
  "slang",
]);

interface FreqRow {
  lemma: string;
  pos: string;
}

interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  form_of?: unknown;
  alt_of?: unknown;
}

interface KaikkiRecord {
  word: string;
  pos: string;
  senses?: KaikkiSense[];
}

function parseFrequency(csv: string, buffer: number): FreqRow[] {
  const rows: FreqRow[] = [];
  const seen = new Set<string>();
  for (const line of csv.split("\n")) {
    const [count, spanish, pos, flags] = line.split(",", 5);
    if (!count || count === "count") continue;
    if (!CONTENT_POS.has(pos)) continue;
    if (flags?.includes("NOUSAGE")) continue;
    if (spanish.length < 2 || !WORD_RE.test(spanish)) continue;
    if (seen.has(spanish)) continue;
    seen.add(spanish);
    rows.push({ lemma: spanish, pos });
    if (rows.length >= buffer) break;
  }
  return rows;
}

function cleanGloss(raw: string): string | null {
  const withoutLeadingParens = raw.replace(/^\([^)]*\)\s*/, "").split(";")[0];
  const gloss = withoutLeadingParens.split(",").slice(0, 2).join(",").trim().replace(/\.$/, "");
  if (gloss.length < 2 || gloss.length > 50) return null;
  if (/form of "|spelling of "|abbreviation of |initialism of /i.test(gloss)) {
    return null;
  }
  if (/[{#]/.test(gloss)) return null;
  return gloss;
}

function pickGloss(senses: KaikkiSense[] | undefined): string | null {
  for (const sense of senses ?? []) {
    const raw = sense.glosses?.[0];
    if (!raw) continue;
    if (sense.form_of || sense.alt_of) {
      const degree = /^(?:comparative|superlative) degree of [^:]+: (.+)$/.exec(raw);
      if (degree) {
        const gloss = cleanGloss(degree[1]);
        if (gloss) return gloss;
      }
      continue;
    }
    if (sense.tags?.some((tag) => SKIP_TAGS.has(tag))) continue;
    const gloss = cleanGloss(raw);
    if (gloss) return gloss;
  }
  return null;
}

async function* jsonLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const gunzip = createGunzip();
  Readable.fromWeb(stream as unknown as NodeReadableStream<Uint8Array>).pipe(gunzip);
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of gunzip) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      yield buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }
  buffer += decoder.decode();
  if (buffer) yield buffer;
}

const frequencyResponse = await fetch(FREQUENCY_URL);
if (!frequencyResponse.ok) {
  throw new Error(`fetch frequency.csv: ${frequencyResponse.status}`);
}
const rows = parseFrequency(await frequencyResponse.text(), TOP * 3);
const wanted = new Set(rows.map((row) => row.lemma));

const kaikkiResponse = await fetch(KAIKKI_URL);
if (!kaikkiResponse.ok || !kaikkiResponse.body) {
  throw new Error(
    `fetch kaikki: ${kaikkiResponse.status} — the per-language extract is marked deprecated ` +
      `upstream. If it is gone, download the full English-edition dump from ` +
      `https://kaikki.org/dictionary/rawdata.html and filter records to lang_code "es".`,
  );
}

const glossByLemmaPos = new Map<string, string>();
const glossByLemma = new Map<string, string>();
for await (const line of jsonLines(kaikkiResponse.body)) {
  let mentionsWanted = false;
  for (const match of line.matchAll(/"word": "([^"]+)"/g)) {
    if (wanted.has(match[1])) {
      mentionsWanted = true;
      break;
    }
  }
  if (!mentionsWanted) continue;
  const record = JSON.parse(line) as KaikkiRecord;
  if (!wanted.has(record.word)) continue;
  if (!CONTENT_KAIKKI_POS.has(record.pos)) continue;
  const gloss = pickGloss(record.senses);
  if (!gloss) continue;
  const key = `${record.word}/${record.pos}`;
  if (!glossByLemmaPos.has(key)) glossByLemmaPos.set(key, gloss);
  if (!glossByLemma.has(record.word)) glossByLemma.set(record.word, gloss);
}

const items: WordItem[] = [];
for (const { lemma, pos } of rows) {
  const gloss = glossByLemmaPos.get(`${lemma}/${KAIKKI_POS[pos]}`) ?? glossByLemma.get(lemma);
  if (!gloss) continue;
  items.push({ prompt: lemma, gloss, pos });
  if (items.length >= TOP) break;
}

if (items.length < TOP) {
  console.warn(`warning: only ${items.length} of ${TOP} requested items found`);
}

const out = new URL("../packages/core/src/wordlist.json", import.meta.url);
await Bun.write(out, `${JSON.stringify(items)}\n`);
console.log(`wrote ${items.length} items to packages/core/src/wordlist.json`);
