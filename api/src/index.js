import { app } from '@azure/functions';
import { registerAccountFunction } from './functions/account.js';

registerAccountFunction(app);
