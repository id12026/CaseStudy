# End-to-End Time Series Forecasting System with API

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

# Architecture

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

# Project Structure

```
state-sales-forecasting/
├── .gitignore                     # Git ignore patterns
├── README.md                      # Project documentation
├── requirements.txt               # Python dependencies (13 packages)
├── .venv/                         # Python virtual environment
│
├── backend/                       # FastAPI backend service
│   ├── __init__.py
│   ├── app/                      # Core application modules
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app & REST endpoints (4.2 KB)
│   │   ├── data.py               # Data loading & preprocessing (5.7 KB)
│   │   ├── features.py           # Feature engineering pipeline (3.6 KB)
│   │   ├── models.py             # ML model implementations (17.5 KB)
│   │   ├── training.py           # Training orchestration (2.6 KB)
│   │   ├── metrics.py            # Evaluation metrics (1.5 KB)
│   │   ├── artifacts.py          # Model artifact management (1.4 KB)
│   │   ├── config.py             # Configuration settings (593 B)
│   │   └── simple_server.py      # Alternative server implementation (5.1 KB)
│   └── scripts/                  # Utility scripts
│       └── train.py              # Model training script (1.7 KB)
│
├── frontend/                      # React dashboard
│   ├── package.json              # Node.js dependencies (7 packages)
│   ├── package-lock.json         # Dependency lock file
│   ├── vite.config.js            # Vite build configuration
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── postcss.config.js         # PostCSS configuration
│   ├── index.html                # HTML entry point
│   ├── src/                      # Source code
│   │   ├── main.jsx              # React entry point (241 B)
│   │   ├── App.jsx               # Main application component (2.9 KB)
│   │   └── styles.css            # Global styles (3.9 KB)
│   ├── dist/                     # Production build output
│   ├── assets/                   # Static assets
│   └── node_modules/             # Node.js dependencies
│
├── data/                         # Dataset
│   └── sales_data.xlsx           # Sales data (251 KB, 8,084 rows)
│
├── artifacts/                    # Model outputs
│   ├── latest/                   # Latest training results
│   │   └── forecast_results.json # Forecasts & comparisons (761 KB)
│   └── models/                   # Trained model files
│
├── docs/                         # Documentation
│   ├── project_analysis_report.md # Comprehensive analysis report
│   └── video_walkthrough.md      # Video script documentation
│
└── tests/                        # Test suite
    └── test_data_features.py     # Data processing tests (1.2 KB)
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

# Screendhots

<img width="1600" height="808" alt="image" src="https://github.com/user-attachments/assets/bdcd488f-88bd-4fbd-b058-87df10293a8d" />
<img width="1600" height="807" alt="image" src="https://github.com/user-attachments/assets/a2116e1b-71a8-4a1f-a278-e7ceae1e9ce8" />

<img width="1600" height="793" alt="image" src="https://github.com/user-attachments/assets/1b8d7a9d-a269-4865-afb3-178810f41be4" />
<img width="1600" height="816" alt="image" src="https://github.com/user-attachments/assets/b2943fc8-06e9-4e44-b62a-75d903b67745" />

<img width="1600" height="806" alt="image" src="https://github.com/user-attachments/assets/7856caae-01b5-4741-bb4f-5854563a0a51" />

<img width="1600" height="804" alt="image" src="https://github.com/user-attachments/assets/a26445ff-0374-4078-966b-b6588008a370" />
<img width="1600" height="811" alt="image" src="https://github.com/user-attachments/assets/7e829fb0-e7bf-43e4-9e7f-b38ad64073c9" />

<img width="1600" height="800" alt="image" src="https://github.com/user-attachments/assets/71042240-2a64-4fec-a486-1e530eecfd04" />

<img width="1600" height="806" alt="image" src="https://github.com/user-attachments/assets/f94041a5-5ad5-4c50-bc2c-eaeb8f4871f7" />

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


#  BY
## Name: Mohitha Bandi
## E-maail: mohitha12026@gmail.com
## Contact: +91 8523015795
## College: Woxsen University

