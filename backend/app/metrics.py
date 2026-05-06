from __future__ import annotations

import math
from typing import Iterable

import numpy as np


def mae(y_true: Iterable[float], y_pred: Iterable[float]) -> float:
    y_t = np.asarray(list(y_true), dtype=float)
    y_p = np.asarray(list(y_pred), dtype=float)
    return float(np.mean(np.abs(y_t - y_p)))


def rmse(y_true: Iterable[float], y_pred: Iterable[float]) -> float:
    y_t = np.asarray(list(y_true), dtype=float)
    y_p = np.asarray(list(y_pred), dtype=float)
    return float(math.sqrt(np.mean(np.square(y_t - y_p))))


def mape(y_true: Iterable[float], y_pred: Iterable[float]) -> float:
    y_t = np.asarray(list(y_true), dtype=float)
    y_p = np.asarray(list(y_pred), dtype=float)
    denom = np.where(np.abs(y_t) < 1e-9, np.nan, np.abs(y_t))
    value = np.nanmean(np.abs((y_t - y_p) / denom)) * 100
    return float(0.0 if np.isnan(value) else value)


def smape(y_true: Iterable[float], y_pred: Iterable[float]) -> float:
    y_t = np.asarray(list(y_true), dtype=float)
    y_p = np.asarray(list(y_pred), dtype=float)
    denom = (np.abs(y_t) + np.abs(y_p)) / 2.0
    denom = np.where(denom < 1e-9, np.nan, denom)
    value = np.nanmean(np.abs(y_t - y_p) / denom) * 100
    return float(0.0 if np.isnan(value) else value)


def regression_metrics(y_true: Iterable[float], y_pred: Iterable[float]) -> dict[str, float]:
    return {
        "mae": mae(y_true, y_pred),
        "rmse": rmse(y_true, y_pred),
        "mape": mape(y_true, y_pred),
        "smape": smape(y_true, y_pred),
    }

