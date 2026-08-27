# SKT ALEPH T04 · 오늘의 진짜 정보판

## 게임 / Steam 기반 주제 아이디어 정리

> Claude에게 전달하기 위한 기획 정리 문서
> 목표: **T04 과제 명세를 충족하면서 게임이라는 대중적인 소재를 활용해 포트폴리오에서도 눈에 띄는 정보판을 만든다.**

---

# 1. T04 과제 핵심 이해

T04의 주제는 **「오늘의 진짜 정보판 — 데이터가 안 올 때」**이다.

핵심은 단순히 API 데이터를 화면에 출력하는 것이 아니다.

**실제로 계속 변하는 데이터 한 가지를 선택하고 다음 흐름을 구현해야 한다.**

```text
실제 데이터 조회
        ↓
현재값 + 단위 + 출처 + 조회시각
        ↓
API/네트워크 장애 처리
        ↓
마지막 정상 데이터 보존
        ↓
하루 한 번 기록
        ↓
어제 데이터와 비교
        ↓
변화량 / 변화 방향 표시
```

과제의 주요 요구사항은 다음과 같다.

### 카드 1 — 값의 맥락

실제로 변하는 데이터 하나를 가져와 다음 정보를 한 화면에서 보여준다.

* 현재값
* 단위
* 출처
* 마지막 조회 시각

### 카드 2 — 비밀키와 호출 경로

* API Key 등 비밀값이 브라우저에 노출되지 않아야 한다.
* 배포 파일에도 비밀값이 없어야 한다.
* Git 기록에도 비밀값을 남기지 않는다.
* 사용한 원자료의 출처를 사용자가 직접 열 수 있어야 한다.

### 카드 3 — 실패 상태

다음 5가지 장애를 서로 구분해야 한다.

1. Timeout
2. 인증 실패
3. 호출 제한
4. Offline
5. 응답 형식 변경

장애 발생 시 무조건 데이터를 없애는 것이 아니라 **마지막 정상값을 보존하면서 오래된 데이터임을 명확하게 표시한다.**

### 카드 4 — 하루 한 번 기록

* 기준 시간대 명시
* 날짜별 데이터 1개 저장
* 같은 날짜 중복 저장 방지
* 서로 다른 실제 날짜 기록 2개 확보

### 카드 5 — 어제와 비교

오늘과 어제 데이터를 비교하여 다음을 표시한다.

```text
차이
변화 방향
단위
```

---

# 2. 전체 방향

이번 T04는 게임을 직접 만드는 과제가 아니라,

> **게임과 관련된 실제 데이터를 이용해 정보 서비스를 만드는 방향**

으로 접근한다.

특히 Steam처럼 세계적으로 사용자가 많은 플랫폼의 데이터를 이용하면 대중성과 시각적인 재미를 동시에 확보할 수 있다.

단순한 API 실습 화면이 아니라,

> **"오늘 게임 세계에서는 무슨 일이 벌어지고 있는가?"**

를 알려주는 서비스처럼 보이게 만드는 것이 목표다.

---

# 3. 후보 아이디어

| 순위 | 아이디어                       | 핵심 데이터     | 어제와 비교             |
| -- | -------------------------- | ---------- | ------------------ |
| 1  | **Steam Pulse**            | 게임 동시접속자   | ▲ +12,430명 / +4.2% |
| 2  | **Steam Top Game Tracker** | 인기 게임 순위   | #3 → #1            |
| 3  | **Game Price Watch**       | 가격 / 할인율   | ₩66,000 → ₩33,000  |
| 4  | **Dead or Alive?**         | 오래된 게임 동접자 | 842 → 1,104명       |
| 5  | **Indie Radar**            | 인디게임 동접자   | ▲ 38%              |
| 6  | **Game Server Watch**      | 서버 상태/지연시간 | ONLINE / 32ms      |

---

# 4. 1순위 — Steam Pulse

## 컨셉

### **STEAM PULSE**

### What's everyone playing right now?

Steam 게임의 현재 플레이어 데이터를 이용해 **"지금 사람들이 어떤 게임을 플레이하고 있는가?"**를 보여주는 정보판이다.

단순한 Steam 통계 사이트가 아니라,

> **게임 시장의 실시간 체온계**

라는 컨셉으로 접근한다.

---

# 5. Steam Pulse 메인 화면 예시

```text
STEAM PULSE

What's everyone playing right now?


🔥 Counter-Strike 2

1,284,392
PLAYERS ONLINE


▲ 84,291

+7.02% vs Yesterday


STATUS
● LIVE


Last checked
09:14 KST

Source
Steam
```

사용자가 사이트에 들어온 순간 가장 중요한 정보를 바로 이해할 수 있도록 한다.

---

# 6. Yesterday 비교

오늘 데이터만 보여주지 않는다.

```text
TODAY

1,284,392 Players


YESTERDAY

1,200,101 Players


CHANGE

▲ +84,291 Players
▲ +7.02%
```

또는 시각적으로

```text
Yesterday        Today

1.20M    ─────▶   1.28M
               ▲ 7.02%
```

형태로 표현한다.

---

# 7. 데이터 기록

기준 시간대는 예를 들어 다음과 같이 명시한다.

```text
Timezone
Asia/Seoul (KST)
```

날짜별 기록:

```text
PLAYER HISTORY

2026.08.27
1,284,392

2026.08.26
1,200,101
```

같은 날짜에 여러 번 데이터를 조회해도 하루 기록은 하나만 유지한다.

---

# 8. 장애 상태를 디자인 요소로 활용

T04에서 특히 중요한 부분이다.

과제에서 요구하는 오류 처리를 단순한 에러 메시지가 아니라 **게임 서버 모니터링 화면처럼 표현한다.**

정상 상태:

```text
● LIVE

Fresh data
Updated 09:14 KST
```

오류 발생:

```text
⚠ CONNECTION LOST

LIVE DATA UNAVAILABLE


LAST KNOWN POPULATION

1,284,392 PLAYERS


Data from 08:52 KST

STALE DATA


[ RETRY CONNECTION ]
```

이렇게 하면 사용자는 현재 숫자가 실시간 데이터가 아니라 **마지막 정상 데이터**라는 사실을 바로 알 수 있다.

---

# 9. 장애 5종 표현

각 장애를 동일한 `ERROR`로 처리하지 않는다.

### Timeout

```text
REQUEST TIMEOUT

Steam did not respond in time.
```

### 인증 실패

```text
AUTHENTICATION FAILED

Data provider rejected the request.
```

### 호출 제한

```text
RATE LIMIT REACHED

Too many requests.
Please try again later.
```

### Offline

```text
YOU'RE OFFLINE

Check your internet connection.
```

### 응답 형식 변경

```text
DATA FORMAT CHANGED

Unexpected response received.
```

모든 경우 가능하면 마지막 정상값을 유지한다.

```text
LAST KNOWN DATA

1,284,392 PLAYERS

STALE
08:52 KST
```

---

# 10. 2순위 — Steam Top Game Tracker

## 컨셉

> **"오늘 Steam 왕좌의 주인은 누구인가?"**

Steam의 인기 게임 데이터를 게임 차트처럼 표현한다.

예:

```text
STEAM TOP

TODAY'S #1


👑 Counter-Strike 2

1,312,442
PLAYERS


TODAY
#1

YESTERDAY
#2


▲ 1 RANK
▲ 111,000 PLAYERS
```

Steam UI를 그대로 복제하기보다는

* Billboard Chart
* eSports 방송
* 게임 랭킹
* 스포츠 순위표

같은 디자인을 참고한다.

---

# 11. 3순위 — Dead or Alive?

조금 더 독창적인 후보.

## 컨셉

### **IS THIS GAME STILL ALIVE?**

> "10년 전 인기 게임, 2026년에도 사람들이 플레이하고 있을까?"

오래된 유명 게임 하나를 선정하여 현재 플레이어 수를 추적한다.

예:

```text
IS THIS GAME
STILL ALIVE?


8,421

PLAYERS ONLINE


▲ 17.4%
vs Yesterday


🔥 VERY ALIVE
```

---

# 12. 게임 생존 판정

동접자 데이터를 이용해 재미있는 상태를 추가할 수 있다.

```text
🔥 VERY ALIVE

🟢 ALIVE

🟡 SURVIVING

💀 NEARLY DEAD
```

예:

```text
LEFT 4 DEAD 2

CURRENT PLAYERS
34,821

YESTERDAY
31,240

▲ +3,581
▲ +11.46%


STATUS

🔥 VERY ALIVE
```

단순 API 대시보드보다 서비스 자체의 캐릭터가 강해지는 장점이 있다.

---

# 13. 4순위 — Game Price Watch

특정 인기 게임의 가격이나 할인 정보를 추적한다.

예:

```text
GAME PRICE WATCH


Cyberpunk 2077


TODAY

₩33,000


YESTERDAY

₩66,000


▼ ₩33,000

-50%
```

장점은 데이터 변화가 사용자에게 매우 직관적이라는 것이다.

단점은 가격이 매일 바뀌지 않을 수 있기 때문에 **실제 날짜 2건의 변화 비교가 재미없을 가능성**이 있다.

따라서 T04에서는 동시접속자 데이터가 더 적합할 가능성이 높다.

---

# 14. 5순위 — Indie Radar

잘 알려지지 않은 게임 가운데 갑자기 플레이어가 증가하고 있는 게임을 보여준다.

```text
INDIE RADAR


🚀 RISING TODAY


GAME NAME

12,842 PLAYERS


Yesterday
8,941


▲ 43.6%
```

컨셉은 흥미롭지만 여러 게임을 분석해야 한다면 구현 범위가 커질 수 있다.

T04는 데이터 하나를 제대로 검증하는 것이 중요하므로 확장 기능으로 고려한다.

---

# 15. Steam Pulse를 추천하는 이유

## ① 실제로 계속 변한다

동시접속자는 계속 변화하기 때문에 T04의 핵심인 **"실제로 변하는 데이터"**에 매우 잘 맞는다.

## ② 단위가 명확하다

```text
Players
```

라는 명확한 단위를 사용할 수 있다.

## ③ Yesterday 비교가 자연스럽다

```text
Yesterday
1,200,101

Today
1,284,392

▲ +84,291
▲ +7.02%
```

## ④ 하루 한 번 기록하기 좋다

```text
날짜 + 게임 ID
```

등을 기준으로 중복을 방지할 수 있다.

## ⑤ 장애 처리와 UI가 잘 어울린다

```text
LIVE
CONNECTION LOST
STALE DATA
RECONNECT
```

등을 게임 서버 상태 화면처럼 디자인할 수 있다.

## ⑥ 대중성이 있다

날씨·환율 같은 전형적인 API 정보판보다 게임이라는 소재 자체가 포트폴리오에서 눈에 띌 가능성이 있다.

---

# 16. 프로젝트를 단순 Steam 통계판으로 만들지 않는다

중요한 원칙이다.

❌ 이런 프로젝트는 피한다.

```text
Steam API Dashboard

현재 사용자: 1,284,392
어제 사용자: 1,200,101
변화량: 84,291
```

기능은 충족하지만 흔한 API 실습처럼 보인다.

대신:

```text
STEAM PULSE

THE HEARTBEAT
OF PC GAMING
```

처럼 하나의 서비스 브랜드로 만든다.

---

# 17. 디자인 방향

Steam 화면을 그대로 복제하지 않는다.

추천 방향:

```text
Steam
+
Bloomberg Terminal
+
eSports Broadcast
+
Spotify Charts
```

전체적으로 **실시간 데이터 터미널 + 게임 문화** 느낌을 만든다.

화면에서 강조할 것은 숫자다.

```text
1,284,392

PLAYERS ONLINE
```

그리고 변화량을 두 번째 핵심 정보로 둔다.

```text
▲ 84,291
+7.02%
```

---

# 18. 페이지 구조 예시

```text
┌───────────────────────────────────────┐
│ STEAM PULSE                 ● LIVE   │
│                                       │
│ What's everyone playing right now?   │
├───────────────────────────────────────┤
│                                       │
│ Counter-Strike 2                      │
│                                       │
│          1,284,392                    │
│          PLAYERS ONLINE               │
│                                       │
│          ▲ 7.02%                      │
│          vs Yesterday                 │
│                                       │
├───────────────────────────────────────┤
│ TODAY                YESTERDAY        │
│ 1,284,392            1,200,101        │
│                                       │
│ CHANGE                                │
│ ▲ +84,291 Players                     │
├───────────────────────────────────────┤
│ PLAYER HISTORY                        │
│                                       │
│ Aug 27     1,284,392                  │
│ Aug 26     1,200,101                  │
├───────────────────────────────────────┤
│ Source · Steam                        │
│ Last checked · 09:14 KST             │
│ Timezone · Asia/Seoul                 │
└───────────────────────────────────────┘
```

---

# 19. 구현 우선순위

Claude/Codex가 처음부터 기능을 과도하게 확장하지 않도록 한다.

### Phase 1 — 과제 핵심

```text
실제 데이터 가져오기
↓
현재값 표시
↓
단위 표시
↓
출처 표시
↓
조회 시각 표시
```

### Phase 2 — 기록

```text
날짜별 저장
↓
같은 날짜 중복 방지
↓
2일 기록 확보
```

### Phase 3 — 비교

```text
오늘
vs
어제

↓

차이
변화율
증가/감소
```

### Phase 4 — 장애 처리

```text
Timeout
Authentication
Rate Limit
Offline
Schema Change
```

### Phase 5 — 디자인

마지막에 Steam Pulse의 브랜드와 인터랙션을 적용한다.

---

# 20. 반드시 확인해야 할 기술 조사

본격적인 구현 전에 **실제로 사용할 데이터 출처부터 검증한다.**

Claude는 다음을 먼저 조사해야 한다.

1. Steam 또는 관련 공식/공개 출처에서 현재 플레이어 데이터를 안정적으로 가져올 수 있는가?
2. 데이터의 공식적인 단위는 무엇인가?
3. 데이터 갱신 주기는 어느 정도인가?
4. 브라우저에서 직접 호출할 수 있는가?
5. CORS 문제가 있는가?
6. API Key가 필요한가?
7. API Key 없이 사용할 수 있는 공식/공개 출처가 있는가?
8. GitHub Pages 같은 정적 배포 환경에서도 사용할 수 있는가?
9. 출처 원문을 사용자가 직접 열 수 있는가?
10. 이용 조건상 공개 프로젝트에서 사용할 수 있는가?

**데이터 출처가 불안정하다면 디자인/개발을 시작하기 전에 다른 게임 데이터 출처로 변경한다.**

---

# 21. 현재 우선순위

```text
1위
Steam Pulse
"오늘 게이머들은 어디에 몰려 있는가?"

↓

2위
Steam Top Game Tracker
"오늘 Steam 왕좌의 주인은?"

↓

3위
Dead or Alive?
"이 오래된 게임은 아직 살아 있는가?"

↓

4위
Game Price Watch

↓

5위
Indie Radar
```

---

# 22. Claude에게 요청

현재 가장 유력한 방향은 **Steam Pulse**다.

하지만 바로 구현하지 말고 먼저 다음을 수행한다.

### STEP 1

T04 원본 명세를 기준으로 Steam Pulse가 카드 1~5를 전부 충족하는지 검토한다.

### STEP 2

실제로 사용할 수 있는 Steam/게임 데이터 출처를 조사한다.

특히 다음을 확인한다.

```text
공식성
무료 여부
API Key 여부
CORS
호출 제한
갱신 주기
원자료 URL
GitHub Pages 배포 가능성
```

### STEP 3

Steam Pulse / Steam Top Game Tracker / Dead or Alive?를 비교한다.

평가 기준:

```text
T04 명세 적합성
데이터 안정성
구현 난이도
6~7시간 내 구현 가능성
디자인 차별성
포트폴리오 가치
실제 사용자 재미
```

### STEP 4

가장 적합한 주제를 하나 추천하고 그 이유를 설명한다.

### STEP 5

주제가 결정되면 그때부터

```text
데이터 구조
→
API 구조
→
저장 구조
→
장애 처리
→
UI/UX
→
배포
→
검증
```

순서로 구현 계획을 작성한다.

---

# 최종 방향

이번 T04에서 목표로 하는 것은 단순히

> **"Steam API를 사용해봤다."**

가 아니다.

최종 결과물은

> **"실시간 게임 데이터를 신뢰할 수 있게 수집하고, 장애 상황에서도 마지막 정상 데이터를 관리하며, 날짜별 기록을 통해 변화를 설명하는 작은 데이터 서비스"**

가 되어야 한다.

그리고 그 서비스를 사용자가 한눈에 이해할 수 있도록

# **STEAM PULSE**

### **The heartbeat of PC gaming.**

이라는 하나의 제품처럼 완성하는 것을 우선 방향으로 검토한다.
