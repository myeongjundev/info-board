// 차트 가격은 Steam 이 이미 만들어 준 문자열을 그대로 쓴다.
//
// 왜 다시 계산하지 않는가.
//
// 2026-08-28 공개 주소에 붉은사막이 `-20% ₩70 → ₩56` 으로 떠 있었다. 실제 한국
// 가격은 ₩79,800 → ₩63,840 이다. 저장값은 `6999 / 5599` 였는데 이건 원이 아니라
// **USD 센트**였다 ($69.99 → $55.99). 그걸 100 으로 나눠 원화 기호를 붙이고 있었다.
//
// 원인은 수집 위치다. 차트 URL 에 `cc=KR` 을 붙여 두었지만 **이 파라미터는 무시된다.**
// 한국에서 `cc=US` 로 불러도 ₩ 가 온다 (2026-08-28 실측, KR·US·JP 세 값이 동일).
// 통화를 정하는 것은 호출한 IP 다. 그래서 로컬(한국)에서 수집하면 KRW, Actions
// (미국 러너)에서 수집하면 USD 가 오고, 한 파일 안에 두 체계가 섞였다.
//
// 고치는 방법은 "어느 통화인지 알아내서 나눗셈을 고른다" 가 아니다. 응답에는 통화
// 코드 필드가 아예 없다 — 있는 것은 `formatted_final_price` 하나뿐이고, 그것이
// **Steam 자신이 그 통화로 표기한 문자열**이다. 그래서 그것을 그대로 쓴다.
// 우리가 단위를 고르지 않으면 단위를 틀릴 수도 없다.
//
// `initialMinor`·`finalMinor` 는 계산이 필요할 때를 위해 그대로 보존한다. 다만
// **그 숫자의 단위는 `currency` 이지 항상 원이 아니다.** 확신할 수 없으면 `null` 이다.

/** 표기에서 확실히 알아볼 수 있는 통화만 이름을 붙인다. */
const CURRENCY_BY_MARK = [
  { mark: /₩/, code: 'KRW' },
];

/**
 * 표기 문자열에서 통화를 읽는다. **모르면 `null` 이다.**
 *
 * `$` 를 USD 로 단정하지 않는다. 이 값의 쓰임은 "한국 가격이라고 불러도 되는가"
 * 하나뿐이고, 거기에는 KRW 인지 아닌지만 있으면 된다. 모르는 것에 이름을 붙이면
 * 지금 고치고 있는 결함을 형태만 바꿔 되풀이하게 된다.
 */
export function currencyFromFormatted(text) {
  if (typeof text !== 'string' || text.trim() === '') return null;
  for (const { mark, code } of CURRENCY_BY_MARK) if (mark.test(text)) return code;
  return null;
}

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

function toMinor(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

/**
 * `best_purchase_option` 하나를 화면이 쓸 수 있는 모양으로 읽는다.
 *
 * `priceText` 가 화면에 그대로 나가는 값이다. 원자료에 있던 문자열이므로
 * "화면값이 원자료와 일치한다" 가 계산 없이 성립한다.
 */
export function readChartPrice(price) {
  const priceText = cleanText(price?.formatted_final_price);
  const priceTextInitial = cleanText(price?.formatted_original_price) ?? priceText;
  const finalMinor = toMinor(price?.final_price_in_cents);
  const initialMinor = toMinor(price?.original_price_in_cents) ?? finalMinor;
  const discountPercent = toMinor(price?.discount_pct) ?? 0;
  return {
    currency: currencyFromFormatted(priceText),
    priceText,
    priceTextInitial,
    initialMinor,
    finalMinor,
    discountPercent: discountPercent >= 0 && discountPercent <= 100 ? discountPercent : 0,
  };
}

/**
 * 가격이 붙은 항목이 있는데 표기를 한 건도 못 읽었으면 응답 형식이 바뀐 것이다.
 *
 * `assertDescriptorsPresent` 와 같은 자리다. 성인 분류에는 이 가드를 달아 두고
 * 통화에는 안 달아서 결함이 조용히 배포됐다. 그대로 두면 화면이 가격 자리를
 * 통째로 비운 채 나간다.
 */
export function assertPriceTextPresent(items, where) {
  const priced = items.filter((item) => item && !item.isFree && item.finalMinor != null);
  if (priced.length === 0) return;
  const seen = priced.filter((item) => typeof item.priceText === 'string' && item.priceText !== '').length;
  if (seen === 0) {
    throw new TypeError(
      `${where}: 가격 표기(formatted_final_price)를 한 건도 읽지 못했다. `
      + '응답 형식이 바뀐 것으로 보고 기존 스냅샷을 덮지 않는다.',
    );
  }
}

/** 이 목록의 가격을 "한국 가격" 이라고 불러도 되는가. 하나라도 아니면 안 된다. */
export function isAllKrw(items) {
  const priced = items.filter((item) => item && !item.isFree && item.priceText);
  if (priced.length === 0) return false;
  return priced.every((item) => item.currency === 'KRW');
}
