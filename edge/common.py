from __future__ import annotations

from datetime import datetime, timezone

import cv2


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_capture_source(source_stream: str) -> int | str:
    return int(source_stream) if source_stream.isdigit() else source_stream


def open_video_capture(source_stream: str) -> cv2.VideoCapture:
    capture_source = parse_capture_source(source_stream)
    cap = cv2.VideoCapture(capture_source)
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open source: {source_stream}")
    return cap
