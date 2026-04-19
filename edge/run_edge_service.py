from __future__ import annotations

import os

from dotenv import load_dotenv

from run_edge_inference import main as run_behavior_pipeline
from run_two_stage_attendance import main as run_attendance_pipeline


def main() -> None:
    load_dotenv()
    mode = os.getenv("EDGE_PIPELINE_MODE", "attendance").strip().lower()

    if mode in {"attendance", "two_stage_attendance", "face"}:
        print("Starting edge attendance pipeline...")
        run_attendance_pipeline()
        return

    if mode in {"behavior", "action", "behavior_detection"}:
        print("Starting edge behavior pipeline...")
        run_behavior_pipeline()
        return

    if mode in {"all", "both"}:
        print("Starting edge attendance pipeline first...")
        run_attendance_pipeline()
        print("Starting edge behavior pipeline second...")
        run_behavior_pipeline()
        return

    raise ValueError(
        "Unsupported EDGE_PIPELINE_MODE. "
        "Use one of: attendance, two_stage_attendance, face, behavior, action, all, both"
    )


if __name__ == "__main__":
    main()
