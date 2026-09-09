/**
 * Same permission logic as the sidebar nav (Navigation.tsx), extracted so
 * individual action buttons (Edit, View, Delete...) can check "does this
 * user actually have this permission" — not just "is there a nav link for
 * it" — for the routes that were previously ungated (an admin could check
 * every Product box and still have no way to specifically grant/deny
 * Edit Product, because it was never a checkbox in the first place).
 *
 * @param kind Controls whether Head Office is allowed:
 *   - 'edit': blocked. Franchise-operational actions (editing a product,
 *     a supplier, a customer...) — Head Office is reports-only for these.
 *   - 'view': allowed. Reading something (an invoice, an order) is itself
 *     a report-like action, not an edit.
 *   - 'admin': allowed. Actions that are Head Office's own job regardless
 *     of the reports-only rule — e.g. managing employee accounts across
 *     every franchise. Blocking these would leave Head Office unable to
 *     do the one thing it's actually supposed to administer.
 */
export function hasPermission(session: any, value: string, kind: 'view' | 'edit' | 'admin' = 'edit'): boolean {
  const roles: string[] = session?.user?.roles || [];
  const isSuperAdmin = Boolean(session?.user?.is_super_admin);
  const isShopAdmin = session?.user?.flag === '1';
  const showAll = isShopAdmin || roles.length === 0;

  if (isSuperAdmin) return kind !== 'edit';

  return showAll || roles.includes(value);
}
