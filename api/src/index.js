import { app } from '@azure/functions';
import { registerAccountFunction } from './functions/account.js';
import { registerSaveFunction } from './functions/save.js';

registerAccountFunction(app);
registerSaveFunction(app);
