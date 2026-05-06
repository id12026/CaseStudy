import { motion } from "framer-motion";

export function ChartCard({ title, subtitle, action, children, className = "", id }) {
  return (
    <motion.section
      id={id}
      className={`glass rounded-lg p-5 ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-black text-white light:text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-400 light:text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/92 p-3 shadow-violet backdrop-blur-xl light:bg-white/95">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.dataKey}`} className="flex items-center justify-between gap-5 text-sm">
            <span className="flex items-center gap-2 font-bold text-slate-300 light:text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-black text-white light:text-slate-950">
              {formatter ? formatter(item.value, item.name) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

