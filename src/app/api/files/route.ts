import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { allow } from "@/lib/rate-limit";
import { professionalForAction } from "@/lib/session";
import { MAX_FILE_BYTES, newStorageKey, sniffType, storage } from "@/lib/storage";

// Subida de archivos (solo profesionales): PDF o imagen, hasta 10 MB.
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await professionalForAction());
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!allow(`upload:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Subiste muchos archivos seguidos. Esperá un rato." },
      { status: 429 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const scope = form?.get("scope") === "external" ? "external" : "resources";
  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "El archivo pesa más de 10 MB" }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer());
  const type = sniffType(data);
  if (!type)
    return NextResponse.json({ error: "Solo se aceptan PDF, PNG, JPG o WEBP" }, { status: 415 });

  const key = newStorageKey(scope, type);
  await storage().put(key, data, type);
  await audit({ actorId: userId, action: "create", entityType: "File", entityId: key });
  return NextResponse.json({ key, type, kind: type === "application/pdf" ? "PDF" : "IMAGE" });
}
