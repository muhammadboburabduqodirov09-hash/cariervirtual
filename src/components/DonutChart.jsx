import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fmtMoney } from "../lib/data";
import { SymbolIcon } from "./VisualIcon";

const SEGMENTS = [
  { key: "spendable", label: "Spendable", sub: "Free allowance", e: "WalletCards", color: "#34d399", soft: "bg-emerald-50 text-emerald-700", share: 0.58 },
  { key: "savings", label: "Savings", sub: "Locked toward goal", e: "LockKeyhole", color: "#818cf8", soft: "bg-indigo-50 text-indigo-700", share: 0.3 },
  { key: "tax", label: "Tax / Community", sub: "Virtual tax pot", e: "ShieldCheck", color: "#fbbf24", soft: "bg-amber-50 text-amber-700", share: 0.12 },
];

const R = 54;
const C = 2 * Math.PI * R;

/**
 * Interactive donut chart of the money split.
 * Uses real wallet totals; before the first payout it previews the 58/30/12 plan.
 */
export default function DonutChart({ wallet, currency }) {
  const [active, setActive] = useState(null);

  const real = {
    spendable: wallet.spendable,
    savings: wallet.savings,
    tax: wallet.taxPaid,
  };
  const realTotal = real.spendable + real.savings + real.tax;
  const isPlan = realTotal <= 0;

  const segs = useMemo(() => {
    let offset = 0;
    return SEGMENTS.map((s) => {
      const value = isPlan ? s.share : real[s.key] / realTotal;
      const seg = { ...s, value, amount: isPlan ? null : real[s.key], dash: value * C, offset };
      offset += value * C;
      return seg;
    });
  }, [wallet.spendable, wallet.savings, wallet.taxPaid, currency]);

  const focus = active != null ? segs[active] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          {segs.map((s, i) => (
            <motion.circle
              key={s.key}
              cx="70" cy="70" r={R} fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 26 : 20}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(s.dash - 1.5, 0)} ${C}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              className="cursor-pointer transition-all duration-200"
              style={{ opacity: active == null || active === i ? 1 : 0.35 }}
              initial={{ strokeDashoffset: 0, rotate: 0 }}
              animate={{ strokeDashoffset: -s.offset }}
              transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.12 }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            <div className="text-2xl"><SymbolIcon value={focus ? focus.e : "Receipt"} size={22} /></div>
            <div className="font-display text-lg leading-tight text-slate-900">
              {focus ? `${Math.round(focus.value * 100)}%` : isPlan ? "58·30·12" : fmtMoney(realTotal, currency)}
            </div>
            <div className="text-[11px] font-bold text-slate-400 leading-tight px-4">
              {focus ? focus.label : isPlan ? "split plan" : "total earned"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {segs.map((s, i) => (
          <button
            key={s.key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
            className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-150 ${s.soft} ${active === i ? "ring-2 ring-slate-900/10 scale-[1.02]" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-base"><SymbolIcon value={s.e} size={16} /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-extrabold text-sm leading-tight">{s.label}</span>
              <span className="block text-[11px] font-semibold opacity-70 leading-tight">{s.sub}</span>
            </span>
            <span className="text-right shrink-0">
              <span className="block font-display text-sm">{Math.round(s.value * 100)}%</span>
              <span className="block text-[11px] font-bold opacity-70">
                {isPlan ? "planned" : fmtMoney(s.amount, currency)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
