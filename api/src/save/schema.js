import { ApiError } from '../shared/http.js';

export const MAX_SAVE_BODY_BYTES = 256 * 1024;

const STAGE_IDS = ['forest-1', 'mine-1'];
const ROUND_KEYS = Array.from({ length: 8 }, (_, index) => String(index + 1));
const ROUND_ENEMY_COUNTS = [1, 2, 3, 4, 0, 6, 3, 3];
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAYER_KEYS = [
  'x', 'y', 'vx', 'vy', 'w', 'h', 'grounded', 'hp', 'mode', 'facing', 'horizontalFacing', 'aim',
  'invulnerableTicks', 'defenseMode', 'defenseTicksRemaining', 'shieldCooldownTicks', 'parryCooldownTicks',
  'rollCooldown', 'rollTicks', 'rollDirection', 'rollInvulnerable', 'damageInvulnerable', 'jumpCut',
  'diveCooldown', 'diveUsed', 'diveGraceTicks', 'diveGraceActive', 'attackTick', 'hitIds',
  'hurtTicks', 'hurtPushTicks', 'hurtPushDirection'
];
const RUN_KEYS = [
  'stageId', 'player', 'enemies', 'projectiles', 'boss', 'arenaLocked', 'consumedPickupIds',
  'elapsedTicks', 'deaths', 'outcome', 'deathTicks', 'round', 'roundClearTicks', 'rngState', 'bossSequence'
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0) && new Set(value).size === value.length;

function hasExactKeys(value, keys, optional = []) {
  if (!isObject(value)) return false;
  const allowed = [...keys, ...optional];
  return keys.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.includes(key));
}

function isFiniteJson(value, seen = new Set()) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((item) => isFiniteJson(item, seen));
    seen.delete(value);
    return valid;
  }
  if (isObject(value)) {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = Object.values(value).every((item) => isFiniteJson(item, seen));
    seen.delete(value);
    return valid;
  }
  return false;
}

function validRecord(value) {
  return hasExactKeys(value, ['elapsedTicks', 'deaths']) && isCount(value.elapsedTicks) && isCount(value.deaths);
}

function validRecordPair(value) {
  return hasExactKeys(value, ['best', 'recent']) &&
    (value.best === null || validRecord(value.best)) &&
    (value.recent === null || validRecord(value.recent));
}

function validStageRecordMap(value, validate) {
  return hasExactKeys(value, STAGE_IDS) && STAGE_IDS.every((stageId) => validate(value[stageId]));
}

function validRoundMap(value, validate) {
  return hasExactKeys(value, ROUND_KEYS) && ROUND_KEYS.every((round) => validate(value[round]));
}

function validRect(value, withTicks = false) {
  const keys = withTicks ? ['x', 'y', 'w', 'h', 'ticks'] : ['x', 'y', 'w', 'h'];
  return hasExactKeys(value, keys) && ['x', 'y', 'w', 'h'].every((key) => Number.isFinite(value[key])) &&
    value.w > 0 && value.h > 0 && (!withTicks || isCount(value.ticks));
}

function validPlayer(player) {
  if (!hasExactKeys(player, PLAYER_KEYS, ['dropPlatforms']) || !isFiniteJson(player)) return false;
  if (!hasExactKeys(player.aim, ['x', 'y']) || !Number.isFinite(player.aim.x) || !Number.isFinite(player.aim.y)) return false;
  if (!isStringList(player.hitIds) || !['idle', 'run', 'jump', 'fall', 'attack', 'roll', 'dive', 'hurt', 'dead'].includes(player.mode)) return false;
  if (!['none', 'shield', 'parry'].includes(player.defenseMode) || typeof player.grounded !== 'boolean') return false;
  if (player.w !== 16 || player.h !== 28 || !Number.isFinite(player.hp) || player.hp < 0 || player.hp > 3 || !Number.isInteger(player.hp * 2)) return false;
  if (typeof player.rollInvulnerable !== 'boolean' || typeof player.damageInvulnerable !== 'boolean' || typeof player.jumpCut !== 'boolean' ||
    typeof player.diveUsed !== 'boolean' || typeof player.diveGraceActive !== 'boolean') return false;
  if (![-1, 1].includes(player.horizontalFacing) || ![-1, 1].includes(player.rollDirection) || ![-1, 1].includes(player.hurtPushDirection)) return false;
  const counters = [
    'invulnerableTicks', 'defenseTicksRemaining', 'shieldCooldownTicks', 'parryCooldownTicks', 'rollCooldown', 'rollTicks',
    'diveCooldown', 'diveGraceTicks', 'attackTick', 'hurtTicks', 'hurtPushTicks'
  ];
  if (!counters.every((key) => isCount(player[key]))) return false;
  if (player.shieldCooldownTicks > 180 || player.parryCooldownTicks > 180 ||
    player.defenseMode === 'none' && player.defenseTicksRemaining !== 0 ||
    player.defenseMode === 'shield' && (player.defenseTicksRemaining < 1 || player.defenseTicksRemaining > 60) ||
    player.defenseMode === 'parry' && (player.defenseTicksRemaining < 1 || player.defenseTicksRemaining > 15)) return false;
  if ((player.mode === 'dead') !== (player.hp === 0)) return false;
  if (Object.hasOwn(player, 'dropPlatforms') && (!Array.isArray(player.dropPlatforms) ||
    player.dropPlatforms.some((index) => !isCount(index)) || new Set(player.dropPlatforms).size !== player.dropPlatforms.length)) return false;
  return true;
}

function validRun(run) {
  if (!isObject(run) || !isFiniteJson(run) || !STAGE_IDS.includes(run.stageId)) return false;
  const required = run.stageId === 'mine-1' ? [...RUN_KEYS, 'cartZones', 'hazards', 'bossDrop'] : RUN_KEYS;
  if (!hasExactKeys(run, required, ['terrainLayout'])) return false;
  if (run.outcome !== null || !isCount(run.elapsedTicks) || !isCount(run.deaths) || !isCount(run.deathTicks) ||
    !Number.isInteger(run.round) || run.round < 1 || run.round > 8 ||
    !(run.roundClearTicks === null || Number.isSafeInteger(run.roundClearTicks) && run.roundClearTicks > 0 && run.roundClearTicks <= 120) ||
    !isCount(run.rngState) || run.rngState > 0xffffffff || typeof run.bossSequence !== 'string' || typeof run.arenaLocked !== 'boolean') return false;
  if (!validPlayer(run.player) || !Array.isArray(run.enemies) || !Array.isArray(run.projectiles) ||
    !isObject(run.boss) || !isStringList(run.consumedPickupIds)) return false;
  const enemyKinds = run.stageId === 'forest-1' ? ['soldier', 'wisp', 'boar'] : ['golem', 'insect', 'bat'];
  const enemyStates = ['idle', 'chase', 'windup', 'attack', 'return', 'recovery', 'hurt', 'dead'];
  if (run.enemies.length !== ROUND_ENEMY_COUNTS[run.round - 1] || new Set(run.enemies.map((enemy) => enemy?.id)).size !== run.enemies.length ||
    run.enemies.some((enemy) => !isObject(enemy) || !isFiniteJson(enemy) || typeof enemy.id !== 'string' || !enemyKinds.includes(enemy.kind) ||
    !Number.isInteger(enemy.hp) || !Number.isInteger(enemy.maxHp) || enemy.hp < 0 || enemy.hp > enemy.maxHp || !isCount(enemy.stateTicks) ||
    !enemyStates.includes(enemy.state) || !isStringList(enemy.hitIds))) return false;
  if (run.projectiles.some((projectile) => !hasExactKeys(projectile, ['id', 'ownerId', 'x', 'y', 'w', 'h', 'vx', 'vy', 'life', 'alive']) ||
    typeof projectile.id !== 'string' || typeof projectile.ownerId !== 'string' || !isCount(projectile.life) || typeof projectile.alive !== 'boolean' ||
    !['x', 'y', 'w', 'h', 'vx', 'vy'].every((key) => Number.isFinite(projectile[key])) || projectile.w <= 0 || projectile.h <= 0)) return false;
  if (!isCount(run.boss.hp) || !isCount(run.boss.maxHp) || run.boss.hp > run.boss.maxHp || !isCount(run.boss.stateTicks) || !isCount(run.boss.cycle) ||
    ![1, 2].includes(run.boss.phase) || !['dormant', 'intro', 'transition', 'windup', 'attack', 'recovery', 'dying', 'dead'].includes(run.boss.state) ||
    !Array.isArray(run.boss.telegraphs) || run.boss.telegraphs.some((rect) => !validRect(rect)) ||
    !Array.isArray(run.boss.hitboxes) || run.boss.hitboxes.some((rect) => !validRect(rect, true))) return false;
  if (run.stageId === 'mine-1') {
    if (!['machine', 'worm'].includes(run.boss.kind) || run.boss.id !== (run.boss.kind === 'machine' ? 'mine-machine' : 'mine-worm') ||
      !Array.isArray(run.cartZones) || !Array.isArray(run.hazards) || !isObject(run.bossDrop) ||
      !['none', 'machine', 'worm-intro', 'worm', 'done'].includes(run.bossSequence) || !isCount(run.boss.attackSerial) || !isCount(run.boss.burrowsLeft)) return false;
    if (run.cartZones.length !== 5 || run.cartZones.some((zone, index) => !hasExactKeys(zone, ['id', 'centerX', 'direction', 'state', 'ticks', 'cartId']) ||
      zone.id !== `cart-${index + 1}` || !Number.isSafeInteger(zone.centerX) || ![-1, 1].includes(zone.direction) ||
      !['countdown', 'warning', 'active'].includes(zone.state) || !isCount(zone.ticks) || !(zone.cartId === null || typeof zone.cartId === 'string'))) return false;
    const hazardKinds = ['wave', 'acid-shot', 'acid-pool', 'cart', 'rock', 'mineral'];
    if (run.hazards.some((hazard) => !isObject(hazard) || typeof hazard.id !== 'string' || typeof hazard.ownerId !== 'string' ||
      !hazardKinds.includes(hazard.kind) || !['x', 'y', 'w', 'h', 'vx', 'vy'].every((key) => Number.isFinite(hazard[key])) ||
      hazard.w <= 0 || hazard.h <= 0 || !isCount(hazard.life) || typeof hazard.alive !== 'boolean')) return false;
    if (!hasExactKeys(run.bossDrop, ['rolled', 'spawned', 'consumed', 'x', 'y']) ||
      !['rolled', 'spawned', 'consumed'].every((key) => typeof run.bossDrop[key] === 'boolean') ||
      !Number.isFinite(run.bossDrop.x) || !Number.isFinite(run.bossDrop.y)) return false;
  } else if (run.boss.id !== 'forest-guardian') {
    return false;
  } else if (run.bossSequence !== 'none') {
    return false;
  }
  if (Object.hasOwn(run, 'terrainLayout')) {
    const layout = run.terrainLayout;
    const authored = hasExactKeys(layout, ['mode', 'presetId', 'platforms']) && layout.mode === 'authored' && typeof layout.presetId === 'string';
    const legacy = hasExactKeys(layout, ['mode', 'platforms']) && layout.mode === 'legacy-fixed';
    if ((!authored && !legacy) || !Array.isArray(layout.platforms) || layout.platforms.some((platform) => !isObject(platform))) return false;
    if (Object.hasOwn(run.player, 'dropPlatforms') && run.player.dropPlatforms.some((index) => index >= layout.platforms.length)) return false;
  }
  return true;
}

export function validateCloudSave(value) {
  if (!hasExactKeys(value, ['version', 'run', 'unlockedStageIds', 'records', 'easy']) || value.version !== 6) return false;
  if (!(value.run === null || validRun(value.run))) return false;
  if (!Array.isArray(value.unlockedStageIds) || !value.unlockedStageIds.includes('forest-1') ||
    new Set(value.unlockedStageIds).size !== value.unlockedStageIds.length || value.unlockedStageIds.some((id) => !STAGE_IDS.includes(id))) return false;
  if (value.run !== null && !value.unlockedStageIds.includes(value.run.stageId)) return false;
  if (!validStageRecordMap(value.records, (records) => hasExactKeys(records, ['best', 'recent']) &&
    (records.best === null || validRecord(records.best)) && (records.recent === null || validRecord(records.recent)))) return false;

  const easy = value.easy;
  if (!hasExactKeys(easy, ['unlockedRoundByStage', 'roundDeaths', 'roundRecords'])) return false;
  if (!hasExactKeys(easy.unlockedRoundByStage, STAGE_IDS) ||
    !Number.isInteger(easy.unlockedRoundByStage['forest-1']) || easy.unlockedRoundByStage['forest-1'] < 1 || easy.unlockedRoundByStage['forest-1'] > 8 ||
    !Number.isInteger(easy.unlockedRoundByStage['mine-1']) || easy.unlockedRoundByStage['mine-1'] < 0 || easy.unlockedRoundByStage['mine-1'] > 8) return false;
  return validStageRecordMap(easy.roundDeaths, (rounds) => validRoundMap(rounds, isCount)) &&
    validStageRecordMap(easy.roundRecords, (rounds) => validRoundMap(rounds, validRecordPair));
}

function validPrincipal(principal) {
  return isObject(principal) && GUID_PATTERN.test(principal.tenantId) && GUID_PATTERN.test(principal.objectId) &&
    principal.userId === `${principal.tenantId}:${principal.objectId}` && typeof principal.displayName === 'string' &&
    [...principal.displayName.trim()].length > 0 && [...principal.displayName.trim()].length <= 80;
}

function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function cloudFields(document) {
  return {
    version: document.version,
    run: document.run,
    unlockedStageIds: document.unlockedStageIds,
    records: document.records,
    easy: document.easy
  };
}

export function toSaveDocument(save, principal, { revision = 1, updatedAt = new Date().toISOString() } = {}) {
  if (!validateCloudSave(save)) throw new ApiError(400, 'invalid_payload');
  if (!validPrincipal(principal)) throw new ApiError(403, 'forbidden');
  if (!isCount(revision) || revision < 1 || !validTimestamp(updatedAt)) throw new ApiError(503, 'service_unavailable');

  return {
    id: principal.userId,
    userId: principal.userId,
    tenantId: principal.tenantId,
    objectId: principal.objectId,
    displayName: principal.displayName.trim(),
    ...structuredClone(cloudFields(save)),
    updatedAt,
    revision
  };
}

export function fromSaveDocument(document) {
  if (!isObject(document) || typeof document.id !== 'string' || document.id !== document.userId ||
    !GUID_PATTERN.test(document.tenantId) || !GUID_PATTERN.test(document.objectId) ||
    document.userId !== `${document.tenantId}:${document.objectId}` ||
    typeof document.displayName !== 'string' || [...document.displayName.trim()].length < 1 || [...document.displayName.trim()].length > 80 ||
    !isCount(document.revision) || document.revision < 1 || !validTimestamp(document.updatedAt) ||
    !validateCloudSave(cloudFields(document))) throw new ApiError(503, 'service_unavailable');

  return structuredClone(cloudFields(document));
}
