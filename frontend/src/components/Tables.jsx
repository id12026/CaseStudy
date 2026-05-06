import { ArrowDownUp, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney, formatPercent } from "../lib/format";

export function ForecastTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 light:border-slate-900/10">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Predicted Sales</th>
              <th className="px-4 py-3">Lower Bound</th>
              <th className="px-4 py-3">Upper Bound</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="transition hover:bg-white/[0.04] light:hover:bg-slate-900/[0.03]">
                <td className="table-cell font-extrabold">{row.date}</td>
                <td className="table-cell font-black text-cyanic">{formatMoney(row.yhat)}</td>
                <td className="table-cell">{formatMoney(row.lower)}</td>
                <td className="table-cell">{formatMoney(row.upper)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MetricsTable({ rows }) {
  const [sortKey, setSortKey] = useState("mape");
  const sorted = useMemo(
    () => [...rows].sort((a, b) => Number(a[sortKey] ?? Infinity) - Number(b[sortKey] ?? Infinity)),
    [rows, sortKey]
  );

  const headers = [
    ["model_name", "Model"],
    ["mape", "MAPE"],
    ["mae", "MAE"],
    ["rmse", "RMSE"],
    ["status", "Status"]
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 light:border-slate-900/10">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="table-head">
              {headers.map(([key, label]) => (
                <th key={key} className="px-4 py-3">
                  <button className="inline-flex items-center gap-2" type="button" onClick={() => setSortKey(key)}>
                    {label}
                    <ArrowDownUp className="h-3.5 w-3.5" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.state || "selected"}-${row.model_name}`} className="transition hover:bg-white/[0.04]">
                <td className="table-cell font-black">
                  <span className="inline-flex items-center gap-2">
                    {row.is_best ? <CheckCircle2 className="h-4 w-4 text-cyanic" /> : null}
                    {row.model_name}
                  </span>
                </td>
                <td className="table-cell">{formatPercent(row.mape ?? row.smape)}</td>
                <td className="table-cell">{formatMoney(row.mae)}</td>
                <td className="table-cell">{formatMoney(row.rmse)}</td>
                <td className="table-cell">
                  <span className="metric-chip">{row.status || "trained"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

