from __future__ import print_function

import os

import requests


class ClassSightEdgeClient(object):
    def __init__(self, api_base_url, device_key, timeout=10):
        self.api_base_url = api_base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "x-device-key": device_key,
            }
        )

    def start_session(self, course_id=None, classroom=None, source_stream=None, metadata=None):
        response = self.session.post(
            self.api_base_url + "/api/edge/session",
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

    def upload_batch(self, session_id, events=None, student_metrics=None, class_metric=None, metadata=None):
        response = self.session.post(
            self.api_base_url + "/api/edge/events",
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

    def close_session(self, session_id, status="completed", metadata=None):
        response = self.session.post(
            self.api_base_url + "/api/edge/session/{0}/close".format(session_id),
            json={
                "status": status,
                "metadata": metadata or {},
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()["data"]


def from_env():
    return ClassSightEdgeClient(
        api_base_url=os.environ["API_BASE_URL"],
        device_key=os.environ["DEVICE_KEY"],
    )
