import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scope = await getShopScope()
    const shopFilter = scopeWhere(scope)

    // Get total ledgers count
    const totalLedgers = await prisma.tbl_ledger.count({ where: shopFilter })

    // Get sum of all positive balances (Karz Leya)
    const totalDebitResult = await prisma.tbl_ledger.aggregate({
      _sum: {
        total_balance: true,
      },
      where: {
        total_balance: {
          gt: 0,
        },
        ...shopFilter,
      },
    })

    // Get sum of all negative balances (Karz Deya)
    const totalCreditResult = await prisma.tbl_ledger.aggregate({
      _sum: {
        total_balance: true,
      },
      where: {
        total_balance: {
          lt: 0,
        },
        ...shopFilter,
      },
    })

    // Get net balance (sum of all balances)
    const netBalanceResult = await prisma.tbl_ledger.aggregate({
      _sum: {
        total_balance: true,
      },
      where: shopFilter,
    })

    // Convert Decimal to number
    const totalDebit = totalDebitResult._sum.total_balance?.toNumber() || 0
    const totalCredit = Math.abs(totalCreditResult._sum.total_balance?.toNumber() || 0)
    const totalBalance = netBalanceResult._sum.total_balance?.toNumber() || 0

    return NextResponse.json({
      totalLedgers,
      totalDebit,
      totalCredit,
      totalBalance,
    })
  } catch (error: any) {
    console.error('Error fetching ledger stats:', error)
    return NextResponse.json(
      { error: `Failed to fetch statistics: ${error?.message || error}` },
      { status: 500 }
    )
  }
}