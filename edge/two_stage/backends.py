from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import cv2
from ultralytics import YOLO

from .gallery import FaceGalleryEntry, load_embedding_gallery, load_roster


def safe_float(value: Any) -> float:
    if hasattr(value, "item"):
        return float(value.item())
    return float(value)


def resolve_name(names: Any, index: int) -> str:
    if isinstance(names, dict):
        return str(names.get(index, index))
    if isinstance(names, list) and 0 <= index < len(names):
        return str(names[index])
    return str(index)


def cosine_similarity(lhs: list[float], rhs: list[float]) -> float:
    if len(lhs) != len(rhs) or not lhs:
        return -1.0

    dot = sum(a * b for a, b in zip(lhs, rhs))
    lhs_norm = sum(a * a for a in lhs) ** 0.5
    rhs_norm = sum(b * b for b in rhs) ** 0.5
    if lhs_norm == 0 or rhs_norm == 0:
        return -1.0
    return dot / (lhs_norm * rhs_norm)


@dataclass
class RecognitionCandidate:
    student_id: str
    display_name: str
    label: str
    confidence: float
    backend: str
    extra: dict[str, Any]


class FaceRecognizerBackend(Protocol):
    backend_name: str

    def recognize(self, face_image: Any) -> RecognitionCandidate | None:
        ...


class YoloClassificationRecognizerBackend:
    backend_name = "yolo_cls"

    def __init__(
        self,
        model_path: str,
        roster_path: str | None,
        confidence_threshold: float,
    ) -> None:
        self.model_path = model_path
        self.model = YOLO(model_path)
        self.roster = load_roster(roster_path)
        self.confidence_threshold = confidence_threshold

    def recognize(self, face_image: Any) -> RecognitionCandidate | None:
        results = self.model.predict(face_image, verbose=False)
        if not results:
            return None

        probs = results[0].probs
        if probs is None:
            return None

        top1 = int(probs.top1)
        confidence = safe_float(probs.top1conf)
        if confidence < self.confidence_threshold:
            return None

        label = resolve_name(results[0].names, top1)
        mapped = self.roster.get(label)
        if not mapped:
            return None

        return RecognitionCandidate(
            student_id=mapped["studentId"],
            display_name=mapped.get("displayName", mapped["studentId"]),
            label=label,
            confidence=round(confidence, 4),
            backend=self.backend_name,
            extra={},
        )


class OnnxEmbeddingRecognizerBackend:
    backend_name = "onnx_embedding"

    def __init__(
        self,
        model_path: str,
        gallery_path: str | None,
        match_threshold: float,
        input_size: int,
    ) -> None:
        try:
            import numpy as np
            import onnxruntime as ort
        except ImportError as error:
            raise RuntimeError(
                "onnx_embedding backend requires numpy and onnxruntime. "
                "Install them on the edge device before enabling this backend."
            ) from error

        self.np = np
        self.ort = ort
        self.model_path = model_path
        self.gallery = load_embedding_gallery(gallery_path)
        self.match_threshold = match_threshold
        self.input_size = input_size
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def _preprocess(self, face_image: Any) -> Any:
        resized = cv2.resize(face_image, (self.input_size, self.input_size))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        tensor = rgb.astype("float32") / 255.0
        tensor = (tensor - 0.5) / 0.5
        tensor = tensor.transpose(2, 0, 1)
        return self.np.expand_dims(tensor, axis=0)

    def _extract_embedding(self, face_image: Any) -> list[float]:
        outputs = self.session.run(None, {self.input_name: self._preprocess(face_image)})
        vector = outputs[0]
        if len(vector.shape) > 1:
            vector = vector[0]
        return [float(value) for value in vector.tolist()]

    def recognize(self, face_image: Any) -> RecognitionCandidate | None:
        if not self.gallery:
            return None

        embedding = self._extract_embedding(face_image)
        best_entry: FaceGalleryEntry | None = None
        best_score = -1.0

        for entry in self.gallery:
            score = cosine_similarity(embedding, entry.embedding)
            if score > best_score:
                best_score = score
                best_entry = entry

        if not best_entry or best_score < self.match_threshold:
            return None

        return RecognitionCandidate(
            student_id=best_entry.student_id,
            display_name=best_entry.display_name,
            label=best_entry.label,
            confidence=round(float(best_score), 4),
            backend=self.backend_name,
            extra={
                "matchThreshold": self.match_threshold,
                "gallerySize": len(self.gallery),
            },
        )


def build_face_recognizer_backend(
    backend_name: str,
    model_path: str,
    roster_path: str | None,
    confidence_threshold: float,
    gallery_path: str | None,
    match_threshold: float,
    input_size: int,
) -> FaceRecognizerBackend:
    normalized = backend_name.strip().lower()

    if normalized in {"yolo_cls", "yolo", "classification"}:
        return YoloClassificationRecognizerBackend(
            model_path=model_path,
            roster_path=roster_path,
            confidence_threshold=confidence_threshold,
        )

    if normalized in {"onnx_embedding", "embedding", "gallery"}:
        return OnnxEmbeddingRecognizerBackend(
            model_path=model_path,
            gallery_path=gallery_path,
            match_threshold=match_threshold,
            input_size=input_size,
        )

    raise ValueError(
        f"Unsupported FACE_RECOGNIZER_BACKEND: {backend_name}. "
        "Use yolo_cls or onnx_embedding."
    )
