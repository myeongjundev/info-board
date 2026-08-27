---
name: review
description: 커밋 전에 이 프로젝트가 스스로 정한 규칙을 어기지 않았는지 확인한다. 코드 리뷰, 제출 전 점검, "이거 괜찮나" 를 물을 때 쓴다.
---

# 리뷰

일반적인 코드 리뷰가 아니라 **이 프로젝트가 하지 않기로 한 것**을 찾는다.
[CLAUDE.md](../../../CLAUDE.md) 의 7가지가 기준이다.

## 기계로 찾을 수 있는 것

```bash
# 1. 실패를 0 으로 바꾸는 코드
grep -rnE "\|\| *0|\?\? *0|catch.*return 0" src/ scripts/ --include="*.js"

# 2. 비공식 엔드포인트
grep -rnE "store\.steampowered|appdetails|appreviews|ISteamCharts" src/ scripts/ --include="*.js"

# 3. LIVE 표기
grep -rniE "\bLIVE\b|right now|실시간" src/ui/ --include="*.jsx" --include="*.js"

# 4. 비밀값
grep -rniE "api[_-]?key|token|secret|password" src/ scripts/ --include="*.js"

# 5. process.exit — 종료 코드가 엉킨다
grep -rn "process\.exit(" scripts/ src/

# 6. 테스트가 실제로 돌았는가 (0개 통과와 전부 통과는 다르다)
npm test 2>&1 | tail -5
```

## 눈으로 봐야 하는 것

### Reading 이 쪼개지지 않았는가
값과 시각을 따로 넘기는 함수 인자가 생기면 불변식이 깨진 것이다.
`fn(value, fetchedAt)` 같은 서명을 찾는다. `fn(reading)` 이어야 한다.

### 없는 데이터를 있는 것처럼 만들지 않았는가
- 기록이 하루치뿐인데 "어제 대비" 를 보여주는가 → `compare()` 가 `null` 을 줘야 한다
- 7일이 안 찼는데 이동평균을 보여주는가 → `movingAverage()` 가 `null` 을 줘야 한다
- HYPE 점수 같은 파생 지표에 "우리가 계산한 값" 이라는 표시가 있는가

### 화면이 시각에 대해 정직한가
- 잰 시각과 방문 시각을 구분해 쓰는가
- 오래된 값에 지금 시각을 붙이지 않았는가
- 순간값이라 원자료 대조가 안 된다는 안내가 있는가

### 계산이 `src/view` 에 있는가
`src/ui` 의 컴포넌트가 뺄셈·나눗셈·날짜 계산을 하고 있으면 옮긴다.
테스트할 수 없는 자리에 계산이 있으면 손계산 대조를 못 한다.

## 문서

- 상태를 적는 새 문서를 만들지 않았는가 → `docs/DECISIONS.md` 하나만 고친다
- 만든 체크리스트를 그 자리에서 채웠는가 → 못 채울 것은 만들지 않는다
- "확인하지 못한 범위" 를 남겼는가

## 리뷰 결과

고칠 것이 있으면 고치고, 고치지 않기로 한 것은 **왜 안 고치는지**를 남긴다.
발견만 하고 넘어가지 않는다.
