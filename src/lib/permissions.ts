// lib/permissions.ts
import { UserByEmail } from "../components/employee/actions/UserByEmail";

export async function hasPermission(email: string, menu: string) {
  const user = await UserByEmail(email);

  if (!user) return false;
  if (user.flag === "1") return true; // admin always has access

  return user.user_roles.some((role) => role.menu_name === menu);
}
