const accountIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

export async function readSwaAccount() {
  const response = await fetch('/.auth/me', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read the login session');

  const { clientPrincipal: principal } = await response.json();
  if (principal === null) return { status: 'signed-out' };
  if (principal?.identityProvider !== 'aad' || !Array.isArray(principal.userRoles) ||
      !principal.userRoles.includes('grill-member')) return { status: 'forbidden' };

  const displayName = typeof principal.userDetails === 'string' ? principal.userDetails.trim() : '';
  if (typeof principal.userId !== 'string' || !accountIdPattern.test(principal.userId) ||
      !displayName || [...displayName].length > 80) throw new Error('Invalid login session');

  return { status: 'member', account: { userId: principal.userId, displayName } };
}

export function signIn() {
  window.location.assign('/.auth/login/aad?post_login_redirect_uri=/');
}

export function signOut() {
  window.location.assign('/.auth/logout?post_logout_redirect_uri=/');
}
