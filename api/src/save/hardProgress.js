export function compareHardProgress(left, right) {
  return right.roundReached - left.roundReached ||
    Number(right.cleared) - Number(left.cleared) ||
    left.deaths - right.deaths ||
    left.elapsedTicks - right.elapsedTicks;
}

function completionProgress(record) {
  if (record === null) return null;
  return { roundReached: 8, cleared: true, elapsedTicks: record.elapsedTicks, deaths: record.deaths };
}

export function completionProgressFromRecords(records) {
  return Object.fromEntries(Object.entries(records).map(([stageId, { best, recent }]) => [
    stageId,
    { best: completionProgress(best), recent: completionProgress(recent) }
  ]));
}
