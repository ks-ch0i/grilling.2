import {FOREST_STAGE} from './forestStage.js';
import {MINE_STAGE} from './mineStage.js';
export {validateStage} from './stageValidation.js';
export const STAGES=Object.freeze({'forest-1':FOREST_STAGE,'mine-1':MINE_STAGE});
export function getStage(id){if(!Object.hasOwn(STAGES,id))throw new TypeError('Unknown stage');return STAGES[id];}
