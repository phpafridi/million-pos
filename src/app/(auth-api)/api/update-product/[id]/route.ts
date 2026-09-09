import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { getShopScope, scopeShopIdForWrite } from "@/lib/getShopScope";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Helper functions with decimal support
function getString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getDecimalOrNull(form: FormData, key: string): number | null {
  const value = form.get(key);
  if (typeof value === "string" && value.trim() !== "") {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

function getDecimal(form: FormData, key: string, defaultValue: number = 0): number {
  const value = form.get(key);
  if (typeof value === "string" && value.trim() !== "") {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
}

function getInteger(form: FormData, key: string, defaultValue: number = 0): number {
  const value = form.get(key);
  if (typeof value === "string" && value.trim() !== "") {
    const num = parseInt(value);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
}

function getDate(form: FormData, key: string): Date | null {
  const value = form.get(key);
  if (typeof value === "string" && value.trim() !== "") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function getBoolean(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === 'true' || value === 'on' || value === '1';
}

function getTierPrices(form: FormData): { quantity_above: number; selling_price_tier: number }[] {
  const tierPrices: { quantity_above: number; selling_price_tier: number }[] = [];
  let i = 0;
  
  while (true) {
    const quantity = form.get(`tierPrices[${i}][quantity_above]`);
    const price = form.get(`tierPrices[${i}][selling_price_tier]`);

    if (quantity === null && price === null) break;

    tierPrices.push({
      quantity_above: getDecimal(form, `tierPrices[${i}][quantity_above]`),
      selling_price_tier: getDecimal(form, `tierPrices[${i}][selling_price_tier]`),
    });

    i++;
  }
  return tierPrices;
}

function getProductAttributes(form: FormData): { attribute_name: string; value: string }[] {
  const productAttributes: { attribute_name: string; value: string }[] = [];
  let i = 0;
  
  while (true) {
    const attrName = form.get(`productAttribute[${i}][attribute_name]`);
    const attrValue = form.get(`productAttribute[${i}][value]`);
    
    if (attrName === null && attrValue === null) break;
    
    productAttributes.push({
      attribute_name: String(attrName || "").trim(),
      value: String(attrValue || "").trim(),
    });
    
    i++;
  }
  return productAttributes;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const scope = await getShopScope();
    const shopId = scopeShopIdForWrite(scope);

    // Check if product exists
    const existingProduct = await prisma.tbl_product.findUnique({
      where: { product_id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    if (existingProduct.shop_id !== null && !scope.isSuperAdmin && existingProduct.shop_id !== scope.shopId) {
      return NextResponse.json(
        { success: false, error: "This product belongs to a different franchise and cannot be edited here" },
        { status: 403 }
      );
    }

    // Extract form data with proper types
    const product_code = getString(formData, "product_code");
    const sku = getString(formData, "sku") || null;
    const product_name = getString(formData, "product_name");
    const product_note = getString(formData, "product_note");
    const subcategory_id = getInteger(formData, "subcategory_id");
    const tax_id = getInteger(formData, "tax_id");
    const measurement_units = getString(formData, "measurement_units");
    
    // Price fields - decimal
    const buying_price = getDecimal(formData, "buying_price");
    const selling_price = getDecimal(formData, "selling_price");
    
    // Special offer
    const start_date = getDate(formData, "start_date");
    const end_date = getDate(formData, "end_date");
    const special_offer_price = getDecimalOrNull(formData, "special_offer_price");
    
    // Inventory fields - decimal
    const product_quantity = getDecimal(formData, "product_quantity", 0);
    const notify_quantity = getDecimalOrNull(formData, "notify_bellow_quantity");
    
    // Tag
    const tag = getString(formData, "tag");
    
    // Get arrays
    const tierPrices = getTierPrices(formData);
    const productAttributes = getProductAttributes(formData);
    
    // Expiration date fields
    const has_expiration = getBoolean(formData, 'has_expiration');
    const expiration_date = getDate(formData, 'expiration_date');
    const days_before_expiry_alert = getInteger(formData, 'days_before_expiry_alert', 30);
    
    // ✅ Packet size handling - for any admin-defined packet-based measurement unit
    const packetSizeRaw = formData.get("packet_size");
    let packet_size: number | null = null;

    const unitDef = await prisma.tbl_measurement_unit.findFirst({
      where: { unit_code: measurement_units, OR: [{ shop_id: null }, { shop_id: scope.shopId ?? 1 }] },
    });
    if (unitDef?.is_packet_based) {
      packet_size = packetSizeRaw ? parseFloat(String(packetSizeRaw)) || null : null;
    } else {
      packet_size = null;
    }

    // ✅ Handle image upload
    const file = formData.get("file") as File | null;
    let imagePath = existingProduct.barcode_path;

    if (file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name;
        const extension = originalName.split('.').pop() || 'png';
        const imageName = `product_${timestamp}_${productId}.${extension}`;
        
        // Create uploads directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "uploads", "products");
        if (!existsSync(uploadDir)) {
          mkdirSync(uploadDir, { recursive: true });
        }
        
        const fullPath = join(uploadDir, imageName);
        await writeFile(fullPath, buffer);
        
        imagePath = `/uploads/products/${imageName}`;
      } catch (error) {
        console.error("File upload error:", error);
        // Keep existing image path if upload fails
      }
    }

    // Validation
    if (!product_code.trim()) {
      return NextResponse.json(
        { success: false, error: "Product code is required" },
        { status: 400 }
      );
    }
    
    if (!product_name.trim()) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }
    
    if (!subcategory_id) {
      return NextResponse.json(
        { success: false, error: "Subcategory is required" },
        { status: 400 }
      );
    }
    
    if (!tax_id) {
      return NextResponse.json(
        { success: false, error: "Tax is required" },
        { status: 400 }
      );
    }

    // Begin transaction for data consistency
    await prisma.$transaction(async (prisma) => {
      // 1. Update product
      await prisma.tbl_product.update({
        where: { product_id: productId },
        data: {
          product_code,
          sku,
          product_name,
          product_note,
          subcategory_id,
          tax_id,
          measurement_units,
          packet_size,
          
          // Expiration fields
          has_expiration,
          expiration_date,
          days_before_expiry_alert,
          
          // Only update image path if new image was uploaded
          ...(imagePath && imagePath !== existingProduct.barcode_path ? { 
            barcode_path: imagePath 
          } : {}),
        },
      });

      // 2. Update product image if new image uploaded
      if (file && file.size > 0 && imagePath) {
        const existingImage = await prisma.tbl_product_image.findFirst({
          where: { product_id: productId },
        });

        if (existingImage) {
          await prisma.tbl_product_image.update({
            where: { product_image_id: existingImage.product_image_id },
            data: {
              image_path: imagePath,
              filename: file.name,
            },
          });
        } else {
          await prisma.tbl_product_image.create({
            data: {
              product_id: productId,
              image_path: imagePath,
              filename: file.name,
            },
          });
        }
      }

      // 3. Update product price - decimal
      const existingPrice = await prisma.tbl_product_price.findFirst({
        where: { product_id: productId, shop_id: shopId },
      });
      
      if (existingPrice) {
        await prisma.tbl_product_price.update({
          where: { product_price_id: existingPrice.product_price_id },
          data: {
            buying_price,
            selling_price,
          },
        });
      } else {
        await prisma.tbl_product_price.create({
          data: {
            product_id: productId,
            shop_id: shopId,
            buying_price,
            selling_price,
          },
        });
      }

      // 4. Update special offer if dates are provided
      if (start_date && special_offer_price !== null) {
        const existingOffer = await prisma.tbl_special_offer.findFirst({
          where: { product_id: productId },
        });
        
        if (existingOffer) {
          await prisma.tbl_special_offer.update({
            where: { special_offer_id: existingOffer.special_offer_id },
            data: {
              offer_price: special_offer_price,
              start_date,
              end_date: end_date || null,
            },
          });
        } else {
          await prisma.tbl_special_offer.create({
            data: {
              product_id: productId,
              offer_price: special_offer_price,
              start_date,
              end_date: end_date || null,
            },
          });
        }
      } else {
        // Remove special offer if dates are not provided
        await prisma.tbl_special_offer.deleteMany({
          where: { product_id: productId },
        });
      }

      // 5. Update tier prices - decimal
      await prisma.tbl_tier_price.deleteMany({ 
        where: { product_id: productId } 
      });
      
      if (tierPrices.length > 0) {
        const tierPriceData = tierPrices.map((tp) => ({
          product_id: productId,
          quantity_above: tp.quantity_above, // Decimal field
          tier_price: tp.selling_price_tier, // Decimal field
        }));
        
        await prisma.tbl_tier_price.createMany({
          data: tierPriceData,
        });
      }

      // 6. Update inventory - decimal
      const existingInventory = await prisma.tbl_inventory.findFirst({
        where: { product_id: productId, shop_id: shopId },
      });
      
      if (existingInventory) {
        await prisma.tbl_inventory.update({
          where: { inventory_id: existingInventory.inventory_id },
          data: {
            product_quantity, // Decimal field
            notify_quantity: notify_quantity, // Decimal field
          },
        });
      } else {
        await prisma.tbl_inventory.create({
          data: {
            product_id: productId,
            shop_id: shopId,
            product_quantity,
            notify_quantity: notify_quantity,
          },
        });
      }

      // 7. Update product attributes
      await prisma.tbl_attribute.deleteMany({ 
        where: { product_id: productId } 
      });
      
      if (productAttributes.length > 0) {
        const attributeData = productAttributes
          .filter(attr => attr.attribute_name.trim() && attr.value.trim())
          .map((attr) => ({
            product_id: productId,
            attribute_name: attr.attribute_name,
            attribute_value: attr.value,
          }));
        
        if (attributeData.length > 0) {
          await prisma.tbl_attribute.createMany({
            data: attributeData,
          });
        }
      }

      // 8. Handle tags
      await prisma.tbl_product_tag.deleteMany({ 
        where: { product_id: productId } 
      });
      
      if (tag.trim()) {
        // Split tags by comma if multiple tags
        const tags = tag.split(',')
          .map(t => t.trim())
          .filter(t => t !== '');
        
        for (const singleTag of tags) {
          // Create product tag
          await prisma.tbl_product_tag.create({
            data: {
              product_id: productId,
              tag: singleTag,
            },
          });
          
          // Also add to tbl_tag if not exists
          const existingTag = await prisma.tbl_tag.findFirst({
            where: { tag: singleTag },
          });
          
          if (!existingTag) {
            await prisma.tbl_tag.create({
              data: { tag: singleTag },
            });
          }
        }
      }
    });

    await logActivity({
      action: 'product.price_update',
      entityType: 'product',
      entityId: productId,
      description: `Product "${product_name}" updated — price set to ${selling_price} (cost ${buying_price})`,
      shopIdOverride: shopId,
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      productId: productId,
    });

  } catch (error) {
    console.error("Error updating product:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      // Foreign key constraint errors
      if (error.message.includes("foreign key constraint")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid category, subcategory, or tax selection",
          },
          { status: 400 }
        );
      }
      
      // Unique constraint errors
      if (error.message.includes("Unique constraint failed")) {
        return NextResponse.json(
          {
            success: false,
            error: "Product code already exists",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Failed to update product: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

// Optional: GET method for fetching product data
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const scope = await getShopScope();

    const product = await prisma.tbl_product.findFirst({
      where: {
        product_id: productId,
        OR: [{ shop_id: null }, { shop_id: scope.shopId ?? 1 }],
      },
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
        tax: true,
        prices: { where: { shop_id: scope.shopId ?? 1 } },
        special_offers: { where: { shop_id: scope.shopId ?? 1 } },
        tier_prices: { where: { shop_id: scope.shopId ?? 1 } },
        inventories: { where: { shop_id: scope.shopId ?? 1 } },
        attributes: true,
        tags: true,
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch product data: ${error?.message || error}`,
      },
      { status: 500 }
    );
  }
}