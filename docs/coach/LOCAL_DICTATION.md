# Local Dictation

> Product direction: dictation should become a first-class note input across
> trade, day, ticker/day, check-in, and coach surfaces. See
> `docs/product/NOTES_DICTATION_COACH_MODEL.md`.

Local dictation turns microphone audio into normal journal text before the AI
coach payload is built.

```text
Browser microphone
-> Next.js /api/dictation/transcribe
-> local FastAPI Whisper service
-> transcript text
-> journal note field
-> saved journal text
-> existing AI coach OpenAI Responses API call
```

The coach never receives raw audio. It receives the same structured JSON payload
as before, with dictated text stored in the recap or trade-note fields.

## Setup

Create a Python environment and install the local transcription service deps:

```bash
python3 -m venv .venv-dictation
source .venv-dictation/bin/activate
pip install -r scripts/requirements-dictation.txt
```

Run the local service:

```bash
uvicorn scripts.local_transcribe_server:app --host 127.0.0.1 --port 8788 --reload
```

The first run downloads the configured Whisper model. The default is `base.en`.

Optional environment variables:

```bash
WHISPER_MODEL_SIZE=small.en
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_MAX_UPLOAD_BYTES=26214400
LOCAL_TRANSCRIPTION_URL=http://127.0.0.1:8788/api/transcribe
```

## App Behavior

- Audio is recorded with the browser `MediaRecorder` API.
- The Next.js proxy only forwards to `localhost`, `127.0.0.1`, or `::1`.
- Raw audio is not stored by the app.
- The local service writes audio to a temporary file only for transcription and
  deletes it after the request completes.
- Dictated text is inserted into the focused note field and can be edited before
  saving.

## Model Guidance

Start with `base.en`. Move to `small.en` if transcript quality is weak and local
latency is acceptable. Avoid larger models for the default local workflow until
startup time and memory use are acceptable on the target machine.
