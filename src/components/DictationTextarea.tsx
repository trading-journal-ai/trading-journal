"use client";

import type { RefObject, TextareaHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

export type DictationStatus = "idle" | "recording" | "transcribing" | "unsupported";

type DictationTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onDictationStatusChange?: (status: DictationStatus) => void;
  onDictationComplete?: (value: string, transcript: string) => void;
  onDictationStop?: () => void;
};

type BrowserWindowWithAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/wav",
];
const WAVEFORM_SAMPLE_MS = 96;
const WAVEFORM_HISTORY_COUNT = 260;

function supportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function recordingSupported() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function drawWaveform(canvas: HTMLCanvasElement | null, levels: readonly number[]) {
  if (!canvas) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;

  const pixelRatio = window.devicePixelRatio || 1;
  const targetWidth = Math.floor(width * pixelRatio);
  const targetHeight = Math.floor(height * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return;

  context.save();
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);

  const color = getComputedStyle(canvas).color || "rgb(230, 237, 243)";
  const centerY = Math.round(height / 2) + 0.5;
  const sampleStep = 5;
  const dotRadius = 0.7;
  const barStep = sampleStep;
  const barWidth = 1.15;
  const maxBars = Math.floor(width / barStep);
  const visibleLevels = levels.slice(Math.max(0, levels.length - maxBars));
  const startX = Math.max(0, width - visibleLevels.length * barStep);
  const firstWaveformIndex = visibleLevels.findIndex((level) => level > 0);
  const firstWaveformX = firstWaveformIndex === -1
    ? width + sampleStep
    : startX + firstWaveformIndex * barStep;

  context.fillStyle = color;
  context.globalAlpha = 0.32;
  for (let x = firstWaveformX - sampleStep; x >= dotRadius; x -= sampleStep) {
    context.beginPath();
    context.arc(x, centerY, dotRadius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  visibleLevels.forEach((level, index) => {
    if (firstWaveformIndex === -1 || index < firstWaveformIndex) return;

    const waveformLevel = level > 0 ? level : 0.035;
    const shapedLevel = Math.pow(clamp(waveformLevel, 0, 1), 0.78);
    const barHeight = Math.max(3, Math.round(3 + shapedLevel * (height - 7)));
    const x = Math.round(startX + index * barStep);
    const y = Math.round((height - barHeight) / 2);

    context.fillRect(x, y, barWidth, barHeight);
  });

  context.restore();
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
      <path
        d="M8 9.5a2.4 2.4 0 0 0 2.4-2.4V4.2a2.4 2.4 0 0 0-4.8 0v2.9A2.4 2.4 0 0 0 8 9.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.8 7.2a4.2 4.2 0 0 0 8.4 0M8 11.4v2.1M5.8 13.5h4.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
      <rect
        x="4.5"
        y="4.5"
        width="7"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function VoiceActivityIndicator({
  status,
  elapsedSeconds,
  canvasRef,
}: {
  status: DictationStatus;
  elapsedSeconds: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <div
      aria-hidden="true"
      className={`dictation-wave absolute bottom-3 ${
        status === "recording" || status === "transcribing" ? "dictation-wave--active" : ""
      } ${
        status === "transcribing" ? "dictation-wave--soft" : ""
      }`}
    >
      <div className="dictation-wave__line">
        <canvas ref={canvasRef} className="dictation-wave__canvas" />
      </div>
      <span className="dictation-wave__time">{formatElapsed(elapsedSeconds)}</span>
    </div>
  );
}

function transcriptInsertion({
  current,
  transcript,
  start,
  end,
  appendToEnd,
}: {
  current: string;
  transcript: string;
  start: number;
  end: number;
  appendToEnd: boolean;
}) {
  const insertionPoint = appendToEnd ? current.length : start;
  const selectionEnd = appendToEnd ? current.length : end;
  const before = current.slice(0, insertionPoint);
  const after = current.slice(selectionEnd);
  const prefix = before && !/\s$/.test(before) ? (appendToEnd ? "\n\n" : " ") : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";

  return {
    value: `${before}${prefix}${transcript}${suffix}${after}`,
    cursor: before.length + prefix.length + transcript.length,
  };
}

export default function DictationTextarea({
  defaultValue = "",
  value: controlledValue,
  onValueChange,
  onDictationStatusChange,
  onDictationComplete,
  onDictationStop,
  disabled = false,
  className,
  ...props
}: DictationTextareaProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const analyserLastSampleRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const waveformLevelsRef = useRef<number[]>([]);
  const noiseFloorRef = useRef(0.018);
  const recordingStartedAtRef = useRef(0);
  const valueRef = useRef(defaultValue);
  const mountedRef = useRef(false);
  const value = controlledValue ?? uncontrolledValue;

  function updateValue(nextValue: string) {
    if (controlledValue === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  function resetWaveform() {
    waveformLevelsRef.current = [];
    noiseFloorRef.current = 0.018;
    drawWaveform(waveformCanvasRef.current, waveformLevelsRef.current);
  }

  function pushWaveformLevel(level: number) {
    waveformLevelsRef.current = [...waveformLevelsRef.current, level].slice(-WAVEFORM_HISTORY_COUNT);
    drawWaveform(waveformCanvasRef.current, waveformLevelsRef.current);
  }

  function stopAudioMeter() {
    if (analyserFrameRef.current !== null) {
      cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserLastSampleRef.current = 0;
  }

  function startRecordingTimer() {
    recordingStartedAtRef.current = Date.now();
    setElapsedSeconds(0);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 250);
  }

  function stopRecordingTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanupRecordingResources() {
    stopAudioMeter();
    stopRecordingTimer();
    stopStream(streamRef.current);
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }

  function startAudioMeter(stream: MediaStream) {
    const AudioContextClass =
      window.AudioContext ?? (window as BrowserWindowWithAudioContext).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.68;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const sampleBuffer = new Uint8Array(analyser.fftSize);

    function tick(timestamp: number) {
      analyserFrameRef.current = requestAnimationFrame(tick);
      if (timestamp - analyserLastSampleRef.current < WAVEFORM_SAMPLE_MS) return;
      analyserLastSampleRef.current = timestamp;

      analyser.getByteTimeDomainData(sampleBuffer);

      let sumSquares = 0;
      let peak = 0;
      for (const byte of sampleBuffer) {
        const centeredSample = (byte - 128) / 128;
        const magnitude = Math.abs(centeredSample);
        sumSquares += centeredSample * centeredSample;
        peak = Math.max(peak, magnitude);
      }

      const rms = Math.sqrt(sumSquares / sampleBuffer.length);
      const rawEnergy = rms * 2.45 + peak * 0.38;
      const currentNoiseFloor = noiseFloorRef.current;
      const silenceGate = Math.max(0.034, currentNoiseFloor * 2.35);
      const speechGate = Math.max(0.052, currentNoiseFloor * 3);

      if (rawEnergy < silenceGate) {
        noiseFloorRef.current = currentNoiseFloor * 0.96 + rawEnergy * 0.04;
        pushWaveformLevel(0);
        return;
      }

      noiseFloorRef.current = currentNoiseFloor * 0.995 + Math.min(rawEnergy, currentNoiseFloor) * 0.005;
      if (rawEnergy < speechGate) {
        const tailLevel = clamp((rawEnergy - silenceGate) / (speechGate - silenceGate), 0, 1);
        pushWaveformLevel(tailLevel < 0.18 ? 0 : 0.05 + tailLevel * 0.08);
        return;
      }

      const voicedLevel = clamp((rawEnergy - speechGate) / 0.25, 0, 1);
      pushWaveformLevel(0.12 + voicedLevel * 0.88);
    }

    analyserFrameRef.current = requestAnimationFrame(tick);
  }

  async function transcribeBlob(blob: Blob) {
    if (!mountedRef.current) return;

    setError("");
    setStatus("transcribing");

    try {
      const formData = new FormData();
      formData.append("file", blob, `dictation.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      const response = await fetch("/api/dictation/transcribe", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Transcription failed.";
        throw new Error(message);
      }

      if (!data || typeof data !== "object" || !("text" in data) || typeof data.text !== "string") {
        throw new Error("Transcription returned an invalid response.");
      }

      const transcript = data.text.trim();
      if (!transcript) throw new Error("No speech was detected.");

      const textarea = textareaRef.current;
      const current = valueRef.current;
      const appendToEnd = document.activeElement !== textarea;
      const start = textarea?.selectionStart ?? current.length;
      const end = textarea?.selectionEnd ?? start;
      const insertion = transcriptInsertion({ current, transcript, start, end, appendToEnd });

      updateValue(insertion.value);
      onDictationComplete?.(insertion.value, transcript);
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(insertion.cursor, insertion.cursor);
      });
      setStatus("idle");
      setElapsedSeconds(0);
      resetWaveform();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dictation failed.");
      setStatus("idle");
      setElapsedSeconds(0);
      resetWaveform();
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    drawWaveform(waveformCanvasRef.current, waveformLevelsRef.current);

    return () => {
      mountedRef.current = false;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (analyserFrameRef.current !== null) {
        cancelAnimationFrame(analyserFrameRef.current);
        analyserFrameRef.current = null;
      }
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onDictationStatusChange?.(status);
  }, [onDictationStatusChange, status]);

  async function startRecording() {
    setError("");

    if (!recordingSupported()) {
      setError("Microphone recording is not supported in this browser.");
      setStatus("unsupported");
      return;
    }

    try {
      resetWaveform();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = supportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanupRecordingResources();
        if (!mountedRef.current) return;
        setError("Recording failed.");
        setStatus("idle");
        setElapsedSeconds(0);
        resetWaveform();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        cleanupRecordingResources();

        if (!mountedRef.current) return;
        if (blob.size === 0) {
          setError("No audio was recorded.");
          setStatus("idle");
          setElapsedSeconds(0);
          resetWaveform();
          return;
        }

        void transcribeBlob(blob);
      };

      startAudioMeter(stream);
      startRecordingTimer();
      recorder.start();
      setStatus("recording");
    } catch (caught) {
      cleanupRecordingResources();
      setError(caught instanceof Error ? caught.message : "Microphone permission was denied or unavailable.");
      setStatus("idle");
      setElapsedSeconds(0);
      resetWaveform();
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setError("");
    setStatus("transcribing");
    onDictationStop?.();
    recorder.stop();
  }

  async function handleDictationClick() {
    if (status === "recording") {
      stopRecording();
      return;
    }
    if (status === "idle") await startRecording();
  }

  const unavailable = disabled || status === "unsupported";
  const buttonLabel = status === "recording"
    ? "Stop dictation"
    : status === "transcribing"
      ? "Transcribing dictation"
      : status === "unsupported"
        ? "Microphone unavailable"
        : "Start dictation";

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          {...props}
          ref={textareaRef}
          disabled={disabled}
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          className={`${className ?? ""} block pb-13 pr-12`}
        />
        <VoiceActivityIndicator status={status} elapsedSeconds={elapsedSeconds} canvasRef={waveformCanvasRef} />
        <span className="sr-only" aria-live="polite">
          {status === "recording" ? "Recording dictation" : status === "transcribing" ? "Transcribing dictation" : ""}
        </span>
        <button
          type="button"
          aria-label={buttonLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleDictationClick}
          disabled={unavailable || status === "transcribing"}
          aria-pressed={status === "recording"}
          title={buttonLabel}
          className={`absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            status === "recording"
              ? "bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[var(--foreground)]"
              : status === "transcribing"
                ? "bg-[var(--surface)] text-[var(--muted)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {status === "recording" ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
      {error ? (
        <div aria-live="polite" className="text-xs leading-5 text-[var(--red)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
