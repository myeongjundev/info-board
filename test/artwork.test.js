import { test } from 'node:test';
import assert from 'node:assert/strict';

import { capsuleUrl, headerUrl, ARTWORK_NOTE } from '../src/source/artwork.js';
import { GAMES } from '../src/source/definition.js';

test('appid 로 주소를 만든다', () => {
  assert.equal(
    capsuleUrl(730),
    'https://cdn.cloudflare.steamstatic.com/steam/apps/730/capsule_231x87.jpg',
  );
  assert.equal(
    headerUrl(730),
    'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  );
});

test('재는 게임 전부에 대해 주소가 만들어진다', () => {
  for (const g of GAMES) {
    assert.match(capsuleUrl(g.appid), /^https:\/\/cdn\.cloudflare\.steamstatic\.com\/steam\/apps\/\d+\/capsule_231x87\.jpg$/);
    assert.match(headerUrl(g.appid), /^https:\/\/cdn\.cloudflare\.steamstatic\.com\/steam\/apps\/\d+\/header\.jpg$/);
  }
});

// 규칙 5 의 예외를 좁게 유지하기 위한 자물쇠.
//
// 이 파일이 값을 가져오는 쪽으로 번지면 규칙이 무너진다. 값은 전부
// records.json 에서 와야 하고, 이 CDN 에서는 그림만 온다.
test('그림 말고 다른 것을 이 경로에서 가져오지 않는다', () => {
  for (const url of [capsuleUrl(1), headerUrl(1)]) {
    assert.match(url, /\.jpg$/, '이 경로에서는 이미지만 가져온다');
  }
});

test('출처를 화면에 적을 문구가 있다', () => {
  assert.match(ARTWORK_NOTE, /Steam CDN/);
  assert.match(ARTWORK_NOTE, /퍼블리셔/);
  // 값이 여기서 오지 않는다는 말이 반드시 들어 있어야 한다.
  assert.match(ARTWORK_NOTE, /값은 여기서 오지 않는다/);
});
