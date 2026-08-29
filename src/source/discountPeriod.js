// 이 할인이 **언제 끝나는가.**
//
// 할인 구역은 여태 "얼마나 싸다" 만 말하고 "언제까지" 를 못 말했다. 쓰는 사람이
// 실제로 묻는 것은 두 번째인데도 그랬다. 이유는 하나다 — 우리가 쓰던
// `appdetails` 의 `price_overview` 에는 **끝나는 시각이라는 필드 자체가 없다.**
//
// 결함 목록 23개 중 5개가 `시각에 대한 거짓말` 이었다. 그만큼 이 판은 "언제" 를
// 조심해 왔는데, 정작 할인 구역만 그 질문에 침묵하고 있었다.
//
// `IStoreBrowseService/GetItems` 는 그 값을 준다. 덤으로 할인의 **종류**(특별·주간·
// 일일·주말·출시 기념)까지 준다.
//
// ## 이 경로에 대해 정직하게
//
// 호스트는 Steam 공식 Web API(`api.steampowered.com`)지만 **파트너 문서에 없다.**
// 규칙 5-4 가 판매 차트를 두고 갈라 적은 것과 같은 자리다 —
// **자료는 공식, 경로는 문서화되지 않음.** 화면에서도 그렇게 부른다.
//
// ## appdetails 를 안 버린 이유
//
// 가격은 계속 `appdetails` 가 말하고 여기서는 시각만 가져온다. 그리고 **두 곳의
// 할인율을 맞대 본다.** 다르면 감추지 않고 적는다.
//
// 결함 18번이 한 화면의 두 패널이 같은 질문에 정반대로 답한 것이었다. 출처가 둘이면
// 언제든 갈라진다 — 특히 할인은 우리가 두 번 부르는 사이에 끝나 버릴 수 있다.
// 갈라지는 것 자체는 못 막는다. **갈라진 것을 모르는 것**을 막는다.

export const PERIOD_SOURCE = {
  id: 'steam-storebrowse-undocumented',
  label: 'Steam Web API 호스트 · 문서화되지 않은 StoreBrowse 응답',
  host: 'api.steampowered.com',
  country: 'KR',
  language: 'koreana',
  warning: '공식 Web API 호스트에 있으나 파트너 문서에 없는 응답이며 예고 없이 바뀔 수 있다.',
};

/** 한 번에 물어보는 appid 수. 100개가 250ms 안에 돌아오는 것을 재서 정했다. */
export const PERIOD_BATCH = 100;

// Steam 이 돌려주는 할인 종류 토큰. 화면에 그대로 쓰면 `#discount_desc_preset_special`
// 이 뜬다. 아는 것만 우리말로 바꾸고 **모르는 것은 지어내지 않는다** — 원문을 남긴다.
const KIND_LABEL = {
  '#discount_desc_preset_special': '특별 할인',
  '#discount_desc_preset_daily': '일일 할인',
  '#discount_desc_preset_weeklong': '주간 할인',
  '#discount_desc_preset_weekend': '주말 할인',
  '#discount_desc_preset_launch': '출시 기념 할인',
  '#discount_desc_preset_midweek': '주중 할인',
};

export function discountKindLabel(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  return KIND_LABEL[raw] ?? null;
}

export function buildPeriodUrl(appids) {
  if (!Array.isArray(appids) || appids.length === 0) throw new TypeError('appid 목록이 비었다');
  if (appids.length > PERIOD_BATCH) throw new TypeError(`한 번에 ${PERIOD_BATCH}개까지만 묻는다`);
  if (!appids.every(Number.isInteger)) throw new TypeError('appid 는 정수여야 한다');
  const input = {
    ids: appids.map((appid) => ({ appid })),
    context: { language: PERIOD_SOURCE.language, country_code: PERIOD_SOURCE.country, steam_realm: 1 },
    data_request: { include_assets: false, include_basic_info: false, include_release: false },
  };
  return `https://${PERIOD_SOURCE.host}/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;
}

// 이 응답은 원화 최소단위를 **문자열**로 준다(`"798000"`). appdetails 는 정수로 준다.
// 같은 값을 서로 다른 꼴로 주는 두 출처를 맞대려면 한쪽으로 맞춰야 한다.
function minorFromString(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * 응답 하나에서 appid → 할인 기간을 뽑는다.
 *
 * 할인이 없는 것, 무료인 것, 살 수 없는 것은 **여기 없다.** 없는 것을 `종료 시각 없음`
 * 으로 만들지 않는다 — 부르지 않은 것과 물어봤더니 없더라는 것은 다르다.
 */
export function parsePeriodResponse(body, now = new Date()) {
  const items = body?.response?.store_items;
  if (!Array.isArray(items)) throw new TypeError('StoreBrowse 응답에 store_items 가 없다');

  const fetchedAt = now.toISOString();
  const periods = new Map();

  for (const item of items) {
    const appid = item?.appid ?? item?.id;
    if (!Number.isInteger(appid)) continue;

    const option = item.best_purchase_option;
    if (!option || typeof option !== 'object') continue; // 살 수 없거나 무료
    const discount = option.active_discounts?.[0];
    if (!discount || typeof discount !== 'object') continue; // 정가

    const endsAtEpoch = discount.discount_end_date;
    const percent = option.discount_pct;

    periods.set(appid, {
      appid,
      // 끝나는 시각을 못 받으면 **비워 둔다.** 임의 시각을 만들지 않는다 — 규칙 5-3 이
      // 무료 주말에 대해 정한 것과 같다.
      endsAt: Number.isInteger(endsAtEpoch) && endsAtEpoch > 0
        ? new Date(endsAtEpoch * 1000).toISOString()
        : null,
      kindRaw: typeof discount.discount_description === 'string' ? discount.discount_description : null,
      kindLabel: discountKindLabel(discount.discount_description),
      // 맞대 볼 값. 우리가 화면에 쓰는 할인율은 이것이 아니라 appdetails 것이다.
      percentHere: Number.isInteger(percent) ? percent : null,
      finalMinorHere: minorFromString(option.final_price_in_cents),
      fetchedAt,
      sourceLabel: PERIOD_SOURCE.label,
    });
  }

  return periods;
}

/**
 * 가격 Reading 에 기간을 붙인다. **두 출처의 할인율이 다르면 그 사실을 같이 붙인다.**
 *
 * 다른 이유는 대개 하나다 — 두 번 부르는 사이에 할인이 바뀌었다. 그것도 사실이므로
 * 지운다고 없어지지 않는다. 어느 쪽이 맞다고 고르지 않고 둘 다 적는다.
 */
export function attachPeriod(reading, period) {
  if (!period) {
    return { ...reading, discountEndsAt: null, discountKind: null, periodKnown: false };
  }
  const disagrees = Number.isInteger(period.percentHere)
    && Number.isInteger(reading.discountPercent)
    && period.percentHere !== reading.discountPercent;

  return {
    ...reading,
    discountEndsAt: period.endsAt,
    discountKind: period.kindLabel ?? period.kindRaw,
    periodKnown: true,
    periodFetchedAt: period.fetchedAt,
    periodSourceLabel: period.sourceLabel,
    ...(disagrees ? { periodPercentDisagrees: period.percentHere } : {}),
  };
}
