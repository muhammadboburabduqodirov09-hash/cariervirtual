import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ADVICE, categoryOf, fmtMoney, GOAL_EMOJIS, CURRENCIES, toUZS } from "../lib/data";
import { Bar, btnPrimary, btnSoft, card, Count, inp, Modal, pill } from "./ui";
import DonutChart from "./DonutChart";
import { BadgeCheck, Clock3, Gift, WalletCards, X } from "lucide-react";
import { AvatarIcon, CareerIcon, SymbolIcon } from "./VisualIcon";

/* ---------- custom goal creator ---------- */
function GoalModal({ currency, onSave, onClose }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GOAL_EMOJIS[0]);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const cur = CURRENCIES[currency];

  const save = () => {
    const target = toUZS(parseFloat(amount.replace(",", ".")) || 0, currency);
    if (name.trim().length < 2) return setErr("Give your goal a name.");
    if (target <= 0) return setErr("Set a target amount above 0.");
    onSave({ id: `g-${Date.now()}`, name: name.trim(), emoji, target });
  };

  return (
    <Modal onBackdrop={onClose}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="flex items-center gap-2 font-display text-2xl tracking-tight"><SymbolIcon value="Goal" size={22} /> New savings goal</h3>
        <button type="button" onClick={onClose} aria-label="Close goal dialog" className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-90 transition"><X size={16} /></button>
      </div>
      <p className="text-sm font-bold text-slate-400 mb-4">Dream it, name it, save for it.</p>
      <div className="grid gap-3">
        <input className={inp} placeholder='Goal name — e.g. "New Shoes", "Skateboard"' value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div>
          <p className="font-extrabold text-sm text-slate-600 mb-2">Pick an icon</p>
          <div className="grid grid-cols-6 gap-2">
            {GOAL_EMOJIS.map((e) => (
              <motion.button key={e} type="button" aria-label={`${e} goal icon`} title={`${e} icon`} whileTap={{ scale: 0.85 }} onClick={() => setEmoji(e)}
                className={`h-11 text-2xl rounded-xl transition-all ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-400 -translate-y-0.5" : "bg-slate-50 border border-slate-200"}`}>
                <SymbolIcon value={e} size={19} />
              </motion.button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input className={`${inp} pr-16`} inputMode="decimal" placeholder="Target amount" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">{cur.code}</span>
        </div>
        {err && <p className="text-rose-500 font-extrabold text-sm">{err}</p>}
        <button className={`${btnPrimary} w-full`} onClick={save}>Save goal & make it active</button>
      </div>
    </Modal>
  );
}

/* ---------- kid dashboard ---------- */
export default function KidDashboard({ state, startQuiz, addGoal, setActiveGoal, requestVoucher }) {
  const [goalModal, setGoalModal] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [voucherNotice, setVoucherNotice] = useState("");
  const { child, tasks, wallet, xp, goals, activeGoalId, currency, punishment, vouchers, voucherRequests } = state;
  const cat = categoryOf({ kind: "career", categoryId: child.career });
  const level = Math.floor(xp / 100) + 1;
  const goal = goals.find((g) => g.id === activeGoalId) || goals[0];

  const active = tasks.filter((t) => t.status === "active");
  const review = tasks.filter((t) => t.status === "review");
  const paid = tasks.filter((t) => t.status === "paid");
  const punishmentActive = punishment && (!punishment.until || Date.parse(punishment.until) > Date.now());
  const voucherPaused = punishmentActive && ["voucherTimed", "voucherManual"].includes(punishment.type);
  const availableVouchers = vouchers.filter((voucher) => voucher.active !== false);
  const pendingVoucherIds = new Set(voucherRequests.filter((request) => request.status === "pending").map((request) => request.voucherId));
  const requestFamilyVoucher = async (voucher) => {
    setVoucherBusy(voucher.id);
    setVoucherError("");
    setVoucherNotice("");
    try {
      await requestVoucher(voucher.id);
      setVoucherNotice("Request sent to your parent. The price is charged only if they approve it.");
    } catch (error) {
      setVoucherError(error.message);
    } finally {
      setVoucherBusy("");
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* profile + balance */}
      <div id="overview" data-tour="overview" className={`${card} md:col-span-2`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 shrink-0 grid place-items-center text-4xl rounded-3xl ${cat.tint}`}><AvatarIcon avatar={child.avatar} size={30} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl tracking-tight leading-none truncate">{child.name}</h1>
              <span className="bg-indigo-100 text-indigo-600 rounded-full px-2.5 py-0.5 text-xs font-extrabold">Level {level}</span>
            </div>
            <p className="flex items-center gap-1.5 font-bold text-slate-500 text-sm"><CareerIcon id={child.career} size={15} /> {cat.title}</p>
            <div className="mt-2 max-w-xs"><Bar pct={xp % 100} color="bg-indigo-400" h="h-2" /></div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{xp % 100} / 100 XP</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="col-span-3 sm:col-span-1 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4 shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white/60"><WalletCards size={14} /> Spendable</p>
            <p className="font-display text-2xl tracking-tight mt-1 break-all">
              <Count to={wallet.spendable} format={(x) => fmtMoney(x, currency)} />
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-400"><WalletCards size={14} /> Savings</p>
            <p className="font-display text-xl text-indigo-600 tracking-tight mt-1 break-all">
              <Count to={wallet.savings} format={(x) => fmtMoney(x, currency)} />
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-amber-500"><BadgeCheck size={14} /> Tax paid</p>
            <p className="font-display text-xl text-amber-600 tracking-tight mt-1 break-all">
              <Count to={wallet.taxPaid} format={(x) => fmtMoney(x, currency)} />
            </p>
          </div>
        </div>
      </div>

      {/* financial breakdown */}
      <div className={`${card} md:col-span-2`}>
        <div className="flex items-baseline justify-between flex-wrap gap-1 mb-4">
          <h2 className="font-display text-2xl tracking-tight">Money overview</h2>
          <span className="text-xs font-bold text-slate-400">58% spend · 30% save · 12% tax</span>
        </div>
        <DonutChart wallet={wallet} currency={currency} />
      </div>

      {/* smart spending advice */}
      <div className={`${card} md:col-span-2 bg-gradient-to-br !from-white !to-sky-50/60`}>
        <h2 className="font-display text-2xl tracking-tight mb-1">Spending plan</h2>
        <p className="text-sm font-bold text-slate-400 mb-4">
          How to split your spendable {fmtMoney(wallet.spendable, currency)}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {ADVICE.map((a) => (
            <div key={a.id} className={`rounded-2xl p-4 ${a.tint}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl"><SymbolIcon value={a.e} size={21} /></span>
                <span className="font-display text-lg">{Math.round(a.share * 100)}%</span>
              </div>
              <p className="font-extrabold text-sm mt-2">{a.label}</p>
              <p className="text-xs font-semibold opacity-70">{a.note}</p>
              <p className="font-display text-base mt-2">{fmtMoney(wallet.spendable * a.share, currency)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* active tasks */}
      <div id="tasks" data-tour="tasks" className={card}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl tracking-tight">Current tasks</h2>
          {active.length > 0 && <span className={`${pill} bg-sky-50 text-sky-600`}>{active.length} open</span>}
        </div>
        {active.length === 0 && review.length === 0 && (
          <p className="font-bold text-slate-400 text-sm">No tasks yet. Your parent can add one from their family workspace.</p>
        )}
        <div className="space-y-3">
          <AnimatePresence>
            {active.map((t) => {
              const c = categoryOf(t);
              return (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 shrink-0 grid place-items-center text-xl rounded-xl ${c.tint}`}><CareerIcon id={t.categoryId} kind={t.kind} size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold leading-tight">{t.name}</p>
                      <div className="flex gap-1.5 my-1.5 flex-wrap items-center">
                        <span className={`${pill} bg-white text-slate-500 border border-slate-200`}>{t.kind === "habit" ? "Habit" : "Career shift"}</span>
                        <span className={`${pill} bg-emerald-50 text-emerald-600`}>{fmtMoney(t.base + t.tip, currency)}</span>
                        {t.tip > 0 && <span className={`${pill} bg-amber-50 text-amber-600`}>incl. tip</span>}
                        {t.dueDate && <span className={`${pill} bg-slate-100 text-slate-500`}>Due {new Date(`${t.dueDate}T00:00:00`).toLocaleDateString()}</span>}
                      </div>
                      {t.parentNote && <p className="revision-note">Parent note: {t.parentNote}</p>}
                      <button className={`${btnPrimary} w-full !py-2.5 !text-sm mt-1`} onClick={() => startQuiz(t)}>
                        Complete task and take quiz
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {review.map((t) => (
            <div key={t.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 flex items-center gap-3">
              <Clock3 size={18} className="shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="font-extrabold text-sm leading-tight">{t.name}</p>
                <p className="text-xs font-bold text-amber-600">Waiting for parent approval · score {t.score}/3</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* savings vault */}
      <div id="goals" data-tour="goals" className={card}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl tracking-tight">Savings goals</h2>
          <button onClick={() => setGoalModal(true)} className={`${pill} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition`}>+ Add custom goal</button>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {goals.map((g) => (
            <button key={g.id} onClick={() => setActiveGoal(g.id)}
              className={`${pill} border transition-all active:scale-95 ${g.id === goal.id ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              <span className="inline-flex items-center gap-1"><SymbolIcon value={g.emoji} size={14} /> {g.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl"><SymbolIcon value={goal.emoji} size={30} /></span>
          <h3 className="font-display text-2xl tracking-tight leading-tight">{goal.name}</h3>
        </div>
        <div className="my-3"><Bar pct={(wallet.savings / goal.target) * 100} color="bg-indigo-400" h="h-3" /></div>
        <p className="font-extrabold text-sm text-slate-500">
          {fmtMoney(wallet.savings, currency)} / {fmtMoney(goal.target, currency)} · {Math.min(100, Math.round((wallet.savings / goal.target) * 100))}%
        </p>
        {wallet.savings >= goal.target && <p className="mt-2 flex items-center gap-1 font-extrabold text-emerald-600 text-sm"><SymbolIcon value="Sparkles" size={15} /> Goal reached! Time to talk to your parent.</p>}
      </div>

      <div id="vouchers" className={`${card} md:col-span-2`}>
        <div className="flex items-center gap-2 mb-1"><Gift size={19} /><h2 className="font-display text-2xl tracking-tight">Family vouchers</h2></div>
        <p className="text-sm font-bold text-slate-400 mb-4">Request a family-approved privilege with your spendable balance. Your parent must approve it before the price is charged.</p>
        {punishmentActive && punishment.type.startsWith("reward") && <p className="family-active-punishment mb-3">A temporary reward adjustment is active. Approved task rewards are currently {punishment.type === "reward25" ? "25%" : "50%"} until {punishment.until ? new Date(punishment.until).toLocaleDateString() : "your parent changes it"}.</p>}
        {voucherPaused && <p className="family-active-punishment mb-3">Voucher requests are paused {punishment.until ? `until ${new Date(punishment.until).toLocaleDateString()}` : "until your parent allows them again"}.</p>}
        {voucherError && <p className="family-control-error" role="alert">{voucherError}</p>}
        {voucherNotice && <p className="family-control-notice" role="status">{voucherNotice}</p>}
        <div className="voucher-list child-voucher-list">
          {availableVouchers.map((voucher) => {
            const alreadyRequested = pendingVoucherIds.has(voucher.id);
            return <div className="voucher-row" key={voucher.id}>
              <span className="voucher-icon"><Gift size={16} /></span>
              <span className="voucher-row-info"><b>{voucher.name}</b><small>{voucher.description || "Family-approved privilege"}</small></span>
              <b>{fmtMoney(voucher.price, currency)}</b>
              <button className="voucher-request-button" disabled={voucherPaused || alreadyRequested || wallet.spendable < voucher.price || voucherBusy === voucher.id} onClick={() => requestFamilyVoucher(voucher)}>
                {voucherBusy === voucher.id ? "Sending…" : alreadyRequested ? "Requested" : wallet.spendable < voucher.price ? "Not enough" : "Request"}
              </button>
            </div>;
          })}
          {!availableVouchers.length && <p className="font-bold text-slate-400 text-sm">Your parent has not added any vouchers yet.</p>}
        </div>
        <div className="voucher-requests">
          <h3>Your requests</h3>
          {voucherRequests.slice(-6).reverse().map((request) => (
            <p className="voucher-history-row" key={request.id}><span>{request.name}</span><b className={request.status}>{request.status}</b><small>{request.status === "approved" ? `Paid ${fmtMoney(request.price, currency)}` : request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : "Waiting for parent"}</small></p>
          ))}
          {!voucherRequests.length && <p className="font-bold text-slate-400 text-sm">Your voucher requests will appear here.</p>}
        </div>
      </div>

      {/* history */}
      {paid.length > 0 && (
        <div className={`${card} md:col-span-2`}>
          <h2 className="flex items-center gap-2 font-display text-2xl tracking-tight mb-3"><BadgeCheck size={19} /> Completed</h2>
          <div className="divide-y divide-slate-100">
            {paid.slice().reverse().map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl"><CareerIcon id={t.categoryId} kind={t.kind} size={17} /></span>
                <span className="flex-1 font-bold text-sm truncate">{t.name}</span>
                <span className="text-xs font-extrabold text-slate-400">score {t.score}/3</span>
                <span className="font-display text-sm text-emerald-600">+{fmtMoney(t.rewardPaid ?? t.base + t.tip, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {goalModal && <GoalModal key="gm" currency={currency} onClose={() => setGoalModal(false)} onSave={(g) => { addGoal(g); setGoalModal(false); }} />}
      </AnimatePresence>
    </div>
  );
}
