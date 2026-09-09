import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET ledger by ID with transactions
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const ledgerId = parseInt(id)
    const scope = await getShopScope()
    
    const ledger = await prisma.tbl_ledger.findFirst({
      where: { ledger_id: ledgerId, ...scopeWhere(scope) },
    })

    if (!ledger) {
      return NextResponse.json(
        { success: false, error: 'Ledger not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: ledger })
  } catch (error) {
    console.error('Error fetching ledger:', error)
    return NextResponse.json(
      { success: false, error: `Failed to fetch ledger: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

// PUT update ledger
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const ledgerId = parseInt(id)
    const body = await request.json()
    const scope = await getShopScope()

    const existing = await prisma.tbl_ledger.findFirst({
      where: { ledger_id: ledgerId, ...scopeWhere(scope) },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Ledger not found' }, { status: 404 })
    }

    const ledger = await prisma.tbl_ledger.update({
      where: { ledger_id: ledgerId },
      data: {
        ledger_name: body.ledger_name,
        email: body.email || null,
        address: body.address || null,
      },
    })

    return NextResponse.json({ success: true, data: ledger })
  } catch (error) {
    console.error('Error updating ledger:', error)
    return NextResponse.json(
      { success: false, error: `Failed to update ledger: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

// DELETE ledger
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const ledgerId = parseInt(id)
    const scope = await getShopScope()

    const existing = await prisma.tbl_ledger.findFirst({
      where: { ledger_id: ledgerId, ...scopeWhere(scope) },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Ledger not found' }, { status: 404 })
    }

    await prisma.tbl_ledger_transaction.deleteMany({
      where: { ledger_id: ledgerId },
    })

    await prisma.tbl_ledger.delete({
      where: { ledger_id: ledgerId },
    })

    return NextResponse.json({ success: true, message: 'Ledger deleted successfully' })
  } catch (error) {
    console.error('Error deleting ledger:', error)
    return NextResponse.json(
      { success: false, error: `Failed to delete ledger: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}