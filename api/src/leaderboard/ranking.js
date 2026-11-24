import { compareHardProgress } from '../save/hardProgress.js';

export function normalizeHardResult(row) {
  if (!Number.isSafeInteger(row?.elapsedTicks) || row.elapsedTicks < 0 ||
      !Number.isSafeInteger(row?.deaths) || row.deaths < 0) {
    throw new TypeError('Invalid Hard leaderboard counters');
  }
  const hasRound = Object.hasOwn(row, 'roundReached');
  const hasCleared = Object.hasOwn(row, 'cleared');
  if (!hasRound && !hasCleared) {
    return { roundReached: 8, cleared: true, elapsedTicks: row.elapsedTicks, deaths: row.deaths };
  }
  if (!hasRound || !hasCleared || !Number.isInteger(row.roundReached) || row.roundReached < 1 || row.roundReached > 8 ||
      typeof row.cleared !== 'boolean' || (row.cleared && row.roundReached !== 8)) {
    throw new TypeError('Invalid Hard leaderboard result');
  }
  return {
    roundReached: row.roundReached,
    cleared: row.cleared,
    elapsedTicks: row.elapsedTicks,
    deaths: row.deaths
  };
}

export function compareResults(mode, left, right) {
  if (mode === 'hard') return compareHardProgress(normalizeHardResult(left), normalizeHardResult(right));
  if (left.elapsedTicks !== right.elapsedTicks) return left.elapsedTicks - right.elapsedTicks;
  return left.deaths - right.deaths;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function rankBoard(rows, userId, boardId, mode) {
  const ordered = [...rows].sort((left, right) => compareResults(mode, left, right) ||
    compareText(left.displayName, right.displayName) || compareText(left.userId, right.userId));
  let rank = 0;
  let previous = null;
  const ranked = ordered.map((row, index) => {
    if (previous === null || compareResults(mode, previous, row) !== 0) rank = index + 1;
    previous = row;
    const score = mode === 'hard' ? normalizeHardResult(row) : {};
    return { row: { ...row, ...score }, rank };
  });
  const toEntry = ({ row, rank: rowRank }) => mode === 'hard'
    ? {
        rank: rowRank,
        displayName: row.displayName,
        roundReached: row.roundReached,
        cleared: row.cleared,
        elapsedTicks: row.elapsedTicks,
        deaths: row.deaths
      }
    : { rank: rowRank, displayName: row.displayName, elapsedTicks: row.elapsedTicks, deaths: row.deaths };
  const mine = ranked.find(({ row }) => row.userId === userId);
  return {
    boardId,
    totalParticipants: ranked.length,
    entries: ranked.slice(0, 10).map(toEntry),
    me: mine ? toEntry(mine) : null
  };
}
