from __future__ import annotations

import pandas as pd

from backend.app.data import aggregate_weekly_sales, load_sales_data
from backend.app.features import FEATURE_COLUMNS, make_supervised_frame


def test_dataset_loads_expected_columns() -> None:
    raw = load_sales_data("data/sales_data.xlsx")
    assert {"state", "date", "sales", "category"}.issubset(raw.columns)
    assert raw["state"].nunique() == 43
    assert raw["sales"].isna().sum() == 0


def test_weekly_aggregation_creates_regular_state_grid() -> None:
    raw = load_sales_data("data/sales_data.xlsx")
    weekly = aggregate_weekly_sales(raw)
    counts = weekly.groupby("state").size()
    assert counts.nunique() == 1
    assert weekly["was_missing"].sum() > 0


def test_required_features_are_created_without_current_target_leakage() -> None:
    dates = pd.date_range("2023-01-01", periods=60, freq="W-SUN")
    frame = pd.DataFrame({"date": dates, "sales": range(60)})
    supervised = make_supervised_frame(frame)
    assert set(FEATURE_COLUMNS).issubset(supervised.columns)
    first = supervised.iloc[0]
    assert first["lag_1"] == first["sales"] - 1
    assert first["lag_7"] == first["sales"] - 7
    assert first["lag_30"] == first["sales"] - 30

