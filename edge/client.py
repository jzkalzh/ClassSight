from __future__ import annotations

import os
from typing import Any

import requests


class ClassSightEdgeClient:
    def __init__(self, api_base_url: str, device_key: str, timeout: int = 10) -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "x-device-key": device_key,
            }
        )

    def start_session(
        self,
        course_id: str | None = None,
        classroom: str | None = None,
        source_stream: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        response = self.session.post(
            f"{self.api_base_url}/api/edge/session",
            json={
                "courseId": course_id,
                "classroom": classroom,
                "sourceStream": source_stream,
                "metadata": metadata or {},
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()["data"]

    def upload_batch(
        self,
        session_id: str,
        events: list[dict[str, Any]] | None = None,
        student_metrics: list[dict[str, Any]] | None = None,
        class_metric: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        response = self.session.post(
            f"{self.api_base_url}/api/edge/events",
            json={
                "sessionId": session_id,
                "events": events or [],
                "studentMetrics": student_metrics or [],
                "classMetric": class_metric,
                "metadata": metadata or {},
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()["data"]

    def close_session(
        self,
        session_id: str,
        status: str = "completed",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        response = self.session.post(
            f"{self.api_base_url}/api/edge/session/{session_id}/close",
            json={
                "status": status,
                "metadata": metadata or {},
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()["data"]


def from_env() -> ClassSightEdgeClient:
    api_base_url = os.environ["API_BASE_URL"]
    device_key = os.environ["DEVICE_KEY"]
    return ClassSightEdgeClient(api_base_url=api_base_url, device_key=device_key)
