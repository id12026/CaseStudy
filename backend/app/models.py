from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass
from typing import Callable

import numpy as np
import pandas as pd

from .config import FORECAST_HORIZON, VALIDATION_WEEKS, WEEKLY_FREQ
from .features import FEATURE_COLUMNS, build_next_feature_row, make_supervised_frame
from .metrics import regression_metrics


@dataclass
class ModelRun:
    model_name: str
    status: str
    metrics: dict[str, float]
    validation: list[dict]
    forecast: list[dict]
    error: str | None = None

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["metrics"] = {key: float(value) for key, value in self.metrics.items()}
        return payload


def _future_dates(last_date: pd.Timestamp, horizon: int, freq: str) -> pd.DatetimeIndex:
    return pd.date_range(pd.Timestamp(last_date), periods=horizon + 1, freq=freq)[1:]


def _prediction_rows(dates: list[pd.Timestamp] | pd.DatetimeIndex, values: list[float] | np.ndarray) -> list[dict]:
    clean = np.asarray(values, dtype=float)
    return [
        {"date": pd.Timestamp(date).date().isoformat(), "yhat": float(max(0.0, value))}
        for date, value in zip(dates, clean)
    ]


def _forecast_rows(
    dates: list[pd.Timestamp] | pd.DatetimeIndex,
    values: list[float] | np.ndarray,
    residual_std: float,
) -> list[dict]:
    rows: list[dict] = []
    for date, value in zip(dates, np.asarray(values, dtype=float)):
        yhat = float(max(0.0, value))
        band = 1.96 * float(residual_std)
        rows.append(
            {
                "date": pd.Timestamp(date).date().isoformat(),
                "yhat": yhat,
                "lower": float(max(0.0, yhat - band)),
                "upper": float(yhat + band),
            }
        )
    return rows


def _empty_skip(model_name: str, message: str) -> ModelRun:
    return ModelRun(
        model_name=model_name,
        status="skipped",
        metrics={"mae": math.inf, "rmse": math.inf, "mape": math.inf, "smape": math.inf},
        validation=[],
        forecast=[],
        error=message,
    )


def _metric_payload(y_true: pd.Series | np.ndarray, y_pred: list[float] | np.ndarray) -> tuple[dict[str, float], float]:
    metrics = regression_metrics(y_true, y_pred)
    residual_std = float(np.std(np.asarray(y_true, dtype=float) - np.asarray(y_pred, dtype=float)))
    return metrics, max(residual_std, 1.0)


class StateForecaster:
    def __init__(
        self,
        horizon: int = FORECAST_HORIZON,
        validation_size: int = VALIDATION_WEEKS,
        freq: str = WEEKLY_FREQ,
        allow_fallback: bool = True,
        fast: bool = False,
    ) -> None:
        self.horizon = horizon
        self.validation_size = validation_size
        self.freq = freq
        self.allow_fallback = allow_fallback
        self.fast = fast

    def train_state(self, state: str, state_frame: pd.DataFrame) -> dict:
        series = state_frame[["date", "sales"]].sort_values("date").reset_index(drop=True)
        if len(series) < self.validation_size + 16:
            raise ValueError(f"State {state} does not have enough observations for a time-series split.")

        validation_size = min(self.validation_size, max(4, len(series) // 5))
        train = series.iloc[:-validation_size].reset_index(drop=True)
        validation = series.iloc[-validation_size:].reset_index(drop=True)
        future = _future_dates(series["date"].iloc[-1], self.horizon, self.freq)

        runners: list[Callable[[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DatetimeIndex], ModelRun]] = [
            self._run_sarima,
            self._run_prophet,
            self._run_xgboost,
            self._run_lstm,
        ]
        runs = [runner(train, validation, series, future) for runner in runners]

        trained = [run for run in runs if run.status == "trained" and np.isfinite(run.metrics.get("smape", math.inf))]
        if not trained and self.allow_fallback:
            runs.append(self._run_seasonal_fallback(train, validation, series, future))
            trained = [run for run in runs if run.status == "trained"]

        if not trained:
            best = min(runs, key=lambda run: run.metrics.get("smape", math.inf))
        else:
            best = min(trained, key=lambda run: (run.metrics["smape"], run.metrics["rmse"]))

        return {
            "state": state,
            "best_model": best.model_name,
            "best_status": best.status,
            "validation_start": validation["date"].iloc[0].date().isoformat(),
            "validation_end": validation["date"].iloc[-1].date().isoformat(),
            "last_history_date": series["date"].iloc[-1].date().isoformat(),
            "comparison": [run.to_dict() for run in runs],
            "forecast": best.forecast,
        }

    def _run_sarima(
        self,
        train: pd.DataFrame,
        validation: pd.DataFrame,
        full: pd.DataFrame,
        future: pd.DatetimeIndex,
    ) -> ModelRun:
        try:
            from statsmodels.tsa.statespace.sarimax import SARIMAX
        except Exception as exc:  # pragma: no cover - depends on optional package
            return _empty_skip("SARIMA", f"statsmodels is not installed: {exc}")

        try:
            period = 13 if self.fast else (52 if len(train) >= 156 else 13)
            order = (1, 1, 1)
            seasonal_order = (1, 0, 1, period)
            train_model = SARIMAX(
                train["sales"],
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False,
            ).fit(disp=False, maxiter=60 if self.fast else 100)
            val_pred = train_model.forecast(steps=len(validation))

            full_model = SARIMAX(
                full["sales"],
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False,
            ).fit(disp=False, maxiter=60 if self.fast else 100)
            forecast = full_model.forecast(steps=len(future))
            metrics, residual_std = _metric_payload(validation["sales"], val_pred)
            return ModelRun(
                model_name="SARIMA",
                status="trained",
                metrics=metrics,
                validation=_prediction_rows(validation["date"], val_pred),
                forecast=_forecast_rows(future, forecast, residual_std),
            )
        except Exception as exc:  # pragma: no cover - model fit can fail by data
            return _empty_skip("SARIMA", str(exc))

    def _run_prophet(
        self,
        train: pd.DataFrame,
        validation: pd.DataFrame,
        full: pd.DataFrame,
        future: pd.DatetimeIndex,
    ) -> ModelRun:
        try:
            from prophet import Prophet
        except Exception as exc:  # pragma: no cover - depends on optional package
            return _empty_skip("Prophet", f"prophet is not installed: {exc}")

        try:
            def fit_predict(train_frame: pd.DataFrame, dates: pd.Series | pd.DatetimeIndex) -> np.ndarray:
                model = Prophet(
                    growth="linear",
                    yearly_seasonality=True,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    interval_width=0.9,
                )
                model.add_country_holidays(country_name="US")
                model.fit(train_frame.rename(columns={"date": "ds", "sales": "y"})[["ds", "y"]])
                preds = model.predict(pd.DataFrame({"ds": pd.to_datetime(dates)}))
                return preds["yhat"].to_numpy()

            val_pred = fit_predict(train, validation["date"])
            future_pred = fit_predict(full, future)
            metrics, residual_std = _metric_payload(validation["sales"], val_pred)
            return ModelRun(
                model_name="Prophet",
                status="trained",
                metrics=metrics,
                validation=_prediction_rows(validation["date"], val_pred),
                forecast=_forecast_rows(future, future_pred, residual_std),
            )
        except Exception as exc:  # pragma: no cover - model fit can fail by data
            return _empty_skip("Prophet", str(exc))

    def _run_xgboost(
        self,
        train: pd.DataFrame,
        validation: pd.DataFrame,
        full: pd.DataFrame,
        future: pd.DatetimeIndex,
    ) -> ModelRun:
        try:
            from xgboost import XGBRegressor
        except Exception as exc:  # pragma: no cover - depends on optional package
            return _empty_skip("XGBoost", f"xgboost is not installed: {exc}")

        try:
            train_supervised = make_supervised_frame(train)
            if len(train_supervised) < 16:
                return _empty_skip("XGBoost", "Not enough supervised rows after lag creation.")
            medians = train_supervised[FEATURE_COLUMNS].median(numeric_only=True)
            model = XGBRegressor(
                n_estimators=250 if not self.fast else 80,
                max_depth=4,
                learning_rate=0.04,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=42,
            )
            model.fit(train_supervised[FEATURE_COLUMNS].fillna(medians), train_supervised["sales"])
            val_pred = self._recursive_ml_predict(model, train, validation["date"], medians)

            full_supervised = make_supervised_frame(full)
            full_medians = full_supervised[FEATURE_COLUMNS].median(numeric_only=True)
            final_model = XGBRegressor(
                n_estimators=300 if not self.fast else 100,
                max_depth=4,
                learning_rate=0.04,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=42,
            )
            final_model.fit(full_supervised[FEATURE_COLUMNS].fillna(full_medians), full_supervised["sales"])
            future_pred = self._recursive_ml_predict(final_model, full, future, full_medians)

            metrics, residual_std = _metric_payload(validation["sales"], val_pred)
            return ModelRun(
                model_name="XGBoost",
                status="trained",
                metrics=metrics,
                validation=_prediction_rows(validation["date"], val_pred),
                forecast=_forecast_rows(future, future_pred, residual_std),
            )
        except Exception as exc:  # pragma: no cover - model fit can fail by data
            return _empty_skip("XGBoost", str(exc))

    def _recursive_ml_predict(
        self,
        model,
        history: pd.DataFrame,
        dates: pd.Series | pd.DatetimeIndex,
        medians: pd.Series,
    ) -> np.ndarray:
        working = history[["date", "sales"]].copy().reset_index(drop=True)
        predictions: list[float] = []
        for date in pd.to_datetime(dates):
            features = build_next_feature_row(working, pd.Timestamp(date), medians=medians)
            pred = float(model.predict(features[FEATURE_COLUMNS])[0])
            pred = max(0.0, pred)
            predictions.append(pred)
            working = pd.concat(
                [working, pd.DataFrame([{"date": pd.Timestamp(date), "sales": pred}])],
                ignore_index=True,
            )
        return np.asarray(predictions, dtype=float)

    def _run_lstm(
        self,
        train: pd.DataFrame,
        validation: pd.DataFrame,
        full: pd.DataFrame,
        future: pd.DatetimeIndex,
    ) -> ModelRun:
        try:
            os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
            import tensorflow as tf
            from tensorflow.keras import Sequential
            from tensorflow.keras.callbacks import EarlyStopping
            from tensorflow.keras.layers import Dense, LSTM
        except Exception as exc:  # pragma: no cover - depends on optional package
            return _empty_skip("LSTM", f"tensorflow is not installed: {exc}")

        try:
            tf.keras.utils.set_random_seed(42)
            seq_len = 12 if len(train) >= 40 else max(4, len(train) // 4)
            if len(train) <= seq_len + 8:
                return _empty_skip("LSTM", "Not enough rows for LSTM sequence training.")

            def fit_model(values: np.ndarray):
                values = values.astype(float)
                min_value = float(values.min())
                max_value = float(values.max())
                scale = max(max_value - min_value, 1.0)
                scaled = (values - min_value) / scale
                x_train, y_train = self._make_sequences(scaled, seq_len)
                model = Sequential(
                    [
                        LSTM(32 if not self.fast else 16, input_shape=(seq_len, 1)),
                        Dense(16 if not self.fast else 8, activation="relu"),
                        Dense(1),
                    ]
                )
                model.compile(optimizer="adam", loss="mse")
                model.fit(
                    x_train,
                    y_train,
                    epochs=40 if not self.fast else 12,
                    batch_size=16,
                    verbose=0,
                    callbacks=[EarlyStopping(monitor="loss", patience=5, restore_best_weights=True)],
                )
                return model, min_value, scale, scaled

            model, min_value, scale, scaled_history = fit_model(train["sales"].to_numpy())
            val_scaled = self._recursive_lstm_predict(model, scaled_history, len(validation), seq_len)
            val_pred = (val_scaled * scale) + min_value

            full_model, full_min, full_scale, full_scaled = fit_model(full["sales"].to_numpy())
            future_scaled = self._recursive_lstm_predict(full_model, full_scaled, len(future), seq_len)
            future_pred = (future_scaled * full_scale) + full_min

            metrics, residual_std = _metric_payload(validation["sales"], val_pred)
            return ModelRun(
                model_name="LSTM",
                status="trained",
                metrics=metrics,
                validation=_prediction_rows(validation["date"], val_pred),
                forecast=_forecast_rows(future, future_pred, residual_std),
            )
        except Exception as exc:  # pragma: no cover - model fit can fail by data
            return _empty_skip("LSTM", str(exc))

    @staticmethod
    def _make_sequences(values: np.ndarray, seq_len: int) -> tuple[np.ndarray, np.ndarray]:
        x_values: list[np.ndarray] = []
        y_values: list[float] = []
        for index in range(seq_len, len(values)):
            x_values.append(values[index - seq_len : index])
            y_values.append(values[index])
        x_array = np.asarray(x_values, dtype=float).reshape(-1, seq_len, 1)
        y_array = np.asarray(y_values, dtype=float)
        return x_array, y_array

    @staticmethod
    def _recursive_lstm_predict(model, scaled_history: np.ndarray, steps: int, seq_len: int) -> np.ndarray:
        working = list(np.asarray(scaled_history, dtype=float))
        predictions: list[float] = []
        for _ in range(steps):
            x_input = np.asarray(working[-seq_len:], dtype=float).reshape(1, seq_len, 1)
            pred = float(model.predict(x_input, verbose=0)[0][0])
            pred = max(0.0, pred)
            predictions.append(pred)
            working.append(pred)
        return np.asarray(predictions, dtype=float)

    def _run_seasonal_fallback(
        self,
        train: pd.DataFrame,
        validation: pd.DataFrame,
        full: pd.DataFrame,
        future: pd.DatetimeIndex,
    ) -> ModelRun:
        val_pred = self._seasonal_baseline_predict(train, len(validation))
        future_pred = self._seasonal_baseline_predict(full, len(future))
        metrics, residual_std = _metric_payload(validation["sales"], val_pred)
        return ModelRun(
            model_name="SeasonalNaiveFallback",
            status="trained",
            metrics=metrics,
            validation=_prediction_rows(validation["date"], val_pred),
            forecast=_forecast_rows(future, future_pred, residual_std),
            error="Used only because optional modeling libraries are unavailable or all required models failed.",
        )

    @staticmethod
    def _seasonal_baseline_predict(history: pd.DataFrame, steps: int) -> np.ndarray:
        values = history["sales"].astype(float).to_numpy()
        period = 52 if len(values) >= 104 else min(13, max(2, len(values) // 2))
        last_mean = float(np.mean(values[-min(8, len(values)) :]))
        previous = values[-min(16, len(values)) : -min(8, len(values))] if len(values) >= 16 else values
        previous_mean = float(np.mean(previous)) if len(previous) else last_mean
        weekly_trend = (last_mean - previous_mean) / max(min(8, len(values)), 1)
        predictions: list[float] = []
        for step in range(steps):
            seasonal_index = len(values) - period + (step % period)
            seasonal_value = values[seasonal_index] if seasonal_index >= 0 else last_mean
            blended = 0.7 * float(seasonal_value) + 0.3 * last_mean + weekly_trend * (step + 1)
            predictions.append(max(0.0, blended))
        return np.asarray(predictions, dtype=float)

