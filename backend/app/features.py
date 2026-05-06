from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from pandas.tseries.holiday import USFederalHolidayCalendar


LAG_FEATURES = (1, 7, 30)
ROLLING_WINDOWS = (4, 8, 13)
FEATURE_COLUMNS = [
    "lag_1",
    "lag_7",
    "lag_30",
    "rolling_mean_4",
    "rolling_std_4",
    "rolling_mean_8",
    "rolling_std_8",
    "rolling_mean_13",
    "rolling_std_13",
    "day_of_week",
    "month",
    "quarter",
    "year",
    "week_of_year",
    "is_holiday_week",
]


@dataclass(frozen=True)
class FeatureSpec:
    lags: tuple[int, ...] = LAG_FEATURES
    rolling_windows: tuple[int, ...] = ROLLING_WINDOWS


def _holiday_dates(start: pd.Timestamp, end: pd.Timestamp) -> set[pd.Timestamp]:
    cal = USFederalHolidayCalendar()
    holidays = cal.holidays(start=start - pd.Timedelta(days=7), end=end + pd.Timedelta(days=7))
    return {pd.Timestamp(day).normalize() for day in holidays}


def holiday_week_flags(dates: Iterable[pd.Timestamp]) -> list[int]:
    date_index = pd.to_datetime(pd.Series(list(dates))).dt.normalize()
    if date_index.empty:
        return []
    holidays = _holiday_dates(date_index.min(), date_index.max())
    flags: list[int] = []
    for week_end in date_index:
        week_days = pd.date_range(week_end - pd.Timedelta(days=6), week_end, freq="D")
        flags.append(int(any(day.normalize() in holidays for day in week_days)))
    return flags


def add_calendar_features(frame: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    out = frame.copy()
    dates = pd.to_datetime(out[date_col])
    iso_calendar = dates.dt.isocalendar()
    out["day_of_week"] = dates.dt.dayofweek.astype(int)
    out["month"] = dates.dt.month.astype(int)
    out["quarter"] = dates.dt.quarter.astype(int)
    out["year"] = dates.dt.year.astype(int)
    out["week_of_year"] = iso_calendar.week.astype(int)
    out["is_holiday_week"] = holiday_week_flags(dates)
    return out


def make_supervised_frame(state_frame: pd.DataFrame, spec: FeatureSpec | None = None) -> pd.DataFrame:
    spec = spec or FeatureSpec()
    out = state_frame[["date", "sales"]].sort_values("date").reset_index(drop=True).copy()

    for lag in spec.lags:
        out[f"lag_{lag}"] = out["sales"].shift(lag)

    shifted = out["sales"].shift(1)
    for window in spec.rolling_windows:
        out[f"rolling_mean_{window}"] = shifted.rolling(window=window, min_periods=2).mean()
        out[f"rolling_std_{window}"] = shifted.rolling(window=window, min_periods=2).std()

    out = add_calendar_features(out)
    out = out.replace([np.inf, -np.inf], np.nan)
    return out.dropna(subset=FEATURE_COLUMNS + ["sales"]).reset_index(drop=True)


def build_next_feature_row(
    history: pd.DataFrame,
    next_date: pd.Timestamp,
    medians: pd.Series | None = None,
    spec: FeatureSpec | None = None,
) -> pd.DataFrame:
    spec = spec or FeatureSpec()
    sales = history["sales"].astype(float).reset_index(drop=True)
    row: dict[str, float | int | pd.Timestamp] = {"date": pd.Timestamp(next_date)}

    for lag in spec.lags:
        row[f"lag_{lag}"] = float(sales.iloc[-lag]) if len(sales) >= lag else np.nan

    for window in spec.rolling_windows:
        tail = sales.tail(window)
        row[f"rolling_mean_{window}"] = float(tail.mean()) if len(tail) >= 2 else np.nan
        row[f"rolling_std_{window}"] = float(tail.std()) if len(tail) >= 2 else np.nan

    frame = add_calendar_features(pd.DataFrame([row]))
    features = frame[FEATURE_COLUMNS]
    if medians is not None:
        features = features.fillna(medians)
    return features.astype(float)

