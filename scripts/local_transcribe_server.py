from pathlib import Path
from tempfile import NamedTemporaryFile
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel


MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base.en")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
MAX_UPLOAD_BYTES = int(os.environ.get("WHISPER_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))

app = FastAPI(title="Trading Journal Local Dictation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

model = WhisperModel(MODEL_SIZE, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)


@app.get("/health")
def health():
    return {
        "ok": True,
        "model": MODEL_SIZE,
        "device": WHISPER_DEVICE,
        "compute_type": WHISPER_COMPUTE_TYPE,
    }


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    suffix = Path(file.filename or "dictation.webm").suffix or ".webm"
    size = 0

    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = Path(tmp.name)
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                tmp_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Audio upload is too large.")
            tmp.write(chunk)

    try:
        segments, info = model.transcribe(
            str(tmp_path),
            beam_size=5,
            language="en",
            vad_filter=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "language_probability": info.language_probability,
        }
    finally:
        tmp_path.unlink(missing_ok=True)
