# ClassSight Face Training Workspace

This folder is intended for the dedicated training host.

## Goal

Prepare a recognition-stage dataset and training workspace for classroom small-face recognition.

The recommended workflow is:

1. Collect student face images into `datasets/raw_faces/<student_id>/`.
2. Generate low-resolution classroom-like augmentations.
3. Fine-tune a lightweight recognizer such as `MobileFaceNet + ArcFace`.
4. Export the final model.
5. Build `face_roster.json` and `face_gallery.json` for the edge runtime.

## Suggested Remote Layout

```text
classsight-face-train/
  datasets/
    raw_faces/
      20230001/
      20230002/
    lowres_augmented/
  outputs/
    recognizer/
    gallery/
  scripts/
```

## Available Scripts

- `generate_lowres_variants.py`
  Build low-resolution, blurry, compressed classroom-style face images.
- `build_face_roster.py`
  Create `face_roster.json` from the dataset folder structure.

## Raw Dataset Structure

```text
datasets/raw_faces/
  20230001/
    1.jpg
    2.jpg
  20230002/
    1.jpg
    2.jpg
```

## Example Commands

```bash
python3 scripts/generate_lowres_variants.py \
  --input-root datasets/raw_faces \
  --output-root datasets/lowres_augmented

python3 scripts/build_face_roster.py \
  --input-root datasets/raw_faces \
  --output face_roster.json
```

## Notes

- This workspace does not force a specific training framework.
- It is designed so you can plug in your preferred recognizer trainer later.
- The low-resolution augmentation step is especially important for back-row classroom faces.
