import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

type RouteParams = {
  params: Promise<{ id: string; transactionId: string }>
}

// Helper function to recalculate ALL balances
async function recalculateLedgerBalances(ledgerId: number) {
  try {
    // Get all transactions sorted by date
    const transactions = await prisma.tbl_ledger_transaction.findMany({
      where: { ledger_id: ledgerId },
      orderBy: { transaction_date: 'asc' }
    })

    let runningBalance = 0
    
    // Update each transaction with correct balances
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]
      const previousBalance = runningBalance
      const amount = transaction.amount.toNumber()
      
      if (transaction.transaction_type === 'karz_leya') {
        runningBalance += amount
      } else {
        runningBalance -= amount
      }

      // Update the transaction
      await prisma.tbl_ledger_transaction.update({
        where: { transaction_id: transaction.transaction_id },
        data: {
          previous_balance: previousBalance,
          new_balance: runningBalance
        }
      })
    }

    // Update ledger total balance
    await prisma.tbl_ledger.update({
      where: { ledger_id: ledgerId },
      data: { total_balance: runningBalance }
    })

    return runningBalance
  } catch (error) {
    console.error('Error recalculating balances:', error)
    throw error
  }
}

// PUT - Update transaction
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id, transactionId } = await context.params
    const ledgerId = parseInt(id)
    const transId = parseInt(transactionId)
    const body = await request.json()

    if (isNaN(ledgerId) || isNaN(transId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IDs' },
        { status: 400 }
      )
    }

    // Validate amount
    const amount = parseFloat(body.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid amount' },
        { status: 400 }
      )
    }

    // Validate transaction type
    if (!['karz_leya', 'karz_deya'].includes(body.transaction_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Check if transaction exists AND belongs to a ledger in this shop
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

    const existingTransaction = await prisma.tbl_ledger_transaction.findUnique({
      where: { transaction_id: transId }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update the transaction
    await prisma.tbl_ledger_transaction.update({
      where: { transaction_id: transId },
      data: {
        transaction_type: body.transaction_type,
        amount: amount,
        description: body.description || null,
        reference_number: body.reference_number || null,
      }
    })

    // Recalculate ALL balances
    await recalculateLedgerBalances(ledgerId)

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction updated successfully. All balances recalculated.'
    })

  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update transaction: ${error?.message || error}`
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete transaction
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id, transactionId } = await context.params
    const ledgerId = parseInt(id)
    const transId = parseInt(transactionId)

    if (isNaN(ledgerId) || isNaN(transId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IDs' },
        { status: 400 }
      )
    }

    // Check if transaction exists AND belongs to a ledger in this shop
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

    const existingTransaction = await prisma.tbl_ledger_transaction.findUnique({
      where: { transaction_id: transId }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete the transaction
    await prisma.tbl_ledger_transaction.delete({
      where: { transaction_id: transId }
    })

    // Recalculate ALL balances
    await recalculateLedgerBalances(ledgerId)

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction deleted successfully. All balances recalculated.'
    })

  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to delete transaction: ${error?.message || error}`
      },
      { status: 500 }
    )
  }
}