import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET all transactions for a ledger
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const ledgerId = parseInt(id)
    
    if (isNaN(ledgerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ledger ID' },
        { status: 400 }
      )
    }

    // Confirm this ledger belongs to the caller's shop before exposing
    // its transaction history
    const scope = await getShopScope()
    const ledgerOwned = await prisma.tbl_ledger.findFirst({
      where: { ledger_id: ledgerId, ...scopeWhere(scope) },
      select: { ledger_id: true },
    })
    if (!ledgerOwned) {
      return NextResponse.json(
        { success: false, error: 'Ledger not found' },
        { status: 404 }
      )
    }

    // Get transactions
    const transactions = await prisma.tbl_ledger_transaction.findMany({
      where: { ledger_id: ledgerId },
      orderBy: { transaction_date: 'desc' }
    })

    return NextResponse.json({ 
      success: true, 
      data: transactions 
    })

  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch transactions: ${error?.message || error}`,
        data: []
      },
      { status: 500 }
    )
  }
}

// POST - Add new transaction
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const ledgerId = parseInt(id)
    const body = await request.json()

    // Validate amount
    const amount = parseFloat(body.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid amount' },
        { status: 400 }
      )
    }

    // Get current ledger — scoped, so nobody can post a transaction
    // against another franchise's ledger by guessing its ID
    const scope = await getShopScope()
    const ledger = await prisma.tbl_ledger.findFirst({
      where: { ledger_id: ledgerId, ...scopeWhere(scope) }
    })

    if (!ledger) {
      return NextResponse.json(
        { success: false, error: 'Ledger not found' },
        { status: 404 }
      )
    }

    const currentBalance = ledger.total_balance.toNumber()
    let newBalance = currentBalance
    
    // Calculate new balance
    if (body.transaction_type === 'karz_leya') {
      newBalance = currentBalance + amount
    } else if (body.transaction_type === 'karz_deya') {
      newBalance = currentBalance - amount
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Create transaction
    await prisma.tbl_ledger_transaction.create({
      data: {
        ledger_id: ledgerId,
        transaction_type: body.transaction_type,
        amount: amount,
        description: body.description || null,
        previous_balance: currentBalance,
        new_balance: newBalance,
        reference_number: body.reference_number || null,
        created_by: body.created_by || 'Admin',
      }
    })

    // Update ledger balance
    await prisma.tbl_ledger.update({
      where: { ledger_id: ledgerId },
      data: { total_balance: newBalance }
    })

    await logActivity({
      action: 'ledger.transaction',
      entityType: 'ledger',
      entityId: ledgerId,
      description: `${body.transaction_type === 'karz_leya' ? 'Credit given (karz leya)' : 'Payment received (karz deya)'} of ${amount.toFixed(2)} on ${ledger.ledger_name}'s ledger — new balance ${newBalance.toFixed(2)}`,
      shopIdOverride: ledger.shop_id,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction added successfully'
    })

  } catch (error: any) {
    console.error('Error adding transaction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to add transaction: ${error?.message || error}`
      },
      { status: 500 }
    )
  }
}