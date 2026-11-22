import { app } from '@azure/functions';
import { registerAccountFunction } from './functions/account.js';
import { registerSaveFunction } from './functions/save.js';
import { registerLeaderboardsFunction } from './functions/leaderboards.js';

registerAccountFunction(app);
registerSaveFunction(app);
registerLeaderboardsFunction(app);
