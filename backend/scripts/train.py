from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from backend.app.config import DATA_PATH  # noqa: E402
from backend.app.training import ForecastingPipeline  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train state-level sales forecasting models.")
    parser.add_argument("--data", type=Path, default=DATA_PATH, help="Path to .xlsx or .csv dataset.")
    parser.add_argument("--horizon", type=int, default=8, help="Forecast horizon in weeks.")
    parser.add_argument("--validation-weeks", type=int, default=8, help="Validation window size.")
    parser.add_argument("--freq", default="W-SUN", help="Weekly pandas frequency.")
    parser.add_argument("--max-states", type=int, default=None, help="Optional smoke-test limit.")
    parser.add_argument("--fast", action="store_true", help="Use smaller model settings for a faster run.")
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Fail states instead of using the local seasonal fallback when optional model libraries are missing.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = ForecastingPipeline(
        data_path=args.data,
        horizon=args.horizon,
        validation_size=args.validation_weeks,
        freq=args.freq,
        allow_fallback=not args.no_fallback,
        fast=args.fast,
    ).run(max_states=args.max_states)
    print(f"Saved forecasts for {len(payload['states'])} states.")
    print(f"Best model counts: {payload.get('model_counts', {})}")


if __name__ == "__main__":
    main()

