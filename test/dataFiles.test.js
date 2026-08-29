import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { DATA_FILES, matchDataFile } from '../src/source/dataFiles.js';

// 개발 서버가 원문 JSON 으로 내주는 주소. 화면이 fetch 하는 그 주소다.
test('질의 없는 정확한 주소만 원문 JSON 으로 내준다', () => {
  assert.equal(matchDataFile('/data/records.json')?.path, 'data/records.json');
  assert.equal(matchDataFile('/data/timeprobe.json')?.required, false);

  assert.equal(matchDataFile('/data/없는파일.json'), null);
  assert.equal(matchDataFile('/src/main.jsx'), null);
  assert.equal(matchDataFile(''), null);
  assert.equal(matchDataFile(undefined), null);
});

// 결함 17번. 같은 파일을 ESM 으로 들여오면 Vite 가 `?import` 를 붙여 부르고,
// 그 응답은 모듈이어야 한다. 미들웨어가 여기서 원문 JSON 을 내주면 MIME 이
// application/json 이 되어 그 모듈을 부른 화면이 통째로 안 뜬다.
test('`?import` 가 붙은 요청은 가로채지 않는다 — Vite 가 모듈로 바꿔야 한다', () => {
  assert.equal(matchDataFile('/data/records.json?import'), null);
  assert.equal(matchDataFile('/data/sales-charts.json?import'), null);
  assert.equal(matchDataFile('/data/discounts.json?t=1735'), null);
});

// `startsWith` 로 고르면 이것들이 전부 records.json 이 된다.
test('앞부분만 같은 주소를 그 파일로 만들지 않는다', () => {
  assert.equal(matchDataFile('/data/records.json.bak'), null);
  assert.equal(matchDataFile('/data/records.json/무엇'), null);
});

// 화면이 ESM 으로 들여오는 data/*.json 은 전부 이 목록 안에 있어야 한다.
// 목록 밖 파일은 빌드 때 dist 로 복사되지 않아 배포본에서만 사라진다.
test('src 가 들여오는 data JSON 은 전부 목록에 있다', async () => {
  const source = await readFile(new URL('../src/ui/OverviewStrip.jsx', import.meta.url), 'utf8');
  const imported = [...source.matchAll(/from '\.\.\/\.\.\/(data\/[\w.-]+\.json)'/g)].map((m) => m[1]);

  assert.ok(imported.length > 0, 'OverviewStrip 이 data JSON 을 들여오지 않는다면 이 검사를 옮긴다');
  for (const path of imported) {
    assert.ok(
      DATA_FILES.some((f) => f.path === path),
      `${path} 이 DATA_FILES 에 없다 — 빌드가 dist 로 복사하지 않는다`,
    );
  }
});
