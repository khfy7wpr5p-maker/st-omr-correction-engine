#!/usr/bin/env python3
import base64
import contextlib
import hashlib
import io
import json
import os
import pathlib
import platform
import sys
import tempfile


def emit(payload, status=0):
    sys.stdout.write(json.dumps(payload, sort_keys=True, separators=(",", ":")))
    sys.stdout.flush()
    raise SystemExit(status)


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_path(path):
    path = pathlib.Path(path)
    digest = hashlib.sha256()
    if path.is_file():
        digest.update(path.read_bytes())
        return digest.hexdigest()
    if path.is_dir():
        for child in sorted(item for item in path.rglob("*") if item.is_file()):
            digest.update(str(child.relative_to(path)).encode("utf-8"))
            digest.update(b"\0")
            digest.update(child.read_bytes())
        return digest.hexdigest()
    return None


def json_note_event(note):
    start_time, end_time, pitch, amplitude, pitch_bends = note
    return {
        "startTimeSeconds": float(start_time),
        "endTimeSeconds": float(end_time),
        "pitchMidi": int(pitch),
        "amplitude": float(amplitude),
        "pitchBends": [int(value) for value in pitch_bends] if pitch_bends else None,
    }


def summarize_model_output(model_output):
    summary = {}
    for key in sorted(model_output):
        value = model_output[key]
        data = value.tobytes(order="C")
        summary[key] = {
            "shape": list(value.shape),
            "dtype": str(value.dtype),
            "sha256": sha256_bytes(data),
        }
    return summary


def main():
    try:
        request = json.loads(sys.stdin.read())
    except Exception as exc:
        emit({"ok": False, "status": "PROVIDER_FAILED", "reason": "INVALID_WORKER_REQUEST", "message": str(exc)}, 2)

    try:
        from importlib.metadata import version
        import numpy as np
        from basic_pitch import ICASSP_2022_MODEL_PATH
        from basic_pitch.inference import predict
    except ModuleNotFoundError as exc:
        emit({
            "ok": False,
            "status": "PROVIDER_UNAVAILABLE",
            "reason": "BASIC_PITCH_PACKAGE_UNAVAILABLE",
            "message": str(exc),
            "runtime": {"python": platform.python_version(), "platform": platform.platform()},
        }, 3)

    package_version = version("basic-pitch")
    expected_version = request.get("expectedPackageVersion")
    if expected_version and package_version != expected_version:
        emit({
            "ok": False,
            "status": "PROVIDER_UNAVAILABLE",
            "reason": "BASIC_PITCH_VERSION_MISMATCH",
            "message": f"Expected basic-pitch {expected_version}, found {package_version}.",
            "runtime": {"python": platform.python_version(), "platform": platform.platform()},
        }, 3)

    audio_path = pathlib.Path(request.get("audioPath", ""))
    if not audio_path.is_file():
        emit({"ok": False, "status": "PROVIDER_FAILED", "reason": "AUDIO_PATH_NOT_FOUND"}, 2)

    allowed_config = {
        "onset_threshold",
        "frame_threshold",
        "minimum_note_length",
        "minimum_frequency",
        "maximum_frequency",
        "multiple_pitch_bends",
        "melodia_trick",
        "midi_tempo",
    }
    config = {key: value for key, value in dict(request.get("config") or {}).items() if key in allowed_config}

    try:
        captured_stdout = io.StringIO()
        with contextlib.redirect_stdout(captured_stdout):
            model_output, midi_data, note_events = predict(audio_path, ICASSP_2022_MODEL_PATH, **config)

        with tempfile.TemporaryDirectory(prefix="ce-basic-pitch-worker-") as temporary_directory:
            midi_path = pathlib.Path(temporary_directory) / "audio-derived.mid"
            midi_data.write(str(midi_path))
            midi_bytes = midi_path.read_bytes()

            artifacts = None
            artifact_directory = request.get("artifactDirectory")
            if artifact_directory:
                output_directory = pathlib.Path(artifact_directory)
                output_directory.mkdir(parents=True, exist_ok=True)
                stem = audio_path.stem or "audio"
                persisted_midi = output_directory / f"{stem}.audio-derived.mid"
                persisted_midi.write_bytes(midi_bytes)
                model_output_path = output_directory / f"{stem}.basic-pitch-model-output.npz"
                np.savez_compressed(model_output_path, **model_output)
                artifacts = {
                    "generatedMidiPath": str(persisted_midi),
                    "generatedMidiSha256": sha256_bytes(midi_bytes),
                    "modelOutputPath": str(model_output_path),
                    "modelOutputSha256": sha256_path(model_output_path),
                }

        emit({
            "ok": True,
            "providerId": request.get("providerId", "spotify_basic_pitch"),
            "packageVersion": package_version,
            "modelSerialization": str(ICASSP_2022_MODEL_PATH),
            "modelSha256": sha256_path(ICASSP_2022_MODEL_PATH),
            "runtime": {
                "python": platform.python_version(),
                "platform": platform.platform(),
                "executable": sys.executable,
            },
            "config": config,
            "noteEvents": [json_note_event(note) for note in note_events],
            "generatedMidiBase64": base64.b64encode(midi_bytes).decode("ascii"),
            "generatedMidiSha256": sha256_bytes(midi_bytes),
            "modelOutputSummary": summarize_model_output(model_output),
            "artifacts": artifacts,
        })
    except Exception as exc:
        emit({
            "ok": False,
            "status": "PROVIDER_FAILED",
            "reason": "BASIC_PITCH_TRANSCRIPTION_FAILED",
            "message": f"{type(exc).__name__}: {exc}",
            "packageVersion": package_version,
            "runtime": {"python": platform.python_version(), "platform": platform.platform()},
        }, 2)


if __name__ == "__main__":
    main()
