import React, { useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, CircleCheck, CirclePause, Database, LayoutDashboard, LogOut, RefreshCw, Search, Settings, ShieldCheck, UserRound, Users, X } from "lucide-react";
import WorkspaceSettings from "./WorkspaceSettings";
import ChatWidget from "./ChatWidget";

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload;
}

const dateLabel = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
const preferenceDefaults = { theme: "green", darkMode: false, avatarImage: "" };
const preferenceStorageKey = (email) => `mvk-preferences-${encodeURIComponent(email.toLowerCase())}`;

function loadPreferences(email) {
  try {
    const stored = localStorage.getItem(preferenceStorageKey(email));
    return stored ? { ...preferenceDefaults, ...JSON.parse(stored) } : preferenceDefaults;
  } catch {
    return preferenceDefaults;
  }
}

export default function AdminDashboard({ account, onSignOut, signOutError }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [preferences, setPreferences] = useState(() => loadPreferences(account.email));

  useEffect(() => {
    localStorage.setItem(preferenceStorageKey(account.email), JSON.stringify(preferences));
  }, [account.email, preferences]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: appliedQuery,
        role: roleFilter,
        status: statusFilter,
        page: String(page),
      });
      const [nextOverview, accountPage] = await Promise.all([
        adminRequest("/api/admin/overview"),
        adminRequest(`/api/admin/users?${params.toString()}`),
      ]);
      setOverview(nextOverview);
      setUsers(accountPage.users);
      setPage(accountPage.page);
      setPagination({ total: accountPage.total, totalPages: accountPage.totalPages });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (user) => {
    const status = user.status === "active" ? "suspended" : "active";
    setBusyId(user._id);
    setError("");
    setNotice("");
    try {
      const { user: updatedUser } = await adminRequest(`/api/admin/users/${user._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(updatedUser.status === status
        ? `${updatedUser.displayName}’s account is now ${status}.`
        : `${updatedUser.displayName}’s account was already ${updatedUser.status}.`);
      await load();
      if (details?.user?._id === user._id) setDetails((current) => current ? { ...current, user: updatedUser } : current);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  };

  const showDetails = async (user) => {
    setDetailsLoading(true);
    setDetails(null);
    setError("");
    try {
      setDetails(await adminRequest(`/api/admin/users/${user._id}/details`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportUsers = () => {
    const escapeCell = (value) => {
      const text = String(value ?? "");
      const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const content = [
      ["Name", "Email", "Role", "Status", "Created"],
      ...users.map((user) => [user.displayName, user.email, user.role, user.status, new Date(user.createdAt).toISOString()]),
    ].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `family-platform-users-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigateTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const changePreferences = (changes) => setPreferences((current) => ({ ...current, ...changes }));
  const closeDetails = () => setDetails(null);

  return (
    <div className={`admin-shell theme-${preferences.theme} ${preferences.darkMode ? "theme-dark" : ""}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-brand"><span className="brand-mark">mk</span><span>Mening <b>Virtual Karyeram</b></span></div>
        <span className="workspace-label">PLATFORM TOOLS</span>
        <nav className="admin-nav" aria-label="Administrator navigation">
          <button className={activeSection === "overview" ? "active" : ""} onClick={() => navigateTo("overview")}><LayoutDashboard size={17} /> Overview</button>
          <button className={activeSection === "accounts" ? "active" : ""} onClick={() => navigateTo("accounts")}><Users size={17} /> Accounts</button>
          <button className={activeSection === "activity" ? "active" : ""} onClick={() => navigateTo("activity")}><Activity size={17} /> Admin activity</button>
        </nav>
        <div className="admin-sidebar-note"><ShieldCheck size={16} /> Manage account access and review family workspace summaries. Changes are recorded.</div>
        <div className="admin-account-profile">
          <div className="admin-account">
            <span className="profile-avatar parent">
              {preferences.avatarImage ? <img src={preferences.avatarImage} alt="" /> : <UserRound size={17} />}
            </span>
            <span><b>{account.displayName}</b><small>{account.email}</small></span>
          </div>
          <button className="admin-hover-signout" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
        </div>
        <button className="admin-settings-button" onClick={() => setSettingsOpen(true)}><Settings size={16} /> Settings</button>
        <button className="admin-signout-button" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumb"><span>Platform</span><ArrowUpRight size={14} /><b>Administration</b></div>
          <div className="admin-topbar-right">
            <span className={`database-status ${overview?.databaseConnected ? "connected" : ""}`}><Database size={14} /> {overview ? overview.databaseConnected ? "MongoDB connected" : "MongoDB unavailable" : "Checking database"}</span>
            <span className="admin-security"><ShieldCheck size={15} /> Admin session</span>
            <button className="admin-mobile-avatar" aria-label="Open settings" onClick={() => setSettingsOpen(true)}>
              {preferences.avatarImage ? <img src={preferences.avatarImage} alt="" /> : <UserRound size={16} />}
            </button>
            <button className="admin-topbar-settings" aria-label="Open settings" onClick={() => setSettingsOpen(true)}><Settings size={16} /></button>
          </div>
        </header>
        <div className="admin-content">
          <div id="overview" className="admin-heading">
            <div><p className="eyebrow">ADMIN CONSOLE</p><h1>Platform overview</h1><p>Monitor family accounts, review platform activity, and manage account access.</p></div>
            <button className="admin-refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spinning" : ""} /> Refresh data</button>
          </div>

          {signOutError && <div className="admin-alert error" role="alert">{signOutError}</div>}
          {error && <div className="admin-alert error" role="alert">{error}</div>}
          {notice && <div className="admin-alert success" role="status">{notice}</div>}

          <section className="admin-stats" aria-label="Account statistics">
            {[
              { title: "Total accounts", value: overview?.totalUsers, icon: Users, tone: "green" },
              { title: "Parent accounts", value: overview?.parentCount, icon: ShieldCheck, tone: "blue" },
              { title: "Child accounts", value: overview?.childCount, icon: BadgeCheck, tone: "amber" },
              { title: "Family workspaces", value: overview?.familyCount, icon: LayoutDashboard, tone: "violet" },
              { title: "Active accounts", value: overview?.activeUsers, icon: CircleCheck, tone: "green" },
              { title: "Suspended accounts", value: overview?.suspendedUsers, icon: CirclePause, tone: "red" },
            ].map(({ title, value, icon: Icon, tone }) => (
              <article className="admin-stat" key={title}>
                <span className={`stat-icon ${tone}`}><Icon size={17} /></span>
                <span className="stat-label">{title}</span>
                <strong>{loading && value === undefined ? "—" : value ?? 0}</strong>
              </article>
            ))}
          </section>

          <section id="accounts" className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Account directory</h2><p>Search, filter, inspect family summaries, and suspend or restore access.</p></div>
              <button className="admin-export" onClick={exportUsers} disabled={!users.length}><ArrowDownToLine size={15} /> Export this page</button>
            </div>
            <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedQuery(query.trim()); }}>
              <Search size={16} />
              <input aria-label="Search accounts" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit">Search</button>
            </form>
            <div className="admin-filters">
              <label>Role
                <select value={roleFilter} onChange={(event) => { setPage(1); setRoleFilter(event.target.value); }}>
                  <option value="all">All roles</option><option value="parent">Parents</option><option value="child">Children</option>
                </select>
              </label>
              <label>Account status
                <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}>
                  <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
                </select>
              </label>
              <span className="admin-result-count">{pagination.total} account{pagination.total === 1 ? "" : "s"}</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Account</th><th>Role</th><th>Joined</th><th>Status</th><th>Account tools</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td><b>{user.displayName}</b><small>{user.email}</small></td>
                      <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                      <td>{dateLabel(user.createdAt)}</td>
                      <td><span className={`status-badge ${user.status}`}><i />{user.status}</span></td>
                      <td className="admin-account-tools">
                        <button className="account-details-button" onClick={() => showDetails(user)}><UserRound size={13} /> Details</button>
                        <button className={`user-toggle ${user.status}`} onClick={() => toggleStatus(user)} disabled={busyId === user._id}>
                          {user.status === "active" ? <><CirclePause size={14} /> Suspend</> : <><CircleCheck size={14} /> Restore</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && <tr><td className="admin-empty" colSpan="5">No accounts found for these filters.</td></tr>}
                  {loading && users.length === 0 && <tr><td className="admin-empty" colSpan="5">Loading accounts from MongoDB…</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <span>Page {page} of {pagination.totalPages}</span>
              <div>
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}><ArrowLeft size={14} /> Previous</button>
                <button onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages || loading}>Next <ArrowRight size={14} /></button>
              </div>
            </div>
          </section>

          <section id="activity" className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Recent admin activity</h2><p>Most recent account access changes made by administrators.</p></div>
              <span className="activity-mark"><Activity size={16} /></span>
            </div>
            <div className="activity-list">
              {overview?.recentEvents?.map((event) => (
                <div className="activity-row" key={event._id}>
                  <span className={`activity-icon ${event.action.endsWith("suspended") ? "warning" : ""}`}><Activity size={15} /></span>
                  <span><b>{event.action.replace("account_", "Account ").replace("_", " ")}</b><small>{event.targetEmail} · by {event.adminEmail}</small></span>
                  <time>{dateLabel(event.createdAt)}</time>
                </div>
              ))}
              {!loading && !overview?.recentEvents?.length && <p className="empty-activity">No administrative changes yet.</p>}
            </div>
          </section>
          <footer className="workspace-footer"><span><ShieldCheck size={14} /> Admin actions are authenticated and recorded in MongoDB.</span><span>{overview?.activeUsers ?? 0} active accounts</span></footer>
        </div>
      </main>

      <WorkspaceSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onChange={changePreferences}
        onSignOut={onSignOut}
        avatarLabel="A"
      />
      <ChatWidget account={account} role="admin" />

      {(detailsLoading || details) && (
        <div className="admin-details-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
          <section className="admin-details-dialog" role="dialog" aria-modal="true" aria-labelledby="account-details-title">
            <div className="admin-details-heading">
              <div><p className="eyebrow">ACCOUNT RECORD</p><h2 id="account-details-title">{details?.user?.displayName || "Loading account…"}</h2></div>
              <button onClick={closeDetails} aria-label="Close account details"><X size={18} /></button>
            </div>
            {detailsLoading ? <p className="admin-details-loading">Loading account information…</p> : details && <>
              <div className="admin-detail-identity">
                <span className="admin-detail-avatar"><UserRound size={20} /></span>
                <span><b>{details.user.email}</b><small>{details.user.role} · {details.user.status}</small></span>
              </div>
              <dl className="admin-detail-list">
                <div><dt>Created</dt><dd>{dateLabel(details.user.createdAt)}</dd></div>
                <div><dt>Family workspace</dt><dd>{details.family ? details.family.id : "Not linked"}</dd></div>
                {details.family && <div><dt>Workspace last saved</dt><dd>{dateLabel(details.family.updatedAt)}</dd></div>}
              </dl>
              {details.family ? <>
                <h3 className="admin-detail-subheading">Linked family accounts</h3>
                <div className="admin-linked-list">
                  {details.family.linkedAccounts.length ? details.family.linkedAccounts.map((linked) => (
                    <div key={linked.email}><span><b>{linked.displayName}</b><small>{linked.email}</small></span><span className={`role-badge ${linked.role}`}>{linked.role}</span></div>
                  )) : <p>No other account is linked to this workspace.</p>}
                </div>
                <h3 className="admin-detail-subheading">Workspace summary</h3>
                <div className="admin-detail-stats">
                  {Object.entries(details.family.taskCounts).map(([key, value]) => <div key={key}><b>{value}</b><small>{key} tasks</small></div>)}
                </div>
                <div className="admin-detail-money"><b>Virtual wallet totals (UZS)</b><span>Spendable {details.family.virtualWallet.spendable.toLocaleString()}</span><span>Savings {details.family.virtualWallet.savings.toLocaleString()}</span><span>Tax {details.family.virtualWallet.taxPaid.toLocaleString()}</span></div>
              </> : <p className="admin-details-loading">No family workspace is attached to this account.</p>}
            </>}
          </section>
        </div>
      )}
    </div>
  );
}
