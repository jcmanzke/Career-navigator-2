import { NextResponse } from "next/server";
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT, N8N_WEBHOOK_URL } from "@/lib/n8n";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const incomingContentType = req.headers.get("content-type") || "application/json";
    const contextHeader = req.headers.get(CONTEXT_HEADER_NAME) || FAST_TRACK_CONTEXT;
    const bodyBuffer = await req.arrayBuffer();

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": incomingContentType,
        [CONTEXT_HEADER_NAME]: contextHeader,
      },
      body: bodyBuffer.byteLength ? bodyBuffer : undefined,
    });

    const responseBody = await webhookResponse.text();
    const responseContentType = webhookResponse.headers.get("content-type") || "text/plain; charset=utf-8";

    return new NextResponse(responseBody, {
      status: webhookResponse.status,
      headers: {
        "Content-Type": responseContentType,
      },
    });
  } catch (error) {
    console.error("fast-track webhook proxy error", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to webhook",
        detail: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, " + CONTEXT_HEADER_NAME,
    },
  });
}
