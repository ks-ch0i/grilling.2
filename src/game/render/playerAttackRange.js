import {attackRangePolygon} from '../sim/combat.js';
import {stageTerrain} from '../sim/stage.js';

export function playerAttackRangePoints(player,stage,run){
 return attackRangePolygon(player,stageTerrain(stage,run.arenaLocked,run.terrainLayout));
}
