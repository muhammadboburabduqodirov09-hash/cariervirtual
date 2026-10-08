import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CAREERS, categoryOf, CURRENCIES, fmtMoney, HABITS, toUZS } from "../lib/data";
import { Bar, btnPrimary, card, inp, pill } from "./ui";
import { BriefcaseBusiness, Check, CircleAlert, Gift, Sparkles, WalletCards } from "lucide-react";
import { AvatarIcon, CareerIcon, SymbolIcon } from "./VisualIcon";

export default function ParentDashboard({ state, addTask, approve, requestRevision, approvalNotice, inviteCode, reviewVoucher, updateFamilyFields }) {
  const { child, tasks, currency, monthlyBudget, punishment, vouchers, voucherRequests } = state;
  const cur = CURRENCIES[currency];

  const [kind, setKind] = useState("career"); // "career" | "habit"
  const [categoryId, setCategoryId] = useState(child.career || CAREERS[0].id);
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [tipOn, setTipOn] = useState(true);
  const [tipAmt, setTipAmt] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [err, setErr] = useState("");
  const [justPosted, setJustPosted] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [budgetDraft, setBudgetDraft] = useState(String((monthlyBudget || 300000) / cur.rate));
  const [budgetError, setBudgetError] = useState("");
  const [punishmentType, setPunishmentType] = useState(punishment?.type || "none");
  const [punishmentDays, setPunishmentDays] = useState("3");
  const [punishmentError, setPunishmentError] = useState("");
  const [voucherName, setVoucherName] = useState("");
  const [voucherDescription, setVoucherDescription] = useState("");
  const [voucherPrice, setVoucherPrice] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [voucherBusy, setVoucherBusy] = useState("");
  const [voucherNotice, setVoucherNotice] = useState("");

  const gross = (t) => t.base + t.tip;
  const earned = tasks.filter((t) => t.status === "paid").reduce((a, t) => a + gross(t), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTasks = tasks.filter((task) => {
    const created = task.createdAt ? new Date(task.createdAt) : new Date(Number(task.id));
    return Number.isFinite(created.getTime()) && created.toISOString().slice(0, 7) === currentMonth;
  });
  const committed = monthTasks.reduce((sum, task) => sum + gross(task), 0);
  const remainingBudget = Math.max(0, (monthlyBudget || 300000) - committed);
  const queue = tasks.filter((t) => t.status === "review");
  const pendingVoucherRequests = voucherRequests.filter((request) => request.status === "pending");
  const punishmentActive = punishment && (!punishment.until || Date.parse(punishment.until) > Date.now());
  const cat = categoryOf({ kind: "career", categoryId: child.career });
  const presets = kind === "career" ? CAREERS : HABITS;
  const preset = presets.find((p) => p.id === categoryId) || presets[0];

  const pickPreset = (p) => {
    setCategoryId(p.id);
    if (!name || presets.some((x) => name.startsWith(x.title))) setName(kind === "career" ? `${p.title} shift` : p.title);
  };
  useEffect(() => setBudgetDraft(String((monthlyBudget || 300000) / cur.rate)), [monthlyBudget, cur.rate]);
  useEffect(() => setPunishmentType(punishment?.type || "none"), [punishment?.type]);

  const saveBudget = (event) => {
    event.preventDefault();
    const next = toUZS(parseFloat(budgetDraft.replace(",", ".")) || 0, currency);
    if (next < 1000 || next > 1000000000) return setBudgetError("Choose a monthly limit between 1,000 and 1,000,000,000 UZS.");
    updateFamilyFields({ monthlyBudget: next });
    setBudgetError("");
  };

  const savePunishment = (event) => {
    event.preventDefault();
    if (punishmentType === "none") {
      updateFamilyFields({ punishment: null });
      setPunishmentError("");
      return;
    }
    const days = Number(punishmentDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) return setPunishmentError("Choose a duration from 1 to 365 days.");
    const manual = punishmentType === "voucherManual";
    updateFamilyFields({
      punishment: {
        type: punishmentType,
        setAt: new Date().toISOString(),
        until: manual ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        note: "",
      },
    });
    setPunishmentError("");
  };

  const addVoucher = (event) => {
    event.preventDefault();
    const price = toUZS(parseFloat(voucherPrice.replace(",", ".")) || 0, currency);
    if (voucherName.trim().length < 2) return setVoucherError("Give the voucher a name.");
    if (price < 1 || price > 1000000000) return setVoucherError("Enter a valid voucher price.");
    const nextVoucher = {
      id: `voucher-${Date.now()}`,
      name: voucherName.trim(),
      description: voucherDescription.trim(),
      price,
      active: true,
    };
    updateFamilyFields({ vouchers: [...vouchers, nextVoucher].slice(-30) });
    setVoucherName("");
    setVoucherDescription("");
    setVoucherPrice("");
    setVoucherError("");
  };

  const reviewVoucherRequest = async (id, decision) => {
    setVoucherBusy(id);
    setVoucherError("");
    setVoucherNotice("");
    try {
      await reviewVoucher(id, decision);
      setVoucherNotice(decision === "approve" ? "Voucher approved and paid from the child’s spendable balance." : "Voucher request declined.");
    } catch (requestError) {
      setVoucherError(requestError.message);
    } finally {
      setVoucherBusy("");
    }
  };

  const post = () => {
    const b = toUZS(parseFloat(base.replace(",", ".")) || 0, currency);
    const t = tipOn ? toUZS(parseFloat(tipAmt.replace(",", ".")) || 0, currency) : 0;
    if (name.trim().length < 3 || b <= 0) return setErr("Add a task name and a base reward above 0.");
    if (committed + b + t > (monthlyBudget || 300000)) return setErr(`This task would exceed this month’s limit. ${fmtMoney(remainingBudget, currency)} remains; increase the monthly limit or lower the reward.`);
    addTask({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      kind,
      categoryId,
      name: name.trim(),
      emoji: preset.e,
      base: b,
      tip: t,
      dueDate,
      status: "active",
      score: 0,
    });
    setName(""); setBase(""); setTipAmt(""); setDueDate(""); setErr("");
    setJustPosted(true);
    setTimeout(() => setJustPosted(false), 2600);
  };

  const preview = useMemo(() => {
    const b = toUZS(parseFloat((base || "0").replace(",", ".")) || 0, currency);
    const t = tipOn ? toUZS(parseFloat((tipAmt || "0").replace(",", ".")) || 0, currency) : 0;
    return b + t;
  }, [base, tipAmt, tipOn, currency]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* header / budget */}
      <div id="overview" data-tour="overview" className={`${card} md:col-span-2`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 grid place-items-center text-3xl rounded-2xl ${cat.tint}`}><AvatarIcon avatar={child.avatar} size={25} /></div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl tracking-tight leading-none truncate">{child.name}</h1>
            <p className="flex items-center gap-1.5 font-bold text-slate-500 text-sm"><CareerIcon id={child.career} size={15} /> {cat.title}</p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs font-bold text-slate-400">Lifetime approved earnings</p>
            <p className="font-display text-2xl tracking-tight">{fmtMoney(earned, currency)}</p>
          </div>
        </div>
        <p className="text-sm font-extrabold text-slate-600 mt-5 mb-1.5">
          This month’s task rewards: {fmtMoney(committed, currency)} of {fmtMoney(monthlyBudget || 300000, currency)} committed
        </p>
        <Bar pct={(committed / (monthlyBudget || 300000)) * 100} color="bg-indigo-400" />
        <p className="mt-1 text-xs font-bold text-slate-400">{fmtMoney(remainingBudget, currency)} remains in the monthly task budget.</p>
        <AnimatePresence>
          {(justPosted || approvalNotice) && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-3 py-2 font-bold text-sm">
              {approvalNotice || "Task posted — it’s now on your child’s dashboard."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {inviteCode && (
        <div className={`${card} md:col-span-2 family-invite-card`}>
          <div><h2 className="font-display text-lg">Invite your child</h2><p className="text-sm text-slate-500">Share this family code when they create their child account.</p></div>
          <code>{inviteCode}</code>
          <button className="invite-copy-button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteCode);
              setInviteError("");
              setInviteCopied(true);
              window.setTimeout(() => setInviteCopied(false), 2000);
            } catch {
              setInviteError("Clipboard unavailable. Select and copy the code above.");
            }
          }}>{inviteCopied ? "Copied" : "Copy code"}</button>
          {inviteError && <p className="invite-error" role="alert">{inviteError}</p>}
        </div>
      )}

      {/* create task */}
      <div id="tasks" data-tour="tasks" className={card}>
        <h2 className="font-display text-2xl tracking-tight mb-3">Create a task</h2>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[["career", "Career shift"], ["habit", "Growth habit"]].map(([k, l]) => (
              <button key={k} onClick={() => { setKind(k); setCategoryId(k === "career" ? (child.career || CAREERS[0].id) : HABITS[0].id); setName(""); }}
                className={`rounded-2xl px-3 py-2.5 font-extrabold text-sm transition-all active:scale-95 ${kind === k ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 border border-slate-200 text-slate-600"}`}>
                {k === "career" ? <BriefcaseBusiness size={15} className="inline mr-1.5" /> : <Sparkles size={15} className="inline mr-1.5" />}{l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button key={p.id} onClick={() => pickPreset(p)}
                className={`rounded-2xl px-3 py-2 text-left font-bold text-xs transition-all active:scale-95 flex items-center gap-2 ${categoryId === p.id ? "bg-indigo-50 ring-2 ring-indigo-300 text-indigo-700" : "bg-slate-50 border border-slate-200 text-slate-600"}`}>
                <span className="text-lg"><CareerIcon id={p.id} kind={kind} size={17} /></span><span className="leading-tight">{p.title}</span>
              </button>
            ))}
          </div>
          {kind === "habit" && <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 -mt-1"><SymbolIcon value="Lightbulb" size={14} /> {preset.hint}</p>}
          <input className={inp} placeholder={kind === "career" ? "e.g. Barista shift — help in the kitchen" : "e.g. Read 20 pages of Harry Potter"} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="text-xs font-bold text-slate-500 grid gap-1.5">
            Due date <span className="font-normal text-slate-400">Optional</span>
            <input className={inp} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
          </label>
          <div className="relative">
            <input className={`${inp} pr-16`} inputMode="decimal" placeholder="Base reward" value={base} onChange={(e) => setBase(e.target.value.replace(/[^\d.,]/g, ""))} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">{cur.code}</span>
          </div>
          <button onClick={() => setTipOn(!tipOn)} className="flex items-center gap-3 font-extrabold text-sm text-slate-600 text-left">
            <span className={`w-12 h-7 rounded-full p-0.5 flex transition-colors ${tipOn ? "bg-emerald-400 justify-end" : "bg-slate-200 justify-start"}`}>
              <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-6 h-6 rounded-full bg-white shadow-sm" />
            </span>
            Tip / bonus
          </button>
          {tipOn && (
            <div className="relative">
              <input className={`${inp} pr-16`} inputMode="decimal" placeholder="Tip amount" value={tipAmt} onChange={(e) => setTipAmt(e.target.value.replace(/[^\d.,]/g, ""))} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">{cur.code}</span>
            </div>
          )}
          {preview > 0 && (
            <p className="text-xs font-bold text-slate-400">
              Split on approval: {fmtMoney(preview * 0.58, currency)} spend · {fmtMoney(preview * 0.3, currency)} save · {fmtMoney(preview * 0.12, currency)} virtual tax
            </p>
          )}
          {err && <p className="text-rose-500 font-extrabold text-sm">{err}</p>}
          <button className={btnPrimary} onClick={post}>Post task to child</button>
        </div>
      </div>

      {/* approval queue */}
      <div id="approvals" data-tour="approvals" className={card}>
        <h2 className="font-display text-2xl tracking-tight mb-3">Approval queue <span className="text-slate-400">({queue.length})</span></h2>
        {queue.length === 0 && <p className="font-bold text-slate-400 text-sm">Nothing to approve yet. Finished tasks show up here with their test score.</p>}
        <AnimatePresence>
          {queue.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 80 }}
              className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 mb-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl"><CareerIcon id={t.categoryId} kind={t.kind} size={20} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold leading-tight">{t.name}</p>
                  <div className="flex gap-1.5 my-2 flex-wrap">
                    <span className={`${pill} bg-emerald-100 text-emerald-700`}>Test passed {t.score}/3</span>
                    <span className={`${pill} bg-white border border-slate-200 text-slate-600`}>{fmtMoney(gross(t), currency)}</span>
                    <span className={`${pill} bg-violet-100 text-violet-700`}>{t.kind === "habit" ? "Habit" : "Shift"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={`${btnPrimary} !py-2.5 !text-sm`} onClick={() => approve(t.id)}>Approve & pay</button>
                    <button className="revision-button" onClick={() => requestRevision(t.id)}>Request another try</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* live overview of child's task list */}
        {tasks.filter((t) => t.status === "active").length > 0 && (
          <>
            <h3 className="font-extrabold text-sm text-slate-500 mt-5 mb-2">Posted, waiting for {child.name}</h3>
            <div className="space-y-2">
              {tasks.filter((t) => t.status === "active").map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span><CareerIcon id={t.categoryId} kind={t.kind} size={16} /></span>
                  <span className="flex-1 font-bold text-sm truncate">{t.name}</span>
                  <span className="text-xs font-extrabold text-slate-400">{fmtMoney(gross(t), currency)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <section id="controls" className={`${card} md:col-span-2 admin-family-controls`}>
        <div className="mb-4">
          <p className="eyebrow">FAMILY CONTROLS</p>
          <h2 className="font-display text-2xl tracking-tight">Budget &amp; family rules</h2>
          <p className="mt-1 text-sm text-slate-500">Set the family’s monthly reward limit and manage any active consequence.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <form className="family-control-block" onSubmit={saveBudget}>
            <div className="flex items-center gap-2"><WalletCards size={17} /><h3>Monthly task budget</h3></div>
            <p>New tasks count toward the current calendar month when posted. Once the limit is reached, raise it here to post more tasks.</p>
            <label className="field-label">Monthly limit
              <div className="relative">
                <input className={`${inp} pr-16`} inputMode="decimal" min="0" value={budgetDraft} onChange={(event) => setBudgetDraft(event.target.value.replace(/[^\d.,]/g, ""))} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">{cur.code}</span>
              </div>
            </label>
            <p className="family-budget-progress">Committed {fmtMoney(committed, currency)} · Remaining {fmtMoney(remainingBudget, currency)}</p>
            {budgetError && <p className="family-control-error" role="alert">{budgetError}</p>}
            <button className="settings-action" type="submit"><Check size={14} /> Save monthly limit</button>
          </form>

          <form className="family-control-block" onSubmit={savePunishment}>
            <div className="flex items-center gap-2"><CircleAlert size={17} /><h3>Parent-controlled consequence</h3></div>
            <p>This affects future rewards only. It does not remove money already in the child’s wallet.</p>
            <label className="field-label">Consequence
              <select className="form-input" value={punishmentType} onChange={(event) => setPunishmentType(event.target.value)}>
                <option value="none">No active consequence</option>
                <option value="reward25">Future task rewards are 25%</option>
                <option value="reward50">Future task rewards are 50%</option>
                <option value="voucherTimed">Pause voucher requests for a set time</option>
                <option value="voucherManual">Pause vouchers until I allow them</option>
              </select>
            </label>
            {punishmentType !== "none" && punishmentType !== "voucherManual" && <label className="field-label">Duration in days
              <input className="form-input" type="number" min="1" max="365" value={punishmentDays} onChange={(event) => setPunishmentDays(event.target.value)} />
            </label>}
            {punishmentActive && <p className="family-active-punishment">Active: {punishment.type === "reward25" ? "25% rewards" : punishment.type === "reward50" ? "50% rewards" : "voucher requests paused"}{punishment.until ? ` until ${new Date(punishment.until).toLocaleDateString()}` : " until you remove it"}.</p>}
            {punishmentError && <p className="family-control-error" role="alert">{punishmentError}</p>}
            <button className="settings-action" type="submit">{punishmentType === "none" ? "Clear consequence" : "Save consequence"}</button>
          </form>
        </div>
      </section>

      <section id="family-vouchers" className={`${card} md:col-span-2`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div><p className="eyebrow">FAMILY PRIVILEGES</p><h2 className="font-display text-2xl tracking-tight">Vouchers</h2><p className="mt-1 text-sm text-slate-500">Create safe, family-approved privileges. The child requests one; approve it to deduct its price.</p></div>
          <Gift size={21} />
        </div>
        <form className="voucher-create-form" onSubmit={addVoucher}>
          <label className="field-label">Voucher name<input className={inp} maxLength={60} value={voucherName} onChange={(event) => setVoucherName(event.target.value)} placeholder="e.g. Choose the family movie" /></label>
          <label className="field-label">Description<input className={inp} maxLength={200} value={voucherDescription} onChange={(event) => setVoucherDescription(event.target.value)} placeholder="Describe the agreed family privilege" /></label>
          <label className="field-label">Price
            <div className="relative"><input className={`${inp} pr-16`} inputMode="decimal" value={voucherPrice} onChange={(event) => setVoucherPrice(event.target.value.replace(/[^\d.,]/g, ""))} placeholder="Price" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">{cur.code}</span></div>
          </label>
          <button type="submit" className={`${btnPrimary} voucher-create-button`}><Gift size={15} /> Add voucher</button>
        </form>
        {voucherError && <p className="family-control-error" role="alert">{voucherError}</p>}
        {voucherNotice && <p className="family-control-notice" role="status">{voucherNotice}</p>}
        <div className="voucher-list">
          {vouchers.map((voucher) => (
            <div className={`voucher-row ${voucher.active === false ? "inactive" : ""}`} key={voucher.id}>
              <span className="voucher-icon"><Gift size={16} /></span>
              <span className="voucher-row-info"><b>{voucher.name}</b><small>{voucher.description || "Family-approved privilege"}</small></span>
              <b>{fmtMoney(voucher.price, currency)}</b>
              <button className="voucher-toggle" onClick={() => updateFamilyFields({ vouchers: vouchers.map((item) => item.id === voucher.id ? { ...item, active: item.active === false } : item) })}>
                {voucher.active === false ? "Reactivate" : "Pause"}
              </button>
            </div>
          ))}
          {!vouchers.length && <p className="font-bold text-slate-400 text-sm">No vouchers yet. Add a family-approved privilege above.</p>}
        </div>
        <div className="voucher-requests">
          <h3>Requests waiting for you <span>{pendingVoucherRequests.length}</span></h3>
          {pendingVoucherRequests.map((request) => (
            <div className="voucher-request-row" key={request.id}>
              <span><b>{request.name}</b><small>{fmtMoney(request.price, currency)} · requested {new Date(request.requestedAt).toLocaleDateString()}</small></span>
              <div>
                <button className="voucher-approve" disabled={voucherBusy === request.id} onClick={() => reviewVoucherRequest(request.id, "approve")}>Approve &amp; pay</button>
                <button className="voucher-decline" disabled={voucherBusy === request.id} onClick={() => reviewVoucherRequest(request.id, "decline")}>Decline</button>
              </div>
            </div>
          ))}
          {!pendingVoucherRequests.length && <p className="font-bold text-slate-400 text-sm">No pending voucher requests.</p>}
        </div>
        <div className="voucher-requests">
          <h3>Recent decisions</h3>
          {voucherRequests.filter((request) => request.status !== "pending").slice(-5).reverse().map((request) => (
            <p className="voucher-history-row" key={request.id}><span>{request.name}</span><b className={request.status}>{request.status}</b><small>{request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : ""}</small></p>
          ))}
          {!voucherRequests.some((request) => request.status !== "pending") && <p className="font-bold text-slate-400 text-sm">No decisions yet.</p>}
        </div>
      </section>
    </div>
  );
}
