function count(items) {
  return Array.isArray(items) ? items.length : null;
}

export function dealsOverview({ tracked, popular, epic, steamKeep, steamWeekend }) {
  const saleLists = [tracked, popular].filter(Array.isArray);
  const onSale = saleLists.length === 0
    ? null
    : new Set(saleLists.flat().map((item) => item.appid).filter(Number.isInteger)).size;

  return {
    epicFree: count(epic),
    steamKeep: count(steamKeep),
    steamWeekend: count(steamWeekend),
    onSale,
  };
}
