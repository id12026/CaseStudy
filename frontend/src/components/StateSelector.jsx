import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export function StateSelector({ states, value, onChange }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => states.filter((state) => state.toLowerCase().includes(query.toLowerCase())).slice(0, 12),
    [query, states]
  );

  return (
    <div className="subtle-panel p-3">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 light:border-slate-900/10 light:bg-white">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500 light:text-slate-950"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search state"
        />
      </div>
      <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 custom-scrollbar">
        {filtered.map((state) => (
          <button
            type="button"
            key={state}
            className={`rounded-lg px-3 py-2 text-left text-sm font-extrabold transition ${
              state === value
                ? "bg-gradient-to-r from-electric to-cyanic text-white shadow-glow"
                : "bg-white/[0.06] text-slate-300 hover:bg-white/10 light:bg-slate-950/[0.04] light:text-slate-700"
            }`}
            onClick={() => onChange(state)}
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
}

