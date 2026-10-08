import { useCallback, useEffect, useState } from "react";
import { DEFAULT_GOALS } from "./data";

const KEY = "mvk-tab-state-v2";

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
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return { ...initialState, ...parsed, wallet: { ...initialState.wallet, ...(parsed.wallet || {}) } };
  } catch {
    return initialState;
  }
}

/**
 * Per-tab workspace cache. MongoDB remains authoritative and the API polling
 * keeps family members in sync without sharing account state between tabs.
 */
export function useAppState() {
  const [state, setState] = useState(load);

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn) => setState((s) => (typeof fn === "function" ? fn(s) : fn)), []);
  const reset = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setState(initialState);
  }, []);

  return [state, update, reset];
}
