# STEAM PULSE 개선 방향 및 가치 고도화 명세

> Claude Code 전달용  
> 프로젝트: SKT ALEPH T04 — 오늘의 진짜 정보판  
> 목적: 현재의 단순 Steam 순위 정보판을 **“어제와 오늘의 변화를 해석해주는 데이터 제품”​**으로 발전시키기 위한 개선 명세

---

# 0. 현재 프로젝트에 대한 판단

현재 STEAM PULSE는 과제 수행 관점에서는 충분히 의미가 있다.

이미 다음 요소를 중심으로 좋은 구조를 가지고 있다.

- 실제 Steam 관련 데이터 사용
- 순위 데이터 표시
- 날짜별 스냅샷 저장
- GitHub Actions를 통한 자동 수집
- 장애 상태 처리
- GitHub Pages 정적 배포
- 전일 데이터 비교 준비
- 동일 날짜 중복 저장 방지 구조

하지만 서비스 가치 측면에서는 아직 다음 문제가 있다.

> 사용자가 사이트를 보고  
> “현재 Steam 순위가 이렇구나.”  
> 라고 확인한 뒤 다시 방문할 이유가 약하다.

Steam 자체에서도 현재 인기 게임이나 플레이어 수를 확인할 수 있기 때문이다.

따라서 앞으로의 핵심 목표는:

# 단순한 `RANKING BOARD`
에서

# `DAILY GAME TREND BOARD`

로 프로젝트 성격을 발전시키는 것이다.

---

# 1. 프로젝트의 핵심 질문 변경

현재 핵심 질문:

> **What is the world playing?**

여기에 두 번째 질문을 추가한다.

> **What changed since yesterday?**

최종적으로 STEAM PULSE는 다음 질문에 답하는 사이트가 되어야 한다.

```text
오늘 가장 많이 플레이하는 게임은?

어제보다 가장 많이 성장한 게임은?

가장 크게 떨어진 게임은?

순위가 가장 많이 오른 게임은?

새롭게 순위에 들어온 게임은?

다시 살아나고 있는 게임은?

어떤 장르가 오늘 가장 강한가?
```

---

# 2. 프로젝트 가치 재정의

STEAM PULSE의 최종 목적을 다음과 같이 정의한다.

> **Steam의 현재 게임 순위를 단순 표시하는 것이 아니라,  
> 날짜별 스냅샷을 비교하여 게임 생태계에서 어떤 변화가 발생했는지를 자동으로 탐지하고 보여주는 Daily Gaming Trend Board.**

---

# 3. 핵심 데이터 흐름

앞으로의 모든 기능은 다음 데이터 흐름을 기반으로 한다.

```text
Steam Source
     ↓
Daily Snapshot
     ↓
JSON Storage
     ↓
Previous Day Snapshot
     ↓
Comparison Engine
     ↓
Movement Detection
     ↓
Trend Classification
     ↓
Insight Cards
     ↓
React UI
```

---

# 4. 데이터 스냅샷 구조

현재 수집되는 75개 게임 데이터를 최대한 활용한다.

권장 데이터 형태:

```json
{
  "date": "2026-08-28",
  "timezone": "Asia/Seoul",
  "observedAt": "2026-08-28T10:10:00+09:00",
  "games": [
    {
      "rank": 1,
      "appId": 730,
      "name": "Counter-Strike 2",
      "players": 1245821
    }
  ]
}
```

가능하다면 다음 데이터를 추가한다.

```json
{
  "genre": ["FPS", "Action"],
  "releaseDate": "2012-08-21"
}
```

단, 데이터 출처를 명확히 확보할 수 있을 경우에만 추가한다.

---

# 5. 비교 데이터 모델

전일과 현재 데이터를 appId 기준으로 비교한다.

예:

```js
{
  appId: 730,

  previous: {
    rank: 2,
    players: 1180000
  },

  current: {
    rank: 1,
    players: 1245821
  },

  playerDiff: 65821,
  playerChangeRate: 5.58,

  rankDiff: 1,

  status: "rising"
}
```

게임명보다 `appId`를 비교 기준으로 사용한다.

---

# 6. 가장 중요한 개선 1 — TODAY'S BIGGEST RISER

가장 우선적으로 추가한다.

오늘 가장 플레이어 증가량 또는 증가율이 큰 게임을 찾는다.

예:

```text
TODAY'S BIGGEST RISER

HELLDIVERS 2

Yesterday
83,421

Today
146,821

▲ +63,400 PLAYERS
▲ +76.0%

Rank
#24 → #11
```

---

# 7. Riser 계산 기준

두 가지 지표가 있다.

## Absolute Growth

```text
currentPlayers - previousPlayers
```

예:

```text
1,000,000 → 1,100,000

+100,000 players
```

---

## Percentage Growth

```text
(current - previous) / previous × 100
```

예:

```text
10,000 → 30,000

+200%
```

---

# 8. 추천 방식

메인 `Biggest Riser`는 플레이어 **절대 증가량**을 기본으로 하는 것을 추천한다.

이유:

작은 게임이:

```text
100 → 1,000

+900%
```

되는 경우 퍼센트만 보면 과도하게 강조될 수 있다.

따라서:

```text
PRIMARY
Absolute Player Increase

SECONDARY
Percentage Increase
```

형태가 좋다.

---

# 9. 개선 2 — BIGGEST DROP

반대 데이터도 보여준다.

```text
BIGGEST DROP

GAME NAME

Yesterday
201,482

Today
126,341

▼ -75,141 PLAYERS
▼ -37.3%

Rank
#8 → #19
```

---

# 10. 개선 3 — RANK MOVEMENT

현재 Top 75 순위에 전일 대비 변화를 붙인다.

현재:

```text
01 CS2
02 Dota 2
03 PUBG
```

개선:

```text
01 CS2              ▲1
02 Dota 2           ▼1
03 PUBG             ─
04 Game A           ▲7
05 Game B           ▼3
```

추천 표시:

```text
▲ 7
▼ 3
─
NEW
```

---

# 11. Rank Diff 계산

전일:

```text
#18
```

오늘:

```text
#11
```

이면:

```text
rank movement = +7
```

즉 숫자가 작아지는 것이 상승이다.

계산:

```text
previousRank - currentRank
```

---

# 12. 개선 4 — NEW ENTRY

전일 Top 75에 없었지만 오늘 Top 75에 들어온 게임을 탐지한다.

```text
NEW ENTRY

#67

GAME NAME

83,421 PLAYERS

Entered the Top 75 today
```

판정:

```js
previousGame === undefined
&& currentGame !== undefined
```

이면:

```text
NEW ENTRY
```

---

# 13. OUT OF RANKING

반대로 어제 있었지만 오늘 Top 75에서 사라진 게임도 탐지할 수 있다.

```text
DROPPED OUT

GAME NAME

Yesterday
#72

Today
Outside Top 75
```

이 기능은 시간이 남을 경우 추가한다.

---

# 14. 개선 5 — TODAY'S MOVEMENT

첫 화면에 다음 3개를 한 그룹으로 묶는 것을 추천한다.

```text
TODAY'S MOVEMENT

🔥 BIGGEST RISER
Game A
+63,400

❄ BIGGEST DROP
Game B
-51,821

🚀 BIGGEST RANK CLIMB
Game C
▲ 12 ranks
```

이 영역이 현재 순위보다 더 중요한 STEAM PULSE의 차별화 영역이 된다.

---

# 15. 개선 6 — COMEBACK RADAR

시간이 충분하면 구현 가치가 매우 높은 기능.

오래된 게임이 갑자기 플레이어 수와 순위가 크게 상승하는 경우 표시한다.

예:

```text
COMEBACK RADAR

NO MAN'S SKY

Released
2016

Yesterday
42,821

Today
91,205

▲ +48,384
▲ +113%

Rank
#41 → #18
```

---

# 16. Comeback 기본 조건 예시

예:

```text
releaseAge >= 3 years
AND
playerChangeRate >= 30%
AND
rankMovement >= 5
```

단 이 기준은 Steam의 공식 기준이 아니다.

따라서 반드시:

> STEAM PULSE 자체 분석 기준

이라고 표시한다.

---

# 17. 개선 7 — GENRE LEADERS

장르별 확장을 할 경우 단순 Filter보다 먼저 이 기능을 추천한다.

예:

```text
KING OF GENRE

FPS
👑 Counter-Strike 2
1.24M

MOBA
👑 Dota 2
823K

SURVIVAL
👑 Rust
142K

RPG
👑 Game X
120K
```

---

# 18. Genre Leader 계산

각 게임에 장르 정보가 있다면:

```js
genreMap = {
  FPS: [...games],
  RPG: [...games],
  Survival: [...games]
}
```

그리고:

```text
각 장르에서 players가 가장 높은 게임
```

을 선택한다.

---

# 19. 장르 데이터 주의

Steam 게임은 한 게임에 여러 Tag/Genre가 붙는다.

예:

```text
Counter-Strike 2

FPS
Shooter
Action
Multiplayer
Competitive
```

따라서 장르 분류 규칙을 정해야 한다.

추천:

```text
Primary Genre 1개
```

또는 제한된 카테고리:

```text
FPS
MOBA
RPG
Survival
Strategy
Simulation
Sports
Casual
```

중 하나로 Normalize한다.

장르 출처가 불확실하면 구현하지 않는다.

---

# 20. 개선 8 — GENRE PULSE

Genre Leader까지 안정적으로 구현된 뒤 추가한다.

예:

```text
GENRE PULSE

FPS

Tracked Players
1.82M

Yesterday
1.69M

▲ +130K
▲ +7.7%
```

계산:

```text
해당 장르의 추적 Top 75 게임 player 합계
```

---

# 21. 중요한 표시 문구

절대로:

> Steam 전체 FPS 플레이어

라고 표현하지 않는다.

정확히:

> **Tracked FPS Players within STEAM PULSE Top 75**

또는:

> **Player total among tracked Top 75 games**

라고 표시한다.

---

# 22. 개선 9 — FASTEST GROWING GENRE

Genre Pulse가 존재하면 만들 수 있다.

```text
FASTEST GROWING GENRE

SURVIVAL

Yesterday
382K

Today
461K

▲ +20.7%
```

이 기능은 정보판 가치가 높다.

---

# 23. 개선 10 — PLAYER SHARE

현재 수집하는 Top 75 전체 players 합계를 기준으로 각 게임의 비율을 보여준다.

예:

```text
PLAYER SHARE
among tracked Top 75

CS2
18.4%

Dota 2
12.1%

PUBG
7.3%
```

계산:

```text
game.players /
SUM(top75.players)
```

---

# 24. 분모 표시 필수

반드시:

```text
Share among tracked Top 75 games
```

라고 명시한다.

절대로:

```text
Steam 전체 점유율
```

이라고 표현하지 않는다.

---

# 25. 첫 화면 개선

현재 첫 화면에서 단순 순위가 가장 크게 보인다면 구조를 다음처럼 조정한다.

```text
STEAM PULSE

WHAT IS THE WORLD PLAYING?
AND WHAT CHANGED SINCE YESTERDAY?

────────────────────────

MOST PLAYED

#1
COUNTER-STRIKE 2

1,245,821
PLAYERS

▲ +65,821
+5.6%

────────────────────────

TODAY'S MOVEMENT

🔥 Biggest Riser
Game A

❄ Biggest Drop
Game B

🚀 Rank Climber
Game C
```

첫 화면만 보고도 프로젝트 차별점이 보여야 한다.

---

# 26. 데이터 기준 시각 강조

매우 중요하다.

예:

```text
DATA SNAPSHOT

28 AUG 2026

10:10 KST
Asia/Seoul
```

또는:

```text
Observed
2026.08.28 10:10 KST
```

모든 비교 데이터는 동일한 기준시각으로 수집해야 한다.

---

# 27. 동일 시간대 비교

가능한 경우:

```text
Yesterday 10:10 KST

vs

Today 10:10 KST
```

로 비교한다.

이유:

Steam 동접자는 시간대에 따른 변동이 크기 때문이다.

```text
03:00 vs 20:00
```

를 비교하면 날짜 변화가 아니라 시간대 영향이 섞인다.

---

# 28. T04 과제와 직접 연결되는 부분

## 카드 1

첫 화면에:

```text
현재값
단위
Source
Observed At
```

를 보여준다.

---

## 카드 2

Source 링크:

```text
SOURCE ↗
```

클릭 시 실제 원자료 페이지.

Secret:

```text
0
```

이어야 한다.

---

## 카드 3

다음 5종 장애 UI 유지.

```text
TIMEOUT
AUTH FAILURE
RATE LIMIT
OFFLINE
SCHEMA CHANGED
```

---

# 29. 장애 상태 개선

정상 순위 화면보다 장애 화면도 프로젝트 컨셉에 맞게 설계한다.

예:

```text
STEAM PULSE

⚠ DATA LINK LOST

STALE DATA

Last Verified

Counter-Strike 2

1,245,821 PLAYERS

Observed
28 AUG · 10:10 KST

Reason
SOURCE TIMEOUT
```

---

# 30. stale 상태에서 중요

이전 데이터를 현재 데이터처럼 표시하지 않는다.

반드시:

```text
STALE DATA
LAST VERIFIED
```

표시.

---

# 31. 정상 데이터가 한 번도 없을 때

```text
DATA UNAVAILABLE

No verified Steam snapshot
is available yet.
```

절대로:

```text
0 players
```

로 표시하지 않는다.

---

# 32. 카드 4 — 하루 하나

날짜별 데이터 중복 방지를 실제로 검증한다.

예:

```text
2026-08-28
```

snapshot이 이미 존재하면:

```text
SKIP
```

한다.

---

# 33. 카드 5 — 비교

최소한 화면에서 다음 값이 확인되어야 한다.

```text
Yesterday

1,180,000

Today

1,245,821

Difference

+65,821 PLAYERS

Direction

▲

Percentage

+5.6%
```

---

# 34. Evidence / Verification Panel 추천

심사를 위해 별도 검증 패널을 만들면 좋다.

예:

```text
DATA PROOF

RAW SOURCE
1,245,821

STORED
1,245,821

PREVIOUS
1,180,000

CALCULATED
+65,821

DISPLAY
+65,821 players
```

이를 Collapse 가능한 `DATA PROOF` 영역으로 넣는다.

---

# 35. 기능 우선순위

## P0 — 과제 필수

반드시 먼저 완료.

```text
Daily Snapshot
Yesterday Comparison
Difference
Direction
Unit
Source
Observed Time
Failure 5 states
Stale Data
Duplicate Prevention
```

---

# 36. P1 — 가치 개선

P0 완료 직후 구현 추천.

```text
Biggest Riser
Biggest Drop
Rank Movement
New Entry
```

이 네 개가 가장 중요하다.

---

# 37. P2 — 서비스 확장

시간이 충분할 때.

```text
Genre Leader
Genre Pulse
Comeback Radar
Biggest Rank Climber
```

---

# 38. P3 — 후순위

지금은 구현하지 않아도 됨.

```text
게임 검색
게임 상세 페이지
가격 정보
리뷰 분석
게임 추천
로그인
Favorites
유저 개인화
커뮤니티
```

T04 프로젝트 정체성을 흐릴 가능성이 있다.

---

# 39. 가장 중요한 원칙

기능 개수보다:

> **"왜 이 사이트를 Steam 대신 볼까?"**

에 답해야 한다.

답:

> Steam은 현재 순위를 잘 보여준다.

> STEAM PULSE는 **어제와 오늘을 비교하여 변화 자체를 보여준다.**

---

# 40. 사이트 가치의 핵심

현재:

```text
DATA
→ DISPLAY
```

개선:

```text
DATA
→ STORAGE
→ COMPARISON
→ ANALYSIS
→ INSIGHT
→ DISPLAY
```

---

# 41. 포트폴리오 설명 개선

기존 표현:

> Steam 게임 데이터를 API로 가져와 순위를 표시했습니다.

추천 표현:

> 매일 동일 시점의 Steam 게임 데이터를 스냅샷으로 저장하고, 전일 데이터와 비교하여 플레이어 증감, 순위 변화, 신규 진입, 급상승 및 급락 게임을 자동으로 탐지하는 Daily Gaming Trend Board를 구현했습니다.

추가:

> 외부 데이터 수집 실패 시 이전 정상 데이터를 현재 데이터처럼 보여주지 않고 stale 상태로 전환하도록 설계했습니다.

---

# 42. 사용자 재방문 이유

사이트가 다음 질문에 매일 답할 수 있어야 한다.

```text
오늘 1위는 누구지?

오늘 갑자기 뜬 게임은?

오늘 가장 크게 떨어진 게임은?

새로 순위에 들어온 게임은?

예전 게임 중 다시 뜨는 게 있나?

장르 중 뭐가 강해졌지?
```

이 질문들이 재방문성을 만든다.

---

# 43. 추천 Main Navigation

기능을 크게 늘리지 않는 범위에서:

```text
OVERVIEW

MOVEMENT

RANKING

DATA STATUS
```

정도면 충분하다.

장르 기능이 추가되면:

```text
GENRES
```

추가.

---

# 44. Overview 추천 구조

```text
Hero

↓

Most Played

↓

Today's Movement

↓

Biggest Riser

↓

Biggest Drop

↓

Top Ranking Preview

↓

Data Status
```

---

# 45. Movement Section

```text
TODAY'S MOVEMENT

[ Biggest Riser ]

[ Biggest Drop ]

[ Biggest Rank Climber ]

[ New Entry ]
```

이 영역을 현재 사이트의 대표 기능으로 만든다.

---

# 46. Ranking 개선

각 행에:

```text
Rank
Game
Players
Player Diff
Rank Movement
Status
```

표시.

예:

```text
01

Counter-Strike 2

1,245,821

▲ +65,821

▲ 1
```

---

# 47. Mobile

모바일에서는 모든 데이터를 보여주지 않는다.

예:

```text
01 CS2
1.24M
▲ +5.6%
```

세부 값은 클릭/확장.

---

# 48. Animation

애니메이션은 변화 데이터 이해에 도움되는 정도만.

추천:

```text
Number Count
Rank Arrow
Subtle Row Highlight
New Entry Fade
```

비추천:

```text
Excessive Glow
Long Page Transitions
Particles
Heavy 3D
```

---

# 49. Color 의미

상태 색상은 일관되게 사용한다.

```text
UP
Positive

DOWN
Negative

NEW
Accent

STALE
Warning

ERROR
Critical
```

단, 색깔만으로 상태를 전달하지 않는다.

항상:

```text
▲
▼
NEW
STALE
```

텍스트/아이콘 병행.

---

# 50. 내일 두 번째 데이터 이후 검증 순서

두 번째 날짜 데이터가 들어오면 다음 순서로 확인한다.

```text
1. 75개 정상 수집

2. 새로운 날짜 추가 확인

3. 이전 날짜 유지 확인

4. 중복 저장 없음 확인

5. 동일 appId 매칭 확인

6. playerDiff 계산 확인

7. percentage 계산 확인

8. rankDiff 계산 확인

9. New Entry 확인

10. Biggest Riser 확인

11. Biggest Drop 확인

12. UI 표시값과 JSON 계산값 대조
```

---

# 51. 수동 재실행 테스트

같은 날짜에 GitHub Actions를 다시 실행한다.

기대:

```text
Today's snapshot already exists.

Skipping collection.
```

데이터 개수가:

```text
75 → 150
```

으로 늘어나면 실패다.

---

# 52. 데이터 무결성

반드시 유지.

```text
appId unique

date unique

players numeric

rank numeric

observedAt exists

source exists
```

잘못된 record는 저장하지 않는다.

---

# 53. Schema Validation

수집 단계에서 최소 검증:

```js
if (
  !game.appId ||
  !game.name ||
  typeof game.players !== "number" ||
  typeof game.rank !== "number"
) {
  throw new SchemaError();
}
```

Schema 오류는 T04의:

```text
SCHEMA_CHANGED
```

상태와 연결할 수 있다.

---

# 54. 데이터 계산 분리

React 컴포넌트 안에서 모든 계산을 하지 않는다.

추천:

```text
utils/
  compareSnapshots.js
  findBiggestRiser.js
  findBiggestDrop.js
  calculateRankMovement.js
  findNewEntries.js
```

---

# 55. UI와 데이터 로직 분리

예:

```text
Data Layer

↓

Analysis Layer

↓

Presentation Layer
```

이렇게 설계한다.

포트폴리오 설명에도 좋다.

---

# 56. 추천 파일 구조

```text
src/
│
├─ components/
│  ├─ Hero
│  ├─ MostPlayedCard
│  ├─ MovementCard
│  ├─ BiggestRiser
│  ├─ BiggestDrop
│  ├─ RankingTable
│  ├─ DataStatus
│  └─ DataProof
│
├─ utils/
│  ├─ compareSnapshots.js
│  ├─ calculateChange.js
│  ├─ calculateRankMovement.js
│  ├─ findRisers.js
│  └─ findNewEntries.js
│
├─ hooks/
│
├─ data/
│
└─ pages/
```

현재 구조가 이미 안정적이면 무리하게 변경하지 않는다.

---

# 57. 가장 중요한 개선 TOP 5

현재 프로젝트에서 우선순위를 딱 정하면:

## 1.

**Yesterday vs Today**

## 2.

**Biggest Riser**

## 3.

**Biggest Drop**

## 4.

**Rank Movement / New Entry**

## 5.

**Genre Leader**

이 순서다.

---

# 58. 장르 기능 판단

장르별로 확장하는 것은 좋다.

하지만:

```text
장르 버튼 많이 추가
```

보다:

```text
각 장르의 오늘 1위
```

가 우선이다.

추천:

```text
FPS KING

CS2

1.24M Players
```

이 형태가 더 정보판답다.

---

# 59. 기능 추가를 멈춰야 하는 시점

다음이 모두 완료되면 기능 추가보다 완성도를 높인다.

```text
T04 카드 1~5 모두 충족

2개 날짜 실제 데이터

Movement 계산 정상

Failure UI 정상

Mobile 정상

Build 정상

Source 정상

Data Proof 가능
```

그 이후:

```text
Spacing
Typography
Motion
Responsive
Accessibility
```

을 다듬는다.

---

# 60. 최종 프로젝트 정의

# STEAM PULSE

## What is the world playing — and what's changing?

STEAM PULSE는 Steam 게임 순위를 단순히 보여주는 사이트가 아니다.

매일 동일 기준 시각에 Steam 게임 데이터를 저장하고,
어제와 오늘의 데이터를 비교하여:

```text
Most Played

Biggest Riser

Biggest Drop

Rank Movement

New Entry

Comeback

Genre Leader
```

등의 변화를 발견하는:

# Daily Gaming Trend Board

를 목표로 한다.

---

# 61. 최종 가치

사용자가 Steam에서 확인할 수 있는 것은:

```text
"지금 무엇이 인기 있는가?"
```

STEAM PULSE가 답해야 하는 것은:

```text
"어제 이후 무엇이 달라졌는가?"
```

이 차이가 프로젝트의 존재 이유다.

---

# 62. Claude Code 작업 지시

현재 프로젝트를 전면 재작성하지 않는다.

먼저 현재 구현 상태를 분석한다.

다음 작업 순서를 따른다.

```text
1. 현재 데이터 구조 분석

2. 전일/현재 Snapshot 비교 가능 여부 확인

3. 카드 4/5 실제 데이터 검증

4. compareSnapshots 유틸 작성

5. Biggest Riser 구현

6. Biggest Drop 구현

7. Rank Movement 구현

8. New Entry 구현

9. Overview UI에 Movement 영역 추가

10. 기존 Failure State가 깨지지 않았는지 확인

11. Responsive 검증

12. 시간이 남을 경우 Genre Leader 추가
```

---

# 63. Claude Code 작업 원칙

- 기존 정상 기능을 깨뜨리지 않는다.
- 대규모 리팩터링부터 시작하지 않는다.
- 실제 데이터가 없는 기능은 만들지 않는다.
- 가짜 변화율을 넣지 않는다.
- 데이터 계산 로직과 UI를 분리한다.
- 동일 날짜 중복 방지 로직을 보존한다.
- T04 요구사항을 최우선으로 한다.
- 부가 기능보다 실제 2일 데이터 검증이 우선이다.

---

# FINAL PRINCIPLE

> **Do not build another Steam ranking page.**

> **Build a board that explains what changed.**

STEAM PULSE의 가장 중요한 가치는:

```text
Current Data
+
Historical Snapshot
+
Comparison
+
Movement Detection
+
Honest Failure Handling
```

이다.

최종 결과물은:

> “Steam 게임 순위를 보여주는 사이트”

가 아니라,

> **“게임 생태계의 하루 변화를 자동으로 발견하는 데이터 제품”**

으로 보여야 한다.