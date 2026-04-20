from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2

from two_stage.backends import build_face_recognizer_backend
from two_stage.detectors import build_face_detector_backend
from two_stage.pipeline import apply_small_face_enhancement, crop_face


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export an annotated scene image and per-face thumbnails from the two-stage pipeline.",
    )
    parser.add_argument("--image", required=True, help="Path to the source image.")
    parser.add_argument(
        "--output-dir",
        default="outputs/two_stage_demo",
        help="Directory for the annotated image, thumbnails, and metadata.",
    )
    parser.add_argument(
        "--detect-model",
        default="downloads/scrfd_500m_bnkps_shape640x640.onnx",
        help="Face detector model path.",
    )
    parser.add_argument(
        "--detect-backend",
        default="scrfd_onnx",
        help="Detector backend: yolo or scrfd_onnx.",
    )
    parser.add_argument("--detect-confidence", type=float, default=0.35)
    parser.add_argument("--detect-iou", type=float, default=0.5)
    parser.add_argument("--detect-image-size", type=int, default=640)
    parser.add_argument("--face-class-name", default="face")
    parser.add_argument("--padding-ratio", type=float, default=0.18)
    parser.add_argument("--face-min-size", type=int, default=72)
    parser.add_argument("--upscale-factor", type=float, default=2.0)
    parser.add_argument(
        "--recognize-model",
        default="",
        help="Optional recognizer model path. Leave empty to skip stage-2 identity output.",
    )
    parser.add_argument(
        "--recognize-backend",
        default="yolo_cls",
        help="Recognizer backend: yolo_cls or onnx_embedding.",
    )
    parser.add_argument("--recognition-confidence", type=float, default=0.65)
    parser.add_argument("--roster-path", default="face_roster.json")
    parser.add_argument("--gallery-path", default="face_gallery.json")
    parser.add_argument("--match-threshold", type=float, default=0.45)
    parser.add_argument("--recognizer-input-size", type=int, default=112)
    return parser.parse_args()


def try_build_recognizer(args: argparse.Namespace):
    model_path = args.recognize_model.strip()
    if not model_path:
        return None, "recognizer model not provided"

    if not Path(model_path).exists():
        return None, f"recognizer model not found: {model_path}"

    try:
        recognizer = build_face_recognizer_backend(
            backend_name=args.recognize_backend,
            model_path=model_path,
            roster_path=args.roster_path,
            confidence_threshold=args.recognition_confidence,
            gallery_path=args.gallery_path,
            match_threshold=args.match_threshold,
            input_size=args.recognizer_input_size,
        )
    except Exception as error:  # pragma: no cover - best effort fallback
        return None, str(error)

    return recognizer, "ready"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def build_thumbnail_sheet(image_paths: list[Path], output_path: Path, thumb_size: int = 140, columns: int = 4) -> None:
    if not image_paths:
        return

    images = []
    for path in image_paths:
        image = cv2.imread(str(path))
        if image is None:
            continue
        resized = cv2.resize(image, (thumb_size, thumb_size), interpolation=cv2.INTER_AREA)
        label = path.stem.replace("_enhanced", "")
        cv2.putText(
            resized,
            label,
            (8, thumb_size - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        images.append(resized)

    if not images:
        return

    rows = (len(images) + columns - 1) // columns
    canvas = 255 * __import__("numpy").ones((rows * thumb_size, columns * thumb_size, 3), dtype="uint8")
    for index, image in enumerate(images):
        row = index // columns
        col = index % columns
        top = row * thumb_size
        left = col * thumb_size
        canvas[top : top + thumb_size, left : left + thumb_size] = image

    cv2.imwrite(str(output_path), canvas)


def main() -> None:
    args = parse_args()
    image_path = Path(args.image)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    detector = build_face_detector_backend(
        backend_name=args.detect_backend,
        model_path=args.detect_model,
        confidence_threshold=args.detect_confidence,
        iou_threshold=args.detect_iou,
        image_size=args.detect_image_size,
        face_class_name=args.face_class_name,
    )
    recognizer, recognizer_status = try_build_recognizer(args)

    frame = cv2.imread(str(image_path))
    if frame is None:
        raise RuntimeError(f"Failed to load image: {image_path}")

    output_dir = Path(args.output_dir)
    face_dir = output_dir / "faces"
    ensure_dir(face_dir)

    detections = detector.detect(frame)
    annotated = frame.copy()
    metadata: list[dict[str, object]] = []
    enhanced_paths: list[Path] = []

    for index, detection in enumerate(detections, start=1):
        crop, original_size = crop_face(frame, detection.bbox, args.padding_ratio)
        if crop.size == 0:
            continue

        enhanced, upscale_applied, used_factor = apply_small_face_enhancement(
            crop,
            min_face_size=args.face_min_size,
            upscale_factor=args.upscale_factor,
        )

        candidate = recognizer.recognize(enhanced) if recognizer else None
        base_name = f"face_{index:03d}"
        crop_path = face_dir / f"{base_name}_crop.jpg"
        enhanced_path = face_dir / f"{base_name}_enhanced.jpg"
        cv2.imwrite(str(crop_path), crop)
        cv2.imwrite(str(enhanced_path), enhanced)
        enhanced_paths.append(enhanced_path)

        label = f"#{index}"
        if candidate:
            label = f"{label} {candidate.display_name} {candidate.confidence:.2f}"
        elif recognizer is None:
            label = f"{label} face"
        else:
            label = f"{label} unknown"

        x1, y1, x2, y2 = detection.bbox
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (28, 160, 255), 2)
        cv2.putText(
            annotated,
            label,
            (x1, max(18, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (28, 160, 255),
            2,
            cv2.LINE_AA,
        )

        metadata.append(
            {
                "index": index,
                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                },
                "detectorConfidence": detection.confidence,
                "originalSize": {
                    "width": original_size[0],
                    "height": original_size[1],
                },
                "processedSize": {
                    "width": int(enhanced.shape[1]),
                    "height": int(enhanced.shape[0]),
                },
                "upscaleApplied": upscale_applied,
                "upscaleFactor": round(used_factor, 3),
                "recognizedStudentId": candidate.student_id if candidate else None,
                "recognizedName": candidate.display_name if candidate else None,
                "recognitionConfidence": candidate.confidence if candidate else None,
                "cropImage": str(crop_path),
                "enhancedImage": str(enhanced_path),
            }
        )

    annotated_path = output_dir / "annotated_scene.jpg"
    metadata_path = output_dir / "faces.json"
    contact_sheet_path = output_dir / "thumbnails_sheet.jpg"

    cv2.imwrite(str(annotated_path), annotated)
    metadata_path.write_text(
        json.dumps(
            {
                "sourceImage": str(image_path),
                "detectorBackend": args.detect_backend,
                "detectModel": args.detect_model,
                "recognizerBackend": args.recognize_backend if recognizer else None,
                "recognizerStatus": recognizer_status,
                "faceCount": len(metadata),
                "faces": metadata,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    build_thumbnail_sheet(enhanced_paths, contact_sheet_path)

    print(f"Annotated image: {annotated_path}")
    print(f"Faces directory: {face_dir}")
    print(f"Metadata JSON: {metadata_path}")
    print(f"Thumbnail sheet: {contact_sheet_path}")
    print(f"Detected faces: {len(metadata)}")
    print(f"Recognizer: {recognizer_status}")


if __name__ == "__main__":
    main()
