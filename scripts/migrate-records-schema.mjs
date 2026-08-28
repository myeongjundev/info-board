import { readFile, writeFile } from 'node:fs/promises';
import { loadRecords, serialize } from '../src/state/records.js';

const recordsPath = new URL('../data/records.json', import.meta.url);
const raw = await readFile(recordsPath, 'utf8');
const parsed = JSON.parse(raw);
const { records, quarantined } = loadRecords(parsed);

if (quarantined.length > 0) {
  throw new Error(`records.json 스키마 변환 중 ${quarantined.length}개 행이 격리됐다. 쓰지 않는다.`);
}

const { schemaVersion: _oldVersion, records: _oldRecords, ...meta } = parsed;
const next = serialize(records, meta);

if (next === raw) {
  console.log('records.json: 이미 최신 스키마다.');
} else {
  await writeFile(recordsPath, next, 'utf8');
  console.log(`records.json: ${records.length}개 기존 행을 최신 스키마로 변환했다.`);
}
