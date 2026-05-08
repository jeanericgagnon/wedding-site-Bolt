function hasPermissionKey(permissions: unknown, key: string): boolean {
  return Array.isArray(permissions) && permissions.map(String).includes(key);
}

function hasMutatingCollaboratorRole(role: unknown): boolean {
  return role === "planner" || role === "coordinator";
}

export function canMutateMessages(role: unknown, permissions: unknown): boolean {
  return hasMutatingCollaboratorRole(role) && hasPermissionKey(permissions, "messages");
}

export function canMutateGuestsOrMessages(role: unknown, permissions: unknown): boolean {
  return hasMutatingCollaboratorRole(role)
    && (hasPermissionKey(permissions, "guests") || hasPermissionKey(permissions, "messages"));
}

export function canMutatePhotos(role: unknown, permissions: unknown): boolean {
  if (!hasMutatingCollaboratorRole(role)) return false;
  if (!Array.isArray(permissions)) return true;
  return hasPermissionKey(permissions, "photos") || hasPermissionKey(permissions, "media");
}
