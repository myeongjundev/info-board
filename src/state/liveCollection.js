// 공개 fixture의 저장 계약과 live의 측정 정책을 가르는 경계.
//
// upsertRecord는 계약대로 같은 날짜 성공을 같은 행에서 갱신한다. 하지만 실제
// 동시접속자는 조회 시각이 바뀌면 의미도 바뀐다. 그래서 live 수집기는 오늘 이미
// 저장된 게임을 다시 부르지 않고, 빠진 게임만 한 번 채운다.

export function pendingGamesForDate(records, games, date) {
  const stored = new Set(
    records
      .filter((record) => record.date === date && Number.isInteger(record.appid))
      .map((record) => record.appid),
  );
  return games.filter((game) => !stored.has(game.appid));
}
