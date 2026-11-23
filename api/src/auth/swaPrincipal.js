import { ApiError } from '../shared/http.js';

const MEMBER_ROLE = 'grill-member';
const SWA_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isSwaUserId(value) {
  return typeof value === 'string' && SWA_USER_ID.test(value);
}

// SWA invokes this callback only after validating the tenant's sign-in.
export function rolesForIdentity(identity) {
  if (identity?.identityProvider !== 'aad' || !Array.isArray(identity.claims)) return [];
  const accountClaims = identity.claims.filter(claim => claim?.typ === 'acct');
  const accountType = accountClaims[0]?.val;
  return accountClaims.length === 1 && (accountType === '0' || accountType === 0) ? [MEMBER_ROLE] : [];
}

export function requireSwaPrincipal(request) {
  // The managed API receives this header from the Static Web Apps gateway.
  const encoded = request.headers.get('x-ms-client-principal');
  if (!encoded) throw new ApiError(401, 'unauthorized');

  let identity;
  try {
    identity = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new ApiError(401, 'unauthorized');
  }

  if (identity?.identityProvider !== 'aad' || !Array.isArray(identity.userRoles) ||
      !identity.userRoles.includes(MEMBER_ROLE) || !isSwaUserId(identity.userId)) {
    throw new ApiError(403, 'forbidden');
  }

  const displayName = typeof identity.userDetails === 'string' ? identity.userDetails.trim() : '';
  if (!displayName || [...displayName].length > 80) throw new ApiError(403, 'forbidden');
  return { userId: identity.userId, displayName };
}
