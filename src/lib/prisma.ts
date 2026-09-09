// lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// On Vercel serverless, each invocation may get a fresh Node process.
// We store the client on `global` to reuse it across warm invocations,
// but we NEVER reuse it in production the same way as dev.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Reduce transaction timeout — fail fast rather than hanging
    transactionOptions: {
      maxWait: 5000,   // max time waiting for a connection (ms)
      timeout: 10000,  // max time the transaction can run (ms)
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
