import { rolePermissions } from "./rolePermissions";

export function checkAccess(role: string, page: string): boolean {
  return rolePermissions[role]?.includes(page) ?? false;
}
