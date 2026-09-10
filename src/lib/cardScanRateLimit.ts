import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Card numbers are 6 digits — not astronomically hard to guess via
// automated requests. Each successful guess reveals a customer's name
// and points balance, so this is worth limiting even though the stakes
// are lower than login (no password, no money movement, no order access
// granted by a card number alone).
const MAX_FAILURES_PER_IP = 20;
const WINDOW_MINUTES = 15;

export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function checkCardScanRateLimit(ip: string): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const failures = await prisma.tbl_card_scan_attempt.count({
    where: { ip_address: ip, success: false, attempted_at: { gte: since } },
  });
  if (failures >= MAX_FAILURES_PER_IP) {
    return { allowed: false, reason: `Too many card lookups from this till. Try again in ${WINDOW_MINUTES} minutes, or select the customer manually.` };
  }
  return { allowed: true };
}

export async function recordCardScanAttempt(ip: string, success: boolean) {
  try {
    await prisma.tbl_card_scan_attempt.create({ data: { ip_address: ip, success } });
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
      await prisma.tbl_card_scan_attempt.deleteMany({ where: { attempted_at: { lt: cutoff } } });
    }
  } catch (err) {
    console.error("Failed to record card scan attempt:", err);
  }
}
