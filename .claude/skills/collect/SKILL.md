---
name: collect
description: Steam 동시접속자를 재서 data/records.json 에 하루 한 건 기록하고, 결과가 정직한지 확인한다. 수집기를 돌리거나 오늘 기록이 들어갔는지 볼 때 쓴다.
---

# 수집

## 돌리기

```bash
node scripts/collect.mjs
```

의존성이 없다. Node 22 이상이면 된다.

## 결과 읽는 법

| 종료 코드 | 뜻 | 정상인가 |
|---|---|---|
| 0 · `기록 추가` | 오늘 기록이 새로 들어갔다 | 정상 |
| 0 · `이미 같은 값으로 있다` | 오늘 이미 쟀다. 파일을 안 건드렸다 | **정상** |
| 1 · `거부` | 오늘이 아닌 날짜를 요청했다 | 정상 동작 (막은 것) |
| 1 · `실패 [FAULT]` | 호출이 실패했다. 기록하지 않았다 | 정상 동작 (0 을 안 넣은 것) |

**값이 안 바뀌어 커밋이 없는 날은 정상이다.** 실패와 헷갈리지 않는다.

## 확인할 것

```bash
node -e "
const j=require('./data/records.json');
const by={}; for(const r of j.records) (by[r.date] ??= []).push(r);
for(const d of Object.keys(by).sort()) console.log(d, by[d].length+'건');
"
```

- 날짜별로 게임 수가 같아야 한다. 한 날짜만 개수가 적으면 그날 일부 호출이 실패한 것이다.
- 같은 `date + appid` 가 두 번 나오면 안 된다. `loadRecords` 가 격리한다.

## 하지 말 것

- **빈 날을 메우려고 하지 않는다.** 동시접속자는 과거를 잴 수 없다.
  `assertMeasurableNow()` 가 막는 것이 맞다. 우회하지 않는다.
- 실패했을 때 0 을 넣지 않는다.
- `records.json` 을 편집기로 고치지 않는다.

## Actions

`.github/workflows/collect.yml` 이 매일 01:10 UTC (10:10 KST) 에 돌린다.
값이 바뀌었을 때만 커밋한다.

새 저장소라 러너 배정이 늦을 수 있다. 잡이 생성되지 않고 `queued` 로 오래 있으면
워크플로 내용 문제가 아니다.
