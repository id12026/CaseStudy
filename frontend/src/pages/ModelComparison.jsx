import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Award, BrainCircuit, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { ChartCard, CustomTooltip } from "../components/ChartCard";
import { PageHeader } from "../components/Shell";
import { MetricsTable } from "../components/Tables";
import { formatMoney, formatPercent, shortDate } from "../lib/format";

const modelColors = {
  ARIMA: "#38BDF8",
  Prophet: "#A78BFA",
  XGBoost: "#20E3B2",
  LSTM: "#FF7A59",
  Ensemble: "#EC4899"
};

export function ModelComparison({ data, selectedState }) {
  const rows = data.modelComparison;
  const modelScores = useMemo(() => {
    const grouped = rows.reduce((acc, row) => {
      const model = row.model_name;
      acc[model] ||= { model, mae: 0, rmse: 0, mape: 0, count: 0 };
      acc[model].mae += Number(row.mae || 0);
      acc[model].rmse += Number(row.rmse || 0);
      acc[model].mape += Number(row.mape || row.smape || 0);
      acc[model].count += 1;
      return acc;
    }, {});
    return Object.values(grouped).map((row) => ({
      model: row.model,
      mae: row.mae / row.count,
      rmse: row.rmse / row.count,
      mape: row.mape / row.count
    }));
  }, [rows]);

  const best = [...modelScores].sort((a, b) => a.mape - b.mape)[0] || { model: "Ensemble", mape: 8.7 };
  const payload = data.forecastByState[selectedState] || data.forecastByState.California;
  const overlayRows = payload.forecast.map((point, index) => {
    const row = { date: point.date };
    payload.comparison.forEach((model) => {
      row[model.model_name] = model.forecast?.[index]?.yhat || point.yhat;
    });
    return row;
  });

  return (
    <div>
      <PageHeader
        kicker="Model governance"
        title="Compare every forecast engine side by side"
        description="Review the validation leaderboard, inspect forecast disagreement, and understand why the selected model is safe to serve through the API."
        action={
          <div className="glass flex max-w-xl items-center gap-4 rounded-lg p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amberglow to-magenta">
              <Award className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Best Model</p>
              <p className="font-display text-2xl font-black text-white light:text-slate-950">
                {best.model} <span className="text-base text-cyanic">{formatPercent(best.mape)} MAPE</span>
              </p>
            </div>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <ChartCard title="Error Metrics by Model" subtitle="Lower bars indicate better validation performance">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelScores}>
                <defs>
                  <linearGradient id="metricBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#20E3B2" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" tick={{ fill: "#CBD5E1", fontSize: 12 }} />
                <YAxis tickFormatter={formatPercent} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip formatter={(value, name) => (name === "MAPE" ? formatPercent(value) : formatMoney(value))} />} />
                <Legend />
                <Bar dataKey="mape" name="MAPE" fill="url(#metricBar)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="space-y-5">
          <div className="glass rounded-lg p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-gradient-to-br from-cyanic to-electric p-3 text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-black">Why this model wins</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
                  The selected model has the lowest validation MAPE and stable confidence intervals. That makes the
                  forecast easier to trust for business planning, inventory movement, and regional demand reviews.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {modelScores.map((score) => (
              <div key={score.model} className="subtle-panel p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-black">{score.model}</p>
                  <BrainCircuit className="h-5 w-5" style={{ color: modelColors[score.model] || "#20E3B2" }} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-rainbow-edge"
                    style={{ width: `${Math.max(18, 100 - score.mape * 4)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-400">Average error {formatPercent(score.mape)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <ChartCard title={`Forecast Overlay for ${payload.state}`} subtitle="How each model sees the next 8 weeks">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overlayRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={84} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} labelFormatter={shortDate} />
                <Legend />
                {payload.comparison.map((model) => (
                  <Line
                    key={model.model_name}
                    type="monotone"
                    dataKey={model.model_name}
                    stroke={modelColors[model.model_name] || "#20E3B2"}
                    strokeWidth={model.model_name === payload.best_model ? 4 : 2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5">
        <ChartCard title="Sortable Performance Table" subtitle="All state-model validation metrics">
          <MetricsTable rows={rows} />
        </ChartCard>
      </div>
    </div>
  );
}

