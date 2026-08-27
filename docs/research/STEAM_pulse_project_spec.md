# STEAM PULSE — Project Specification

> Steam 게임 데이터를 활용하여 현재 게임 트렌드와 게임 정보를 탐색할 수 있는 데이터 기반 웹 서비스

---

## 0. 이 문서의 목적

이 문서는 `STEAM PULSE` 프로젝트를 개발하는 AI Agent(Claude Code / Codex 등)가
프로젝트의 목적, 기능, 디자인 방향, 개발 우선순위를 정확히 이해하기 위한 기준 문서다.

AI Agent는 구현 전 반드시 이 문서를 읽고 프로젝트 전체 방향을 파악한다.

### 가장 중요한 원칙

1. 과제 필수 기능을 가장 먼저 완성한다.
2. 실제 API에서 얻을 수 있는 데이터만 실제 정보처럼 표현한다.
3. 존재하지 않는 통계나 트렌드 데이터를 임의로 생성하지 않는다.
4. Steam 공식 사이트를 복제하지 않는다.
5. `STEAM PULSE`만의 데이터 대시보드 경험을 만든다.
6. 디자인보다 기능 안정성을 우선한다.
7. 기능 추가 때문에 기존 기능을 깨뜨리지 않는다.
8. Desktop / Tablet / Mobile을 모두 고려한다.
9. Loading / Empty / Error 상태를 반드시 구현한다.
10. 과도한 기능 추가보다 완성도를 우선한다.

---

# 1. 프로젝트 개요

## Project Name

**STEAM PULSE**

## Tagline

> Don't just browse games.  
> Read the pulse.

## 핵심 질문

> "지금 Steam에서는 어떤 게임들이 주목받고 있을까?"

Steam의 게임 데이터를 단순히 나열하는 것이 아니라,
사용자가 게임과 게임 시장의 흐름을 탐색할 수 있는
**Gaming Data Dashboard** 형태의 웹 서비스를 만든다.

---

# 2. 프로젝트 목표

단순한 API 과제처럼 보이면 안 된다.

잘못된 결과:

> Steam API를 호출해서 게임 목록을 출력했습니다.

우리가 원하는 결과:

> Steam 데이터를 수집하고 가공하여 사용자가 게임을 검색하고,
> 필터링하고, 비교하고, 현재 Steam 생태계를 탐색할 수 있도록
> 데이터 기반 인터페이스를 설계했습니다.

이를 통해 다음 역량을 보여주는 것을 목표로 한다.

- API 활용
- 비동기 데이터 처리
- React 컴포넌트 설계
- 상태 관리
- 검색
- 필터링
- 정렬
- 데이터 가공
- 데이터 시각화
- 반응형 UI
- UX 설계
- Error Handling
- Loading State
- Empty State

---

# 3. 핵심 컨셉

## STEAM × DATA × PULSE

STEAM PULSE의 핵심은 Steam Store를 복제하는 것이 아니다.

Steam Store가

> "어떤 게임을 살 것인가?"

에 가깝다면,

STEAM PULSE는

> "지금 Steam에서는 어떤 게임들이 움직이고 있는가?"

를 탐색하는 경험에 가깝다.

---

# 4. 사용자 흐름

전체 UX는 다음 흐름을 기준으로 한다.

```text
STEAM PULSE 접속
        ↓
현재 Steam 데이터 요약 확인
        ↓
Trending / Popular 영역 확인
        ↓
게임 목록 탐색
        ↓
검색 / 필터 / 정렬
        ↓
관심 게임 선택
        ↓
게임 상세 정보 확인
        ↓
다른 게임 탐색

사용자가 처음 접속했을 때
"이 사이트에서 무엇을 할 수 있는지"가 즉시 보여야 한다.

5. 전체 페이지 구조

권장 구조:

HEADER
│
├── LOGO
├── DISCOVER
└── ABOUT
│
HERO
│
├── Headline
├── Description
└── Summary Cards
│
TRENDING NOW
│
├── Ranking
├── Game
└── Status
│
DISCOVER GAMES
│
├── Search
├── Genre Filter
├── Sort
└── Game Grid
│
GAME DETAIL
│
└── Game Information
│
FOOTER
6. Header

Header는 최대한 단순하게 구성한다.

예:

STEAM PULSE                         DISCOVER    ABOUT

스크롤 시 Sticky Header를 적용해도 좋다.

단, 과도한 Navigation 메뉴는 만들지 않는다.

7. Hero Section

첫 화면에서 프로젝트의 정체성을 전달한다.

Main Copy
WHAT'S PLAYING
RIGHT NOW?
Sub Copy
Explore the pulse of Steam.
Discover what's popular, active and worth playing.

또는

REAL GAMES.
REAL DATA.
RIGHT NOW.
8. Summary Cards

Hero 하단에는 현재 Steam 데이터를 요약한 카드를 배치한다.

예:

┌──────────────────────┐
│ 🔥 TRENDING          │
│ Counter-Strike 2     │
└──────────────────────┘

┌──────────────────────┐
│ 👥 MOST PLAYED       │
│ 1,234,567 PLAYERS    │
└──────────────────────┘

┌──────────────────────┐
│ ⚡ ACTIVE NOW        │
│ DOTA 2               │
└──────────────────────┘

주의:

API에서 해당 데이터를 제공하지 않는다면
임의의 숫자나 게임을 넣어 실제 데이터처럼 표현하지 않는다.

9. Trending Now

메인 화면에서 시각적으로 강조할 영역이다.

예:

TRENDING NOW

01   Counter-Strike 2              HOT
02   Dota 2                        ACTIVE
03   PUBG                          RISING
04   Apex Legends                  ACTIVE
05   Stardew Valley                HOT

가능하다면 다음 정보를 사용한다.

Rank
Game Name
Current Players
Review Score
Status
10. Trend 상태

STEAM PULSE의 개성을 위해 게임 상태를 간단한 Label로 표현할 수 있다.

예:

HOT
RISING
ACTIVE
HIDDEN GEM
COOLING

하지만 상태를 무작위로 지정해서는 안 된다.

가능하다면 실제 데이터에 기반하여 규칙을 만든다.

예:

HOT
→ 높은 동시 접속자 + 높은 평가

ACTIVE
→ 현재 플레이어 수가 일정 기준 이상

HIDDEN GEM
→ 플레이어 수는 상대적으로 낮지만 평가가 매우 높음

정확한 계산 기준은 실제 확보 가능한 데이터를 확인한 후 정의한다.

11. Discover Games

프로젝트의 핵심 기능이다.

사용자가 Steam 게임을 직접 탐색할 수 있어야 한다.

구조:

DISCOVER GAMES

[ Search Steam........................ ]

[ ALL ] [ ACTION ] [ RPG ] [ FPS ] [ INDIE ]

SORT BY: [ MOST PLAYED ▼ ]


[ GAME ] [ GAME ] [ GAME ] [ GAME ]

[ GAME ] [ GAME ] [ GAME ] [ GAME ]
12. Search

게임 이름을 검색할 수 있어야 한다.

예:

Search Steam...

[ Cyber                              🔍 ]

결과:

Cyberpunk 2077
요구사항
입력 즉시 결과 반영
대소문자 구분 최소화
검색 결과가 없으면 Empty State 표시
페이지 새로고침 없이 작동
13. Filter

장르 기반 필터를 우선 구현한다.

예:

ALL
ACTION
RPG
FPS
INDIE
STRATEGY
SIMULATION

추가 데이터 확보가 가능하다면:

FREE TO PLAY
PAID

WINDOWS
MAC
LINUX

SINGLE PLAYER
MULTIPLAYER
CO-OP

하지만 필터 개수를 늘리는 것이 목표가 아니다.

정상 작동하는 소수의 필터가 더 중요하다.

14. Sort

사용자가 게임 데이터를 다른 기준으로 볼 수 있도록 한다.

예:

SORT BY

MOST PLAYED
RATING
NEWEST
NAME

Trending 데이터를 실제로 확보할 수 있다면:

TRENDING

도 추가한다.

15. Game Card

게임 목록은 카드 기반 UI로 구성한다.

예:

┌──────────────────────────────┐
│                              │
│          GAME IMAGE          │
│                              │
├──────────────────────────────┤
│ Counter-Strike 2             │
│                              │
│ Action · FPS                 │
│                              │
│ 1.2M PLAYERS                 │
│ VERY POSITIVE                │
│                              │
│                         HOT  │
└──────────────────────────────┘
표시 우선순위
게임 이미지
게임 이름
장르
핵심 데이터
상태

정보가 너무 많아 카드가 복잡해지지 않도록 한다.

16. Game Card Interaction

Desktop에서는 Hover Interaction을 사용할 수 있다.

예:

Normal
↓
Hover
↓
Image Scale
Border Highlight
Data Reveal

하지만 애니메이션은 짧고 절제해서 사용한다.

과도한 Glow Effect는 피한다.

17. Game Detail

게임 카드를 클릭하면 상세 정보를 보여준다.

구현 방법은 다음 중 하나를 선택할 수 있다.

Detail Page

또는

Side Panel / Modal

프로젝트 규모를 고려하면 Side Panel 방식도 좋다.

18. Game Detail 정보

예:

CYBERPUNK 2077

[ HEADER IMAGE ]

Cyberpunk 2077 is an open-world
action-adventure RPG...

────────────────────────────

GENRE
RPG / OPEN WORLD

RELEASE
2020

REVIEWS
VERY POSITIVE

PRICE
₩66,000

CURRENT PLAYERS
32,421

────────────────────────────

[ VIEW ON STEAM ]

실제 API에서 제공되는 정보만 사용한다.

19. PULSE SCORE

STEAM PULSE의 대표적인 차별화 기능 후보.

여러 데이터를 조합해
게임의 현재 상태를 하나의 숫자로 표현한다.

예:

PULSE SCORE

84

████████████████░░░░

HOT
20. Pulse Score 후보 데이터

가능한 데이터:

Current Players
Review Score
Review Count
Popularity
Release Date
Price
Trend

예시 개념:

Player Score   40%
Review Score   30%
Popularity     20%
Freshness      10%

하지만 실제 계산식은 API 데이터 조사 후 결정한다.

절대로 임의의 84, 92 등의 값을 UI 장식용으로 생성하지 않는다.

21. Data Visualization

데이터가 충분하다면 간단한 시각화를 추가한다.

Player Activity
PLAYER ACTIVITY

CS2       █████████████████
DOTA 2    █████████████
PUBG      █████████
APEX      █████
Genre Distribution
GENRE DISTRIBUTION

ACTION       ███████████  32%
RPG          ████████     24%
INDIE        ██████       18%
STRATEGY     ████         12%
OTHER        █████        14%

차트를 많이 만드는 것이 목적이 아니다.

사용자가 데이터를 빠르게 이해하도록 만드는 것이 목적이다.

22. 디자인 방향
Design Concept
Gaming
×
Data Dashboard
×
Terminal
×
Editorial
23. 디자인 키워드
Dark
Minimal
Cyber
Gaming
Data
Terminal
Grid
Editorial
High Contrast
Modern
Technical
24. 피해야 할 디자인

다음과 같은 흔한 AI 생성형 디자인을 피한다.

❌ 모든 요소에 둥근 모서리
❌ 모든 카드에 Glow
❌ 과도한 Gradient
❌ 의미 없는 Glassmorphism
❌ 지나친 Neon Blue
❌ 너무 많은 카드
❌ 모든 텍스트 중앙 정렬
❌ 의미 없는 그래프
❌ Steam UI 복제
25. 권장 디자인

대신 다음 방향을 사용한다.

Strong Typography
Clear Grid
Thin Borders
Large Game Artwork
Data-focused Layout
Controlled Accent Color
Whitespace
Sharp UI
Editorial Composition
26. Typography

Headline은 강하게 표현한다.

예:

WHAT'S
PLAYING
RIGHT NOW?

본문은 정보 전달에 집중한다.

숫자 데이터는 Mono Font 계열을 사용해도 좋다.

예:

1,284,321
PLAYERS ONLINE
27. 색상

전체적으로 Dark UI를 사용한다.

예시 방향:

Background
#0A0A0A

Surface
#111111

Border
#272727

Primary Text
#F5F5F5

Secondary Text
#888888

Accent Color는 하나의 핵심 색상을 정하고
필요한 곳에서만 사용한다.

Steam의 파란색을 그대로 복제할 필요는 없다.

28. Grid

Desktop에서는 게임 목록을 Grid로 구성한다.

예:

Desktop
4 Columns

Tablet
2~3 Columns

Mobile
1~2 Columns

화면 크기에 따라 자연스럽게 변경한다.

29. Responsive

반응형은 필수다.

Desktop

전체 Dashboard 경험 제공.

Tablet

일부 데이터 영역 축소.

Mobile

핵심 정보만 남긴다.

모바일에서 모든 Desktop 정보를 억지로 보여주지 않는다.

30. Loading State

API 요청 중에는 빈 화면을 보여주지 않는다.

예:

FETCHING STEAM DATA...

가능하면 Skeleton UI를 사용한다.

┌──────────────────────┐
│██████████████████████│
│████████              │
│██████████████        │
└──────────────────────┘
31. Empty State

검색 또는 필터 결과가 없을 때:

NO GAMES FOUND

Try another search or filter.

필요하면:

RESET FILTERS

버튼을 제공한다.

32. Error State

API 호출 실패 시:

CONNECTION LOST

Steam data could not be loaded.

[ RETRY ]

개발자 Console에만 오류를 표시하고 끝내지 않는다.

사용자가 현재 상태를 이해할 수 있어야 한다.

33. 데이터 처리 원칙

이 프로젝트에서 매우 중요하다.

REAL DATA FIRST

실제 데이터와 디자인용 Mock Data를 혼동하지 않는다.

개발 중 Mock Data를 사용하는 것은 가능하다.

하지만 최종 결과에서는 실제 데이터처럼 위장하지 않는다.

34. API 조사

본격적인 구현 전 사용 가능한 Steam 관련 API/Data Source를 조사한다.

확인할 내용:

Game Name
App ID
Header Image
Genre
Price
Release Date
Review Score
Review Count
Current Players
Description
Platform
Steam URL

각 데이터가 실제로 안정적으로 확보 가능한지 확인한다.

35. API 조사 후 기능 확정

반드시 다음 순서를 지킨다.

API / Data Source 조사
        ↓
확보 가능한 데이터 목록 작성
        ↓
필수 기능 결정
        ↓
데이터 구조 설계
        ↓
UI 설계
        ↓
구현
        ↓
추가 기능

디자인을 먼저 만들고
존재하지 않는 API 데이터를 끼워 맞추지 않는다.

36. 데이터 모델 예시

실제 API 구조와 별도로
프론트엔드에서 다음처럼 Normalize하는 것을 고려한다.

{
  id: 730,
  name: "Counter-Strike 2",
  image: "...",
  genres: ["Action", "FPS"],
  currentPlayers: 1200000,
  reviewScore: 88,
  reviewCount: 500000,
  price: 0,
  releaseDate: "...",
  platforms: {
    windows: true,
    mac: false,
    linux: true
  },
  steamUrl: "..."
}

API Response를 UI 전체에서 직접 사용하는 것보다
필요한 형태로 정규화하는 것을 우선 고려한다.

37. 컴포넌트 구조 예시

React 기준 권장 구조:

src/
│
├── components/
│   ├── Header
│   ├── Hero
│   ├── StatCard
│   ├── TrendingList
│   ├── SearchBar
│   ├── FilterBar
│   ├── SortControl
│   ├── GameGrid
│   ├── GameCard
│   ├── GameDetail
│   ├── PulseScore
│   ├── LoadingState
│   ├── EmptyState
│   └── ErrorState
│
├── hooks/
│
├── services/
│   └── steamApi
│
├── utils/
│
├── data/
│
└── pages/

현재 프로젝트 구조가 이미 존재한다면
무리하게 전체 구조를 변경하지 않는다.

38. 상태 관리

최소한 다음 상태를 명확하게 관리한다.

games
selectedGame
searchQuery
selectedGenre
sortOption
loading
error

필요 이상으로 복잡한 상태관리 라이브러리를 도입하지 않는다.

프로젝트 규모에 맞는 방식을 선택한다.

39. 성능

다음 사항을 고려한다.

불필요한 API 재호출 방지
검색 Debounce 필요 여부 검토
이미지 Lazy Loading
불필요한 Re-render 최소화
동일 데이터 캐싱 검토
API Rate Limit 확인

단, 과제 규모보다 과도한 최적화는 하지 않는다.

40. 접근성

기본적인 접근성을 지킨다.

이미지 alt
Button 의미 명확화
Keyboard 접근
Focus State
충분한 Contrast
Semantic HTML
단순 색상만으로 상태 전달하지 않기
41. 개발 우선순위
PHASE 1 — DATA

가장 먼저 데이터부터 확인한다.

Steam API 조사
↓
실제 데이터 호출
↓
Response 확인
↓
데이터 Normalize
PHASE 2 — CORE

과제 핵심 기능 구현.

Game List
Search
Filter
Sort
Game Detail
PHASE 3 — STATE

사용자 상태 처리.

Loading
Empty
Error
Retry
PHASE 4 — RESPONSIVE
Desktop
Tablet
Mobile
PHASE 5 — DESIGN

STEAM PULSE 디자인 적용.

Typography
Grid
Game Card
Dashboard
Interaction
Micro Animation
PHASE 6 — DIFFERENTIATION

시간이 충분한 경우에만 진행한다.

Pulse Score
Trending
Status
Charts
Game Comparison
Related Games
42. MVP 완료 기준

최소한 다음 기능이 모두 정상 작동해야 한다.

실제 API/Data Source 연결
게임 데이터 출력
게임 이미지 표시
게임 검색
장르 필터
정렬
게임 상세 정보
Loading State
Empty State
Error State
Retry
Responsive Layout

여기까지 완료되면 MVP 성공으로 판단한다.

43. 추가 기능 우선순위

MVP 완료 후 다음 순서로 고려한다.

1. Trending Dashboard
2. Pulse Score
3. Game Status
4. Data Visualization
5. Game Comparison
6. Related Games
7. Advanced Animation
44. 하지 말아야 할 것

AI Agent는 다음 행동을 피한다.

기능
❌ API에 없는 데이터 생성
❌ 가짜 Trending 수치 표시
❌ 가짜 Player 증가율 표시
❌ 의미 없는 기능 추가
❌ 필요 없는 로그인 시스템 추가
❌ 필요 없는 Backend 구축
디자인
❌ Steam 홈페이지 복제
❌ 모든 카드에 Gradient
❌ 과도한 Glow
❌ Glassmorphism 남발
❌ 모든 요소 둥글게 만들기
❌ 의미 없는 애니메이션
개발
❌ 기존 정상 기능 파괴
❌ 이유 없는 대규모 Refactoring
❌ 불필요한 Dependency 추가
❌ API Key 코드에 직접 노출
❌ Console Error 방치
45. Agent 작업 규칙

Claude Code / Codex는 작업 시 다음 규칙을 따른다.

작업 시작 전
프로젝트 전체 파일 구조를 확인한다.
기존 코드와 기능을 파악한다.
package.json을 확인한다.
현재 사용 중인 기술을 확인한다.
기존 디자인 시스템이 있다면 파악한다.
이 문서와 현재 구현 상태를 비교한다.
수정 전

변경하려는 기능과 관련된 파일을 먼저 읽는다.

기존 기능을 추측해서 수정하지 않는다.

수정 후

가능한 경우 다음을 확인한다.

Build
Lint
Runtime Error
Console Error
Responsive
Existing Features
46. Agent 구현 판단 기준

무언가 추가할지 고민된다면 다음 질문을 한다.

이 기능이 사용자의 게임 탐색에 도움이 되는가?

실제 데이터로 구현 가능한가?

과제 요구사항과 관련이 있는가?

기존 기능보다 우선순위가 높은가?

포트폴리오에서 설명할 가치가 있는가?

대부분 NO라면 구현하지 않는다.

47. 프로젝트 차별화 포인트

STEAM PULSE의 차별점은 기능의 개수가 아니다.

핵심은:

Steam Data
      ↓
Normalization
      ↓
Filtering / Sorting
      ↓
Interpretation
      ↓
Visualization
      ↓
User Exploration

즉,

데이터를 가져오는 것에서 끝나지 않고
데이터를 사용자가 이해할 수 있는 경험으로 재구성하는 것

이 프로젝트의 핵심이다.

48. 포트폴리오 관점

완성 후 다음과 같이 설명할 수 있어야 한다.

Steam 데이터를 단순 출력하는 방식에서 벗어나
검색, 필터링, 정렬 및 데이터 시각화를 통해
사용자가 Steam 게임 생태계를 탐색할 수 있는
데이터 기반 게임 대시보드를 설계하고 개발했습니다.

그리고 기술적으로는:

외부 API 데이터를 UI에서 사용하기 좋은 형태로 정규화하고,
비동기 요청의 Loading / Error / Empty 상태를 설계했으며,
검색과 필터링 및 반응형 인터페이스를 구현했습니다.

라고 설명할 수 있어야 한다.

49. 최종 사용자 경험

최종 결과물에서 사용자는 다음 경험을 해야 한다.

"게임이 많네"
        ↓
"지금 인기 있는 게임이 이거구나"
        ↓
"내가 좋아하는 장르만 볼까?"
        ↓
"이 게임은 어떤 게임이지?"
        ↓
"다른 게임과 비교해볼까?"

즉,

단순 정보 조회가 아니라

탐색 → 발견 → 관심 → 비교

로 이어지는 경험을 만든다.

50. 최종 목표

STEAM PULSE는 단순 Steam API 실습 프로젝트가 아니다.

목표는 다음 역량을 하나의 결과물에서 보여주는 것이다.

API
+
React
+
Data Processing
+
State Management
+
UX
+
Responsive Design
+
Visualization
+
Error Handling

최종적으로 사용자가 사이트를 봤을 때

"Steam 데이터를 가져왔구나."

에서 끝나는 것이 아니라,

"Steam 데이터를 가지고 하나의 서비스를 만들었구나."

라는 인상을 받아야 한다.

51. Definition of Done

프로젝트 완료 전 최종 확인한다.

DATA
 실제 Data Source가 연결되어 있다.
 주요 게임 정보가 정상적으로 표시된다.
 Mock Data가 실제 데이터처럼 남아 있지 않다.
 API 오류가 처리된다.
CORE
 게임 목록이 표시된다.
 검색이 작동한다.
 필터가 작동한다.
 정렬이 작동한다.
 게임 상세 정보를 볼 수 있다.
UX
 Loading State가 있다.
 Empty State가 있다.
 Error State가 있다.
 Retry가 작동한다.
UI
 Desktop에서 정상적으로 보인다.
 Tablet에서 정상적으로 보인다.
 Mobile에서 정상적으로 보인다.
 Hover / Focus 상태가 존재한다.
QUALITY
 Build가 성공한다.
 치명적인 Console Error가 없다.
 기존 기능이 깨지지 않았다.
 불필요한 Dependency가 없다.
 API Key가 노출되지 않는다.
DESIGN
 Steam 홈페이지를 복제하지 않았다.
 STEAM PULSE만의 디자인 언어가 있다.
 과도한 AI 스타일 디자인을 피했다.
 데이터의 중요도에 따른 시각적 계층이 명확하다.
52. Claude Code에게 전달하는 최종 지시

이 프로젝트를 작업할 때 바로 코드를 작성하기 시작하지 않는다.

먼저:

현재 Repository 전체 구조를 분석한다.
현재 구현되어 있는 기능을 파악한다.
사용 가능한 API/Data Source를 확인한다.
이 문서의 요구사항과 현재 구현 상태를 비교한다.
완료 / 부분 완료 / 미구현 항목을 구분한다.
과제 필수 기능을 최우선으로 작업 계획을 만든다.
기존 기능을 최대한 보존한다.
작은 단위로 구현하고 검증한다.
MVP가 완성되기 전에는 부가 기능에 과도하게 시간을 사용하지 않는다.
실제 데이터로 구현할 수 없는 기능은 임의로 가짜 데이터를 만들어 구현하지 않는다.

작업 순서는 기본적으로 다음을 따른다.

ANALYZE
   ↓
DATA
   ↓
CORE
   ↓
STATE
   ↓
RESPONSIVE
   ↓
DESIGN
   ↓
DIFFERENTIATION
   ↓
TEST
   ↓
POLISH
FINAL PRINCIPLE

Build the product first.
Add the personality second.
Polish it last.

STEAM PULSE의 목표는
기능이 많은 프로젝트가 아니다.

실제 데이터를 제대로 다루고,
사용자가 그것을 탐색할 수 있으며,
명확한 컨셉과 완성도를 가진 프로젝트를 만드는 것.

그것이 이 프로젝트의 최우선 목표다.


이 버전은 단순 아이디어 메모가 아니라 **Claude Code가 프로젝트 루트에서 읽는 `프로젝트 명세서`** 성격으로 만든 거야. 특히 마지막에