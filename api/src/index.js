import { app } from '@azure/functions';
import { registerRolesFunction } from './functions/roles.js';
import { registerSaveFunction } from './functions/save.js';
import { registerLeaderboardsFunction } from './functions/leaderboards.js';

registerRolesFunction(app);
registerSaveFunction(app);
registerLeaderboardsFunction(app);
