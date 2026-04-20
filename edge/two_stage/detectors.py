from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import cv2
from ultralytics import YOLO


@dataclass
class FaceDetection:
    bbox: tuple[int, int, int, int]
    confidence: float
    landmarks: list[tuple[float, float]] | None = None


def resolve_name(names: Any, index: int) -> str:
    if isinstance(names, dict):
        return str(names.get(index, index))
    if isinstance(names, list) and 0 <= index < len(names):
        return str(names[index])
    return str(index)


def distance2bbox(points, distance):
    x1 = points[:, 0] - distance[:, 0]
    y1 = points[:, 1] - distance[:, 1]
    x2 = points[:, 0] + distance[:, 2]
    y2 = points[:, 1] + distance[:, 3]
    return __import__("numpy").stack([x1, y1, x2, y2], axis=-1)


def distance2kps(points, distance):
    np = __import__("numpy")
    preds = []
    for i in range(0, distance.shape[1], 2):
        px = points[:, i % 2] + distance[:, i]
        py = points[:, i % 2 + 1] + distance[:, i + 1]
        preds.append(px)
        preds.append(py)
    return np.stack(preds, axis=-1)


class FaceDetectorBackend:
    backend_name = "base"

    def detect(self, frame: Any) -> list[FaceDetection]:
        raise NotImplementedError


class YoloFaceDetectorBackend(FaceDetectorBackend):
    backend_name = "yolo"

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float,
        iou_threshold: float,
        image_size: int,
        face_class_name: str,
    ) -> None:
        self.model_path = model_path
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.image_size = image_size
        self.face_class_name = face_class_name

    def detect(self, frame: Any) -> list[FaceDetection]:
        results = self.model.predict(
            frame,
            verbose=False,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            imgsz=self.image_size,
        )
        if not results or results[0].boxes is None:
            return []

        result = results[0]
        boxes = result.boxes
        class_ids = boxes.cls.tolist() if boxes.cls is not None else []
        confidences = boxes.conf.tolist() if boxes.conf is not None else []
        xyxy = boxes.xyxy.tolist() if boxes.xyxy is not None else []
        names = result.names
        detections = []

        for class_id, confidence, bbox in zip(class_ids, confidences, xyxy):
            label = resolve_name(names, int(class_id))
            if self.face_class_name and label != self.face_class_name:
                continue

            x1, y1, x2, y2 = [int(max(0, round(value))) for value in bbox]
            if x2 <= x1 or y2 <= y1:
                continue

            detections.append(
                FaceDetection(
                    bbox=(x1, y1, x2, y2),
                    confidence=round(float(confidence), 4),
                    landmarks=None,
                )
            )

        return detections


class ScrfdOnnxFaceDetectorBackend(FaceDetectorBackend):
    backend_name = "scrfd_onnx"

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float,
        iou_threshold: float,
        image_size: int,
    ) -> None:
        try:
            import numpy as np
            import onnxruntime as ort
        except ImportError as error:
            raise RuntimeError(
                "scrfd_onnx backend requires numpy and onnxruntime."
            ) from error

        self.np = np
        self.ort = ort
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.nms_threshold = iou_threshold
        self.image_size = (image_size, image_size)
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_cfg = self.session.get_inputs()[0]
        self.input_name = self.input_cfg.name
        self.output_names = [item.name for item in self.session.get_outputs()]
        self.center_cache = {}
        self.use_kps = False
        self.batched = False
        self._num_anchors = 1
        self._feat_stride_fpn = [8, 16, 32]
        self.fmc = 3
        self._init_structure()

    def _init_structure(self) -> None:
        outputs = self.session.get_outputs()
        if len(outputs[0].shape) == 3:
            self.batched = True

        if len(outputs) == 6:
            self.fmc = 3
            self._feat_stride_fpn = [8, 16, 32]
            self._num_anchors = 2
        elif len(outputs) == 9:
            self.fmc = 3
            self._feat_stride_fpn = [8, 16, 32]
            self._num_anchors = 2
            self.use_kps = True
        elif len(outputs) == 10:
            self.fmc = 5
            self._feat_stride_fpn = [8, 16, 32, 64, 128]
            self._num_anchors = 1
        elif len(outputs) == 15:
            self.fmc = 5
            self._feat_stride_fpn = [8, 16, 32, 64, 128]
            self._num_anchors = 1
            self.use_kps = True

    def _nms(self, dets):
        np = self.np
        if dets.shape[0] == 0:
            return []
        x1 = dets[:, 0]
        y1 = dets[:, 1]
        x2 = dets[:, 2]
        y2 = dets[:, 3]
        scores = dets[:, 4]
        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]
        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            w = np.maximum(0.0, xx2 - xx1 + 1)
            h = np.maximum(0.0, yy2 - yy1 + 1)
            inter = w * h
            ovr = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(ovr <= self.nms_threshold)[0]
            order = order[inds + 1]
        return keep

    def _forward(self, image):
        np = self.np
        scores_list = []
        bboxes_list = []
        kpss_list = []

        blob = cv2.dnn.blobFromImage(
            image,
            1.0 / 128.0,
            tuple(image.shape[0:2][::-1]),
            (127.5, 127.5, 127.5),
            swapRB=True,
        )
        net_outs = self.session.run(self.output_names, {self.input_name: blob})
        input_height = blob.shape[2]
        input_width = blob.shape[3]

        for idx, stride in enumerate(self._feat_stride_fpn):
            if self.batched:
                scores = net_outs[idx][0]
                bbox_preds = net_outs[idx + self.fmc][0] * stride
                kps_preds = net_outs[idx + self.fmc * 2][0] * stride if self.use_kps else None
            else:
                scores = net_outs[idx]
                bbox_preds = net_outs[idx + self.fmc] * stride
                kps_preds = net_outs[idx + self.fmc * 2] * stride if self.use_kps else None

            scores = scores.reshape(-1)
            bbox_preds = bbox_preds.reshape(-1, 4)
            if kps_preds is not None:
                kps_preds = kps_preds.reshape(-1, 10)

            height = input_height // stride
            width = input_width // stride
            key = (height, width, stride)
            if key in self.center_cache:
                anchor_centers = self.center_cache[key]
            else:
                anchor_centers = np.stack(np.mgrid[:height, :width][::-1], axis=-1).astype(np.float32)
                anchor_centers = (anchor_centers * stride).reshape((-1, 2))
                if self._num_anchors > 1:
                    anchor_centers = np.stack([anchor_centers] * self._num_anchors, axis=1).reshape((-1, 2))
                if len(self.center_cache) < 100:
                    self.center_cache[key] = anchor_centers

            pos_inds = np.where(scores >= self.confidence_threshold)[0]
            if pos_inds.size == 0:
                continue

            bboxes = distance2bbox(anchor_centers, bbox_preds)
            scores_list.append(scores[pos_inds][:, None])
            bboxes_list.append(bboxes[pos_inds])

            if self.use_kps and kps_preds is not None:
                kpss = distance2kps(anchor_centers, kps_preds).reshape((kps_preds.shape[0], -1, 2))
                kpss_list.append(kpss[pos_inds])

        return scores_list, bboxes_list, kpss_list

    def detect(self, frame: Any) -> list[FaceDetection]:
        np = self.np
        img_height, img_width = frame.shape[:2]
        input_width, input_height = self.image_size
        im_ratio = float(img_height) / float(img_width)
        model_ratio = float(input_height) / float(input_width)

        if im_ratio > model_ratio:
            new_height = input_height
            new_width = int(new_height / im_ratio)
        else:
            new_width = input_width
            new_height = int(new_width * im_ratio)

        det_scale = float(new_height) / float(img_height)
        resized_img = cv2.resize(frame, (new_width, new_height))
        det_img = np.zeros((input_height, input_width, 3), dtype=np.uint8)
        det_img[:new_height, :new_width, :] = resized_img

        scores_list, bboxes_list, kpss_list = self._forward(det_img)
        if not bboxes_list:
            return []

        scores = np.vstack(scores_list)
        bboxes = np.vstack(bboxes_list) / det_scale
        order = scores.ravel().argsort()[::-1]
        kpss = np.vstack(kpss_list) / det_scale if self.use_kps and kpss_list else None

        pre_det = np.hstack((bboxes, scores)).astype(np.float32, copy=False)
        pre_det = pre_det[order, :]
        keep = self._nms(pre_det)
        det = pre_det[keep, :]

        if kpss is not None:
            kpss = kpss[order, :, :]
            kpss = kpss[keep, :, :]

        detections = []
        for index, bbox in enumerate(det):
            x1, y1, x2, y2, score = bbox.tolist()
            if x2 <= x1 or y2 <= y1:
                continue
            landmarks = None
            if kpss is not None and index < len(kpss):
                landmarks = [(float(point[0]), float(point[1])) for point in kpss[index]]
            detections.append(
                FaceDetection(
                    bbox=(int(x1), int(y1), int(x2), int(y2)),
                    confidence=round(float(score), 4),
                    landmarks=landmarks,
                )
            )
        return detections


def build_face_detector_backend(
    backend_name: str,
    model_path: str,
    confidence_threshold: float,
    iou_threshold: float,
    image_size: int,
    face_class_name: str,
) -> FaceDetectorBackend:
    normalized = backend_name.strip().lower()

    if normalized in {"yolo", "yolo_det"}:
        return YoloFaceDetectorBackend(
            model_path=model_path,
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold,
            image_size=image_size,
            face_class_name=face_class_name,
        )

    if normalized in {"scrfd", "scrfd_onnx"}:
        return ScrfdOnnxFaceDetectorBackend(
            model_path=model_path,
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold,
            image_size=image_size,
        )

    raise ValueError(
        f"Unsupported FACE_DETECT_BACKEND: {backend_name}. "
        "Use yolo or scrfd_onnx."
    )
