from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class FaceGalleryEntry:
    student_id: str
    display_name: str
    label: str
    embedding: list[float]


def load_roster(path: str | None) -> dict[str, dict[str, str]]:
    if not path:
        return {}

    roster_path = Path(path)
    if not roster_path.exists():
        raise FileNotFoundError(f"Face roster file not found: {roster_path}")

    with roster_path.open("r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def load_embedding_gallery(path: str | None) -> list[FaceGalleryEntry]:
    if not path:
        return []

    gallery_path = Path(path)
    if not gallery_path.exists():
        raise FileNotFoundError(f"Face gallery file not found: {gallery_path}")

    with gallery_path.open("r", encoding="utf-8") as file_obj:
        payload = json.load(file_obj)

    if isinstance(payload, dict):
        items = payload.get("entries", [])
    else:
        items = payload

    gallery: list[FaceGalleryEntry] = []
    for item in items:
        embedding = item.get("embedding", [])
        if not embedding:
            continue
        gallery.append(
            FaceGalleryEntry(
                student_id=item["studentId"],
                display_name=item.get("displayName", item["studentId"]),
                label=item.get("label", item["studentId"]),
                embedding=[float(value) for value in embedding],
            )
        )

    return gallery
