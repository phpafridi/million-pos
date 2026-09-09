import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite, scopeWhere } from '@/lib/getShopScope'

export const dynamic = "force-dynamic";

// GET all ledgers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    const scope = await getShopScope()

    const [ledgers, total] = await Promise.all([
      prisma.tbl_ledger.findMany({
        where: {
          OR: [
            { ledger_name: { contains: search } },
            { mobile_number: { contains: search } },
            { email: { contains: search } },
          ],
          ...scopeWhere(scope),
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          transactions: {
            orderBy: { transaction_date: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.tbl_ledger.count({
        where: {
          OR: [
            { ledger_name: { contains: search } },
            { mobile_number: { contains: search } },
            { email: { contains: search } },
          ],
          ...scopeWhere(scope),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: ledgers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching ledgers:', error)
    return NextResponse.json(
      { success: false, error: `Failed to fetch ledgers: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

// POST create new ledger
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Creating ledger with data:', body) // Debug log

    const shop_id = scopeShopIdForWrite(await getShopScope())

    // Check if mobile number already exists WITHIN THIS SHOP (mobile numbers
    // can repeat across different franchises' customer bases)
    const existingLedger = await prisma.tbl_ledger.findFirst({
      where: { mobile_number: body.mobile_number, shop_id },
    })

    if (existingLedger) {
      console.log('Mobile number already exists:', body.mobile_number)
      return NextResponse.json(
        { success: false, error: 'Mobile number already exists' },
        { status: 400 }
      )
    }

    const ledger = await prisma.tbl_ledger.create({
      data: {
        shop_id,
        ledger_name: body.ledger_name,
        mobile_number: body.mobile_number,
        email: body.email || null,
        address: body.address || null,
        total_balance: 0,
      },
    })

    console.log('Ledger created successfully:', ledger)
    return NextResponse.json({ success: true, data: ledger })
  } catch (error) {
    console.error('Error creating ledger:', error)
    return NextResponse.json(
      { success: false, error: `Failed to create ledger: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}