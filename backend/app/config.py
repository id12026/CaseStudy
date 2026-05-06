from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

DATA_PATH = Path(os.getenv("SALES_DATA_PATH", ROOT_DIR / "data" / "sales_data.xlsx"))
ARTIFACT_DIR = Path(os.getenv("FORECAST_ARTIFACT_DIR", ROOT_DIR / "artifacts" / "latest"))
ARTIFACT_FILE = ARTIFACT_DIR / "forecast_results.json"

FORECAST_HORIZON = int(os.getenv("FORECAST_HORIZON", "8"))
VALIDATION_WEEKS = int(os.getenv("VALIDATION_WEEKS", "8"))
WEEKLY_FREQ = os.getenv("WEEKLY_FREQ", "W-SUN")

