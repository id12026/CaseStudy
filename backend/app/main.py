from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .artifacts import load_artifacts
from .config import ARTIFACT_FILE, DATA_PATH, FRONTEND_DIR
from .training import ForecastingPipeline


app = FastAPI(
    title="State Sales Forecasting API",
    version="1.0.0",
    description="Forecasts the next 8 weeks of state-level sales and exposes model comparison metadata.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _artifacts_or_404() -> dict[str, Any]:
    payload = load_artifacts(ARTIFACT_FILE)
    if payload is None:
        raise HTTPException(
            status_code=404,
            detail="No forecast artifacts found. Run python backend/scripts/train.py first.",
        )
    return payload


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "data_file": str(DATA_PATH),
        "artifact_file": str(ARTIFACT_FILE),
        "artifacts_ready": ARTIFACT_FILE.exists(),
    }


@app.get("/api/summary")
def summary() -> dict[str, Any]:
    payload = _artifacts_or_404()
    return {
        "generated_at": payload["generated_at"],
        "summary": payload["summary"],
        "model_counts": payload.get("model_counts", {}),
        "run_status_counts": payload.get("run_status_counts", {}),
    }


@app.get("/api/states")
def states() -> dict[str, Any]:
    payload = _artifacts_or_404()
    names = sorted(payload["states"].keys())
    return {"states": names}


@app.get("/api/forecast/{state}")
def forecast(state: str) -> dict[str, Any]:
    payload = _artifacts_or_404()
    state_payload = payload["states"].get(state)
    if not state_payload:
        raise HTTPException(status_code=404, detail=f"State not found: {state}")
    return state_payload


@app.get("/api/model-comparison")
def model_comparison() -> dict[str, Any]:
    payload = _artifacts_or_404()
    rows = []
    for state, state_payload in payload["states"].items():
        for run in state_payload["comparison"]:
            rows.append(
                {
                    "state": state,
                    "model_name": run["model_name"],
                    "status": run["status"],
                    "mae": run["metrics"].get("mae"),
                    "rmse": run["metrics"].get("rmse"),
                    "mape": run["metrics"].get("mape"),
                    "smape": run["metrics"].get("smape"),
                    "is_best": run["model_name"] == state_payload["best_model"],
                    "error": run.get("error"),
                }
            )
    return {"rows": rows}


def _train_job(fast: bool) -> None:
    ForecastingPipeline(data_path=DATA_PATH, fast=fast, allow_fallback=True).run()


@app.post("/api/train")
def train(background_tasks: BackgroundTasks, fast: bool = False) -> dict[str, Any]:
    background_tasks.add_task(_train_job, fast=fast)
    return {"status": "accepted", "message": "Training started in the background.", "fast": fast}


def _frontend_root() -> Path:
    dist = FRONTEND_DIR / "dist"
    return dist if (dist / "index.html").exists() else FRONTEND_DIR


def _assets_root() -> Path:
    root = _frontend_root()
    return root / "assets"


if _assets_root().exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_root())), name="assets")


@app.get("/")
def index() -> FileResponse:
    index_file = _frontend_root() / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend not found.")
    return FileResponse(index_file)


@app.get("/{path:path}")
def frontend_fallback(path: str) -> FileResponse:
    frontend_root = _frontend_root().resolve()
    target = (frontend_root / path).resolve()
    if target.exists() and target.is_file() and frontend_root in target.parents:
        return FileResponse(target)
    return FileResponse(frontend_root / "index.html")
