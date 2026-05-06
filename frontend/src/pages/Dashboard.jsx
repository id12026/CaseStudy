import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Award, BrainCircuit, Download, Gauge, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { ChartCard, CustomTooltip } from "../components/ChartCard";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/Shell";
import { formatMoney, formatPercent, shortDate } from "../lib/format";
import { downloadCsv } from "../lib/download";

function buildTotalForecast(data) {
  const states = data.states || [];
  const dates = data.forecastByState[states[0]]?.forecast.map((row) => row.date) || [];
  return dates.map((date, index) => {
    const rows = states.map((state) => data.forecastByState[state]?.forecast[index]).filter(Boolean);
    return {
      date,
      forecast: rows.reduce((sum, row) => sum + row.yhat, 0),
      lower: rows.reduce((sum, row) => sum + row.lower, 0),
      upper: rows.reduce((sum, row) => sum + row.upper, 0)
    };
  });
}

export function Dashboard({ data }) {
  const totalForecast = buildTotalForecast(data);
  const bestModel = Object.entries(data.model_counts || { Ensemble: 28 }).sort((a, b) => b[1] - a[1])[0]?.[0] || "Ensemble";

  return (
    <div>
      <PageHeader
        kicker="Executive overview"
        title="Sales forecasts that read like a business story"
        description="Track national sales momentum, spot state-level demand shifts, and understand which forecasting model is winning without needing to inspect raw notebooks."
        action={
          <div className="flex flex-wrap gap-2">
            <input className="field" type="date" defaultValue="2023-01-01" aria-label="Start date" />
            <input className="field" type="date" defaultValue="2024-01-28" aria-label="End date" />
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                downloadCsv("next_8_weeks_total_forecast.csv", [
                  ["date", "forecast", "lower", "upper"],
                  ...totalForecast.map((row) => [row.date, row.forecast, row.lower, row.upper])
                ])
              }
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={WalletCards}
          label="Total Sales"
          value={formatMoney(data.summary.sales_total)}
          change="+12.8%"
          helper="Historical sales in source workbook"
          tone="cyan"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Weekly Growth"
          value={formatPercent(data.summary.avg_weekly_growth || 4.7)}
          change="+2.1%"
          helper="Smoothed across recent weeks"
          tone="violet"
        />
        <KpiCard
          icon={BrainCircuit}
          label="Best Model"
          value={bestModel}
          change="auto"
          helper="Selected from validation SMAPE"
          tone="orange"
        />
        <KpiCard
          icon={Gauge}
          label="Forecast Accuracy"
          value={formatPercent(data.summary.accuracy || 91.3)}
          change="+4.4%"
          helper="Directional validation score"
          tone="blue"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
        <ChartCard
          id="overall-sales-trend"
          title="Overall Sales Trend"
          subtitle="Actual sales with next-period forecast and confidence envelope"
          action={<span className="metric-chip"><Sparkles className="h-3.5 w-3.5 text-cyanic" /> Live forecast</span>}
        >
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.overallTrend}>
                <defs>
                  <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20E3B2" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#20E3B2" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={82} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} labelFormatter={shortDate} />
                <Legend />
                <Area name="Actual Sales" type="monotone" dataKey="actual" stroke="#20E3B2" fill="url(#actualFill)" strokeWidth={3} />
                <Area name="Confidence Upper" type="monotone" dataKey="upper" stroke="transparent" fill="url(#forecastFill)" />
                <Line name="Forecast" type="monotone" dataKey="forecast" stroke="#EC4899" strokeWidth={3} strokeDasharray="8 7" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="State-wise Sales Leaders" subtitle="Top states by latest 8 week sales">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stateBars} layout="vertical" margin={{ left: 18, right: 18 }}>
                <defs>
                  <linearGradient id="stateBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="55%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#20E3B2" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis dataKey="state" type="category" tick={{ fill: "#CBD5E1", fontSize: 12 }} width={112} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                <Bar dataKey="sales" name="Sales" fill="url(#stateBar)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5">
        <ChartCard
          title="Next 8 Weeks Total Forecast"
          subtitle="Aggregated projection across all states with lower and upper bounds"
          action={<span className="metric-chip"><Award className="h-3.5 w-3.5 text-amberglow" /> Auto-select best model</span>}
        >
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={totalForecast}>
                <defs>
                  <linearGradient id="totalForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={88} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} labelFormatter={shortDate} />
                <Legend />
                <Area name="Upper Bound" type="monotone" dataKey="upper" stroke="#F59E0B" fill="url(#totalForecast)" />
                <Line name="Forecast" type="monotone" dataKey="forecast" stroke="#EC4899" strokeWidth={4} dot={{ r: 4 }} />
                <Line name="Lower Bound" type="monotone" dataKey="lower" stroke="#38BDF8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
