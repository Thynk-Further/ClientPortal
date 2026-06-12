export const CLIENT_PORTAL_ROLE_NAMES = ['ClientUser', 'ClientAdmin'] as const;

export type ClientPortalRoleName = (typeof CLIENT_PORTAL_ROLE_NAMES)[number];

export const ClientRole = {
  ClientAdmin: 4,
  ClientUser: 5,
} as const;

export function isClientPortalRoleName(role: string): role is ClientPortalRoleName {
  return (CLIENT_PORTAL_ROLE_NAMES as readonly string[]).includes(role);
}

export function isClientPortalUser(
  roles: readonly string[],
  roleValue?: number | null,
): boolean {
  if (
    roleValue === ClientRole.ClientAdmin ||
    roleValue === ClientRole.ClientUser
  ) {
    return true;
  }

  return roles.some((role) => isClientPortalRoleName(role));
}
