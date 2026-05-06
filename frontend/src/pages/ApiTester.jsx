import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Code2, Copy, Play, Server, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "../components/ChartCard";
import { PageHeader } from "../components/Shell";
import { callApi } from "../lib/api";

const endpoints = [
  { label: "Health", method: "GET", path: "/api/health" },
  { label: "Summary", method: "GET", path: "/api/summary" },
  { label: "States", method: "GET", path: "/api/states" },
  { label: "Forecast", method: "GET", path: "/api/forecast/California" },
  { label: "Model Comparison", method: "GET", path: "/api/model-comparison" },
  { label: "Train Fast", method: "POST", path: "/api/train?fast=true" }
];

export function ApiTester() {
  const [selected, setSelected] = useState(endpoints[3]);
  const [path, setPath] = useState(endpoints[3].path);
  const [method, setMethod] = useState(endpoints[3].method);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const prettyBody = useMemo(() => {
    if (!response) return "";
    return typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2);
  }, [response]);

  async function run() {
    setLoading(true);
    try {
      setResponse(await callApi(path, method));
    } catch (error) {
      setResponse({ status: 0, ok: false, body: { error: error.message } });
    } finally {
      setLoading(false);
    }
  }

  function choose(endpoint) {
    setSelected(endpoint);
    setPath(endpoint.path);
    setMethod(endpoint.method);
  }

  return (
    <div>
      <PageHeader
        kicker="API tester"
        title="Explore forecasts like a product API"
        description="Run backend requests, inspect JSON payloads, and confirm that the dashboard data contract is simple enough for other systems to consume."
        action={
          <button type="button" className="primary-button" onClick={run}>
            <Play className="h-4 w-4" />
            Send Request
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <ChartCard title="Endpoint Library" subtitle="Common forecast service requests">
          <div className="space-y-2">
            {endpoints.map((endpoint) => (
              <button
                type="button"
                key={endpoint.label}
                className={`w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 ${
                  selected.label === endpoint.label
                    ? "border-cyanic/70 bg-cyanic/10"
                    : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08] light:border-slate-900/10 light:bg-slate-950/[0.04]"
                }`}
                onClick={() => choose(endpoint)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-base font-black">{endpoint.label}</span>
                  <span className="metric-chip">{endpoint.method}</span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-slate-400">{endpoint.path}</p>
              </button>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-5">
          <ChartCard
            title="Request Builder"
            subtitle="Change the path, method, or state slug and send the call"
            action={
              <button type="button" className="secondary-button" onClick={() => navigator.clipboard?.writeText(path)}>
                <Copy className="h-4 w-4" />
                Copy path
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-[150px_1fr_auto]">
              <select className="field" value={method} onChange={(event) => setMethod(event.target.value)}>
                <option>GET</option>
                <option>POST</option>
              </select>
              <input className="field" value={path} onChange={(event) => setPath(event.target.value)} />
              <button type="button" className="primary-button" onClick={run}>
                <Server className="h-4 w-4" />
                Run
              </button>
            </div>
          </ChartCard>

          <ChartCard
            title="Response"
            subtitle="Human-readable JSON for debugging API consumers"
            action={
              response ? (
                <span className={`metric-chip ${response.ok ? "text-cyanic" : "text-coral"}`}>
                  {response.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  Status {response.status}
                </span>
              ) : null
            }
          >
            <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 light:border-slate-900/10 light:bg-slate-950">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    className="grid h-[420px] place-items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="text-center">
                      <Code2 className="mx-auto h-10 w-10 animate-pulse text-cyanic" />
                      <p className="mt-4 text-sm font-black text-slate-400">Calling forecast service</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.pre
                    key={prettyBody || "empty"}
                    className="custom-scrollbar max-h-[560px] overflow-auto p-5 text-sm leading-6 text-slate-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {prettyBody || "{\n  \"message\": \"Send a request to inspect forecast API output.\"\n}"}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

