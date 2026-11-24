import { NextResponse, type NextRequest } from "next/server";
import { getAuthorizedPayment, mpEnabled, syncPreapproval } from "@/lib/mercadopago";
import { verifyMpSignature } from "@/lib/mp-signature";

// Notificaciones de Mercado Pago sobre suscripciones. El aviso solo dispara la consulta: el estado
// real siempre se trae de la API de MP con nuestro token (ver syncPreapproval), así que un aviso
// falso no puede dar acceso. Con MP_WEBHOOK_SECRET configurado, además se exige la firma.
export async function POST(request: NextRequest) {
  if (!mpEnabled()) return new NextResponse(null, { status: 200 });
  const q = request.nextUrl.searchParams;
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    topic?: string;
    data?: { id?: string | number };
  };
  const type = body.type ?? body.topic ?? q.get("type") ?? q.get("topic") ?? "";
  const dataId = q.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : q.get("id"));
  if (!dataId) return new NextResponse(null, { status: 200 });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (
    secret &&
    !verifyMpSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
    })
  )
    return new NextResponse("Firma inválida", { status: 401 });

  try {
    if (type === "subscription_preapproval" || type === "preapproval") {
      await syncPreapproval(dataId);
    } else if (type === "subscription_authorized_payment" || type === "authorized_payment") {
      const pay = await getAuthorizedPayment(dataId);
      if (pay.preapproval_id) await syncPreapproval(pay.preapproval_id);
    }
  } catch (e) {
    // 500 para que MP reintente. Sin datos personales en el log.
    console.error("[mercadopago] no se pudo procesar el aviso", type, (e as Error).message);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 200 });
}
