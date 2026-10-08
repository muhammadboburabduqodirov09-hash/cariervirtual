import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, CircleHelp, Coins, House, LogOut, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { useAppState, initialState } from "./lib/store";
import { calc, categoryOf } from "./lib/data";
import Onboarding from "./components/Onboarding";
import AdminDashboard from "./components/AdminDashboard";
import KidDashboard from "./components/KidDashboard";
import ParentDashboard from "./components/ParentDashboard";
import Quiz from "./components/Quiz";
import { FailModal, Payout, Receipt } from "./components/Receipts";
import GuidedTour, { tourSteps } from "./components/GuidedTour";
import WorkspaceSettings from "./components/WorkspaceSettings";
import ChatWidget from "./components/ChatWidget";

const PARENT_LINKS = [
  { id: "overview", label: "Overview", icon: House },
  { id: "tasks", label: "Task planner", icon: BriefcaseBusiness },
  { id: "approvals", label: "Approvals", icon: BadgeCheck },
  { id: "controls", label: "Budget & vouchers", icon: Coins },
];
const CHILD_LINKS = [
  { id: "overview", label: "My overview", icon: House },
  { id: "tasks", label: "My tasks", icon: BookOpen },
  { id: "goals", label: "Savings goals", icon: ChartNoAxesCombined },
  { id: "vouchers", label: "Family vouchers", icon: BadgeCheck },
];

async function requestApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function mergeWorkspace(workspace) {
  return {
    ...initialState,
    ...(workspace || {}),
    wallet: { ...initialState.wallet, ...(workspace?.wallet || {}) },
    child: { ...initialState.child, ...(workspace?.child || {}) },
    monthlyBudget: workspace?.monthlyBudget ?? initialState.monthlyBudget,
    punishment: workspace?.punishment ?? null,
    vouchers: Array.isArray(workspace?.vouchers) ? workspace.vouchers : [],
    voucherRequests: Array.isArray(workspace?.voucherRequests) ? workspace.voucherRequests : [],
  };
}

function reconcileWorkspace(base, local, remote) {
  if (!base) return mergeWorkspace(remote);
  const merged = { ...remote };
  for (const key of ["child", "parentName", "currency", "activeGoalId", "onboarded", "monthlyBudget", "punishment", "vouchers"]) {
    if (JSON.stringify(local[key]) !== JSON.stringify(base[key])) merged[key] = local[key];
  }
  const requests = new Map((remote.voucherRequests || []).map((request) => [String(request.id), request]));
  (local.voucherRequests || []).forEach((request) => {
    const existing = requests.get(String(request.id));
    if (!existing || (existing.status === "pending" && request.status !== "pending")) requests.set(String(request.id), request);
  });
  merged.voucherRequests = [...requests.values()];
  const previousTasks = new Map(base.tasks.map((task) => [String(task.id), task]));
  const localTasks = new Map(local.tasks.map((task) => [String(task.id), task]));
  const remoteTasks = new Map(remote.tasks.map((task) => [String(task.id), task]));
  const taskIds = new Set([...previousTasks.keys(), ...localTasks.keys(), ...remoteTasks.keys()]);
  merged.tasks = [...taskIds].flatMap((id) => {
    const previous = previousTasks.get(id);
    const localTask = localTasks.get(id);
    const remoteTask = remoteTasks.get(id);
    if (!localTask) return remoteTask ? [remoteTask] : [];
    if (!remoteTask) return [localTask];
    if (!previous) return [remoteTask];
    const localChanged = JSON.stringify(localTask) !== JSON.stringify(previous);
    const remoteChanged = JSON.stringify(remoteTask) !== JSON.stringify(previous);
    if (!localChanged) return [remoteTask];
    if (!remoteChanged) return [localTask];
    return [remoteTask];
  });
  merged.wallet = Object.fromEntries(["spendable", "savings", "taxPaid"].map((key) => {
    const previous = Number(base.wallet[key]) || 0;
    const localValue = Number(local.wallet[key]) || 0;
    const remoteValue = Number(remote.wallet[key]) || 0;
    const localChanged = localValue !== previous;
    const remoteChanged = remoteValue !== previous;
    const value = !localChanged ? remoteValue
      : !remoteChanged || localValue === remoteValue ? localValue
        : Math.max(0, previous + (localValue - previous) + (remoteValue - previous));
    return [key, value];
  }));
  const previousXp = Number(base.xp) || 0;
  const localXp = Number(local.xp) || 0;
  const remoteXp = Number(remote.xp) || 0;
  merged.xp = localXp === remoteXp
    ? remoteXp
    : Math.max(previousXp, localXp) + Math.max(previousXp, remoteXp) - previousXp;
  const goals = new Map(remote.goals.map((goal) => [String(goal.id), goal]));
  local.goals.forEach((goal) => goals.set(String(goal.id), goals.get(String(goal.id)) || goal));
  merged.goals = [...goals.values()];
  return mergeWorkspace(merged);
}

const DEFAULT_PREFERENCES = { theme: "green", darkMode: false, avatarImage: "" };
const preferencesKey = (account) => `mvk-preferences-${encodeURIComponent(account.email.toLowerCase())}`;
const tourKey = (account, role) => `mvk-tour-seen-${encodeURIComponent(account.email.toLowerCase())}-${role}`;

function loadPreferences(account) {
  try {
    const stored = localStorage.getItem(preferencesKey(account));
    return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function AppShell({ state, role, account, syncError, onSignOut, children }) {
  const child = state.child;
  const links = role === "parent" ? PARENT_LINKS : CHILD_LINKS;
  const [active, setActive] = useState("overview");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => loadPreferences(account));
  const [tourStep, setTourStep] = useState(null);
  const tourStepsForRole = tourSteps(role);
  const profileLabel = role === "parent" ? "P" : child.avatar;

  useEffect(() => {
    localStorage.setItem(preferencesKey(account), JSON.stringify(preferences));
  }, [account, preferences]);

  useEffect(() => {
    const key = tourKey(account, role);
    if (localStorage.getItem(key)) return undefined;
    const timer = window.setTimeout(() => {
      localStorage.setItem(key, "true");
      setTourStep(0);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [account, role]);

  const startTour = () => {
    localStorage.setItem(tourKey(account, role), "true");
    setSettingsOpen(false);
    setTourStep(0);
  };
  const closeTour = () => setTourStep(null);
  const goTourBack = () => setTourStep((step) => Math.max(0, step - 1));
  const goTourNext = () => setTourStep((step) => {
    if (step >= tourStepsForRole.length - 1) return null;
    return step + 1;
  });
  const changePreferences = (changes) => setPreferences((current) => ({ ...current, ...changes }));

  const selectSection = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className={`workspace ${role}-workspace theme-${preferences.theme} ${preferences.darkMode ? "theme-dark" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark">mk</span><span>Mening <b>Virtual Karyeram</b></span></div>
        <div className="workspace-label">{role === "parent" ? "FAMILY WORKSPACE" : "MY WORKSPACE"}</div>
        <nav className="side-nav" aria-label="Main navigation">
          {links.map(({ id, label, icon: Icon }) => (
            <button key={id} data-tour={id === "tasks" ? "tasks" : id === "approvals" ? "approvals" : undefined} onClick={() => selectSection(id)} className={`nav-item ${active === id ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {role === "parent" && id === "approvals" && state.tasks.some((task) => task.status === "review") && <i className="nav-count">{state.tasks.filter((task) => task.status === "review").length}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="account-profile" data-tour="account">
            <div className="side-profile">
              <span className={`profile-avatar ${role}`}>
                {preferences.avatarImage ? <img src={preferences.avatarImage} alt="" /> : profileLabel}
              </span>
              <span><b>{account.displayName}</b><small>{account.email}</small></span>
            </div>
            <button className="account-hover-signout" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
          </div>
          <button className="sidebar-settings-button" data-tour="settings" onClick={() => setSettingsOpen(true)}><Settings size={16} /> Settings <span>Personalize your workspace</span></button>
          <button className="sidebar-help-button" onClick={startTour}><CircleHelp size={16} /> Take the dashboard tour</button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ArrowRight size={14} /><b>{role === "parent" ? "Parent" : "Child"}</b></div>
          <div className="topbar-actions">
            <span className="secure-label"><ShieldCheck size={15} /> Saved to family account</span>
            <button className="mobile-account-trigger" data-tour="account" aria-label="Open your account settings" onClick={() => setSettingsOpen(true)}>
              <span className="profile-avatar">{preferences.avatarImage ? <img src={preferences.avatarImage} alt="" /> : profileLabel}</span>
            </button>
            <button className="topbar-settings-trigger" data-tour="settings" aria-label="Open settings" onClick={() => setSettingsOpen(true)}><Settings size={16} /></button>
            <div className="currency-control">
              <button className="currency-trigger" onClick={() => setCurrencyOpen((open) => !open)}><Coins size={16} /> {state.currency} <span>⌄</span></button>
              {currencyOpen && <div className="currency-menu">
                {["UZS", "USD", "RUB"].map((currency) => <button key={currency} onClick={() => { state.setCurrency(currency); setCurrencyOpen(false); }}>{currency}</button>)}
              </div>}
            </div>
          </div>
        </header>
        <main className="dashboard-content">
          <div className="page-heading">
            <div><p className="eyebrow">{role === "parent" ? "FAMILY OVERVIEW" : "YOUR PROGRESS"}</p>
              <h1>{role === "parent" ? `Good to see you, ${account.displayName}.` : `Welcome back, ${child.name || account.displayName}.`}</h1>
              <p>{role === "parent" ? "A clear picture of goals, tasks and rewards — all in one place." : "Your effort adds up. Here’s where things stand today."}</p>
            </div>
            {role === "child" && <span className="level-chip"><Sparkles size={15} /> Level {Math.floor(state.xp / 100) + 1}</span>}
          </div>
          {syncError && <div className="sync-warning" role="alert"><ShieldCheck size={16} /> Changes are not syncing: {syncError}</div>}
          {children}
          <footer className="workspace-footer"><span><ShieldCheck size={14} /> Private family workspace. Progress syncs to your account.</span><span><CircleHelp size={14} /> Rewards are virtual until approved.</span></footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {links.map(({ id, label, icon: Icon }) => <button key={id} data-tour={id === "tasks" ? "tasks" : id === "approvals" ? "approvals" : undefined} onClick={() => selectSection(id)} className={active === id ? "active" : ""}><Icon size={18} /><span>{label}</span></button>)}
      </nav>
      <WorkspaceSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onChange={changePreferences}
        onStartTour={startTour}
        onSignOut={onSignOut}
        avatarLabel={profileLabel}
      />
      {tourStep !== null && <GuidedTour role={role} step={tourStep} onNext={goTourNext} onBack={goTourBack} onClose={closeTour} />}
      <ChatWidget account={account} role={role} />
    </div>
  );
}

export default function App() {
  const [state, update] = useAppState();
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [startupError, setStartupError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [quizTask, setQuizTask] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [fail, setFail] = useState(null);
  const [payout, setPayout] = useState(null);
  const [parentNotice, setParentNotice] = useState("");
  const workspaceVersion = useRef({ version: null, state: null });

  useEffect(() => {
    let current = true;
    requestApi("/api/auth/me").then(({ user, workspace, version }) => {
      if (!current) return;
      setAccount(user);
      setRole(user.role);
      if (workspace && user.role !== "admin") {
        const restored = mergeWorkspace(workspace);
        workspaceVersion.current = { version, state: restored };
        update(restored);
      }
      setWorkspaceReady(true);
      setSessionReady(true);
    }).catch((error) => {
      if (!current) return;
      if (!error.message.includes("Sign in to continue")) setStartupError(`${error.message} Make sure the API server and MongoDB are running.`);
      setSessionReady(true);
    });
    return () => { current = false; };
  }, [update]);

  useEffect(() => {
    if (!account || account.role === "admin" || !workspaceReady) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      requestApi("/api/workspace", { method: "PUT", body: JSON.stringify({ workspace: state, version: workspaceVersion.current.version }), signal: controller.signal })
        .then(({ workspace, version }) => {
          workspaceVersion.current = { version, state: mergeWorkspace(workspace) };
          setSyncError("");
        })
        .catch((error) => {
          if (error.status === 409 && error.payload?.workspace && Number.isSafeInteger(error.payload.version)) {
            const remote = mergeWorkspace(error.payload.workspace);
            const rebased = reconcileWorkspace(workspaceVersion.current.state, state, remote);
            workspaceVersion.current = { version: error.payload.version, state: remote };
            update(rebased);
            setSyncError("Another device updated this family. Merging changes…");
            return;
          }
          if (error.name !== "AbortError") setSyncError(error.message);
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, state, workspaceReady]);

  useEffect(() => {
    if (!account || account.role === "admin" || !workspaceReady) return undefined;
    let reading = false;
    const refreshWorkspace = async () => {
      if (reading) return;
      reading = true;
      try {
        const { workspace, version } = await requestApi("/api/workspace");
        const nextState = mergeWorkspace(workspace);
        if (version > workspaceVersion.current.version) {
          const reconciled = reconcileWorkspace(workspaceVersion.current.state, state, nextState);
          workspaceVersion.current = { version, state: nextState };
          if (JSON.stringify(reconciled) !== JSON.stringify(state)) update(reconciled);
        }
        setSyncError("");
      } catch (error) {
        setSyncError(error.message);
      } finally {
        reading = false;
      }
    };
    const timer = window.setInterval(refreshWorkspace, 5000);
    return () => window.clearInterval(timer);
  }, [account, state, update, workspaceReady]);

  const chooseRole = (selectedRole) => {
    setRole(selectedRole);
    setStartupError("");
  };
  const backToRoles = () => {
    setRole(null);
    setStartupError("");
  };
  const authenticate = async (details) => {
    const { mode, role: requestedRole, ...form } = details;
    const payload = mode === "register"
      ? await requestApi("/api/auth/register", { method: "POST", body: JSON.stringify({ ...form, role: requestedRole }) })
      : await requestApi("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password, expectedRole: requestedRole }) });
    setAccount(payload.user);
    setRole(payload.user.role);
    setStartupError("");
    setSyncError("");
    if (payload.user.role !== "admin" && payload.workspace) {
      const restored = mergeWorkspace(payload.workspace);
      workspaceVersion.current = { version: payload.version, state: restored };
      update(restored);
    }
    setWorkspaceReady(true);
  };
  const signOut = async () => {
    try {
      await requestApi("/api/auth/logout", { method: "POST" });
      setAccount(null);
      setRole(null);
      setWorkspaceReady(false);
      workspaceVersion.current = { version: null, state: null };
      setSyncError("");
    } catch (error) {
      setSyncError(`Sign out failed: ${error.message}`);
    }
  };

  const addTask = (task) => update((current) => ({ ...current, tasks: [...current.tasks, task] }));
  const finishQuiz = (score) => {
    const task = quizTask;
    setQuizTask(null);
    if (score < 2) return setFail(score);
    update((current) => ({ ...current, tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status: "review", score, parentNote: "" } : item)) }));
    const split = calc(task.base + task.tip);
    setReceipt({ ...split, base: task.base, tip: task.tip, name: task.name, score, savingsAfter: state.wallet.savings + split.save });
  };
  const approve = (id) => {
    const task = state.tasks.find((item) => item.id === id && item.status === "review");
    if (!task) return;
    const punishment = state.punishment;
    const punishmentActive = punishment && (!punishment.until || Date.parse(punishment.until) > Date.now());
    const rewardFactor = punishmentActive && punishment.type === "reward25" ? 0.25
      : punishmentActive && punishment.type === "reward50" ? 0.5
        : 1;
    const rewardGross = Math.floor((task.base + task.tip) * rewardFactor);
    const split = calc(rewardGross);
    const lvlUp = Math.floor((state.xp + 60) / 100) > Math.floor(state.xp / 100);
    update((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === id ? { ...item, status: "paid", rewardPaid: rewardGross, punishmentApplied: rewardFactor < 1 ? rewardFactor : null } : item)),
      wallet: { spendable: current.wallet.spendable + split.net, savings: current.wallet.savings + split.save, taxPaid: current.wallet.taxPaid + split.tax },
      xp: current.xp + 60,
    }));
    setPayout({ ...split, lvlUp, rewardFactor });
    setParentNotice("Payout approved. The family workspace has been updated.");
    window.setTimeout(() => setParentNotice(""), 3200);
  };
  const requestRevision = (id) => update((current) => ({
    ...current,
    tasks: current.tasks.map((task) => task.id === id && task.status === "review" ? { ...task, status: "active", parentNote: task.parentNote || "Please review the task details and try again." } : task),
  }));
  const addGoal = (goal) => update((current) => ({ ...current, goals: [...current.goals, goal], activeGoalId: goal.id }));
  const setActiveGoal = (id) => update((current) => ({ ...current, activeGoalId: id }));
  const setCurrency = (currency) => update((current) => ({ ...current, currency }));
  const applyWorkspaceResponse = ({ workspace, version }) => {
    const restored = mergeWorkspace(workspace);
    workspaceVersion.current = { version, state: restored };
    update(restored);
  };
  const familyAction = async (path, options) => {
    const result = await requestApi(path, options);
    if (result?.workspace) applyWorkspaceResponse(result);
    return result;
  };
  const updateFamilyFields = (fields) => update((current) => ({ ...current, ...fields }));
  const requestVoucher = (voucherId) => familyAction(`/api/vouchers/${encodeURIComponent(voucherId)}/request`, { method: "POST" });
  const reviewVoucher = (requestId, decision) => familyAction(`/api/vouchers/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
  const activeGoal = state.goals.find((goal) => goal.id === state.activeGoalId) || state.goals[0];
  const quizCat = quizTask ? categoryOf(quizTask) : null;

  if (!sessionReady) return <div className="session-loading"><span className="brand-mark">mk</span><p>Checking your account…</p></div>;

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {!account ? (
          <motion.div key={role || "entry"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {startupError && <div className="startup-error" role="alert">{startupError}</div>}
            <Onboarding initialRole={role} onBack={backToRoles} onChooseRole={chooseRole} onAuthenticate={authenticate} />
          </motion.div>
        ) : role === "admin" ? (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminDashboard account={account} onSignOut={signOut} signOutError={syncError} />
          </motion.div>
        ) : (
          <motion.div key={role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AppShell state={{ ...state, setCurrency }} role={role} account={account} syncError={syncError} onSignOut={signOut}>
              {role === "parent" ? (
                <ParentDashboard state={state} addTask={addTask} approve={approve} requestRevision={requestRevision} approvalNotice={parentNotice} inviteCode={account.inviteCode} reviewVoucher={reviewVoucher} updateFamilyFields={updateFamilyFields} />
              ) : (
                <KidDashboard state={state} startQuiz={setQuizTask} addGoal={addGoal} setActiveGoal={setActiveGoal} requestVoucher={requestVoucher} account={account} />
              )}
            </AppShell>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quizTask && <Quiz key="quiz" topic={quizCat?.id || quizTask.categoryId} label={quizTask.name} onDone={finishQuiz} onClose={() => setQuizTask(null)} />}
        {receipt && <Receipt key="receipt" r={receipt} goal={activeGoal} savingsAfter={receipt.savingsAfter} currency={state.currency} onClose={() => setReceipt(null)} />}
        {role === "child" && payout && <Payout key="payout" p={payout} currency={state.currency} onClose={() => setPayout(null)} />}
        {fail !== null && <FailModal key="fail" score={fail} onClose={() => setFail(null)} />}
      </AnimatePresence>
    </div>
  );
}
