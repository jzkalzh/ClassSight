# ClassSight Face Training Workspace

This folder holds the project-owned training notes and helper files that sit
next to the official InsightFace repository. The actual training framework is
still the upstream `insightface/recognition/arcface_torch` codebase.

## Goal

Prepare a lightweight face recognizer for the classroom attendance pipeline:

1. Use the official InsightFace ArcFace trainer.
2. Start from a public Chinese-friendly face dataset such as `CASIA-WebFace`.
3. Train `MobileFaceNet + ArcFace` as the recognition stage baseline.
4. Export the trained backbone to ONNX.
5. Deploy the ONNX model to Jetson Nano and plug it into the two-stage runtime.

## Current Recommended Stack

- Detection stage: `SCRFD_500M_KPS` on Jetson Nano
- Recognition stage: `MobileFaceNet + ArcFace`
- Training framework: official `InsightFace arcface_torch`
- Training host: `10.90.7.10`
- Edge runtime target: `10.203.80.50`

## Suggested Remote Layout

```text
~/work/classsight-face-train/
  .venv/
  datasets/
    casia_webface/
  insightface/
    recognition/
      arcface_torch/
  logs/
  outputs/
    recognizer/
  scripts/
```

## Official Training Flow

1. Clone or sync the official `InsightFace` repository into the training host.
2. Prepare `CASIA-WebFace` under `datasets/casia_webface/`.
3. Copy the config in `insightface_configs/casia_webface_mbf_classsight.py`
   into `insightface/recognition/arcface_torch/configs/`.
4. Install the upstream dependencies in the isolated training virtual
   environment.
5. Run `torchrun --nproc_per_node=2 train_v2.py configs/casia_webface_mbf_classsight`.
6. Export the final checkpoint with `torch2onnx.py`.
7. Copy the exported `model.onnx` to the Jetson Nano runtime `models/` folder.

## Dataset Layout

`arcface_torch` can train directly from an image-folder dataset, so the first
baseline does not have to convert CASIA-WebFace into RecordIO.

```text
datasets/casia_webface/
  person_000001/
    0001.jpg
    0002.jpg
  person_000002/
    0001.jpg
    0002.jpg
```

If a later run needs better I/O throughput, the dataset can still be converted
to `train.rec` and `train.idx` with the official MXNet `im2rec` flow.

## Available Helper Scripts

- `scripts/generate_lowres_variants.py`
  Build low-resolution, blurry, compressed classroom-style face images.
- `scripts/build_face_roster.py`
  Create `face_roster.json` from the dataset folder structure.

## Example Commands

```bash
source ~/work/classsight-face-train/.venv/bin/activate
cd ~/work/classsight-face-train/insightface/recognition/arcface_torch

torchrun --nproc_per_node=2 train_v2.py configs/casia_webface_mbf_classsight

python torch2onnx.py \
  /home/lzh/work/classsight-face-train/outputs/recognizer/casia_webface_mbf_classsight/model.pt \
  --network mbf \
  --output /home/lzh/work/classsight-face-train/outputs/recognizer/casia_webface_mbf_classsight/model.onnx
```

## Notes

- This workspace keeps the project-specific config separate from the upstream
  trainer so the training host stays easy to update.
- The first baseline intentionally favors a stable public dataset over a custom
  classroom dataset.
- The low-resolution augmentation step is still valuable later when you start
  adapting the recognizer to classroom back-row faces.
