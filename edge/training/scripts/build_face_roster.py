from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build face_roster.json from student folders.")
    parser.add_argument("--input-root", required=True, help="Root directory with student_id folders.")
    parser.add_argument("--output", required=True, help="Output JSON file path.")
    args = parser.parse_args()

    input_root = Path(args.input_root)
    output_path = Path(args.output)

    roster = {}
    for student_dir in sorted(input_root.iterdir()):
        if not student_dir.is_dir():
            continue
        student_id = student_dir.name
        label = "student_{0}".format(student_id)
        roster[label] = {
            "studentId": student_id,
            "displayName": student_id,
        }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(roster, ensure_ascii=False, indent=2), encoding="utf-8")
    print("students:", len(roster))
    print("output:", output_path)


if __name__ == "__main__":
    main()
