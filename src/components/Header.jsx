import React from "react";
import { Trophy } from "lucide-react";
import { CURRENCY_LIST } from "../lib/data";

/* Top bar: brand + currency switcher, shared by kid & parent views */
export default function Header({ currency, setCurrency }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 grid place-items-center bg-white rounded-2xl border border-slate-100 shadow-sm shrink-0 text-amber-500"><Trophy size={19} /></div>
        <div className="min-w-0">
          <p className="font-display text-lg tracking-tight leading-none truncate">Mening Virtual Karyeram</p>
          <p className="text-[11px] font-bold text-slate-400">Youth finance & career simulator</p>
        </div>
      </div>
      <div className="flex bg-white border border-slate-100 shadow-sm rounded-2xl p-1 gap-0.5 shrink-0">
        {CURRENCY_LIST.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrency(c.code)}
            title={`${c.label} (1 ${c.code} ≈ ${c.rate.toLocaleString()} UZS)`}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
              currency === c.code ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>
    </div>
  );
}
