import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Prevent path traversal attacks
  if (!filename || filename.includes("..")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "uploads/images", filename);

  if (!existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stream = createReadStream(filePath);

  // Convert Node stream → Web stream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": getContentType(filename),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// Simple MIME type helper
function getContentType(filename: string) {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
    return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  if (filename.endsWith(".gif")) return "image/gif";
  // Lampiran izin boleh PDF — path-nya tetap /api/images supaya URL yang sudah
  // tersimpan di kolom attachmentUrl tidak perlu dimigrasi.
  if (filename.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
