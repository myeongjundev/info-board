import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ADULT_DESCRIPTOR_IDS, assertDescriptorsPresent, hasAdultDescriptor, hasDescriptorSource,
  isAdultItem, toDescriptorIds,
} from '../src/source/contentDescriptors.js';
import { ADULT_LABEL, countAdult, displayArt, displayName } from '../src/view/gameDisplay.js';

// 2026-08-28 에 실제로 재서 확인한 표본이다. Steam 이 나이 확인으로 막는 항목과
// 막지 않는 항목을 그대로 옮겨 둔다. 규칙을 넓히면 여기가 먼저 깨진다.
const MEASURED = [
  { appid: 4924510, ids: [1, 3, 4, 5], gatedBySteam: true, note: 'Lust Share House' },
  { appid: 3718190, ids: [1, 3, 4, 5], gatedBySteam: true, note: 'Stripjong' },
  { appid: 3308670, ids: [1, 5], gatedBySteam: false, note: "GIRLS' FRONTLINE 2" },
  { appid: 730, ids: [2, 5], gatedBySteam: false, note: 'Counter-Strike 2' },
  { appid: 1174180, ids: [5], gatedBySteam: false, note: 'Red Dead Redemption 2' },
];

test('판별이 Steam 의 나이 확인과 정확히 일치한다', () => {
  for (const sample of MEASURED) {
    assert.equal(
      hasAdultDescriptor(sample.ids), sample.gatedBySteam,
      `${sample.note} (${sample.appid}) 판정이 Steam 과 어긋난다`,
    );
  }
});

test('1 이나 2 로 넓히지 않는다 — 정상 게임까지 접히면 우리가 가리는 쪽이 된다', () => {
  assert.deepEqual(ADULT_DESCRIPTOR_IDS, [3, 4]);
  assert.equal(hasAdultDescriptor([1]), false);
  assert.equal(hasAdultDescriptor([2]), false);
  assert.equal(hasAdultDescriptor([1, 2, 5]), false);
});

test('descriptor 를 모르면 접지 않는다', () => {
  for (const empty of [undefined, null, [], 'null', '', {}, 0]) {
    assert.equal(isAdultItem(empty), false, `${JSON.stringify(empty)} 를 성인으로 봤다`);
  }
});

test('출처 세 곳의 서로 다른 모양을 같은 판별로 읽는다', () => {
  assert.equal(isAdultItem([3, 4]), true, '판매 차트: content_descriptorids');
  assert.equal(isAdultItem('[1,3,4,5]'), true, '출시 캘린더: data-ds-descids 문자열');
  assert.equal(isAdultItem({ ids: [1, 3, 4, 5], notes: '...' }), true, '할인: content_descriptors');
  assert.equal(isAdultItem('[2,5]'), false);
  assert.equal(isAdultItem({ ids: [5] }), false);
});

test('망가진 문자열을 성인 판정으로 만들지 않는다', () => {
  assert.deepEqual(toDescriptorIds('{{{'), []);
  assert.deepEqual(toDescriptorIds('[3,'), []);
  assert.deepEqual(toDescriptorIds('[3,"4"]'), [3, 4]);
});

test('빈 분류와 원본 필드 누락을 구분한다', () => {
  assert.equal(hasDescriptorSource([]), true);
  assert.equal(hasDescriptorSource({ ids: [] }), true);
  assert.equal(hasDescriptorSource('[]'), true);
  assert.equal(hasDescriptorSource(undefined), false);
  assert.equal(hasDescriptorSource({}), false);
  assert.equal(hasDescriptorSource('[3,'), false);
});

test('descriptor 를 한 건도 못 읽으면 스냅샷을 덮지 않는다', () => {
  assert.doesNotThrow(() => assertDescriptorsPresent([], '정상 빈 결과'));
  assert.throws(
    () => assertDescriptorsPresent([{ appid: 1 }, { appid: 2 }], '판매 차트'),
    /성인 분류/,
  );
  assert.doesNotThrow(
    () => assertDescriptorsPresent([{ appid: 1, descriptorIds: [], descriptorAvailable: true }, { appid: 2 }], '판매 차트'),
  );
  assert.throws(
    () => assertDescriptorsPresent([{ appid: 1, descriptorIds: [] }], '판매 차트'),
    /성인 분류/,
  );
});

test('접어도 순위와 가격은 그대로 남는다', () => {
  const item = {
    appid: 4924510, rank: 20, name: '접혀야 하는 제목', adult: true,
    imageUrl: 'https://example.invalid/header.jpg',
    initialMinor: 965000, finalMinor: 772000, discountPercent: 20,
  };
  assert.equal(displayName(item), ADULT_LABEL);
  assert.equal(displayArt(item), null);
  // 값은 하나도 건드리지 않는다.
  assert.equal(item.rank, 20);
  assert.equal(item.initialMinor, 965000);
  assert.equal(item.finalMinor, 772000);
  assert.equal(item.discountPercent, 20);
});

test('성인이 아니면 이름과 표지를 그대로 쓴다', () => {
  const item = { name: 'Counter-Strike 2', imageUrl: 'https://example.invalid/730.jpg', adult: false };
  assert.equal(displayName(item), 'Counter-Strike 2');
  assert.equal(displayArt(item), 'https://example.invalid/730.jpg');
});

test('접힌 항목 수를 센다 — 화면이 스스로 밝히기 위해', () => {
  assert.equal(countAdult([{ adult: true }, { adult: false }, {}, { adult: true }]), 2);
  assert.equal(countAdult([]), 0);
  assert.equal(countAdult(null), 0);
});
