import React, { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";

/* ---------- soft design tokens (no heavy black borders) ---------- */
export const card =
  "bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(15,23,42,0.12)]";
export const btnPrimary =
  "bg-slate-900 text-white font-extrabold rounded-2xl px-5 py-3 shadow-md shadow-slate-900/10 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none";
export const btnSoft = (tint = "bg-slate-100 text-slate-700") =>
  `${tint} font-extrabold rounded-2xl px-5 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none`;
export const inp =
  "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none transition-colors focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400 placeholder:font-semibold";
export const pill = "rounded-full px-3 py-1 text-xs font-extrabold";

/* ---------- animated number ---------- */
export function Count({ to, format, dur = 1.1, delay = 0 }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const c = animate(prev.current, to, {
      duration: dur,
      delay,
      ease: "easeOut",
      onUpdate: (x) => {
        prev.current = x;
        setV(x);
      },
    });
    return () => c.stop();
  }, [to]);
  return <>{format(v)}</>;
}

/* ---------- progress bar ---------- */
export const Bar = ({ pct, color = "bg-emerald-400", h = "h-2.5" }) => (
  <div className={`${h} bg-slate-100 rounded-full overflow-hidden`}>
    <motion.div
      className={`h-full rounded-full ${color}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(pct, 0))}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
    />
  </div>
);

/* ---------- modal shell ---------- */
export const Modal = ({ children, wide, onBackdrop }) => (
  <motion.div
    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center p-4 overflow-y-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onBackdrop}
  >
    <motion.div
      className={`${card} w-full ${wide ? "max-w-lg" : "max-w-md"} my-auto shadow-2xl`}
      initial={{ scale: 0.9, y: 40, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.92, y: 30, opacity: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);
