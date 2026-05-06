from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .config import WEEKLY_FREQ


@dataclass(frozen=True)
class DatasetColumns:
    state: str
    date: str
    sales: str
    category: str | None = None


def _find_column(columns: list[str], candidates: tuple[str, ...], required: bool = True) -> str | None:
    normalized = {str(col).strip().lower(): col for col in columns}
    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]
    for col in columns:
        lowered = str(col).strip().lower()
        if any(candidate in lowered for candidate in candidates):
            return col
    if required:
        raise ValueError(f"Could not find any of these columns: {', '.join(candidates)}")
    return None


def infer_columns(frame: pd.DataFrame) -> DatasetColumns:
    columns = list(frame.columns)
    return DatasetColumns(
        state=_find_column(columns, ("state", "province", "region", "market")),
        date=_find_column(columns, ("date", "week", "order date", "invoice date")),
        sales=_find_column(columns, ("total", "sales", "revenue", "amount", "value")),
        category=_find_column(columns, ("category", "segment", "product"), required=False),
    )


def load_sales_data(path: str | Path) -> pd.DataFrame:
    source = Path(path)
    if not source.exists():
        raise FileNotFoundError(f"Dataset not found: {source}")

    if source.suffix.lower() in {".xlsx", ".xls"}:
        sheets = pd.read_excel(source, sheet_name=None)
        raw = pd.concat(sheets.values(), ignore_index=True)
    elif source.suffix.lower() in {".csv", ".txt"}:
        raw = pd.read_csv(source)
    else:
        raise ValueError(f"Unsupported data file type: {source.suffix}")

    columns = infer_columns(raw)
    renamed = raw.rename(
        columns={
            columns.state: "state",
            columns.date: "date",
            columns.sales: "sales",
            **({columns.category: "category"} if columns.category else {}),
        }
    )

    keep_cols = ["state", "date", "sales"] + (["category"] if "category" in renamed.columns else [])
    data = renamed[keep_cols].copy()
    data["state"] = data["state"].astype(str).str.strip()
    data["date"] = pd.to_datetime(data["date"], errors="coerce")
    data["sales"] = pd.to_numeric(data["sales"], errors="coerce")
    if "category" in data.columns:
        data["category"] = data["category"].astype(str).str.strip()
    else:
        data["category"] = "All"

    data = data.dropna(subset=["state", "date", "sales"])
    data = data[data["state"] != ""]
    data = data.sort_values(["state", "date"]).reset_index(drop=True)
    return data


def aggregate_weekly_sales(raw: pd.DataFrame, freq: str = WEEKLY_FREQ) -> pd.DataFrame:
    grouped = raw.groupby(["state", "date"], as_index=False)["sales"].sum()
    weekly_frames: list[pd.DataFrame] = []

    for state, state_frame in grouped.groupby("state", sort=True):
        state_frame = state_frame.sort_values("date").set_index("date")
        weekly = state_frame["sales"].resample(freq).sum(min_count=1).to_frame()
        weekly["was_missing"] = weekly["sales"].isna().astype(int)
        weekly["sales"] = (
            weekly["sales"]
            .interpolate(method="time", limit_direction="both")
            .ffill()
            .bfill()
            .fillna(0.0)
        )
        weekly["state"] = state
        weekly_frames.append(weekly.reset_index().rename(columns={"date": "date"}))

    result = pd.concat(weekly_frames, ignore_index=True)
    result["sales"] = result["sales"].clip(lower=0)
    return result[["state", "date", "sales", "was_missing"]].sort_values(["state", "date"]).reset_index(drop=True)


def summarize_dataset(raw: pd.DataFrame, weekly: pd.DataFrame) -> dict[str, Any]:
    raw_dates = pd.to_datetime(raw["date"])
    weekly_dates = pd.to_datetime(weekly["date"])
    raw_unique_dates = raw_dates.drop_duplicates().sort_values()
    diffs = raw_unique_dates.diff().dt.days.dropna()

    categories = sorted(raw["category"].dropna().astype(str).unique().tolist()) if "category" in raw.columns else ["All"]
    missing_by_col = {col: int(raw[col].isna().sum()) for col in raw.columns}
    missing_weeks = int(weekly["was_missing"].sum()) if "was_missing" in weekly.columns else 0

    return {
        "raw_rows": int(len(raw)),
        "weekly_rows": int(len(weekly)),
        "states": int(raw["state"].nunique()),
        "categories": categories,
        "raw_date_start": raw_dates.min().date().isoformat(),
        "raw_date_end": raw_dates.max().date().isoformat(),
        "weekly_date_start": weekly_dates.min().date().isoformat(),
        "weekly_date_end": weekly_dates.max().date().isoformat(),
        "raw_unique_dates": int(raw_dates.nunique()),
        "weekly_unique_dates": int(weekly_dates.nunique()),
        "raw_median_gap_days": float(diffs.median()) if not diffs.empty else 0.0,
        "missing_values": missing_by_col,
        "imputed_state_weeks": missing_weeks,
        "sales_min": float(raw["sales"].min()),
        "sales_max": float(raw["sales"].max()),
        "sales_total": float(raw["sales"].sum()),
    }


def latest_history_for_state(weekly: pd.DataFrame, state: str, points: int = 52) -> list[dict[str, Any]]:
    state_frame = weekly[weekly["state"] == state].sort_values("date").tail(points)
    return [
        {"date": row.date.date().isoformat(), "sales": float(row.sales)}
        for row in state_frame.itertuples(index=False)
    ]


def state_names(weekly: pd.DataFrame) -> list[str]:
    return sorted(weekly["state"].dropna().astype(str).unique().tolist())

