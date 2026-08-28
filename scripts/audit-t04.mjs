import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';

import { resetReplayState, runFixture } from '../src/state/fixtureReplay.js';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const registry = await readJson('assets/t04-real-information-board-public-v1/criterion-registry.json');
const recordsDocument = await readJson('data/records.json');
const appSource = await readFile(new URL('src/ui/App.jsx', root), 'utf8');
const replaySource = await readFile(new URL('src/ui/ReplayPage.jsx', root), 'utf8');
const online = process.argv.includes('--online');

if (registry.required_count !== 35 || registry.criteria.length !== 35) {
  throw new Error(`조건 정본이 35개가 아니다: required=${registry.required_count}, actual=${registry.criteria.length}`);
}

const result = new Map();
const set = (ids, status, evidence) => {
  for (const id of Array.isArray(ids) ? ids : [ids]) result.set(id, { status, evidence });
};

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g,
  /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)["']?\s*[:=]\s*["']([^"'`\r\n]{8,})["']/gi,
  /\$env:(?:[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD))\s*=\s*["']([^"'`\r\n]{8,})["']/gi,
];
const placeholder = (value) => /\$\{|secrets\.|process\.env|import\.meta\.env|example|placeholder|your[_-]|<|\*\*\*/i.test(value);
function secretHits(text, where) {
  const hits = [];
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[1] ?? match[0];
      if (!placeholder(value)) hits.push(`${where}:${match[0].slice(0, 32)}`);
    }
  }
  return hits;
}

async function textFilesBelow(relative) {
  const base = new URL(relative, root);
  const files = [];
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = new URL(entry.name, directory.href.endsWith('/') ? directory : new URL(`${directory.href}/`));
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(child, name);
      else files.push({ name: `${relative}${name}`, url: child });
    }
  }
  try { await visit(base); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return files;
}

const trackedNames = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
}).split('\0').filter(Boolean);
const safetyFiles = trackedNames.map((name) => ({ name, url: new URL(name.replaceAll('\\', '/'), root) }));
safetyFiles.push(...await textFilesBelow('dist/'));
const currentSecretHits = [];
for (const file of safetyFiles) {
  const bytes = await readFile(file.url);
  if (bytes.includes(0)) continue;
  currentSecretHits.push(...secretHits(bytes.toString('utf8'), file.name));
}
const history = execFileSync('git', ['log', '-p', '--all', '--no-ext-diff', '--'], {
  encoding: 'utf8', maxBuffer: 100 * 1024 * 1024,
});
const historySecretHits = secretHits(history, 'git-history');
const allSecretHits = [...currentSecretHits, ...historySecretHits];
set('T04-C11', allSecretHits.length === 0 ? 'READY' : 'FAIL',
  allSecretHits.length === 0
    ? '작업트리·dist·Git 전체 diff에서 비밀 원문 패턴 0건'
    : `비밀 원문 후보 ${allSecretHits.length}건: ${allSecretHits.slice(0, 3).join(', ')}`);

const personalKeys = new Set([
  'email', 'phone', 'phonenumber', 'address', 'birthday', 'birthdate', 'realname',
  'username', 'userid', 'accountid', 'ip', 'ipaddress',
]);
const personalHits = [];
function inspectPersonal(value, path) {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectPersonal(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (personalKeys.has(key.toLowerCase())) personalHits.push(`${path}.${key}`);
    inspectPersonal(child, `${path}.${key}`);
  }
}
for (const file of await textFilesBelow('data/')) {
  if (!file.name.endsWith('.json')) continue;
  const raw = await readFile(file.url, 'utf8');
  inspectPersonal(JSON.parse(raw), file.name);
  for (const match of raw.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) personalHits.push(`${file.name}:${match[0]}`);
}
set('T04-C25', personalHits.length === 0 ? 'READY' : 'FAIL',
  personalHits.length === 0 ? '공개 data JSON에서 개인 식별 필드·이메일 0건' : `개인정보 후보 ${personalHits.length}건`);

const fixturesRoot = 'assets/t04-real-information-board-public-v1/fixtures/';
const fixture = async (name) => readJson(`${fixturesRoot}${name}`);
const normalD1A = await fixture('normal-d1-a.json');
const normalD1B = await fixture('normal-d1-b.json');
const normalD2 = await fixture('normal-d2.json');
const recoverD2 = await fixture('recover-d2.json');
const failures = [
  [await fixture('timeout.json'), 'timeout', 'T04-C12'],
  [await fixture('auth-401.json'), 'auth', 'T04-C13'],
  [await fixture('rate-429.json'), 'rate_limit', 'T04-C14'],
  [await fixture('offline.json'), 'offline', 'T04-C15'],
  [await fixture('schema-break.json'), 'schema_error', 'T04-C16'],
];

let baseline = resetReplayState();
baseline = runFixture(baseline, normalD1A);
const firstRecordId = baseline.records[0]?.recordId;
baseline = runFixture(baseline, normalD1B);
const sameDayReady = baseline.records.length === 1 && baseline.records[0]?.value === 105
  && baseline.records[0]?.recordId === firstRecordId && baseline.freshness === 'fresh'
  && baseline.errorCode === 'none';
set('T04-C20', sameDayReady ? 'READY' : 'FAIL', 'D1-A→D1-B: 같은 record ID·행 1건·값 105');

const secondDay = runFixture(baseline, normalD2);
const nextDayReady = secondDay.records.length === 2 && secondDay.lastGood?.value === 120
  && secondDay.delta === 15
  && secondDay.records.filter((row) => row.date === '2026-08-25').length === 1;
set('T04-C21', nextDayReady ? 'READY' : 'FAIL', 'NORMAL-D2: 행 2건·신규 날짜 1건·delta 15');

let allFailuresPreserve = true;
for (const [input, errorCode, criterion] of failures) {
  const state = runFixture(baseline, input);
  const ready = state.freshness === 'stale' && state.errorCode === errorCode
    && state.records.length === 1 && state.lastGood?.value === 105;
  set(criterion, ready ? 'READY' : 'FAIL', `${input.fixture_id}: stale/${errorCode}·행 1건·마지막 정상값 105`);
  allFailuresPreserve &&= ready;
}
set(['T04-C17', 'T04-C18'], allFailuresPreserve ? 'READY' : 'FAIL', '실패 5종 모두 마지막 정상값 105와 stale 표시 보존');

const timeoutState = runFixture(baseline, failures[0][0]);
const recovered = runFixture(timeoutState, recoverD2);
const recoveryReady = timeoutState.freshness === 'stale' && timeoutState.errorCode === 'timeout'
  && timeoutState.records.length === 1 && timeoutState.lastGood?.value === 105
  && recovered.freshness === 'fresh' && recovered.errorCode === 'none'
  && recovered.records.length === 2 && recovered.lastGood?.value === 120
  && recovered.records.filter((row) => row.date === '2026-08-25').length === 1;
set('T04-C19', recoveryReady ? 'READY' : 'FAIL', 'TIMEOUT→RECOVER-D2 전이와 다시 시도 UI 경로');
set('T04-C26', replaySource.includes('SYNTHETIC ONLY') && replaySource.includes('recoverD2') ? 'READY' : 'FAIL', '재생 페이지는 저장 파일·외부 API 대신 공개 fixture만 import');

const records = recordsDocument.records ?? [];
const latest = records.at(-1);
const has = (key) => latest && Object.hasOwn(latest, key);
set('T04-C04', typeof latest?.value === 'number' ? 'READY' : 'FAIL', '저장 Reading과 대표값 UI 경로');
set('T04-C05', typeof latest?.unit === 'string' ? 'READY' : 'FAIL', 'Reading.unit');
set('T04-C06', typeof latest?.sourceUrl === 'string' && latest.sourceUrl.startsWith('https://') ? 'READY' : 'FAIL', 'Reading.sourceUrl·sourceLabel');
set('T04-C07', has('sourceTime') && appSource.includes('출처 관측 시각') ? 'READY' : 'FAIL', 'sourceTime 명시 저장; null이면 Steam API 미제공 표시');
set('T04-C08', has('fetchedAt') && appSource.includes('조회 시각') ? 'READY' : 'FAIL', 'fetchedAt과 조회 시각을 별도 표시');
set('T04-C09', latest?.timezone === 'Asia/Seoul' ? 'READY' : 'FAIL', 'Reading.timezone=Asia/Seoul');
set('T04-C10', appSource.includes('<DataProof') && has('value') && has('sourceUrl') ? 'READY' : 'FAIL', '같은 Reading을 대조 패널과 화면이 공유');

const dates = [...new Set(records.map((row) => row.date))].sort();
const twoLiveDates = dates.length === 2;
set('T04-C22', 'WAIT', `실제 저장 날짜 ${dates.length}개(${dates.join(', ') || '없음'}); 봉인 영수증은 제출 단계에서 확인`);
set('T04-C23', 'WAIT', `${twoLiveDates ? '저장 후보 2일치 있음' : '저장 후보가 아직 2일치가 아님'}; 봉인 영수증 대조 필요`);
set('T04-C24', 'WAIT', `${twoLiveDates ? '변화 재계산 후보 있음' : '실제 두 날짜 변화 재계산 불가'}; 봉인 영수증 순서 대조 필요`);
set(['T04-C27', 'T04-C28'], 'WAIT', '제출문 작성 단계에서만 확정');
set(['T04-C34', 'T04-C35'], 'WAIT', '제출 필드 작성 단계에서 결과물 URL·full commit URL 확정');

async function publicGet(url) {
  try {
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'info-board-t04-audit' },
    });
    return { ok: response.status >= 200 && response.status < 300, status: response.status };
  } catch (error) {
    return { ok: false, status: error.name };
  }
}

async function publicDynamicReading(url) {
  try {
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'info-board-t04-audit' },
    });
    if (!response.ok) return { ok: false, status: response.status, value: null };
    const body = await response.json();
    const value = body?.response?.player_count;
    return {
      ok: body?.response?.result === 1 && Number.isFinite(value) && value >= 0,
      status: response.status,
      value,
    };
  } catch (error) {
    return { ok: false, status: error.name, value: null };
  }
}

if (online) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const pagesUrl = 'https://myeongjundev.github.io/info-board/';
  const sourceUrl = `https://github.com/myeongjundev/info-board/tree/${commit}`;
  const [pages, source, upstream] = await Promise.all([
    publicGet(pagesUrl), publicGet(sourceUrl), publicDynamicReading(latest?.sourceUrl),
  ]);
  const publicReady = pages.ok && source.ok;
  set(['T04-C01', 'T04-C02', 'T04-C29', 'T04-C30', 'T04-C31', 'T04-C32', 'T04-C33'],
    publicReady ? 'READY' : 'FAIL', `무인증 HTTP: 결과물 ${pages.status}, 소스 ${source.status}`);
  set('T04-C03', upstream.ok ? 'READY' : 'FAIL',
    `공개 동적 원천 HTTP ${upstream.status}·player_count ${upstream.value ?? '해석 실패'}`);
} else {
  set(['T04-C01', 'T04-C02', 'T04-C29', 'T04-C30', 'T04-C31', 'T04-C32', 'T04-C33'],
    'CHECK', '`npm run audit:t04 -- --online`으로 결과물·소스 무인증 접근 확인');
  set('T04-C03', 'CHECK', '`--online`으로 공개 동적 원천 응답 확인');
}

const missing = registry.criteria.filter((criterion) => !result.has(criterion.id));
if (missing.length > 0) throw new Error(`판정 경로가 없는 조건: ${missing.map((item) => item.id).join(', ')}`);

console.log('| 조건 | 준비상태 | 현재 근거 |');
console.log('|---|---|---|');
for (const criterion of registry.criteria) {
  const row = result.get(criterion.id);
  console.log(`| ${criterion.id} | ${row.status} | ${row.evidence.replaceAll('|', '\\|')} |`);
}

const counts = Object.fromEntries(['READY', 'WAIT', 'CHECK', 'FAIL'].map((status) => [
  status, [...result.values()].filter((row) => row.status === status).length,
]));
console.log(`\nREADY ${counts.READY} · WAIT ${counts.WAIT} · CHECK ${counts.CHECK} · FAIL ${counts.FAIL}`);
console.log('READY는 저장소에 실행 가능한 근거가 있다는 뜻이며 최종 채점 MET를 대신하지 않는다.');
if (counts.FAIL > 0) process.exitCode = 1;
