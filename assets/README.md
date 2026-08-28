# 받은 공개 자산 — 우리가 만들지 않았다

여기 있는 것은 **ALEPH 이 배포한 T04 공개 fixture 꾸러미**다. 우리 코드도,
빌드 산출물도 아니다. 고치지 않고 받은 그대로 둔다.

```
t04-real-information-board-public-v1/
├─ public-contract.json       계약 (contract_version 2.0.0)
├─ criterion-registry.json    T04-C01 ~ C35 정본
├─ asset-manifest.json        파일 17개의 sha256
├─ fixture-manifest.json      fixture 9개의 canonical sha256
├─ fixture.schema.json
├─ normalized-reading.schema.json   저장 계층에 넘기는 공통 형식
├─ reading-status.schema.json       freshness × error_code
├─ adapter-reset.example.js   참조 구현. 복사해 쓰는 라이브러리가 아니다
└─ fixtures/                  결정론 입력 9개
```

## 배포된 그대로인지 확인

```bash
node scripts/verify-assets.mjs
```

`package_id` 와 파일 17개의 sha256·바이트 수를 `asset-manifest.json` 과 대조한다.
어긋나면 종료 코드가 1 이다. 명세 카드 3 의 첫 행동이 이 확인이다.

## 왜 저장소에 넣었나

두 가지 때문이다.

1. **테스트가 실제로 읽어야 하는 입력이다.** `fixtures/` 9개는 C12~C21·C26 의
   채점 경로가 재생하는 값이다. 저장소 밖에 두면 다른 사람이 같은 결과를 못 낸다.
2. **해시 대조를 재현할 수 있게 하려고.** 문서에 "17개 일치" 라고 적어 두면 그
   문장이 낡는다. 자산과 확인 스크립트가 함께 있으면 아무 때나 다시 돌아간다.

## 여기 없는 것

`T04_오늘의_진짜_정보판_과제명세.md` 와 `T04_제출방식.md` 는 이 꾸러미에 속하지
않는다 (`asset-manifest.json` 이 세는 17개에 안 들어간다). 그래서 여기 두지 않았다.

## 고치지 않는다

`contract_version` 과 `fixture_contract` 는 계약이 `immutable` 로 못박은 값이다.
자산을 고쳐서 통과시키는 것은 통과가 아니다. 우리 코드가 이 입력에 맞춘다.
