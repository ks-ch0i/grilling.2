import { config } from '../config.js';
import { requireEntraPrincipal } from '../auth/entraPrincipal.js';
import { errorResponse, jsonResponse } from '../shared/http.js';

export function registerAccountFunction(functionApp) {
  functionApp.http('account', {
    route: 'account',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
      if (!config) return jsonResponse(503, { error: 'service_unavailable' });

      try {
        const principal = await requireEntraPrincipal(request, config);
        return jsonResponse(200, principal);
      } catch (error) {
        return errorResponse(error);
      }
    }
  });
}
