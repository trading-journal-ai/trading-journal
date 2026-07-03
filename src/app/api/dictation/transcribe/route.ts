import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TRANSCRIPTION_URL = "http://127.0.0.1:8788/api/transcribe";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

function localTranscriptionUrl() {
  const rawUrl = process.env.LOCAL_TRANSCRIPTION_URL?.trim() || DEFAULT_TRANSCRIPTION_URL;
  const url = new URL(rawUrl);

  if (url.protocol !== "http:") {
    throw new Error("LOCAL_TRANSCRIPTION_URL must use http.");
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error("LOCAL_TRANSCRIPTION_URL must point to localhost.");
  }

  return url;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let file: File;

  try {
    const formData = await request.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) {
      return jsonError("Missing audio file.", 400);
    }
    file = value;
  } catch {
    return jsonError("Invalid multipart form data.", 400);
  }

  if (file.size <= 0) return jsonError("Audio file is empty.", 400);
  if (file.size > MAX_AUDIO_BYTES) return jsonError("Audio file is too large.", 413);

  let url: URL;
  try {
    url = localTranscriptionUrl();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Dictation is not configured.", 500);
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name || "dictation.webm");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: outbound,
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
        ? body.detail
        : `Local transcription failed with status ${response.status}.`;
      return jsonError(message, response.status);
    }

    if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string") {
      return jsonError("Local transcription returned an invalid response.", 502);
    }

    return NextResponse.json({
      text: body.text,
      language: "language" in body && typeof body.language === "string" ? body.language : null,
      languageProbability: "language_probability" in body && typeof body.language_probability === "number"
        ? body.language_probability
        : null,
    });
  } catch {
    return jsonError("Local dictation service is not running.", 503);
  }
}
