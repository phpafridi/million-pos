/**
 * Converts a raw error (usually from Prisma) into a message safe to show
 * a user — never table names, column names, SQL fragments, or
 * connection details. Falls back to a generic message for anything not
 * specifically recognized, rather than risk leaking technical detail.
 *
 * Usage in a catch block:
 *   catch (error) {
 *     return { success: false, error: toFriendlyError(error) }
 *   }
 */
export function toFriendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)

  // Prisma unique constraint violation — e.g. a duplicate product code,
  // email, or barcode. Try to name the actual field when Prisma includes
  // it, since "this already exists" alone can be too vague to act on.
  if (raw.includes('Unique constraint failed')) {
    const fieldMatch = raw.match(/fields:\s*\(`?(\w+)`?\)/)
    const field = fieldMatch?.[1]
    return field
      ? `This ${field.replace(/_/g, ' ')} is already in use. Please use a different value.`
      : 'This value is already in use. Please use a different value.'
  }

  // Foreign key violation — e.g. trying to delete something still
  // referenced elsewhere, or assign a category/supplier that was
  // deleted since the page loaded.
  if (raw.includes('Foreign key constraint') || raw.includes('foreign key constraint fails')) {
    return 'This action can\'t be completed because it\'s linked to other existing records.'
  }

  // Record not found — e.g. editing something that was deleted by
  // someone else in the meantime.
  if (raw.includes('Record to update not found') || raw.includes('Record to delete does not exist')) {
    return 'This item no longer exists — it may have been removed already.'
  }

  // Database connection issues — covers "Can't reach database server",
  // ECONNREFUSED, timeouts, and similar infrastructure-level failures.
  if (
    raw.includes("Can't reach database server") ||
    raw.includes('ECONNREFUSED') ||
    raw.includes('Connection refused') ||
    raw.includes('Connection terminated') ||
    raw.includes('timeout')
  ) {
    return 'We\'re having trouble connecting right now. Please try again in a moment.'
  }

  // Any other Prisma-specific technical error (table/column references,
  // query engine errors, validation errors with field paths, etc.) —
  // catch broadly so nothing technical slips through unrecognized.
  if (
    raw.includes('Prisma') ||
    raw.includes('prisma.') ||
    /\btbl_\w+\b/.test(raw) ||
    raw.includes('Invalid `') ||
    raw.includes('P2')  // Prisma error codes like P2002, P2025, etc.
  ) {
    return 'Something went wrong while saving. Please try again, and contact support if it continues.'
  }

  // Anything else is assumed to already be one of our own intentional,
  // user-facing messages (e.g. "Please select a category!") — passed
  // through unchanged.
  return raw
}
