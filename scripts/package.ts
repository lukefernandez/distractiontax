import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const EXTENSIONS = ["distractiontax", "distractiontax-x"] as const;
const ROOT = join(import.meta.dir, "..");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

interface Entry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

async function zipDir(dir: string): Promise<Uint8Array> {
  const files = walk(dir)
    .map((full) => relative(dir, full).split("\\").join("/"))
    .sort();

  const chunks: Uint8Array[] = [];
  const entries: Entry[] = [];
  let offset = 0;

  for (const name of files) {
    const data = new Uint8Array(await Bun.file(join(dir, name)).arrayBuffer());
    const crc = crc32(data);
    const nameBytes = new TextEncoder().encode(name);

    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(8, 0, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, nameBytes.length, true);

    entries.push({ name, data, crc, offset });
    chunks.push(new Uint8Array(header.buffer), nameBytes, data);
    offset += 30 + nameBytes.length + data.length;
  }

  const central: Uint8Array[] = [];
  let centralSize = 0;
  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint16(10, 0, true);
    header.setUint32(16, entry.crc, true);
    header.setUint32(20, entry.data.length, true);
    header.setUint32(24, entry.data.length, true);
    header.setUint16(28, nameBytes.length, true);
    header.setUint32(42, entry.offset, true);
    central.push(new Uint8Array(header.buffer), nameBytes);
    centralSize += 46 + nameBytes.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const total = all.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const chunk of all) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

for (const ext of EXTENSIONS) {
  const dist = join(ROOT, "packages", ext, "dist");
  const manifest = (await Bun.file(join(dist, "manifest.json")).json()) as { version: string };
  const zip = await zipDir(dist);
  const outPath = join(ROOT, "store", ext, `${ext}-v${manifest.version}.zip`);
  await Bun.write(outPath, zip);
  console.log(`${relative(ROOT, outPath)}  (${zip.length} bytes)`);
}
