# SKT ALEPH T04 · GAME PULSE
## 게임 세계의 오늘을 보여주는 데이터 인텔리전스 보드

> **Claude 전달용 기획 문서**
>
> 현재 단계에서는 바로 구현하지 말고, 이 문서를 바탕으로 **데이터 출처·과제 적합성·구현 가능성을 먼저 검증한 뒤 개발 계획을 수립한다.**

---

# 1. 프로젝트 한 줄 정의

## GAME PULSE

> **What's happening in gaming today?**  
> 오늘 게임 세계에서 일어나고 있는 변화를 한눈에 보여주는 데이터 정보판.

단순히 Steam API의 숫자를 출력하는 대시보드를 만들지 않는다.

게임의 실제 데이터를 수집하고 이를 분석하여 사용자에게

- 지금 가장 강한 게임
- 갑자기 뜨는 게임
- 빠르게 식고 있는 게임
- 다시 살아나는 과거의 게임
- 지금 구매할 가치가 있는 게임
- 무료로 받을 수 있는 게임
- 오늘 주목할 e스포츠

등을 하나의 **Gaming Intelligence Dashboard**에서 보여주는 것을 장기적인 목표로 한다.

---

# 2. T04 과제와의 관계

원본 T04의 핵심은 **실제로 변하는 데이터 한 가지**를 선택하여 신뢰할 수 있는 정보판을 만드는 것이다.

필수적으로 고려해야 할 사항:

```text
실제 데이터 조회
        ↓
현재값
단위
출처
조회 시각
        ↓
장애 상태 구분
        ↓
마지막 정상값 보존
        ↓
하루 한 번 기록
        ↓
어제와 오늘 비교
        ↓
차이 + 방향 + 단위 표시
```

따라서 GAME PULSE 전체 비전을 한 번에 구현하려고 하지 않는다.

**서비스의 장기 비전과 T04 MVP 범위를 명확히 분리한다.**

---

# 3. GAME PULSE 전체 서비스 비전

GAME PULSE는 다음 8개의 주요 영역으로 확장할 수 있다.

```text
GAME PULSE

👑 KING OF TODAY
🔥 HYPE METER

🚀 COMEBACK RADAR
📉 FALLING GAME

💀 GAME GRAVEYARD

💰 WORTH THE WAIT?
🎁 FREE GAME RADAR

🏆 ESPORTS PULSE
```

이들은 서로 다른 서비스가 아니다.

모든 기능은 하나의 질문으로 연결된다.

> ## "오늘 게임 세계에서는 무슨 일이 벌어지고 있는가?"

---

# 4. 👑 KING OF TODAY

## 질문

> **오늘 가장 강한 게임은 무엇인가?**

현재 가장 높은 플레이어 활동을 기록하고 있는 게임을 대표 카드로 보여준다.

예시:

```text
👑 KING OF TODAY

COUNTER-STRIKE 2

1,284,392
PLAYERS ONLINE

#1 TODAY

LONG LIVE THE KING.
```

GAME PULSE의 Hero 영역으로 사용한다.

사용자가 사이트에 접속했을 때 가장 먼저 보게 되는 정보다.

---

# 5. 🔥 HYPE METER

## 질문

> **이 게임은 지금 얼마나 뜨거운가?**

단순한 플레이어 수 대신 전일 대비 변화 등을 사람이 쉽게 이해할 수 있는 상태로 변환한다.

예:

```text
HYPE METER

PALWORLD

████████████████░░

84 / 100

▲ 28.4%
vs Yesterday

🔥 HOT
```

상태 예시:

```text
90 ~ 100
🚀 EXPLODING

70 ~ 89
🔥 HOT

40 ~ 69
😐 STABLE

20 ~ 39
🥶 COOLING

0 ~ 19
💀 DEAD
```

중요:

HYPE 점수는 원자료가 아니다.

GAME PULSE가 계산한 파생 지표라면 반드시

```text
GAME PULSE HYPE SCORE
Calculated from daily activity change.
```

등으로 계산된 지표임을 사용자에게 알려야 한다.

---

# 6. 🚀 COMEBACK RADAR

## 질문

> **어제보다 갑자기 사람들이 몰리고 있는 게임은 무엇인가?**

단순히 현재 1위 게임을 찾는 것이 아니다.

**변화가 발생하고 있는 게임을 발견한다.**

예:

```text
🚀 COMEBACK RADAR

PLAYER SURGE DETECTED


NO MAN'S SKY


TODAY
42,812

YESTERDAY
29,441


▲ +13,371 PLAYERS
▲ +45.4%


COMEBACK DETECTED
```

T04의 핵심인 **어제와 오늘 비교**를 서비스 기능 자체로 활용할 수 있다.

---

# 7. 📉 FALLING GAME

## 질문

> **오늘 가장 빠르게 식고 있는 게임은 무엇인가?**

Comeback Radar의 반대 개념.

예:

```text
📉 FALLING

GAME TITLE


YESTERDAY
82,194

TODAY
51,204


▼ -30,990 PLAYERS
▼ -37.7%


🥶 COOLING FAST
```

두 영역은 나란히 배치한다.

```text
┌──────────────────┐ ┌──────────────────┐
│ 🚀 RISING        │ │ 📉 FALLING       │
│                  │ │                  │
│ +45.4%           │ │ -37.7%           │
│                  │ │                  │
│ COMEBACK         │ │ COOLING FAST     │
└──────────────────┘ └──────────────────┘
```

이를 통해 GAME PULSE가 단순 순위 사이트가 아니라 **변화를 발견하는 사이트**라는 인상을 준다.

---

# 8. 💀 GAME GRAVEYARD

## 질문

> **한때 유명했던 게임은 지금도 살아 있는가?**

GAME PULSE에서 가장 강한 개성을 담당할 수 있는 영역.

과거 인기 게임을 선택하여 현재 플레이어 활동을 보여준다.

예:

```text
GAME GRAVEYARD


        R.I.P ?

LEFT 4 DEAD 2

2009 — ?


34,821

SURVIVORS


▲ 11.4%

🔥 STILL ALIVE
```

플레이어가 다시 증가한다면:

```text
💀
↓
🧟

THE DEAD HAVE RISEN.

▲ 41.2%
```

같은 연출도 가능하다.

상태 예:

```text
🔥 STILL ALIVE

🟢 ALIVE

🟡 SURVIVING

⚠ FADING

💀 NEARLY DEAD
```

단, 이러한 판정은 실제 원자료가 아니라 GAME PULSE의 자체 분류임을 명확하게 표시한다.

---

# 9. 💰 WORTH THE WAIT?

## 질문

> **이 게임, 지금 살까? 조금 더 기다릴까?**

게임 가격과 할인 데이터를 이용하는 확장 기능.

예:

```text
💰 WORTH THE WAIT?

CYBERPUNK 2077


₩66,000
     ↓
₩33,000


-50%


💰 GOOD TIME TO BUY
```

단순히 가격만 보여주는 것이 아니라 사용자가 바로 이해할 수 있도록 정보를 제공한다.

장기적으로는

```text
BUY NOW

GOOD DEAL

NORMAL PRICE

WAIT

HISTORICAL LOW
```

같은 상태를 고려할 수 있다.

---

# 10. 🎁 FREE GAME RADAR

## 질문

> **오늘 놓치면 아까운 무료 게임이 있는가?**

사용자가 GAME PULSE에 실제로 다시 방문할 이유를 만들어주는 기능.

예:

```text
🎁 FREE GAME RADAR


FREE NOW


GAME TITLE


₩32,000
    ↓
FREE


ENDS IN

02D 14H


[ CLAIM NOW ]
```

Steam뿐 아니라 향후 다양한 공식 게임 플랫폼을 검토할 수 있다.

단, 데이터 출처와 이용 조건은 구현 전에 반드시 검증한다.

---

# 11. 🏆 ESPORTS PULSE

## 질문

> **오늘 e스포츠에서 무엇을 봐야 하는가?**

예:

```text
🏆 ESPORTS PULSE


MATCH OF THE DAY


T1

VS

GEN.G


20:00 KST


🔥 DON'T MISS IT
```

장기적으로

- 오늘 경기
- 팀 순위
- 최근 전적
- 주요 경기
- 대회 일정

등으로 확장할 수 있다.

Steam과 데이터 출처가 완전히 달라질 가능성이 높으므로 **T04 초기 MVP에는 넣지 않는 것을 우선 검토한다.**

---

# 12. 전체 사이트 구조

```text
┌─────────────────────────────────────────────┐
│                                             │
│                 GAME PULSE                  │
│                                             │
│      What's happening in gaming today?      │
│                                             │
│                                  ● LIVE     │
├─────────────────────────────────────────────┤
│                                             │
│               👑 KING OF TODAY              │
│                                             │
│              COUNTER-STRIKE 2               │
│                                             │
│                 1,284,392                   │
│              PLAYERS ONLINE                 │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│               🔥 HYPE METER                 │
│                                             │
│            ███████████████░ 84              │
│                                             │
│                   HOT                       │
│                                             │
├──────────────────────┬──────────────────────┤
│                      │                      │
│ 🚀 COMEBACK RADAR    │ 📉 FALLING GAME     │
│                      │                      │
│ +45.4%               │ -37.7%              │
│                      │                      │
│ COMEBACK DETECTED    │ COOLING FAST        │
│                      │                      │
├──────────────────────┴──────────────────────┤
│                                             │
│              💀 GAME GRAVEYARD              │
│                                             │
│             IS IT STILL ALIVE?              │
│                                             │
├──────────────────────┬──────────────────────┤
│                      │                      │
│ 💰 WORTH THE WAIT?   │ 🎁 FREE GAME RADAR  │
│                      │                      │
│ BUY / WAIT           │ FREE NOW            │
│                      │                      │
├──────────────────────┴──────────────────────┤
│                                             │
│              🏆 ESPORTS PULSE               │
│                                             │
│               MATCH OF THE DAY              │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ DATA STATUS                                 │
│                                             │
│ ● LIVE                                      │
│                                             │
│ Last Updated · 09:31 KST                    │
│ Source · ...                                │
│ Timezone · Asia/Seoul                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 13. 중요한 전략 — 8개 API 프로젝트로 만들지 않는다

가장 중요한 부분이다.

GAME PULSE의 장기적인 비전은 8개의 기능이지만 **T04에서 모든 기능을 실제 데이터로 구현하려고 하면 안 된다.**

그렇게 하면

```text
Steam 데이터
가격 데이터
무료게임 데이터
eSports 데이터
서버 데이터
...
```

처럼 데이터 출처가 지나치게 많아진다.

그러면 T04의 핵심인

- 데이터 신뢰성
- 출처 검증
- 장애 처리
- 하루 한 번 저장
- 날짜 비교

보다 API 연결 작업에 시간을 대부분 사용하게 된다.

---

# 14. T04 MVP 제안

초기 버전은 다음 네 가지에 집중한다.

```text
GAME PULSE MVP

👑 KING OF TODAY

🔥 HYPE METER

🚀 COMEBACK RADAR

📉 FALLING GAME
```

가능하다면 **동일한 종류의 실제 데이터**를 이용해 네 기능을 파생시킨다.

예:

```text
게임 플레이어 데이터
        │
        ├── 현재 가장 높은 값
        │
        └── 👑 KING OF TODAY
        │
        ├── 어제 대비 증가
        │
        └── 🚀 COMEBACK RADAR
        │
        ├── 어제 대비 감소
        │
        └── 📉 FALLING GAME
        │
        └── 변화율 기반 자체 지표
            └── 🔥 HYPE METER
```

즉,

> **API 네 개를 붙이는 것이 아니라 하나의 신뢰할 수 있는 데이터에서 네 가지 이야기를 만든다.**

---

# 15. Phase 2 확장

T04 핵심 구현과 검증이 끝난 후:

```text
💀 GAME GRAVEYARD
```

를 추가하는 것을 우선 고려한다.

이 기능은 기존 플레이어 데이터를 재활용할 가능성이 있기 때문이다.

따라서 별도의 완전히 새로운 API 없이 구현할 수 있다면 좋은 확장 기능이다.

---

# 16. Phase 3 확장

추후 별도의 데이터 출처가 검증되면:

```text
💰 WORTH THE WAIT?

🎁 FREE GAME RADAR

🏆 ESPORTS PULSE
```

를 추가한다.

이 세 기능은 GAME PULSE를 단순 Steam 데이터 사이트에서 **종합 게임 정보 서비스**로 확장하는 역할을 한다.

---

# 17. T04 장애 처리

GAME PULSE에서 장애는 숨기지 않는다.

오히려 디자인의 일부로 사용한다.

정상:

```text
● LIVE

Fresh data

Updated
09:31 KST
```

데이터 요청 실패:

```text
⚠ SIGNAL LOST


LIVE DATA
UNAVAILABLE


LAST KNOWN DATA

1,284,392 PLAYERS


Last successful update
09:12 KST


STALE DATA


[ RETRY CONNECTION ]
```

---

# 18. 오류 상태 5종

T04 명세에 따라 최소 다음 오류 상태를 구분한다.

### Timeout

```text
REQUEST TIMEOUT

The data provider
didn't respond in time.
```

### Authentication Failed

```text
AUTHENTICATION FAILED

The data provider
rejected the request.
```

### Rate Limit

```text
RATE LIMIT REACHED

Too many requests.

Try again later.
```

### Offline

```text
YOU'RE OFFLINE

Check your
internet connection.
```

### Response Format Changed

```text
DATA FORMAT CHANGED

Unexpected
response received.
```

모든 경우 마지막 정상 데이터가 존재한다면 그것을 삭제하지 않는다.

대신 반드시

```text
STALE DATA
```

라고 표시한다.

---

# 19. 데이터 신뢰성 UX

GAME PULSE의 중요한 차별점 중 하나로 만든다.

페이지 하단 또는 데이터 카드에서 사용자가 다음을 확인할 수 있어야 한다.

```text
DATA STATUS

● LIVE

CURRENT VALUE
1,284,392 Players

LAST UPDATED
09:31 KST

TIMEZONE
Asia/Seoul

SOURCE
Official / Public Data Source

STATUS
Fresh
```

데이터가 오래되었다면:

```text
STATUS

⚠ STALE

Last successful update
08:52 KST
```

로 변경한다.

---

# 20. 디자인 방향

Steam 사이트를 복제하지 않는다.

GAME PULSE는 다음 감각을 혼합한다.

```text
Gaming Culture

+

Bloomberg Terminal

+

eSports Broadcast

+

Spotify / Billboard Charts

+

Cyber Dashboard
```

하지만 과도한 사이버펑크 UI는 피한다.

가장 중요한 것은 **데이터 숫자와 변화가 즉시 읽히는 것**이다.

예:

```text
1,284,392

PLAYERS ONLINE


▲ 84,291

+7.02%
```

숫자가 화면의 주인공이어야 한다.

---

# 21. 브랜드 방향

현재 가장 유력한 이름:

# GAME PULSE

Tagline:

> **What's happening in gaming today?**

또는:

> **The heartbeat of gaming.**

대체 이름 후보:

```text
GG PULSE

GAME SIGNAL

GAMING NOW

THE GAME INDEX

PLAY//NOW

CTRL+PLAY
```

현재로서는 **GAME PULSE**를 1순위로 검토한다.

---

# 22. 프로젝트가 전달해야 할 느낌

사용자가 GAME PULSE에 접속하면

> "Steam 데이터를 가져와서 숫자를 보여주는 학생 과제"

라고 느껴서는 안 된다.

대신

> "오늘 게임판에서 무슨 일이 일어나고 있는지 빠르게 알려주는 작은 게임 데이터 서비스"

처럼 느껴져야 한다.

---

# 23. 구현 순서

## STEP 1 — 데이터 조사

아직 구현하지 않는다.

먼저 실제 사용할 데이터 출처를 검증한다.

확인 항목:

```text
공식 출처인가?

공개적으로 사용할 수 있는가?

API Key가 필요한가?

API Key 없이 가능한 방법이 있는가?

CORS 문제는 없는가?

호출 제한은?

갱신 주기는?

단위는?

조회 시각을 어떻게 정의할 것인가?

원자료 페이지를 사용자가 열 수 있는가?

GitHub Pages에서 가능한가?

이용 조건상 문제가 없는가?
```

---

## STEP 2 — T04 적합성 검증

GAME PULSE가 원본 T04 카드 1~5를 정확하게 만족하는지 검토한다.

기능을 추가하는 것보다 **통과 조건을 놓치지 않는 것을 우선한다.**

---

## STEP 3 — 데이터 모델 설계

예:

```text
Game

CurrentValue

Unit

Source

FetchedAt

Timezone

Date

PreviousValue

Difference

ChangeRate

Status
```

실제 API 구조를 확인한 후 확정한다.

---

## STEP 4 — 핵심 데이터 화면

먼저 디자인 없이

```text
현재값

단위

출처

조회시각
```

이 정확하게 표시되는지 확인한다.

---

## STEP 5 — 하루 기록

```text
2026-08-26
VALUE A

2026-08-27
VALUE B
```

같은 날짜 중복 저장을 방지한다.

---

## STEP 6 — 변화 계산

```text
Today
-

Yesterday

=

Difference
```

그리고 필요하다면 변화율을 계산한다.

---

## STEP 7 — GAME PULSE 기능으로 변환

검증된 데이터에서

```text
👑 KING OF TODAY

🔥 HYPE METER

🚀 COMEBACK RADAR

📉 FALLING GAME
```

을 파생시킨다.

---

## STEP 8 — 장애 처리

```text
Timeout

Authentication

Rate Limit

Offline

Schema Change
```

각 상태를 재현하고 복구까지 검증한다.

---

## STEP 9 — UI/UX

마지막에 GAME PULSE 브랜드와 디자인을 적용한다.

---

# 24. Claude에게 요청하는 사항

이 문서를 받은 뒤 **바로 코드를 작성하지 말 것.**

먼저 다음 순서로 검토한다.

### 1.

원본 T04 명세와 GAME PULSE 기획을 대조한다.

### 2.

GAME PULSE의 T04 MVP가 실제로 과제 요구사항을 모두 충족하는지 분석한다.

### 3.

Steam 및 게임 관련 실제 데이터 출처를 조사한다.

### 4.

특히 다음을 기술적으로 검증한다.

```text
데이터 안정성
API Key
CORS
Rate Limit
공개 배포
GitHub Pages
원자료 링크
일별 기록 가능성
어제와 비교 가능성
```

### 5.

다음 MVP가 하나의 데이터 계통으로 가능한지 검토한다.

```text
👑 KING OF TODAY
🔥 HYPE METER
🚀 COMEBACK RADAR
📉 FALLING GAME
```

### 6.

가능하다면 `GAME GRAVEYARD`까지 동일 데이터로 확장할 수 있는지 검토한다.

### 7.

`Worth the Wait?`, `Free Game Radar`, `Esports Pulse`는 별도 데이터 출처가 필요할 가능성이 있으므로 후순위로 평가한다.

### 8.

검토 결과를 다음 기준으로 보고한다.

```text
T04 적합성

실제 데이터 확보 가능성

데이터 출처 신뢰성

6~7시간 구현 가능성

배포 난이도

장애 5종 구현 난이도

디자인 차별성

포트폴리오 가치

확장 가능성

예상 위험 요소
```

---

# 25. 핵심 원칙

## 데이터가 많다고 좋은 프로젝트가 아니다.

이번 프로젝트에서 중요한 것은

> **신뢰할 수 있는 하나의 데이터를 얼마나 제대로 다루느냐**

이다.

따라서

```text
8개 기능
8개 API
8개 데이터 출처
```

를 만드는 것이 목표가 아니다.

가능하면:

```text
ONE RELIABLE DATA SOURCE

↓

MULTIPLE INSIGHTS
```

구조를 만든다.

---

# 26. 최종 프로젝트 정의

GAME PULSE는 단순한 Steam API Dashboard가 아니다.

> **실시간 게임 데이터를 수집하고, 데이터가 정상인지 사용자에게 설명하며, 마지막 정상값을 보존하고, 날짜별 기록을 통해 게임 세계의 변화를 발견해주는 Gaming Intelligence Dashboard**

를 목표로 한다.

최종적으로 사용자가 사이트에 들어왔을 때 가장 먼저 떠올라야 하는 질문은 하나다.

# GAME PULSE

## What's happening in gaming today?

그리고 GAME PULSE가 그 질문에

```text
👑 누가 지배하고 있는지

🔥 무엇이 뜨거운지

🚀 무엇이 다시 뜨는지

📉 무엇이 식고 있는지

💀 무엇이 아직 살아 있는지

💰 무엇을 살 만한지

🎁 무엇을 무료로 받을 수 있는지

🏆 오늘 무엇을 봐야 하는지
```

데이터로 답해주는 서비스를 목표로 한다.