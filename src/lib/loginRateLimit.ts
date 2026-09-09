import { prisma } from "@/lib/prisma";

// Tuned to stop automated guessing without locking out a real person who
// just fat-fingers their password a few times.
const MAX_FAILURES_PER_IP = 15;      // across ALL accounts from one IP — catches credential-stuffing / scanning many emails
const MAX_FAILURES_PER_EMAIL = 6;    // against ONE account — catches targeted brute force even if spread across many IPs
const WINDOW_MINUTES = 15;

export type RateLimitResult = { allowed: true } | { allowed: false; reason: string };

export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const [ipFailures, emailFailures] = await Promise.all([
    prisma.tbl_login_attempt.count({
      where: { ip_address: ip, success: false, attempted_at: { gte: since } },
    }),
    prisma.tbl_login_attempt.count({
      where: { email, success: false, attempted_at: { gte: since } },
    }),
  ]);

  if (ipFailures >= MAX_FAILURES_PER_IP) {
    return { allowed: false, reason: `Too many failed login attempts from this network. Try again in ${WINDOW_MINUTES} minutes.` };
  }
  if (emailFailures >= MAX_FAILURES_PER_EMAIL) {
    return { allowed: false, reason: `Too many failed login attempts for this account. Try again in ${WINDOW_MINUTES} minutes.` };
  }

  return { allowed: true };
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  try {
    await prisma.tbl_login_attempt.create({ data: { email, ip_address: ip, success } });

    // Opportunistic cleanup — no cron job available, so piggyback on a
    // small fraction of real attempts instead. Keeps the table from
    // growing forever without needing a scheduled task.
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
      await prisma.tbl_login_attempt.deleteMany({ where: { attempted_at: { lt: cutoff } } });
    }
  } catch (err) {
    // Never let logging itself block a login
    console.error("Failed to record login attempt:", err);
  }
}

/** Best-effort real client IP from standard proxy headers, falling back to a shared bucket if none are present (still rate-limits, just less precisely). */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | null => {
    if (headers instanceof Headers) return headers.get(name);
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v ?? null;
  };

  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = get("x-real-ip");
  if (real) return real;

  return "unknown";
}
