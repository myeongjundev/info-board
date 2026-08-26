# T04 데이터 소스 후보 의견
## KOBIS vs YouTube vs NAMU PULSE

> Claude Code 전달용  
> 프로젝트: SKT ALEPH T04 — **오늘의 진짜 정보판: 데이터가 안 올 때**  
> 작성 기준: 2026-08-26

---

# 1. 현재 의견

현재까지 조사한 후보 중에서는 **KOBIS 일별 박스오피스를 가장 진지하게 검토할 가치가 있다.**

현재 개인적인 우선순위:

```text id="d39j80"
1. KOBIS — BOX OFFICE PULSE
2. NAMU PULSE — 나무위키 편집 활동량
3. NOAA GOES X-ray
4. USGS 지진
5. YouTube KR
```

단, KOBIS는 구현에 들어가기 전에 반드시 다음을 실제 요청으로 검증해야 한다.

```text id="68a7rq"
1. Key 없이 사용할 수 있는 데이터 경로
2. CORS
3. 날짜 지정 가능 여부
4. JSON 응답 구조
5. GitHub Actions에서 안정적으로 호출 가능한지
6. 해당 공개 웹 endpoint 사용이 프로젝트에 적절한지
```

이 검증이 실패한다면 **NAMU PULSE 또는 NOAA로 전환**한다.

---

# 2. YouTube KR에 대한 의견

처음에는:

> **YouTube 인기 급상승 KR**

이 상당히 매력적으로 보였다.

사용자가 데이터를 바로 이해할 수 있고 UI도 재미있게 만들 수 있다.

예:

```text id="jz6tpw"
YOUTUBE KR

TODAY'S #1

영상 제목

조회수
4,218,392

2026.08.26
```

하지만 T04 기준에서는 문제가 있다.

---

# 3. YouTube의 가장 큰 문제 — API Key

YouTube Data API는 API Key 또는 OAuth 인증이 필요하다.

T04에는 다음 조건이 있다.

```text id="ngn11x"
브라우저
배포 파일
Network 주소
Git 기록

SECRET = 0
```

따라서 API Key를 사용하는 YouTube는 과제 조건과 충돌할 가능성이 크다.

GitHub Actions Secret으로 Key를 숨길 수도 있지만, 이번 과제에서는 굳이 이러한 리스크를 감수할 필요가 없다.

---

# 4. YouTube "인기 급상승" 정의 문제

과거에는:

```text id="q8uqqi"
chart=mostPopular
regionCode=KR
```

를 일반적인 YouTube 인기 급상승으로 이해하기 쉬웠다.

하지만 현재 `mostPopular`의 의미가 과거 Trending Now와 완전히 동일하다고 보기 어렵다.

따라서 프로젝트 제목을:

```text id="y4ymmf"
YouTube 인기 급상승 KR
```

이라고 단정하면 데이터 의미를 설명하는 과정에서 문제가 생길 수 있다.

---

# 5. YouTube의 또 다른 문제 — "오늘의 값 하나"

T04는 결국 **하루 하나의 숫자**가 있는 데이터가 유리하다.

YouTube 1위 영상은:

```text id="stnrfq"
오늘
영상 A

내일
영상 B
```

처럼 대상 자체가 달라진다.

그러면:

```text id="mx7d8n"
어제 2,000,000 views
오늘 5,000,000 views

▲ 3,000,000
```

이라고 비교해도 서로 다른 영상을 비교한 것이 된다.

T04 카드 5의:

```text id="8x8g3b"
이전 값
현재 값
차이
방향
단위
```

구조가 약해진다.

따라서 YouTube는 소재는 재미있지만 **이번 T04 데이터 모델에는 최적이 아니다.**

---

# 6. KOBIS가 눈에 띄는 이유

KOBIS는 영화진흥위원회의 영화관입장권통합전산망 데이터다.

일별 박스오피스에는 다음처럼 명확한 값들이 존재한다.

```text id="h56o4q"
rank
rankInten
movieNm
salesAmt
audiCnt
scrnCnt
showCnt
```

특히:

```text id="evz7v2"
audiCnt
```

즉 **관객수**를 사용할 수 있다는 점이 매우 좋다.

---

# 7. KOBIS를 단순 영화 순위판으로 만들지 않는다

다음 방식은 추천하지 않는다.

```text id="0sf2gw"
오늘 박스오피스

1위 영화 A
2위 영화 B
3위 영화 C
```

이것은 그냥 영화 순위 사이트가 된다.

T04의 핵심인:

> **실제로 변하는 숫자 하나**

가 약해진다.

---

# 8. 추천 컨셉 — BOX OFFICE PULSE

프로젝트 이름 후보:

# BOX OFFICE PULSE

Subtitle:

> **어제 한국 영화관에는 몇 명이 갔을까?**

핵심 숫자:

```text id="m38cqt"
842,316명
```

단위:

```text id="w25g96"
명
```

기준:

```text id="df4n9i"
KOBIS 일별 박스오피스
```

날짜:

```text id="0dp19c"
2026-08-25
```

---

# 9. 메인 데이터 정의

추천하는 메인 값:

> **KOBIS 일별 박스오피스 TOP 10 관객수 합계**

예:

```text id="2c5fr8"
1위   132,504명
2위    98,302명
3위    76,421명
4위    69,291명
...
10위   21,839명
```

계산:

```text id="7cdqyb"
TOP 10 audiCnt 합계

= 842,316명
```

화면:

```text id="ym2ap4"
BOX OFFICE PULSE

어제 극장을 찾은 관객

842,316명
```

---

# 10. 이 데이터가 T04에 좋은 이유

숫자의 의미가 매우 명확하다.

심사자가:

```text id="v9bytz"
842,316
```

을 봤을 때 바로 옆에:

```text id="oqxkj3"
명
2026.08.25
KOBIS
```

이 있으면 거의 추가 설명이 필요 없다.

즉 카드 1의:

```text id="21ftb6"
현재값
단위
출처
조회 시각
```

을 쉽게 만족시킬 수 있다.

---

# 11. 날짜별 하나의 값

T04 카드 4와도 매우 잘 맞는다.

예:

```json id="khfx78"
{
  "date": "2026-08-25",
  "audienceTop10": 842316,
  "unit": "people",
  "source": "KOBIS",
  "collectedAt": "2026-08-26T10:00:00+09:00"
}
```

다음 날:

```json id="6qqrgv"
{
  "date": "2026-08-26",
  "audienceTop10": 914205,
  "unit": "people",
  "source": "KOBIS",
  "collectedAt": "2026-08-27T10:00:00+09:00"
}
```

---

# 12. 어제와 비교

예:

```text id="rhwp5n"
08.24

714,203명

↓

08.25

842,316명
```

Difference:

```text id="duifxc"
842,316
-
714,203

= +128,113명
```

Percentage:

```text id="nfd9mz"
+17.9%
```

화면:

```text id="ylrcgc"
TODAY

842,316명

▲ +128,113명
▲ +17.9%

vs Previous Day

714,203명
```

T04 카드 5를 매우 자연스럽게 만족한다.

---

# 13. 원자료 → 저장값 → 계산값 → 화면값

KOBIS를 선택할 경우 다음 데이터 흐름을 명확하게 보여줄 수 있다.

```text id="pg60v8"
KOBIS RAW DATA

movie 1
audiCnt: 132504

movie 2
audiCnt: 98302

...

movie 10
audiCnt: 21839

↓

STORED VALUES

[132504, 98302, ..., 21839]

↓

CALCULATION

SUM(audiCnt)

↓

842316

↓

DISPLAY

842,316명
```

이 구조는 T04 카드 5의 검증에도 매우 유리하다.

---

# 14. 영화 1위는 보조정보로 사용

메인 데이터는:

```text id="l7v5bp"
TOP 10 총 관객수
```

로 유지한다.

대신 1위 영화는 화면에 보조정보로 보여준다.

예:

```text id="1jgzmp"
#1 BOX OFFICE

오디세이

132,504명
```

그리고:

```text id="o41unm"
TOP 10 TOTAL

842,316명
```

이렇게 하면 정보판의 재미와 데이터 과제의 요구사항을 모두 살릴 수 있다.

---

# 15. 추천 화면

```text id="wfw61r"
┌───────────────────────────────┐
│ BOX OFFICE PULSE        KOREA │
│                               │
│ 어제 극장을 찾은 사람          │
│                               │
│          842,316              │
│             명                 │
│                               │
│          ▲ 17.9%              │
│       vs previous day         │
│                               │
│ ───────────────────────────── │
│                               │
│ #1 BOX OFFICE                 │
│ 오디세이                       │
│ 132,504명                     │
│                               │
│ DATE                          │
│ 2026.08.25                    │
│                               │
│ OBSERVED                      │
│ 2026.08.26 10:00 KST          │
│                               │
│ SOURCE                        │
│ KOBIS 영화관입장권통합전산망 ↗ │
└───────────────────────────────┘
```

---

# 16. 디자인 방향

영화 포스터에 의존하지 않는 것을 추천한다.

포스터를 사용하면:

```text id="p4jj9r"
저작권
외부 이미지 URL
이미지 로딩 실패
CORS
레이아웃 변화
```

등 불필요한 문제가 추가된다.

대신:

```text id="6uohxy"
영화관 전광판
티켓
박스오피스 숫자판
극장 로비
LED 숫자
Editorial Typography
```

느낌을 디자인에 활용한다.

---

# 17. KOBIS의 가장 큰 문제

정식 KOBIS OpenAPI는 API Key를 요구한다.

따라서 단순하게:

```text id="npnp5z"
React
 ↓
KOBIS OpenAPI
```

구조로 가는 것은 추천하지 않는다.

---

# 18. 흥미로운 KOBIS 공개 웹 Endpoint

KOBIS 공식 웹사이트 자체에서는 일별 박스오피스 데이터를 가져오기 위한 공개 웹 endpoint가 사용되고 있다.

후보:

```text id="pykry5"
https://www.kobis.or.kr/kobis/business/main/searchMainDailyBoxOffice.do
```

현재 조사에서는 해당 경로에서:

```text id="q2h50w"
movieNm
rank
rankInten
salesAmt
audiCnt
scrCnt
showCnt
```

등의 데이터가 JSON 형태로 반환되는 것이 확인되었다.

그리고 일반 OpenAPI처럼 API Key를 URL에 요구하는 구조와는 다르다.

---

# 19. 단, 아직 바로 채택하면 안 된다

이 endpoint는:

> **KOBIS 공식 OpenAPI**

라고 표현하면 안 된다.

정확한 표현:

> **KOBIS 공식 웹사이트가 사용하는 공개 데이터 endpoint 후보**

정도로 구분한다.

구현 전 반드시 다음을 검증한다.

```text id="i2jsr4"
HTTP Status
Content-Type
CORS
날짜 Parameter
응답 Schema
Key 필요 여부
GitHub Actions 접근
호출 안정성
```

---

# 20. CORS가 없더라도 검토할 구조

T04에서는 이미 GitHub Actions를 사용해 날짜별 데이터를 저장하는 구조를 검토하고 있다.

따라서:

```text id="ixcau2"
KOBIS

↓

GitHub Actions

↓

collector.js

↓

daily.json

↓

Git Commit

↓

GitHub Pages

↓

React
```

구조를 사용할 수 있다.

React는 자기 저장소의:

```text id="cm0gwh"
/data/daily.json
```

만 읽는다.

단, GitHub Actions를 접근제어 우회 용도로 사용하면 안 된다.

공개적으로 접근 가능한 원자료만 사용한다.

---

# 21. KOBIS 데이터의 또 다른 장점

관객수는 설명이 필요 없는 단위다.

NOAA:

```text id="2bn32e"
3.7 × 10^-5 W/m²
```

를 보여주면:

> 이게 높은 건가?

라는 설명이 필요하다.

NAMU PULSE:

```text id="dqgm2k"
37.5 edits/min
```

도:

> 37.5가 활발한 건가?

라는 질문이 생긴다.

KOBIS:

```text id="k97nx5"
842,316명
```

은 의미가 바로 전달된다.

그리고:

```text id="0c6bn1"
어제보다 +128,113명
+17.9%
```

을 붙이면 해석도 바로 된다.

---

# 22. KOBIS의 단점 — 공식 임계선 없음

NOAA에는:

```text id="jmg9l6"
R1
R2
R3
R4
R5
```

같은 공식 등급이 있다.

KOBIS에는:

```text id="kbm7qm"
관객 50만명 = NORMAL
관객 100만명 = BUSY
```

같은 공식 등급이 없다.

따라서 임의로:

```text id="j75l9o"
🔥 HOT
😐 NORMAL
🧊 COLD
```

같은 등급을 만들고 이를 공식 기준인 것처럼 표현하면 안 된다.

필요하다면:

```text id="wdjn3f"
우리 프로젝트 자체 UI 분류
```

임을 명확히 표시한다.

개인적으로는 아예 등급을 만들지 않고:

```text id="dtrzse"
842,316명

▲ +17.9%
```

만 보여주는 것을 추천한다.

---

# 23. 데이터 보정 가능성

KOBIS 영화 통계는 추후 보정될 가능성이 있다.

따라서 프로젝트에서는 다음 원칙을 사용한다.

> **해당 날짜의 영구 절대값을 주장하는 것이 아니라 수집 시점에서 KOBIS가 제공한 전일 데이터를 스냅샷으로 기록한다.**

화면 또는 README:

```text id="p0t62x"
본 정보판은 수집 시점의
KOBIS 일별 박스오피스 데이터를 기록합니다.

공식 통계 보정에 따라
KOBIS의 추후 값과 차이가 발생할 수 있습니다.
```

---

# 24. NAMU PULSE와 비교

## NAMU PULSE

장점:

```text id="3mgmmq"
독창적
나무위키라는 친숙한 소재
데이터 파이프라인 설명이 재미있음
CORS/Schema/Stale 문제와 T04 주제가 잘 맞음
```

단점:

```text id="0uw2p3"
공식 API 없음
endpoint 안정성 불확실
edits/min 자체가 파생값
정상 범위가 없음
정책 검토 필요
```

---

## KOBIS

장점:

```text id="cwevpl"
공신력 있는 출처
일별 데이터
날짜 명확
관객수 단위 명확
어제 비교가 자연스러움
누구나 이해 가능
UI 스토리텔링 쉬움
```

단점:

```text id="2c2lfv"
정식 OpenAPI는 Key 필요
공개 웹 endpoint 안정성 추가 검증 필요
공식 관객수 위험/등급 기준 없음
통계 보정 가능
```

---

# 25. 현재 비교

| 항목 | KOBIS | NAMU PULSE | NOAA X-ray | YouTube |
|---|---:|---:|---:|---:|
| 재미 | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ |
| 독창성 | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| 데이터 의미 | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| 일별 기록 | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| 어제 비교 | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| 공식 출처 | ★★★★★ | ★★☆☆☆ | ★★★★★ | ★★★★★ |
| Key 문제 | ⚠️ | 없음 | 없음 | ❌ |
| 구현 안정성 | ★★★★☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ |
| T04 적합성 | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |

---

# 26. 현재 추천 순위

## 1위 — KOBIS BOX OFFICE PULSE

조건:

```text id="o9dtg1"
공개 데이터 endpoint 검증 성공
```

시 최우선 추천.

---

## 2위 — NAMU PULSE

조건:

```text id="b6b8pu"
RecentChanges/sidebar 데이터 확보 가능
+
정책 문제 없음
```

일 경우 독창성 측면에서 강력하다.

---

## 3위 — NOAA GOES X-ray

가장 안정적인 fallback.

```text id="uqz7jf"
공식
Key 없음
구조화 JSON
명확한 단위
공식 R 등급
```

이 있기 때문에 다른 실험이 실패했을 때 사용하기 좋다.

---

# 27. Claude Code에게 요청할 다음 작업

아직 전체 React UI를 구현하지 않는다.

먼저 KOBIS feasibility test를 수행한다.

확인 대상:

```text id="0emwp3"
1. KOBIS 일별 박스오피스 공개 웹 endpoint 확인

2. 날짜 parameter 분석

3. 실제 JSON 구조 확인

4. audiCnt 존재 확인

5. TOP 10 확보 가능 여부

6. API Key 없이 호출되는지 확인

7. CORS 확인

8. GitHub Actions Node fetch 가능 여부 확인

9. 같은 날짜 요청 시 결과 재현성 확인

10. 이용에 문제가 될 접근 우회가 없는지 확인
```

---

# 28. 성공 조건

다음이 가능하면 KOBIS를 최종 채택하는 방향으로 진행한다.

```text id="o2tv6h"
INPUT

2026-08-25

↓

KOBIS

↓

Top 10 movies

↓

audiCnt × 10

↓

SUM

↓

842,316 people

↓

daily.json

↓

GitHub Pages

↓

BOX OFFICE PULSE
```

---

# 29. 실패 조건

다음 중 중요한 문제가 발견되면 KOBIS를 고집하지 않는다.

```text id="4goxob"
❌ API Key 없이는 실질적으로 사용할 수 없음

❌ 공개 endpoint 접근이 안정적이지 않음

❌ 날짜 지정 불가능

❌ 자동 요청에 대한 접근 제한

❌ 응답 구조가 지나치게 불안정

❌ 프로젝트에서 사용하기 부적절한 endpoint

❌ 데이터 재현성 부족
```

이 경우:

```text id="jgyxd5"
KOBIS
 ↓ FAIL

NAMU PULSE
 ↓ FAIL

NOAA GOES X-ray
```

순으로 전환한다.

---

# 30. 최종 의견

현재 T04에서 단순한 API 호출 예제를 만드는 것보다:

# BOX OFFICE PULSE

> **어제 한국 영화관에는 몇 명이 갔을까?**

라는 질문으로 프로젝트를 만드는 것이 매우 좋은 방향이라고 판단한다.

메인 숫자는:

```text id="kt0kzk"
842,316명
```

보조정보:

```text id="h94ht3"
어제 대비

▲ +128,113명
▲ +17.9%
```

그리고:

```text id="4s5t69"
#1 BOX OFFICE

영화명
132,504명
```

정도만 추가한다.

이 방식의 가장 큰 장점은 **15초 안에 프로젝트가 무엇을 보여주는지 이해할 수 있다는 것**이다.

또한:

```text id="87wd41"
값
단위
날짜
출처
수집시각
이전값
현재값
차이
방향
```

이 모두 명확하다.

---

# 핵심 결론

> **YouTube는 재미있지만 T04의 API Key와 날짜별 비교 조건 때문에 우선순위를 낮춘다.**

> **KOBIS는 관객수라는 매우 직관적인 숫자가 있기 때문에 T04에 강하다.**

> **KOBIS를 단순 박스오피스 순위 사이트로 만들지 않는다.**

> **TOP 10 일일 관객수를 하나의 숫자로 합산하여 한국 영화관의 하루 활동량을 보여주는 `BOX OFFICE PULSE`로 만든다.**

> **1위 영화는 메인 값이 아니라 보조 정보로 사용한다.**

> **구현 전에 공개 KOBIS endpoint의 Key/CORS/날짜/응답 구조/안정성을 반드시 실제 요청으로 검증한다.**

> **검증 성공 시 KOBIS를 현재 1순위로 채택할 가치가 있다.**