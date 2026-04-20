from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import cv2

from .backends import build_face_recognizer_backend, resolve_name
from .detectors import FaceDetection, build_face_detector_backend


@dataclass
class FaceRecognition:
    student_id: str
    display_name: str
    label: str
    confidence: float
    detector_confidence: float
    bbox: tuple[int, int, int, int]
    original_size: tuple[int, int]
    processed_size: tuple[int, int]
    upscale_applied: bool
    upscale_factor: float
    recognizer_backend: str
    recognizer_extra: dict[str, Any]


@dataclass
class PipelineResult:
    detections: list[FaceDetection]
    recognitions: list[FaceRecognition]
    small_face_count: int


def apply_small_face_enhancement(
    face_crop: Any,
    min_face_size: int,
    upscale_factor: float,
    apply_clahe: bool = True,
    apply_sharpen: bool = True,
) -> tuple[Any, bool, float]:
    height, width = face_crop.shape[:2]
    shortest_side = min(width, height)
    enhanced = face_crop
    used_factor = 1.0
    upscale_applied = False

    if shortest_side and shortest_side < min_face_size:
        scale = max(upscale_factor, min_face_size / float(shortest_side))
        enhanced = cv2.resize(
            enhanced,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )
        used_factor = scale
        upscale_applied = True

    if apply_clahe:
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        enhanced = cv2.cvtColor(
            cv2.merge((l_channel, a_channel, b_channel)),
            cv2.COLOR_LAB2BGR,
        )

    if apply_sharpen:
        kernel = cv2.getGaussianKernel(5, 0)
        kernel = kernel @ kernel.T
        blurred = cv2.filter2D(enhanced, -1, kernel)
        enhanced = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)

    return enhanced, upscale_applied, used_factor


def crop_face(frame: Any, bbox: tuple[int, int, int, int], padding_ratio: float) -> tuple[Any, tuple[int, int]]:
    frame_height, frame_width = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    width = max(1, x2 - x1)
    height = max(1, y2 - y1)

    pad_x = int(width * padding_ratio)
    pad_y = int(height * padding_ratio)

    left = max(0, x1 - pad_x)
    top = max(0, y1 - pad_y)
    right = min(frame_width, x2 + pad_x)
    bottom = min(frame_height, y2 + pad_y)

    crop = frame[top:bottom, left:right].copy()
    return crop, (width, height)


class TwoStageFaceAttendancePipeline:
    def __init__(
        self,
        detect_model_path: str,
        recognize_model_path: str,
        roster_path: str | None = None,
        detect_confidence: float = 0.35,
        detect_iou: float = 0.5,
        recognition_confidence: float = 0.65,
        min_face_size: int = 72,
        upscale_factor: float = 2.0,
        padding_ratio: float = 0.18,
        detect_image_size: int = 640,
        face_class_name: str = "face",
        detect_backend: str = "yolo",
        recognize_backend: str = "yolo_cls",
        gallery_path: str | None = None,
        embedding_match_threshold: float = 0.45,
        recognizer_input_size: int = 112,
    ) -> None:
        self.detector = build_face_detector_backend(
            backend_name=detect_backend,
            model_path=detect_model_path,
            confidence_threshold=detect_confidence,
            iou_threshold=detect_iou,
            image_size=detect_image_size,
            face_class_name=face_class_name,
        )
        self.recognizer = build_face_recognizer_backend(
            backend_name=recognize_backend,
            model_path=recognize_model_path,
            roster_path=roster_path,
            confidence_threshold=recognition_confidence,
            gallery_path=gallery_path,
            match_threshold=embedding_match_threshold,
            input_size=recognizer_input_size,
        )
        self.min_face_size = min_face_size
        self.upscale_factor = upscale_factor
        self.padding_ratio = padding_ratio

    def process_frame(self, frame: Any) -> PipelineResult:
        detections = self.detector.detect(frame)
        recognitions: list[FaceRecognition] = []
        small_face_count = 0

        for detection in detections:
            face_crop, original_size = crop_face(frame, detection.bbox, self.padding_ratio)
            if face_crop.size == 0:
                continue

            processed_crop, upscale_applied, used_factor = apply_small_face_enhancement(
                face_crop,
                min_face_size=self.min_face_size,
                upscale_factor=self.upscale_factor,
            )
            if upscale_applied:
                small_face_count += 1

            candidate = self.recognizer.recognize(processed_crop)
            if not candidate:
                continue

            processed_size = (int(processed_crop.shape[1]), int(processed_crop.shape[0]))
            recognitions.append(
                FaceRecognition(
                    student_id=candidate.student_id,
                    display_name=candidate.display_name,
                    label=candidate.label,
                    confidence=candidate.confidence,
                    detector_confidence=detection.confidence,
                    bbox=detection.bbox,
                    original_size=original_size,
                    processed_size=processed_size,
                    upscale_applied=upscale_applied,
                    upscale_factor=round(used_factor, 3),
                    recognizer_backend=candidate.backend,
                    recognizer_extra=candidate.extra,
                )
            )

        return PipelineResult(
            detections=detections,
            recognitions=recognitions,
            small_face_count=small_face_count,
        )
