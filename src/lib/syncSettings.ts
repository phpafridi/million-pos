import { prisma } from '@/lib/prisma'
import { getShopScope, type ShopScope } from '@/lib/getShopScope'

export type SyncDataType = 'products' | 'categories' | 'tax_rules' | 'measurement_units' | 'customers' | 'suppliers' | 'tailor_measurements'

/** Whether this data type is currently shared across every franchise. */
export async function isSynced(dataType: SyncDataType): Promise<boolean> {
  const row = await prisma.tbl_sync_setting.findUnique({ where: { data_type: dataType } })
  return row?.is_synced ?? true // default to shared if the setting row is somehow missing
}

/**
 * The shop_id to stamp on a newly-created record of this type: NULL
 * (shared, visible to every franchise) if syncing is on, or the acting
 * shop's own id (private) if syncing is off.
 */
export async function shopIdForNewRecord(dataType: SyncDataType, scope: ShopScope, fallbackShopId = 1): Promise<number | null> {
  const synced = await isSynced(dataType)
  if (synced) return null
  return scope.shopId ?? fallbackShopId
}

/**
 * Where-clause fragment for reading records of this type: shared rows
 * (shop_id IS NULL) plus the acting shop's own private rows, regardless
 * of whether the type is currently synced — turning sync off never hides
 * a shop's own previously-created private data from itself, and old
 * shared rows already visible to everyone stay visible even if sync gets
 * turned off later (only new records go private from that point on).
 */
/**
 * Suppliers have a third visibility tier beyond the generic shared/private
 * split: a shared supplier can be marked "warehouse only", meaning it's
 * visible to every warehouse-flagged shop but hidden from regular
 * franchises (e.g. a bulk supplier only warehouses actually buy from).
 */
export function supplierVisibilityWhere(scope: ShopScope) {
  const shopId = scope.shopId ?? 1
  if (scope.isWarehouse || scope.isSuperAdmin) {
    // Warehouses (and Head Office, for oversight) see everything shared,
    // including warehouse-only suppliers, plus their own private ones.
    return { OR: [{ shop_id: null }, { shop_id: shopId }] }
  }
  // Regular franchises never see warehouse-only suppliers, shared or not.
  return { OR: [{ shop_id: null, warehouse_only: false }, { shop_id: shopId }] }
}

export function sharedOrOwnWhere(scope: ShopScope, fallbackShopId = 1) {
  const shopId = scope.shopId ?? fallbackShopId
  return { OR: [{ shop_id: null }, { shop_id: shopId }] }
}

/**
 * Throws if this record is private to a different shop than the caller's.
 * A NULL shop_id means the record is shared — anyone can act on it. Only
 * matters for the toggleable data types (products, categories, tax rules,
 * measurement units, customers, suppliers), where a record can now be
 * private to whichever shop created it.
 */
export function assertCanModifyRecord(scope: ShopScope, recordShopId: number | null) {
  if (recordShopId === null) return // shared — anyone can modify
  if (scope.isSuperAdmin) return // Head Office can act on anything
  if (scope.shopId !== recordShopId) {
    throw new Error('This record belongs to a different franchise and cannot be modified here')
  }
}

const MEASUREMENT_FIELDS = [
  'measurement_length', 'measurement_teera', 'measurement_chest', 'measurement_waist',
  'measurement_hip', 'measurement_shoulder', 'measurement_sleeve_length', 'measurement_sleeve_round',
  'measurement_neck', 'measurement_daman', 'measurement_shalwar_length', 'measurement_bottom',
] as const

/**
 * Redacts a customer's measurement fields when viewing them from a shop
 * that isn't the one that actually owns the record, and Head Office has
 * measurement-sharing turned off — independent of whether basic contact
 * info (name/phone/email) sharing is on. Lets a franchise look up an
 * existing customer by phone without necessarily seeing their exact body
 * measurements, which another franchise may consider more sensitive
 * than a name and phone number.
 *
 * A customer's own shop always sees their own measurements regardless
 * of this setting — this only affects viewing someone else's customer.
 */
export async function redactMeasurementsIfNeeded<T extends { shop_id: number | null }>(
  customer: T,
  scope: ShopScope
): Promise<T> {
  // A shared customer (shop_id null) has no specific "other shop" to
  // redact from — only a genuinely private customer belonging to a
  // DIFFERENT, specific shop should ever be redacted.
  const isPrivateToAnotherShop = customer.shop_id !== null && customer.shop_id !== scope.shopId
  if (!isPrivateToAnotherShop) return customer

  const measurementsShared = await isSynced('tailor_measurements')
  if (measurementsShared) return customer

  const redacted = { ...customer }
  for (const field of MEASUREMENT_FIELDS) {
    if (field in redacted) (redacted as any)[field] = null
  }
  return redacted
}
