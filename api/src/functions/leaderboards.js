import { config } from '../config.js';
import { requireSwaPrincipal } from '../auth/swaPrincipal.js';
import { parseBoardRequest } from '../leaderboard/boardId.js';
import { createLeaderboardService } from '../leaderboard/service.js';
import { errorResponse, jsonResponse } from '../shared/http.js';

export function registerLeaderboardsFunction(functionApp, { serviceFactory = createLeaderboardService } = {}) {
  functionApp.http('leaderboards', {
    route: 'leaderboards',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
      try {
        const principal = requireSwaPrincipal(request);
        const challenge = parseBoardRequest(request);
        const result = await serviceFactory(config).getBoard(challenge, principal);
        return jsonResponse(200, result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  });
}
