from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .artifacts import save_artifacts
from .config import DATA_PATH, FORECAST_HORIZON, VALIDATION_WEEKS, WEEKLY_FREQ
from .data import aggregate_weekly_sales, latest_history_for_state, load_sales_data, state_names, summarize_dataset
from .models import StateForecaster


class ForecastingPipeline:
    def __init__(
        self,
        data_path: str | Path = DATA_PATH,
        horizon: int = FORECAST_HORIZON,
        validation_size: int = VALIDATION_WEEKS,
        freq: str = WEEKLY_FREQ,
        allow_fallback: bool = True,
        fast: bool = False,
    ) -> None:
        self.data_path = Path(data_path)
        self.horizon = horizon
        self.validation_size = validation_size
        self.freq = freq
        self.allow_fallback = allow_fallback
        self.fast = fast

    def run(self, max_states: int | None = None) -> dict[str, Any]:
        raw = load_sales_data(self.data_path)
        weekly = aggregate_weekly_sales(raw, freq=self.freq)
        names = state_names(weekly)
        if max_states:
            names = names[:max_states]

        forecaster = StateForecaster(
            horizon=self.horizon,
            validation_size=self.validation_size,
            freq=self.freq,
            allow_fallback=self.allow_fallback,
            fast=self.fast,
        )

        states: dict[str, Any] = {}
        best_models: list[str] = []
        statuses: list[str] = []
        for state in names:
            state_frame = weekly[weekly["state"] == state]
            result = forecaster.train_state(state, state_frame)
            result["history"] = latest_history_for_state(weekly, state)
            states[state] = result
            best_models.append(result["best_model"])
            statuses.extend(run["status"] for run in result["comparison"])

        summary = summarize_dataset(raw, weekly)
        summary["trained_states"] = len(states)
        summary["forecast_horizon_weeks"] = self.horizon
        summary["validation_weeks"] = self.validation_size
        summary["weekly_frequency"] = self.freq

        payload: dict[str, Any] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_path": str(self.data_path),
            "summary": summary,
            "model_counts": dict(Counter(best_models)),
            "run_status_counts": dict(Counter(statuses)),
            "states": states,
        }
        save_artifacts(payload)
        return payload

