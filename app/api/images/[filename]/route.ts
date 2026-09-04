import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/generated/prisma";
import { AttendanceService } from "@/servers/services/attendance.service";
import { LeaveService } from "@/servers/services/leave.service";

/** UUID + ekstensi yang benar-benar dihasilkan `saveImage`/`saveAttachment`. */
const FILENAME_PATTERN = /^[0-9a-f-]+\.(jpg|jpeg|png|webp|gif|pdf)$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!filename || !FILENAME_PATTERN.test(filename)) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Admin boleh lihat semua foto absensi & lampiran izin. Karyawan hanya
  // boleh lihat miliknya sendiri.
  if (user.role !== Role.ADMIN) {
    const url = `/api/images/${filename}`;
    const [attendance, leave] = await Promise.all([
      AttendanceService.findByPhotoUrl(url),
      LeaveService.findByAttachmentUrl(url),
    ]);
    const owns = attendance?.userId === user.id || leave?.userId === user.id;

    if (!owns) {
      return new NextResponse("Forbidden", { status: 403 });
    }
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
      "Cache-Control": "private, max-age=31536000, immutable",
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
