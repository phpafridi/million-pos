// lib/flattenNavigation.ts
import { navigationMenus, NavItem } from "../components/employee/constants/navigationMenus";

export function flattenNavigation(
  menus: NavItem[],
  parentKey: string[] = []
): Record<string, string> {
  let map: Record<string, string> = {};

  for (const item of menus) {
    const key = item.title.toLowerCase().replace(/\s+/g, "-"); // e.g. "New Order" → "new-order"

    if (item.path) {
      map[item.path] = key;
    }

    if (item.children) {
      Object.assign(map, flattenNavigation(item.children, [...parentKey, key]));
    }
  }

  return map;
}

// ready-to-use routePermissions
export const routePermissions = flattenNavigation(navigationMenus);
