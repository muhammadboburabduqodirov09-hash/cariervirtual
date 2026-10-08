import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { fmtMoney } from "../lib/data";
import { Bar, btnPrimary, btnSoft, Count, Modal } from "./ui";
import { BadgeCheck, CircleDollarSign, CreditCard, LockKeyhole, ReceiptText, Smile, Star } from "lucide-react";
import { SymbolIcon } from "./VisualIcon";

const Line = ({ d, label, sub, children, cls = "" }) => (
  <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: d, type: "spring", damping: 18 }}
    className={`flex justify-between items-start gap-3 py-3 border-t border-dashed border-slate-200 ${cls}`}>
    <div>
      <div className="font-extrabold text-sm">{label}</div>
      {sub && <div className="text-xs font-semibold text-slate-400">{sub}</div>}
    </div>
    <div className="font-display text-lg text-right shrink-0">{children}</div>
  </motion.div>
);

export function Receipt({ r, goal, savingsAfter, currency, onClose }) {
  return (
    <Modal>
      <div className="flex justify-between items-center mb-2">
        <h3 className="flex items-center gap-2 font-display text-3xl tracking-tight"><ReceiptText size={24} /> Your paycheck</h3>
        <motion.span initial={{ scale: 2.5, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ delay: 3, type: "spring" }}
          className="border border-rose-300 bg-rose-50 text-rose-500 rounded-lg px-2 py-0.5 text-xs font-extrabold">Waiting for parent</motion.span>
      </div>
      <p className="font-bold text-sm text-slate-500 mb-1">{r.name} · test score {r.score}/3</p>
      <Line d={0.2} label="Gross earnings" sub={`Base ${fmtMoney(r.base, currency)} + Tip ${fmtMoney(r.tip, currency)}`}>
        <Count to={r.gross} delay={0.3} format={(x) => fmtMoney(x, currency)} />
      </Line>
      <Line d={1} label="12% virtual tax / community" sub="Taxes pay for schools, roads and parks" cls="text-rose-500">
        <Count to={r.tax} delay={1.1} format={(x) => `-${fmtMoney(x, currency)}`} />
      </Line>
      <Line d={1.8} label="30% into savings" sub={`Into your ${goal.name} vault`} cls="text-indigo-500">
        <Count to={r.save} delay={1.9} format={(x) => fmtMoney(x, currency)} />
      </Line>
      <div className="-mt-1 mb-2">
        <Bar pct={(savingsAfter / goal.target) * 100} color="bg-indigo-400" h="h-2" />
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-1.5"><SymbolIcon value={goal.emoji} size={14} /> {goal.name}: {fmtMoney(savingsAfter, currency)} / {fmtMoney(goal.target, currency)}</p>
      </div>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.6, type: "spring" }}
        className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
        <p className="font-extrabold text-emerald-700 text-sm">Net spendable (58%)</p>
        <p className="font-display text-4xl text-emerald-600 tracking-tight">
          +<Count to={r.net} delay={2.7} dur={1.4} format={(x) => fmtMoney(x, currency)} />
        </p>
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600/70"><CreditCard size={13} /> Lands on your virtual card after your parent approves</p>
      </motion.div>
      <button className={`${btnPrimary} w-full mt-4`} onClick={onClose}>Back to dashboard</button>
    </Modal>
  );
}

export function Payout({ p, currency, onClose }) {
  const coins = useMemo(() => Array.from({ length: 16 }, () => ({ x: (Math.random() - 0.5) * 380, d: Math.random() * 0.6, y: 150 + Math.random() * 170 })), []);
  return (
    <Modal>
      <div className="relative text-center overflow-hidden py-4">
        {coins.map((c, k) => (
          <motion.span key={k} className="absolute left-1/2 bottom-0 text-amber-500" initial={{ y: 0, x: 0, opacity: 1 }}
            animate={{ y: -c.y, x: c.x, opacity: [1, 1, 0], rotate: 360 }} transition={{ duration: 1.6, delay: c.d }}><CircleDollarSign size={18} /></motion.span>
        ))}
        <motion.div className="text-emerald-600" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}><CircleDollarSign size={56} className="mx-auto" /></motion.div>
        <h2 className="font-display text-3xl tracking-tight mt-2">Payout approved!</h2>
        <p className="font-bold text-slate-500">Your parent verified the task.</p>
        <div className="my-4 bg-emerald-50 border border-emerald-100 rounded-2xl py-3 font-display text-4xl text-emerald-600 tracking-tight">
          +<Count to={p.net} format={(x) => fmtMoney(x, currency)} />
        </div>
        <p className="flex items-center justify-center gap-1.5 font-bold text-sm text-slate-500"><LockKeyhole size={14} /> {fmtMoney(p.save, currency)} moved to your vault · <BadgeCheck size={14} /> {fmtMoney(p.tax, currency)} virtual tax · <Star size={14} /> +60 XP{p.lvlUp ? " · Level up!" : ""}</p>
        {p.rewardFactor < 1 && <p className="mt-2 font-bold text-xs text-amber-700">The active family reward adjustment applied: {Math.round(p.rewardFactor * 100)}% of the task reward.</p>}
        <button className={`${btnPrimary} mt-5 w-full`} onClick={onClose}>Awesome</button>
      </div>
    </Modal>
  );
}

export function FailModal({ score, onClose }) {
  return (
    <Modal>
      <div className="text-center">
        <Smile size={46} className="mx-auto text-amber-500" />
        <h3 className="font-display text-3xl tracking-tight mt-2">Score: {score}/3</h3>
        <p className="font-bold text-slate-500 my-2">You need 2 correct answers to finish the task. It's still open — try again.</p>
        <button className={`${btnSoft("bg-indigo-50 text-indigo-600")} w-full`} onClick={onClose}>Back to dashboard</button>
      </div>
    </Modal>
  );
}
