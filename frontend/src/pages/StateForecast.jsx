import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Copy, Download, ImageDown, Medal, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard, CustomTooltip } from "../components/ChartCard";
import { PageHeader } from "../components/Shell";
import { StateSelector } from "../components/StateSelector";
import { ForecastTable } from "../components/Tables";
import { downloadCsv, downloadElementPng } from "../lib/download";
import { formatMoney, formatPercent, shortDate } from "../lib/format";

const modelColors = {
  ARIMA: "#38BDF8",
  Prophet: "#A78BFA",
  XGBoost: "#20E3B2",
  LSTM: "#FF7A59",
  Ensemble: "#EC4899"
};

function buildChartRows(payload, selectedModel) {
  const modelRun = payload.comparison.find((run) => run.model_name === selectedModel) || payload.comparison[0];
  const forecast = modelRun?.forecast?.length ? modelRun.forecast : payload.forecast;
  return [
    ...payload.history.map((row) => ({
      date: row.date,
      actual: row.sales,
      forecast: null,
      lower: null,
      upper: null
    })),
    ...forecast.map((row) => ({
      date: row.date,
      actual: null,
      forecast: row.yhat,
      lower: row.lower,
      upper: row.upper
    }))
  ];
}

export function StateForecast({ data, selectedState, setSelectedState }) {
  const [selectedModel, setSelectedModel] = useState("Ensemble");
  const payload = data.forecastByState[selectedState] || data.forecastByState.California;
  const activeModel = payload.comparison.find((run) => run.model_name === selectedModel) ? selectedModel : payload.best_model;
  const modelRun = payload.comparison.find((run) => run.model_name === activeModel) || payload.comparison[0];
  const rows = useMemo(() => buildChartRows(payload, activeModel), [payload, activeModel]);

  function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}?state=${encodeURIComponent(payload.state)}`;
    navigator.clipboard?.writeText(url);
  }

  return (
    <div>
      <PageHeader
        kicker="State-wise forecast"
        title={`${payload.state} sales outlook`}
        description="Select any state, compare model behavior, inspect prediction intervals, and export the exact next 8 week forecast table."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-button" onClick={copyShareLink}>
              <Copy className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => downloadElementPng("state-forecast-chart", `${payload.state}_forecast.png`)}
            >
              <ImageDown className="h-4 w-4" />
              PNG
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                downloadCsv(`${payload.state}_forecast.csv`, [
                  ["date", "predicted_sales", "lower_bound", "upper_bound"],
                  ...payload.forecast.map((row) => [row.date, row.yhat, row.lower, row.upper])
                ])
              }
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <StateSelector states={data.states} value={payload.state} onChange={setSelectedState} />
          <div className="glass rounded-lg p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amberglow to-magenta">
                <Wand2 className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Auto-select best model</p>
                <p className="font-display text-xl font-black text-white light:text-slate-950">{payload.best_model}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400 light:text-slate-600">
              The service ranks models on the latest time-series validation split and uses the lowest error model for
              production forecasts.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <ChartCard
            id="state-forecast-chart"
            title="Actual vs Forecast"
            subtitle="Historical actual sales, selected model forecast, and confidence band"
            action={
              <div className="flex flex-wrap gap-2">
                {["ARIMA", "Prophet", "XGBoost", "LSTM", "Ensemble"].map((model) => (
                  <button
                    type="button"
                    key={model}
                    className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                      activeModel === model
                        ? "bg-white text-slate-950 shadow-glow"
                        : "bg-white/[0.08] text-slate-300 hover:bg-white/15 light:bg-slate-950/[0.05] light:text-slate-700"
                    }`}
                    onClick={() => setSelectedModel(model)}
                  >
                    {model}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows}>
                  <defs>
                    <linearGradient id="stateActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#20E3B2" stopOpacity={0.48} />
                      <stop offset="100%" stopColor="#20E3B2" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="stateBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={modelColors[activeModel]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={modelColors[activeModel]} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={86} />
                  <Tooltip content={<CustomTooltip formatter={formatMoney} />} labelFormatter={shortDate} />
                  <Legend />
                  <Area name="Actual Sales" type="monotone" dataKey="actual" stroke="#20E3B2" fill="url(#stateActual)" strokeWidth={3} connectNulls />
                  <Area name="Upper Bound" type="monotone" dataKey="upper" stroke="transparent" fill="url(#stateBand)" connectNulls />
                  <Line
                    name={`${activeModel} Forecast`}
                    type="monotone"
                    dataKey="forecast"
                    stroke={modelColors[activeModel]}
                    strokeWidth={4}
                    strokeDasharray="9 7"
                    dot={{ r: 4 }}
                    connectNulls
                  />
                  <Line name="Lower Bound" type="monotone" dataKey="lower" stroke="#94A3B8" strokeDasharray="5 6" dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {payload.comparison.map((run) => (
              <button
                type="button"
                key={run.model_name}
                onClick={() => setSelectedModel(run.model_name)}
                className={`glass rounded-lg p-4 text-left transition hover:-translate-y-1 ${
                  run.model_name === activeModel ? "ring-2 ring-cyanic/70" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-black">{run.model_name}</p>
                  {run.model_name === payload.best_model ? <Medal className="h-5 w-5 text-amberglow" /> : null}
                </div>
                <div className="mt-4 space-y-2 text-sm font-bold text-slate-400">
                  <p>MAE <span className="float-right text-white light:text-slate-950">{formatMoney(run.metrics.mae)}</span></p>
                  <p>RMSE <span className="float-right text-white light:text-slate-950">{formatMoney(run.metrics.rmse)}</span></p>
                  <p>MAPE <span className="float-right text-cyanic">{formatPercent(run.metrics.mape)}</span></p>
                </div>
              </button>
            ))}
          </div>

          <ChartCard title="Next 8 Weeks Forecast Table" subtitle={`Selected model: ${activeModel}`}>
            <ForecastTable rows={modelRun?.forecast?.length ? modelRun.forecast : payload.forecast} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

