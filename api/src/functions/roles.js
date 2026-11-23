import { rolesForIdentity } from '../auth/swaPrincipal.js';
import { jsonResponse } from '../shared/http.js';

export function registerRolesFunction(functionApp) {
  functionApp.http('roles', {
    route: 'roles',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
      const identity = await request.json().catch(() => null);
      return jsonResponse(200, { roles: rolesForIdentity(identity) });
    }
  });
}
