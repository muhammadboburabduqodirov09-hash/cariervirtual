import { useCallback, useEffect, useState } from "react";
import { DEFAULT_GOALS } from "./data";

const KEY = "mvk-state-v2";

export const initialState = {
  onboarded: false,
  child: { name: "", avatar: "fox", career: "Barista" },
  parentName: "",
  currency: "UZS",
  tasks: [], // { id, kind: "career"|"habit", categoryId, name, emoji, base, tip, status: "active"|"review"|"paid", score }
  wallet: { spendable: 0, savings: 0, taxPaid: 0 },
  xp: 0,
  goals: DEFAULT_GOALS,
  activeGoalId: DEFAULT_GOALS[0].id,
  monthlyBudget: 300000,
  punishment: null,
  vouchers: [],
  voucherRequests: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return { ...initialState, ...parsed, wallet: { ...initialState.wallet, ...(parsed.wallet || {}) } };
  } catch {
    return initialState;
  }
}

/**
 * Shared app state persisted to localStorage.
 * The `storage` event keeps Parent and Child views (and extra tabs) in sync:
 * a task posted by the parent appears on the child's dashboard immediately.
 */
export function useAppState() {
  const [state, setState] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY || e.newValue == null) return;
      try {
        setState({ ...initialState, ...JSON.parse(e.newValue) });
      } catch { /* ignore malformed payloads */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn) => setState((s) => (typeof fn === "function" ? fn(s) : fn)), []);
  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(initialState);
  }, []);

  return [state, update, reset];
}
