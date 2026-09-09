import { readFile } from "fs/promises";
import { join, basename } from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: any
) {
  try {
    const params = await context.params;            // ✅ await params
    const filename = basename(params.filename);     // safe from path traversal
    const filePath = join(process.cwd(), "uploads", filename);

    const fileBuffer = await readFile(filePath);    // Node Buffer
    const uint8Array = new Uint8Array(fileBuffer);  // convert to Uint8Array

    const ext = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "png") contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "webp") contentType = "image/webp";

    return new Response(uint8Array, {               // ✅ use Uint8Array
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return new Response("File not found", { status: 404 });
  }
}
