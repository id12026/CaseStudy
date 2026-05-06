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
import { CalendarDays, Layers3, SlidersHorizontal } from "lucide-react";
import { ChartCard, CustomTooltip } from "../components/ChartCard";
import { PageHeader } from "../components/Shell";
import { formatMoney, formatNumber, shortDate } from "../lib/format";

export function HistoricalAnalysis({ data }) {
  return (
    <div>
      <PageHeader
        kicker="Historical analysis"
        title="Seasonality, patterns, and lag signals"
        description="Use these visuals to explain why the forecast moves: trend, seasonal pulses, calendar effects, and the lag features that power machine-learning models."
        action={
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-2 light:border-slate-900/10 light:bg-white/80">
            <span className="metric-chip"><Layers3 className="h-3.5 w-3.5 text-cyanic" /> Trend</span>
            <span className="metric-chip"><CalendarDays className="h-3.5 w-3.5 text-magenta" /> Seasonality</span>
            <span className="metric-chip"><SlidersHorizontal className="h-3.5 w-3.5 text-amberglow" /> Lags</span>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <ChartCard title="Seasonality Decomposition" subtitle="Trend, seasonal lift, and residual movement">
          <div className="h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.decomposition}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.46} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={84} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} labelFormatter={shortDate} />
                <Legend />
                <Area name="Trend" type="monotone" dataKey="trend" stroke="#38BDF8" fill="url(#trendFill)" strokeWidth={3} />
                <Line name="Seasonal Lift" type="monotone" dataKey="seasonal" stroke="#EC4899" strokeWidth={3} dot={false} />
                <Line name="Residual" type="monotone" dataKey="residual" stroke="#F59E0B" strokeDasharray="6 6" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Lag Feature Importance" subtitle="Top engineered features for tree models">
          <div className="h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.featureImportance} layout="vertical" margin={{ left: 12, right: 20 }}>
                <defs>
                  <linearGradient id="featureBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF7A59" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `${value}%`} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis dataKey="feature" type="category" width={128} tick={{ fill: "#CBD5E1", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip formatter={(value) => `${formatNumber(value)}%`} />} />
                <Bar dataKey="importance" name="Importance" fill="url(#featureBar)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Monthly Pattern" subtitle="Average sales concentration by calendar month">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyPattern}>
                <defs>
                  <linearGradient id="monthBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20E3B2" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fill: "#94A3B8", fontSize: 12 }} width={82} />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                <Bar dataKey="sales" name="Sales" fill="url(#monthBar)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Day-of-week Pattern" subtitle="Calendar signal used by feature engineering">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dayPatterns}>
                <defs>
                  <linearGradient id="dayBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}`} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip formatter={(value) => `${value} index`} />} />
                <Bar dataKey="impact" name="Demand Index" fill="url(#dayBar)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

