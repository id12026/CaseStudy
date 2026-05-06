# State Sales Forecasting System

This project builds an end-to-end forecasting service for the provided sales workbook. It trains and compares SARIMA, Prophet, XGBoost, and LSTM models per state, selects the best validation performer, and exposes the selected 8 week forecast through a REST API and dashboard.

## Dataset

Downloaded workbook: `data/sales_data.xlsx`

Observed schema:

| Column | Meaning |
| --- | --- |
| `State` | US state |
| `Date` | historical sales date |
| `Total` | sales amount |
| `Category` | product category, currently `Beverages` |

The pipeline normalizes the workbook to `state`, `date`, `sales`, and `category`, then aggregates total sales by `state` and `date`. Because the assignment asks for weekly forecasts and the source dates are irregular, the backend resamples each state to a regular weekly `W-SUN` time index and imputes missing state-weeks with time interpolation, forward fill, back fill, and a final zero fallback.

## Architecture

```text
data/sales_data.xlsx
        |
backend/app/data.py        load, validate, aggregate, impute
backend/app/features.py    lags t-1/t-7/t-30, rolling stats, calendar, holiday flag
backend/app/models.py      SARIMA, Prophet, XGBoost, LSTM, validation metrics
backend/app/training.py    per-state training, model selection, artifact creation
backend/app/main.py        FastAPI REST service and static dashboard
frontend/                  forecasting dashboard
artifacts/latest/          generated forecasts and model comparison JSON
```

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Train the models:

```powershell
python backend/scripts/train.py --data data/sales_data.xlsx
```

For a quicker smoke run:

```powershell
python backend/scripts/train.py --data data/sales_data.xlsx --fast
```

Start the API and dashboard:

```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

## Frontend

The frontend is a React 18 + Vite single-page app with Tailwind CSS, Recharts, framer-motion, and lucide-react.

Install and run the UI in development mode:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api/*` calls to the FastAPI backend on port `8000`.

Build the production frontend:

```powershell
cd frontend
npm run build
```

FastAPI automatically serves `frontend/dist/index.html` and `frontend/dist/assets` when the build exists.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | service status |
| `GET` | `/api/summary` | dataset and training summary |
| `GET` | `/api/states` | state list |
| `GET` | `/api/forecast/{state}` | selected state's history, best model, comparison, and 8 week forecast |
| `GET` | `/api/model-comparison` | flat comparison table across states and models |
| `POST` | `/api/train?fast=true` | background training job |

FastAPI also exposes OpenAPI docs at `/docs`.

## Model Selection

Each state uses a time-series split with the last 8 weeks as validation. No random shuffle is used. Models are ranked by SMAPE, with RMSE as a tie breaker.

Implemented model families:

| Model | Seasonality and trend handling |
| --- | --- |
| SARIMA | fixed ARIMA order with seasonal order, using weekly seasonality |
| Prophet | yearly seasonality, holidays, linear trend |
| XGBoost | recursive forecasting with lag features, rolling mean/std, calendar fields, holiday flag |
| LSTM | sequence model trained on scaled weekly sales |

If heavyweight optional libraries are unavailable in a local smoke environment, the code records skipped model runs and can create preview forecasts with `SeasonalNaiveFallback`. Install `requirements.txt` and rerun training to produce the mandatory model comparison.

## Feature Engineering

The supervised feature set includes:

- Lag features: `lag_1`, `lag_7`, `lag_30`
- Rolling statistics: 4, 8, and 13 week trailing mean and standard deviation
- Calendar fields: day of week, month, quarter, year, ISO week
- Holiday flag: US federal holiday within the weekly bucket

Rolling and lag features are shifted so the target week is not used to predict itself.

## Deliverables

- Backend source: `backend/`
- Frontend dashboard: `frontend/`
- Dataset: `data/sales_data.xlsx`
- Training artifacts: `artifacts/latest/forecast_results.json`
- Video script: `docs/video_walkthrough.md`
