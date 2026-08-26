# T04 나무위키 데이터 소스 조사 및 NAMU PULSE 구현 검토

> Claude Code 전달용 조사/설계 문서  
> 기준일: 2026-08-26  
> 프로젝트: SKT ALEPH T04 — **오늘의 진짜 정보판: 데이터가 안 올 때**

---

## 1. 프로젝트 목적

이번 T04 과제는 실제로 변하는 데이터 하나를 가져와 다음 내용을 증명하는 개인 정보판을 만드는 것이다.

단순히 API 값을 화면에 출력하는 것이 목적이 아니다.

핵심은 다음 데이터 흐름을 신뢰할 수 있게 만드는 것이다.

```text
외부 원자료
    ↓
데이터 수집
    ↓
응답 검증
    ↓
날짜별 저장
    ↓
계산
    ↓
어제와 비교
    ↓
React 화면 표시
```

특히 정상 상황뿐 아니라 **외부 데이터가 오지 않을 때도 올바른 상태를 보여주는 것**이 핵심이다.

---

# 2. T04 과제 통과 기준

## 카드 1 — 값의 맥락

한 화면에서 다음이 보여야 한다.

- 현재값
- 단위
- 출처
- 마지막 조회 시각

---

## 카드 2 — 비밀키와 호출 경로

- 데이터 출처 주소를 화면에 표시
- 한 번 누르면 원자료 페이지가 열려야 함
- 브라우저에 비밀값 노출 금지
- 배포 파일에 비밀값 노출 금지
- Network 요청 주소에 비밀값 노출 금지
- Git 기록에 비밀값 노출 금지

목표:

```text
SECRET COUNT = 0
```

---

## 카드 3 — 실패 상태 5종

다음 장애를 각각 재현해야 한다.

1. Timeout
2. Authentication Failure
3. Rate Limit
4. Offline
5. Response Schema Changed

각 장애는 서로 다른 UI 상태로 표현한다.

마지막 정상 데이터가 존재한다면:

```text
STALE DATA
오래된 데이터

마지막 정상값
37.5 edits/min

정상 조회
2026-08-26 12:00 KST
```

처럼 표시한다.

정상값이 한 번도 없었다면 값을 만들어내지 않는다.

```text
DATA UNAVAILABLE

표시 가능한 정상 데이터가 없습니다.
```

`0`을 정상값처럼 표시하면 안 된다.

---

# 3. 기존 데이터 후보 조사 결과

검토했던 데이터는 다음과 같다.

### USGS 지진

- API Key 없음
- CORS 가능
- 규모 `M`
- 발생 시각 존재
- GeoJSON 공식 API
- 날짜별 M4.5+ 지진 개수 계산 가능

장점은 안정적이지만 비교적 흔한 소재다.

---

### NOAA Kp

- API Key 없음
- CORS 확인
- Kp 0~9
- UTC 기준
- 약 3시간 간격
- Kp 5 이상 = NOAA G1 geomagnetic storm

과제 적합성은 매우 높지만 우주날씨 프로젝트에서 비교적 흔하다.

---

### NOAA GOES X-ray Flux

매우 좋은 후보.

예:

```text
3.7 × 10^-5 W/m²

M3.7
R1 MINOR
```

NOAA 공식 R Scale이 존재한다.

```text
R0
R1 Minor
R2 Moderate
R3 Strong
R4 Severe
R5 Extreme
```

독창성과 데이터 신뢰성이 높다.

---

### npm downloads

- API Key 없음
- 날짜별 다운로드 제공
- 날짜가 응답에 명확히 표시됨

하지만 프로젝트의 시각적/스토리텔링 측면에서는 다소 평범하다.

---

### Wikimedia Pageviews

- 공식 API
- API Key 없음
- 일별 pageviews
- 날짜별 기록 가능

기술적으로 매우 적합하지만 흔하다.

---

# 4. 나무위키 조사

나무위키를 프로젝트 데이터로 사용하는 방안을 별도로 조사했다.

처음 목표는 다음과 같았다.

```text
나무위키 문서
      ↓
일별 조회수
      ↓
어제 조회수
오늘 조회수
      ↓
증감
```

하지만 조사 결과 이 방식은 현실적으로 어렵다.

---

# 5. 나무위키 공식 API

## 판정

```text
공개 공식 API: 확인 불가
```

현재 확인할 수 있는 공개 개발자 문서가 발견되지 않았다.

다음도 발견하지 못했다.

- 공식 Developer Portal
- REST API Reference
- API Key 발급 페이지
- 공개 SDK
- 공개 인증 방식

직접 확인한 경로:

```text
https://namu.wiki/api/v1/search
→ 404

https://search.namu.wiki/api/v1/search
→ 404
```

따라서 이 경로들을 공식 API로 가정해서 구현하면 안 된다.

---

# 6. 나무위키 HTML 직접 호출 문제

문서:

```text
https://namu.wiki/w/<문서>
```

HTTP 응답 자체는 받을 수 있다.

하지만 직접 확인 결과:

```text
Access-Control-Allow-Origin 없음
```

따라서 GitHub Pages에서 실행되는 React가 다음과 같이 직접 요청하는 구조는 사용할 수 없다.

```javascript
fetch("https://namu.wiki/w/...")
```

브라우저 CORS 정책에 의해 차단된다.

---

# 7. 문서 조회수

현재 나무위키 문서 HTML을 직접 확인했지만 문서별 조회수 숫자가 발견되지 않았다.

확인된 것은 주로:

```text
최근 수정 시각
```

등이다.

따라서 다음 형태의 데이터를 공식적으로 얻을 방법은 현재 확인되지 않았다.

```text
2026-08-25
ChatGPT 문서
18,342 views
```

즉 기존의 **"나무위키 문서 조회수 정보판"은 포기하는 것이 좋다.**

---

# 8. 과거 데이터 덤프

나무위키가 과거 JSON 데이터베이스 dump를 제공했던 기록은 존재한다.

예:

```text
namuwiki_170327.json
namuwiki_20200302.json
```

비공식 GitHub 프로젝트에서도 해당 dump를 처리하는 코드가 존재한다.

하지만:

```text
2026년 현재 공식 dump 제공 여부
→ 확인 불가

현재 다운로드 URL
→ 확인 불가

현재 갱신 주기
→ 확인 불가
```

따라서 T04의 실시간/일간 데이터 소스로 사용하기 어렵다.

---

# 9. 비공식 Scraper

GitHub 등에 다음 종류의 프로젝트들이 존재한다.

```text
namu-wiki-extractor
simple-namuwiki-scraper
NamuWiki crawler
```

그러나 모두 나무위키 운영사가 제공하는 공식 SDK/API가 아니다.

따라서 반드시:

```text
UNOFFICIAL
비공식
```

으로 취급해야 한다.

---

# 10. 중요한 발견 — RecentChanges

나무위키/the seed에는 다음 공개 페이지가 존재한다.

```text
/RecentChanges
```

사용자가 직접 확인한 robots.txt에서도 `/RecentChanges`가 허용 목록에 포함되어 있다.

또 the seed 커뮤니티 문서에는 RecentChanges 관련 URL과 다음 log type들이 기록되어 있다.

```text
create
delete
move
revert
```

즉 조회수 대신 **나무위키의 편집 활동 자체를 데이터로 사용할 가능성**이 있다.

---

# 11. 중요한 발견 — sidebar.json

the seed 관련 커뮤니티 문서에는 다음 경로가 기록되어 있다.

```text
/sidebar.json
```

설명:

```text
최근 변경 사이드바
```

나무위키 기준 후보 URL:

```text
https://namu.wiki/sidebar.json
```

하지만 중요한 점:

```text
공식 Public API인가?
→ 아니다 / 확인된 공식 API 문서 없음

2026-08-26 현재 작동하는가?
→ 추가 확인 필요

JSON 응답인가?
→ 추가 확인 필요

CORS 허용인가?
→ 추가 확인 필요
```

따라서 구현 전 반드시 실제 요청으로 확인한다.

Windows:

```bash
curl.exe -i https://namu.wiki/sidebar.json
```

body:

```bash
curl.exe -s https://namu.wiki/sidebar.json
```

확인할 항목:

```text
HTTP Status

Content-Type:
application/json ?

Access-Control-Allow-Origin:
* ?

JSON Body 존재?
```

---

# 12. 과거 search ranking endpoint 흔적

과거 다음 endpoint가 사용된 흔적이 있다.

```text
https://search.namu.wiki/api/ranking
```

비공식 Userscript에서도 다음처럼 사용한 기록이 존재한다.

```javascript
fetch("https://search.namu.wiki/api/ranking")
    .then(response => response.json())
```

이 endpoint가 살아 있다면 T04 소재로 매우 좋다.

예:

```text
오늘의 나무위키 관심 키워드

1. iPhone 18
2. ...
3. ...
```

하지만 과거 커뮤니티에서 해당 endpoint가 비활성화됐다는 보고가 있다.

따라서 반드시 확인 후 판단한다.

```bash
curl.exe -i https://search.namu.wiki/api/ranking
```

결과가 실패하면 즉시 후보에서 제외한다.

이 endpoint에 의존해서 프로젝트를 먼저 구현하지 않는다.

---

# 13. 내부 API 접근 금지

the seed 관련 자료에는 다음과 같은 내부 경로에 대한 기록도 있다.

```text
/i
/internal
/api
```

일부 API는:

```text
api_access
```

권한이 필요한 것으로 알려져 있다.

이런 endpoint는 T04에서 사용하지 않는다.

또한 다음 행위도 하지 않는다.

```text
인증 우회
Header 위조
Cloudflare 우회
접근 제어 우회
내부 endpoint 강제 접근
```

이번 프로젝트의 목적은 보안 우회가 아니다.

원칙:

> **공개적으로 접근 가능한 데이터만 사용한다.**

---

# 14. 핵심 아이디어 변경

기존:

```text
나무위키 문서 조회수 정보판
```

대신:

# NAMU PULSE

> **지금 나무위키는 얼마나 활발한가?**

라는 정보판을 만든다.

조회수가 아니라 **최근 변경 기록을 이용한 편집 활동량**을 측정한다.

---

# 15. 메인 데이터 정의

가장 유력한 값:

```text
edits / minute
```

즉:

> **최근 N개의 나무위키 편집이 발생하는 속도**

를 계산한다.

예를 들어 최근 변경 20건이 32초 동안 발생했다면:

```text
sampleCount = 20
windowSeconds = 32

20 / 32 × 60

= 37.5 edits/min
```

화면값:

```text
37.5 edits/min
```

---

# 16. 데이터 계산 예시

원자료가 다음과 같다고 가정한다.

```text
12:00:01 문서 A
11:59:58 문서 B
11:59:55 문서 C
11:59:51 문서 D
...
11:59:29 문서 T
```

20건의 편집이 32초 안에 발생.

계산:

```text
20 edits / 32 sec × 60

= 37.5 edits/min
```

이 값을 해당 날짜의 기록으로 저장한다.

---

# 17. 날짜 기준

기준 시간대는 명확하게 고정한다.

추천:

```text
Asia/Seoul
KST
UTC+09:00
```

그리고 매일 같은 시각에 측정한다.

예:

```text
매일 12:00 KST
```

중요:

**날짜별 하나의 값만 저장한다.**

---

# 18. daily.json 예시

```json
[
  {
    "date": "2026-08-25",
    "timezone": "Asia/Seoul",
    "observedAt": "2026-08-25T12:00:00+09:00",
    "sampleCount": 20,
    "windowSeconds": 40,
    "editsPerMinute": 30.0,
    "source": "https://namu.wiki/RecentChanges"
  },
  {
    "date": "2026-08-26",
    "timezone": "Asia/Seoul",
    "observedAt": "2026-08-26T12:00:00+09:00",
    "sampleCount": 20,
    "windowSeconds": 32,
    "editsPerMinute": 37.5,
    "source": "https://namu.wiki/RecentChanges"
  }
]
```

---

# 19. 어제와 비교

```text
2026-08-25

30.0 edits/min

2026-08-26

37.5 edits/min
```

차이:

```text
37.5 - 30.0
= +7.5 edits/min
```

변화율:

```text
(37.5 - 30.0) / 30.0 × 100

= +25%
```

화면:

```text
TODAY

37.5
EDITS / MIN

▲ +7.5 edits/min
▲ +25.0%

vs Yesterday
30.0 edits/min
```

---

# 20. GitHub Actions 구조

GitHub Pages에서는 서버가 없다.

따라서 브라우저가 직접 나무위키를 호출하지 않아도 된다.

구조:

```text
namu.wiki
    ↓
GitHub Actions
    ↓
collector script
    ↓
response validation
    ↓
activity calculation
    ↓
daily.json
    ↓
git commit
    ↓
GitHub Pages
    ↓
React
```

React는 외부 사이트를 직접 호출하지 않는다.

대신:

```text
/public/data/daily.json
```

같은 자기 저장소의 정적 JSON을 읽는다.

---

# 21. CORS 문제에 대한 설계

기존 문제:

```text
Browser
   ↓ fetch
namu.wiki

→ CORS BLOCK
```

변경:

```text
GitHub Actions
       ↓
   namu.wiki
       ↓
   daily.json
       ↓
GitHub Pages
       ↓
     React
```

이 구조에서는 React가 나무위키를 직접 요청하지 않는다.

따라서 브라우저 CORS 문제가 데이터 표시 단계에서는 발생하지 않는다.

단, 이것을 접근제어 우회 용도로 사용해서는 안 된다.

**공개적으로 접근 가능한 원자료만 수집한다.**

---

# 22. 멱등성(Idempotency)

T04 카드 4를 위해 반드시 구현한다.

같은 날 GitHub Action이 여러 번 실행되어도 기록은 하나만 존재해야 한다.

Pseudo Code:

```javascript
const today = getKSTDate();

const exists = records.some(
    record => record.date === today
);

if (exists) {
    console.log("Today's record already exists.");
    process.exit(0);
}

records.push(newRecord);
```

결과:

```text
2026-08-26 Action 실행 #1
→ 저장

2026-08-26 Action 실행 #2
→ SKIP

2026-08-26 Action 실행 #3
→ SKIP
```

---

# 23. GitHub Actions cron

KST 12:00은 UTC 기준:

```text
03:00 UTC
```

예:

```yaml
schedule:
  - cron: "0 3 * * *"
```

단 GitHub Actions cron은 정확히 초 단위 실시간 실행을 보장하는 시스템이 아니므로 실제 `observedAt`은 **실제 수집 시각**을 저장한다.

---

# 24. 화면 디자인 방향

프로젝트 이름 후보:

```text
NAMU PULSE
```

Subtitle:

```text
How active is NamuWiki today?
```

또는:

```text
오늘 나무위키는 얼마나 바쁜가?
```

---

# 25. Main UI 예시

```text
┌────────────────────────────────┐
│ NAMU PULSE               LIVE  │
│                                │
│ 오늘의 나무위키 편집 속도       │
│                                │
│            37.5                │
│         EDITS / MIN            │
│                                │
│           ● ACTIVE             │
│                                │
│ TODAY                 37.5     │
│ YESTERDAY             30.0     │
│                                │
│ ▲ +7.5 edits/min               │
│ ▲ +25.0%                       │
│                                │
│ ─────────────────────────────  │
│                                │
│ SAMPLE                         │
│ 20 revisions / 32 sec          │
│                                │
│ OBSERVED                       │
│ 2026.08.26 12:00 KST           │
│                                │
│ SOURCE                         │
│ NamuWiki RecentChanges ↗       │
└────────────────────────────────┘
```

심사자가 공개 주소를 열고 15초 안에 다음을 확인할 수 있어야 한다.

```text
WHAT
37.5

UNIT
edits/min

WHEN
2026-08-26 12:00 KST

SOURCE
NamuWiki RecentChanges

CHANGE
▲ +25%
```

---

# 26. 원자료 → 저장값 → 계산값 → 화면값

T04 카드 5에서 특히 중요하다.

다음 관계를 UI 또는 검증 패널에서 보여준다.

```text
RAW SOURCE
RecentChanges 20 records

↓

STORED

sampleCount: 20
windowSeconds: 32

↓

CALCULATED

20 / 32 × 60
= 37.5

↓

DISPLAY

37.5 edits/min
```

어제 데이터:

```text
30.0 edits/min
```

현재:

```text
37.5 edits/min
```

Difference:

```text
+7.5 edits/min
```

Direction:

```text
▲
```

Percentage:

```text
+25.0%
```

---

# 27. Failure Simulator

T04 카드 3을 위해 개발/심사용 Failure Simulator를 만든다.

상태:

```text
NORMAL
TIMEOUT
AUTH_FAILURE
RATE_LIMIT
OFFLINE
SCHEMA_CHANGED
```

예:

```javascript
const FAILURE_MODES = {
    NORMAL: "normal",
    TIMEOUT: "timeout",
    AUTH: "auth",
    RATE_LIMIT: "rate-limit",
    OFFLINE: "offline",
    SCHEMA: "schema"
};
```

각 상태는 서로 다른 UI로 보여준다.

---

# 28. Timeout

```text
⚠ SOURCE TIMEOUT

새로운 데이터를 가져오지 못했습니다.

마지막 정상값

37.5 edits/min

정상 조회
2026-08-26 12:00 KST

STALE DATA
```

---

# 29. Authentication Failure

나무위키 공개 데이터에 인증이 없다면 실제 401을 자연스럽게 만들 수 없다.

따라서 이 상태는:

```text
DEMO
FAILURE SIMULATION
```

임을 명확하게 표시한 fixture/mock 방식으로 재현한다.

과제에서 mock 장애 재현을 인정하는지는 강사 기준을 확인할 필요가 있다.

---

# 30. Rate Limit

```text
⚠ REQUEST LIMITED

데이터 소스에서 요청을 제한했습니다.

마지막 정상값

37.5 edits/min

STALE DATA
```

---

# 31. Offline

```text
● OFFLINE

네트워크 연결이 없습니다.

마지막 정상 데이터

37.5 edits/min

2026-08-26 12:00 KST
```

---

# 32. Schema Changed

예상:

```json
{
  "title": "...",
  "time": "..."
}
```

실제 응답 구조가 변경되었다고 가정:

```json
{
  "unexpected": "..."
}
```

UI:

```text
⚠ SOURCE FORMAT CHANGED

원자료의 응답 형식이 예상과 다릅니다.

Expected:
RecentChanges records

Received:
Unknown structure

마지막 정상값
37.5 edits/min

STALE DATA
```

---

# 33. 정상값이 없는 장애

가장 중요하다.

정상 데이터가 단 한 번도 없다면:

```text
DATA UNAVAILABLE

현재 정상 데이터를 가져올 수 없습니다.

표시 가능한 이전 정상값도 없습니다.
```

절대로:

```text
0 edits/min
```

이라고 표시하지 않는다.

`0`은 실제 관측값일 수 있기 때문이다.

---

# 34. 상태 모델

추천:

```javascript
{
    status: "fresh" | "stale" | "unavailable",

    failureReason:
        null |
        "timeout" |
        "auth" |
        "rate-limit" |
        "offline" |
        "schema",

    value: 37.5,

    unit: "edits/min",

    observedAt:
        "2026-08-26T12:00:00+09:00",

    source:
        "https://namu.wiki/RecentChanges"
}
```

---

# 35. 중요한 데이터 무결성 원칙

반드시 지킨다.

## 원칙 1

실패 데이터를 정상값으로 저장하지 않는다.

## 원칙 2

마지막 정상값을 새로운 값처럼 표시하지 않는다.

반드시:

```text
STALE
오래된 데이터
```

표시.

## 원칙 3

정상값이 없다면 값을 만들지 않는다.

## 원칙 4

날짜별 하나의 값만 존재한다.

## 원칙 5

원자료와 계산 결과를 추적할 수 있어야 한다.

---

# 36. 추천 폴더 구조

```text
t04-namu-pulse/
│
├─ .github/
│  └─ workflows/
│     └─ collect-daily.yml
│
├─ scripts/
│  ├─ collect.js
│  ├─ calculatePulse.js
│  ├─ validateResponse.js
│  └─ fixtures/
│     ├─ normal.json
│     ├─ auth-error.json
│     ├─ rate-limit.json
│     └─ schema-changed.json
│
├─ public/
│  └─ data/
│     ├─ daily.json
│     └─ metadata.json
│
├─ src/
│  ├─ components/
│  │  ├─ PulseCard.jsx
│  │  ├─ ComparisonCard.jsx
│  │  ├─ SourceCard.jsx
│  │  ├─ StatusBadge.jsx
│  │  └─ FailureSimulator.jsx
│  │
│  ├─ hooks/
│  │  └─ usePulseData.js
│  │
│  ├─ utils/
│  │  ├─ calculateDifference.js
│  │  ├─ formatDate.js
│  │  └─ statusMapper.js
│  │
│  ├─ App.jsx
│  └─ main.jsx
│
├─ README.md
├─ package.json
└─ vite.config.js
```

---

# 37. 구현 전 반드시 할 실험

## Test A — sidebar.json

```bash
curl.exe -i https://namu.wiki/sidebar.json
```

확인:

```text
HTTP Status
Content-Type
CORS
Body
```

---

## Test B — RecentChanges

```bash
curl.exe -i "https://namu.wiki/RecentChanges"
```

확인:

```text
HTTP Status
Content-Type
robots 허용 여부
시간 데이터 존재 여부
최근 변경 N건 추출 가능 여부
```

---

## Test C — Ranking

```bash
curl.exe -i https://search.namu.wiki/api/ranking
```

살아 있으면 별도 검토.

실패하면 즉시 폐기.

---

# 38. 데이터 소스 선택 우선순위

### Plan A

```text
/sidebar.json
```

조건:

```text
200 OK
+
실제 RecentChanges 데이터
+
필요한 timestamp 존재
```

이면 가장 먼저 검토한다.

---

### Plan B

```text
/RecentChanges
```

공개 페이지의 구조에서 필요한 시간 데이터를 얻을 수 있는지 확인한다.

단 자동수집 정책을 위반하지 않는 범위에서만 사용한다.

---

### Plan C

```text
search.namu.wiki/api/ranking
```

현재 정상 작동이 확인되는 경우에만 검토한다.

과거 비활성화 기록이 있으므로 의존하지 않는다.

---

### Plan D

나무위키 경로가 정책/안정성/데이터 구조 문제로 사용할 수 없다면:

```text
NOAA GOES X-ray Flux
```

로 전환한다.

이것이 현재 가장 강력한 fallback이다.

---

# 39. 절대로 하지 않을 것

```text
❌ Cloudflare 우회

❌ 내부 API 강제 호출

❌ api_access 권한 우회

❌ 인증 Header 위조

❌ robots 정책을 무시한 대량 crawling

❌ 비공식 endpoint를 공식 API라고 설명

❌ 조회수를 추정해서 실제 조회수라고 표시

❌ 실패 데이터를 0으로 저장

❌ 오래된 값을 현재값처럼 표시

❌ GitHub에 Secret commit
```

---

# 40. 이 프로젝트의 포트폴리오 스토리

단순한:

> "API를 React에서 호출해서 숫자를 표시했다."

가 아니다.

프로젝트의 핵심 문제는 다음이다.

> **공식 API가 보장되지 않는 외부 데이터에 의존할 때, 데이터가 정상적으로 들어오지 않아도 사용자를 속이지 않는 신뢰 가능한 정보판을 어떻게 설계할 것인가?**

구현 과정에서 다음 문제를 다룬다.

```text
CORS
외부 데이터 의존성
Schema Validation
Failure State
Stale Data
Daily Snapshot
Idempotency
GitHub Actions
Static Deployment
Data Provenance
Derived Metrics
Yesterday Comparison
```

이 자체가 프로젝트의 기술적 스토리가 된다.

---

# 41. Claude Code 작업 지침

지금 당장 전체 React 프로젝트를 구현하지 않는다.

먼저 **데이터 소스 검증부터 진행한다.**

우선순위:

```text
1. sidebar.json 실제 응답 확인

2. RecentChanges 실제 응답 구조 확인

3. timestamp 확보 가능 여부 확인

4. edits/min 계산 가능 여부 판단

5. 자동수집 정책상 문제가 없는지 확인

6. 가능할 경우 collector 설계

7. daily.json schema 확정

8. GitHub Actions 설계

9. React UI 구현

10. Failure Simulator 구현
```

데이터 소스가 확정되기 전에 UI부터 대규모로 만들지 않는다.

---

# 42. 최종 목표

현재 가장 유력한 프로젝트:

# NAMU PULSE

### 오늘 나무위키는 얼마나 바쁜가?

Primary Metric:

```text
37.5 edits/min
```

Context:

```text
Source
NamuWiki RecentChanges

Observed
2026-08-26 12:00 KST

Sample
20 revisions / 32 sec
```

Comparison:

```text
Yesterday
30.0 edits/min

Today
37.5 edits/min

Difference
▲ +7.5 edits/min

Change
▲ +25.0%
```

Failure:

```text
STALE DATA

Last Good Value
37.5 edits/min

Last Successful Observation
2026-08-26 12:00 KST
```

---

## 핵심 원칙

> **나무위키의 접근 제어나 인증을 우회하지 않는다.**

> **공개적으로 접근 가능한 원자료만 사용한다.**

> **비공식 API는 공식 API라고 표현하지 않는다.**

> **원자료와 파생 계산값을 구분한다.**

> **데이터가 없으면 없는 상태를 그대로 보여준다.**

> **오래된 데이터는 반드시 STALE이라고 표시한다.**

> **날짜별 기록은 하나만 저장한다.**

> **심사자가 공개 주소를 열고 15초 안에 값·단위·출처·조회시각·어제 대비 변화를 판단할 수 있게 한다.**