import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const audioFile = new File([await file.arrayBuffer()], file.name, {
      type: file.type,
    });
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language || undefined,
    });
    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
