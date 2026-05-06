import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({ icon: Icon, label, value, change, tone = "cyan", helper }) {
  const palette = {
    cyan: "from-cyan-400 to-teal-300",
    violet: "from-violet-400 to-fuchsia-400",
    orange: "from-orange-300 to-pink-400",
    blue: "from-sky-400 to-indigo-400"
  }[tone];
  const positive = !String(change || "").startsWith("-");

  return (
    <motion.article
      className="glass group relative overflow-hidden rounded-lg p-5"
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${palette}`} />
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-lg bg-gradient-to-br ${palette} p-3 text-white shadow-glow`}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`metric-chip ${
            positive ? "text-cyanic light:text-teal-700" : "text-coral light:text-rose-700"
          }`}
        >
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {change}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-slate-400 light:text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-black tracking-tight text-white light:text-slate-950">{value}</p>
      {helper ? <p className="mt-3 text-xs font-semibold text-slate-500 light:text-slate-500">{helper}</p> : null}
    </motion.article>
  );
}

