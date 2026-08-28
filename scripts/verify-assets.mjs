// 받은 공개 자산이 배포된 그대로인지 확인한다.
//
// 명세 카드 3 의 첫 행동이 "파일 SHA-256 을 확인합니다" 다. 그 확인을 문서에
// 적어 두는 대신 여기서 돌린다 — 적어 둔 값은 낡지만 돌리는 것은 안 낡는다.
//
//   node scripts/verify-assets.mjs

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 't04-real-information-board-public-v1');

const manifest = JSON.parse(readFileSync(join(ROOT, 'asset-manifest.json'), 'utf8'));
const failures = [];

for (const file of manifest.files) {
  let bytes;
  try {
    bytes = readFileSync(join(ROOT, file.path));
  } catch {
    failures.push(`${file.path} — 파일이 없다`);
    continue;
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== file.sha256) failures.push(`${file.path} — sha256 ${file.sha256} 이어야 하는데 ${sha256}`);
  else if (bytes.length !== file.bytes) failures.push(`${file.path} — ${file.bytes} 바이트여야 하는데 ${bytes.length}`);
}

console.log(`package_id  ${manifest.package_id}`);
console.log(`파일        ${manifest.files.length}개 대조`);

if (failures.length > 0) {
  console.error(`\n어긋난 파일 ${failures.length}개`);
  for (const line of failures) console.error(`  ${line}`);
  console.error('\n받은 자산이 배포된 것과 다르다. 다시 받는다.');
  process.exitCode = 1;
} else {
  console.log('결과        전부 일치');
}
