import {attackRangePolygon} from '../sim/combat.js';
import {stageTerrain} from '../sim/stage.js';
import {isProfiledPlatform,platformOcclusionRects} from '../sim/platforms.js';

export function playerAttackRangePoints(player,stage,run){
 const profiles=run.terrainLayout.platforms.filter(isProfiledPlatform);
 return attackRangePolygon(player,[...stageTerrain(stage,run.arenaLocked,run.terrainLayout),...platformOcclusionRects(profiles)]);
}
