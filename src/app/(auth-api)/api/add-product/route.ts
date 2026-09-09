import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { join } from "path";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getShopScope, scopeShopIdForWrite } from "@/lib/getShopScope";
import { isSynced } from "@/lib/syncSettings";

export const dynamic = "force-dynamic";

// Helper functions with proper decimal handling
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

// Get tier prices
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

// Get product attributes
function getProductAttributes(form: FormData): { attribute_name: string; value: string }[] {
  const productAttributes: { attribute_name: string; value: string }[] = [];
  let j = 0;
  
  while (true) {
    const attrName = form.get(`productAttributes[${j}][attribute_name]`);
    const attrValue = form.get(`productAttributes[${j}][value]`);
    
    if (attrName === null && attrValue === null) break;
    
    productAttributes.push({
      attribute_name: String(attrName || "").trim(),
      value: String(attrValue || "").trim(),
    });
    
    j++;
  }
  return productAttributes;
}

export async function POST(request: Request) {
  try {
    const scope = await getShopScope();
    const shopId = scopeShopIdForWrite(scope);
    const productsSynced = await isSynced('products');
    const productShopId = productsSynced ? null : shopId;

    const data = await request.formData();

    // Extract form data with proper types
    const product_code = getString(data, "product_code");
    const sku = getString(data, "sku") || null;
    const product_name = getString(data, "product_name");
    const product_note = getString(data, "product_note");
    const category_id = getInteger(data, "category_id");
    const subcategory_id = getInteger(data, "subcategory_id");
    const tax_id = getInteger(data, "tax_id");
    
    // Price fields - decimal
    const buying_price = getDecimal(data, "buying_price");
    const selling_price = getDecimal(data, "selling_price");
    
    // Special offer
    const start_date = getDate(data, "start_date");
    const end_date = getDate(data, "end_date");
    const special_offer_price = getDecimalOrNull(data, "special_offer_price");
    
    // Inventory fields - decimal
    const product_quantity = getDecimal(data, "product_quantity", 0);
    const notify_bellow_quantity = getDecimalOrNull(data, "notify_bellow_quantity");
    
    // Other fields
    const measurement_units = getString(data, "measurement_units");
    const packet_size = getDecimalOrNull(data, "packet_size");
    const tag = getString(data, "tag");
    
    // Expiration date fields
    const has_expiration = getBoolean(data, 'has_expiration');
    const expiration_date = getDate(data, 'expiration_date');
    const days_before_expiry_alert = getInteger(data, 'days_before_expiry_alert', 30);
    
    // Get arrays
    const tierPrices = getTierPrices(data);
    const productAttributes = getProductAttributes(data);
    
    // File upload
    const file = data.get("file") as File | null;
    let imageName = "default-product.png";
    let imagePath = "/images/default-product.png";

    if (file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name;
        const extension = originalName.split('.').pop() || 'png';
        imageName = `product_${timestamp}.${extension}`;
        
        // Create uploads directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "uploads", "products");
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        
        const fullPath = join(uploadDir, imageName);
        await writeFile(fullPath, buffer);
        
        imagePath = `/uploads/products/${imageName}`;
      } catch (error) {
        console.error("File upload error:", error);
        // Continue with default image
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
    
    
    if (!tax_id) {
      return NextResponse.json(
        { success: false, error: "Tax is required" },
        { status: 400 }
      );
    }

    // Begin transaction for data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create product
      const product = await prisma.tbl_product.create({
        data: {
          shop_id: productShopId,
          product_code,
          product_name,
          product_note,
          subcategory_id : 1,
          tax_id,
          status: 1,
          barcode: product_code, // Using product code as barcode for now
          barcode_path: `/uploads/barcodes/${product_code}.png`,
          sku,
          measurement_units,
          packet_size,
          
          // Expiration fields
          has_expiration,
          expiration_date,
          days_before_expiry_alert,
        },
      });

      // 2. Create product image
      await prisma.tbl_product_image.create({
        data: {
          product_id: product.product_id,
          image_path: imagePath,
          filename: imageName,
        },
      });

      // 3. Create product price - decimal
      await prisma.tbl_product_price.create({
        data: {
          product_id: product.product_id,
          shop_id: shopId,
          buying_price,
          selling_price,
        },
      });

      // 4. Create special offer if dates are provided
      if (start_date && special_offer_price !== null) {
        await prisma.tbl_special_offer.create({
          data: {
            product_id: product.product_id,
            shop_id: shopId,
            offer_price: special_offer_price,
            start_date,
            end_date: end_date || null,
          },
        });
      }

      // 5. Create tier prices if any - decimal
      if (tierPrices.length > 0) {
        const tierPriceData = tierPrices.map((tp) => ({
          product_id: product.product_id,
          shop_id: shopId,
          quantity_above: tp.quantity_above, // Decimal field
          tier_price: tp.selling_price_tier, // Decimal field
        }));
        
        await prisma.tbl_tier_price.createMany({
          data: tierPriceData,
        });
      }

      // 6. Create inventory - decimal
      await prisma.tbl_inventory.create({
        data: {
          product_id: product.product_id,
          shop_id: shopId,
          product_quantity, // Decimal field
          notify_quantity: notify_bellow_quantity, // Decimal field
        },
      });

      // Give every other active shop a zero-stock, zero-price row for this
      // product too, so it appears in their catalog immediately without
      // them ever having to re-create it. They just set their own price
      // and receive stock via a purchase. Only happens when product
      // sharing is on — a private product stays visible to its own shop
      // only, with no rows created for anyone else.
      if (productsSynced) {
        const otherShops = await prisma.tbl_shop.findMany({
          where: { is_active: true, shop_id: { not: shopId } },
          select: { shop_id: true },
        });
        if (otherShops.length > 0) {
          await prisma.tbl_inventory.createMany({
            data: otherShops.map((s) => ({ product_id: product.product_id, shop_id: s.shop_id, product_quantity: 0 })),
          });
          await prisma.tbl_product_price.createMany({
            data: otherShops.map((s) => ({ product_id: product.product_id, shop_id: s.shop_id, buying_price: 0, selling_price: 0 })),
          });
        }
      }

      // 7. Create product attributes if any
      if (productAttributes.length > 0) {
        const attributeData = productAttributes
          .filter(attr => attr.attribute_name.trim() && attr.value.trim())
          .map((attr) => ({
            product_id: product.product_id,
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
      if (tag.trim()) {
        // Split tags by comma if multiple tags
        const tags = tag.split(',')
          .map(t => t.trim())
          .filter(t => t !== '');
        
        for (const singleTag of tags) {
          // Create product tag
          await prisma.tbl_product_tag.create({
            data: {
              product_id: product.product_id,
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

      return product;
    });

    return NextResponse.json({
      success: true,
      message: "Product added successfully",
      productId: result.product_id,
      productCode: result.product_code,
    });

  } catch (error) {
    console.error("Error adding product:", error);
    
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
        error: `Failed to add product: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

// Optional: GET method for testing
export async function GET() {
  return NextResponse.json({
    message: "Use POST method to add a product",
    required_fields: [
      "product_code",
      "product_name",
      "subcategory_id",
      "tax_id",
      "buying_price",
      "selling_price",
    ],
  });
}