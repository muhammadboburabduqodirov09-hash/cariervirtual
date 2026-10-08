import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { AVATARS, CAREERS, CURRENCY_LIST } from "../lib/data";
import { AvatarIcon, CareerIcon } from "./VisualIcon";

export default function Onboarding({ initialRole, onBack, onChooseRole, onAuthenticate }) {
  const [mode, setMode] = useState("register");
  const [career, setCareer] = useState(CAREERS[0].id);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [currency, setCurrency] = useState("UZS");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", displayName: "", childName: "", familyCode: "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const isAdmin = initialRole === "admin";
  const registering = mode === "register" && !isAdmin;
  const back = () => (
    <button onClick={onBack} className="role-back">
      <ArrowLeft size={16} /> Choose a different path
    </button>
  );

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onAuthenticate({
        mode: isAdmin ? "login" : mode,
        role: initialRole,
        ...form,
        career,
        avatar,
        currency,
      });
    } catch (requestError) {
      setError(requestError.message || "Could not complete the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="entry-page">
      <header className="entry-brand">
        <div className="brand-mark">mk</div>
        <span>Mening <b>Virtual Karyeram</b></span>
      </header>

      <AnimatePresence mode="wait">
        {!initialRole ? (
          <motion.main key="roles" className="entry-layout"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="entry-copy">
              <p className="eyebrow">A family money and growth platform</p>
              <h1>Small steps.<br /><span>Real confidence.</span></h1>
              <p className="entry-lead">A shared space to build good habits, learn about money and celebrate the work behind every reward.</p>
              <div className="entry-proof"><ShieldCheck size={18} /> Secure accounts. Progress saved with your family.</div>
            </div>
            <section className="role-panel">
              <p className="eyebrow">Get started</p>
              <h2>Choose your space</h2>
              <p className="muted">Sign in to an existing account or create a family workspace.</p>
              <button className="role-choice" onClick={() => onChooseRole("parent")}>
                <span className="role-icon parent-icon">P</span>
                <span className="role-copy"><b>Parent space</b><small>Plan tasks, review progress and approve rewards.</small></span>
                <ArrowRight size={18} />
              </button>
              <button className="role-choice" onClick={() => onChooseRole("child")}>
                <span className="role-icon child-icon">C</span>
                <span className="role-copy"><b>Child space</b><small>Complete tasks, learn and track savings.</small></span>
                <ArrowRight size={18} />
              </button>
              <button className="admin-entry-link" onClick={() => onChooseRole("admin")}>Administrator sign in</button>
              <div className="entry-note"><LockKeyhole size={14} /> Passwords are securely hashed on the server.</div>
            </section>
          </motion.main>
        ) : (
          <motion.main key={`account-${initialRole}`} className="account-layout"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <section className="account-intro">
              {back()}
              <p className="eyebrow">{isAdmin ? "ADMINISTRATOR" : initialRole === "parent" ? "PARENT SPACE" : "CHILD SPACE"}</p>
              <h1>{isAdmin ? "Manage the platform." : initialRole === "parent" ? "Build a plan together." : "Your next chapter starts here."}</h1>
              <p className="entry-lead">{isAdmin
                ? "Sign in with the administrator account configured on the server."
                : initialRole === "parent"
                  ? "Create a family workspace to set meaningful tasks and approve rewards."
                  : "Join your family workspace to take on challenges and grow your savings."}</p>
              <div className="account-points">
                <span><Check size={16} /> Private family workspaces</span>
                <span><Check size={16} /> Clear, age-friendly money tools</span>
                <span><Check size={16} /> Sign in securely from any device</span>
              </div>
            </section>
            <form className="account-form" onSubmit={submit}>
              <p className="eyebrow">{isAdmin ? "ADMIN ACCESS" : initialRole === "parent" ? "FAMILY ACCOUNT" : "FAMILY MEMBER"}</p>
              <h2>{registering ? "Create your account" : "Welcome back"}</h2>
              <p className="muted">{isAdmin ? "Administrator accounts are provisioned on the server." : registering ? "Your workspace is securely saved to your family account." : "Sign in with the email and password for this space."}</p>
              {!isAdmin && (
                <div className="auth-mode">
                  <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
                  <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
                </div>
              )}
              <label className="field-label">Email address
                <input className="form-input" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={form.email} onChange={set("email")} />
              </label>
              <label className="field-label">Password
                <input className="form-input" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 8 : 1} maxLength={128} placeholder={registering ? "At least 8 characters" : "Your password"} value={form.password} onChange={set("password")} />
              </label>
              {registering && (
                <>
                  <label className="field-label">Your name
                    <input className="form-input" autoComplete="name" required minLength={2} maxLength={60} placeholder="Name to show in your profile" value={form.displayName} onChange={set("displayName")} />
                  </label>
                  {initialRole === "parent" ? (
                    <label className="field-label">Child’s name
                      <input className="form-input" required minLength={2} maxLength={60} placeholder="Name for your family workspace" value={form.childName} onChange={set("childName")} />
                    </label>
                  ) : (
                    <>
                      <label className="field-label">Family invite code
                        <input className="form-input invite-input" required minLength={10} maxLength={10} autoCapitalize="characters" placeholder="10-character code from your parent" value={form.familyCode} onChange={(event) => setForm((current) => ({ ...current, familyCode: event.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10) }))} />
                      </label>
                      <p className="invite-help">Ask your parent to copy the code from their family overview.</p>
                      <div className="career-options">
                        {CAREERS.map((item) => (
                          <button type="button" key={item.id} onClick={() => setCareer(item.id)}
                            className={`career-option ${career === item.id ? "selected" : ""}`}>
                            <span className={`career-emoji ${item.tint}`}><CareerIcon id={item.id} size={19} /></span>
                            <span><b>{item.title}</b><small>{item.id}</small></span>
                            {career === item.id && <Check size={17} />}
                          </button>
                        ))}
                      </div>
                      <div className="field-label">Choose an avatar
                        <div className="avatar-options">{AVATARS.map((item) => (
                          <button type="button" key={item} onClick={() => setAvatar(item)} className={`avatar-option ${avatar === item ? "selected" : ""}`} aria-label={`Choose ${item}`}>
                            <AvatarIcon avatar={item} size={20} />
                          </button>
                        ))}</div>
                      </div>
                      <label className="field-label">Display currency
                        <select className="form-input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                          {CURRENCY_LIST.map((item) => <option key={item.code} value={item.code}>{item.label} ({item.code})</option>)}
                        </select>
                      </label>
                    </>
                  )}
                  {initialRole === "parent" && <label className="commitment-check">
                    <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                    <span>I understand task rewards are virtual until I review and approve them.</span>
                  </label>}
                </>
              )}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="action-button full" type="submit" disabled={busy || (registering && initialRole === "parent" && !agreed)}>
                {busy ? "Please wait…" : registering ? "Create account" : "Sign in"} <ArrowRight size={17} />
              </button>
              <div className="account-security"><ShieldCheck size={15} /> Passwords are never stored in the browser.</div>
            </form>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
