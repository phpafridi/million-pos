// app/api/check-product-code/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    
    if (!code || code.trim() === '') {
      return NextResponse.json({ 
        exists: false, 
        message: 'Product code is required' 
      }, { status: 400 })
    }
    
    const existingProduct = await prisma.tbl_product.findFirst({
      where: {
        product_code: code.trim()
      },
      select: {
        product_id: true,
        product_name: true,
        product_code: true
      }
    })
    
    return NextResponse.json({ 
      exists: !!existingProduct,
      product: existingProduct || null,
      message: existingProduct 
        ? `Product code "${code}" is already used by "${existingProduct.product_name}"` 
        : 'Product code is available'
    })
    
  } catch (error: any) {
    console.error('Error checking product code:', error)
    return NextResponse.json({ 
      error: `Failed to check product code: ${error?.message || error}` 
    }, { status: 500 })
  }
}