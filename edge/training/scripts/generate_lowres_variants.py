from __future__ import annotations

import argparse
import io
import random
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def iter_images(root: Path):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            yield path


def simulate_classroom_lowres(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    width, height = image.size
    shortest_side = max(1, min(width, height))

    scale_choices = [0.18, 0.22, 0.28, 0.34, 0.42, 0.55]
    scale = random.choice(scale_choices)
    small_w = max(16, int(width * scale))
    small_h = max(16, int(height * scale))

    lowres = image.resize((small_w, small_h), Image.Resampling.BILINEAR)
    restored = lowres.resize((width, height), Image.Resampling.BICUBIC)

    if random.random() < 0.75:
        restored = restored.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.4, 1.6)))

    if random.random() < 0.7:
        restored = ImageEnhance.Brightness(restored).enhance(random.uniform(0.7, 1.15))

    if random.random() < 0.7:
        restored = ImageEnhance.Contrast(restored).enhance(random.uniform(0.65, 1.2))

    if random.random() < 0.6:
        restored = ImageEnhance.Sharpness(restored).enhance(random.uniform(0.5, 1.1))

    quality = random.randint(25, 65)
    buffer = io.BytesIO()
    restored.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    return Image.open(buffer).convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate classroom-style low-resolution face variants.")
    parser.add_argument("--input-root", required=True, help="Root directory with student_id/image files.")
    parser.add_argument("--output-root", required=True, help="Output directory for augmented images.")
    parser.add_argument("--variants", type=int, default=4, help="Number of low-resolution variants per image.")
    args = parser.parse_args()

    input_root = Path(args.input_root)
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    total = 0
    for image_path in iter_images(input_root):
        relative_parent = image_path.parent.relative_to(input_root)
        target_dir = output_root / relative_parent
        target_dir.mkdir(parents=True, exist_ok=True)

        with Image.open(image_path) as image:
            original_target = target_dir / image_path.name
            image.convert("RGB").save(original_target)
            total += 1

            stem = image_path.stem
            for index in range(args.variants):
                augmented = simulate_classroom_lowres(image)
                target_path = target_dir / f"{stem}_lowres_{index + 1}.jpg"
                augmented.save(target_path, quality=92)
                total += 1

    print("generated files:", total)
    print("output root:", output_root)


if __name__ == "__main__":
    main()
