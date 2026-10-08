/* ===================================================================
   Data + money layer for Mening Virtual Karyeram
   All amounts are stored canonically in UZS and converted for display.
   =================================================================== */

/* ---------- currencies ---------- */
// Approximate market rates (1 unit = X UZS), editable in one place.
export const CURRENCIES = {
  UZS: { code: "UZS", label: "So'm", symbol: "so'm", flag: "🇺🇿", rate: 1, decimals: 0 },
  USD: { code: "USD", label: "Dollar", symbol: "$", flag: "🇺🇸", rate: 11790, decimals: 2 },
  RUB: { code: "RUB", label: "Rubl", symbol: "₽", flag: "🇷🇺", rate: 140, decimals: 2 },
};
export const CURRENCY_LIST = Object.values(CURRENCIES);

export const toDisplay = (uzs, code) => uzs / CURRENCIES[code].rate;
export const toUZS = (value, code) => Math.round(value * CURRENCIES[code].rate);

export function fmtMoney(uzs, code) {
  const c = CURRENCIES[code] || CURRENCIES.UZS;
  const v = toDisplay(uzs, c.code);
  const str = v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: c.decimals,
  });
  return c.code === "USD" ? `$${str}` : c.code === "RUB" ? `${str} ₽` : `${str} so'm`;
}

/* ---------- money split: 58% spendable / 30% savings / 12% tax ---------- */
export const SPLIT = { spend: 0.58, save: 0.3, tax: 0.12 };
export const calc = (gross) => {
  const tax = Math.round(gross * SPLIT.tax);
  const save = Math.round(gross * SPLIT.save);
  return { gross, tax, save, net: gross - tax - save };
};

/* ---------- careers ---------- */
export const CAREERS = [
  { id: "Barista", e: "Coffee", title: "Junior Barista", tint: "bg-amber-100 text-amber-700" },
  { id: "Web Developer", e: "Code2", title: "Junior Web Developer", tint: "bg-sky-100 text-sky-700" },
  { id: "Hotel Steward", e: "Bell", title: "Junior Hotel Steward", tint: "bg-violet-100 text-violet-700" },
  { id: "Courier", e: "Bike", title: "Junior Courier", tint: "bg-emerald-100 text-emerald-700" },
  { id: "Store Manager", e: "Store", title: "Assistant Store Manager", tint: "bg-rose-100 text-rose-700" },
];
export const CAREER_ICONS = {
  Barista: "Coffee",
  "Web Developer": "Code2",
  "Hotel Steward": "Bell",
  Courier: "Bike",
  "Store Manager": "Store",
};

/* ---------- real-life growth habits (parent-assignable) ---------- */
export const HABITS = [
  { id: "reading", e: "BookOpen", title: "Read a Book", hint: "e.g. 20 pages of a story book", tint: "bg-sky-100 text-sky-700" },
  { id: "poem", e: "NotebookPen", title: "Learn a Poem / Homework", hint: "Memorise a poem or finish homework", tint: "bg-violet-100 text-violet-700" },
  { id: "cleanup", e: "Home", title: "Room Cleanup / Helping at Home", hint: "Tidy the room, help with chores", tint: "bg-emerald-100 text-emerald-700" },
  { id: "coding", e: "Code2", title: "Coding / Skill Practice", hint: "30 minutes of practice", tint: "bg-amber-100 text-amber-700" },
];
export const HABIT_ICONS = {
  reading: "BookOpen",
  poem: "NotebookPen",
  cleanup: "Home",
  coding: "Code2",
};

/* task category helpers */
export const categoryOf = (task) =>
  task.kind === "habit"
    ? HABITS.find((h) => h.id === task.categoryId) || HABITS[0]
    : CAREERS.find((c) => c.id === task.categoryId) || CAREERS[0];

/* ---------- avatars & goal emoji picker ---------- */
export const AVATARS = ["fox", "panda", "tiger", "unicorn", "frog", "rocket"];
export const GOAL_EMOJIS = ["Bike", "Gamepad2", "ShoppingBag", "Bike", "Music", "Smartphone", "Clock3", "Headphones", "Goal", "Goal", "PawPrint", "Camera", "Bike", "Palette", "BookOpen", "PawPrint", "Plane", "Gift"];

export const DEFAULT_GOALS = [
  { id: "g-bike", name: "New Bicycle", emoji: "Bike", target: 100000 },
  { id: "g-ps5", name: "PlayStation 5", emoji: "Gamepad2", target: 500000 },
];

/* ---------- spending advice (share of spendable) ---------- */
export const ADVICE = [
  { id: "needs", e: "BookOpen", label: "Books & stationery", share: 0.5, tint: "bg-sky-100 text-sky-700", note: "School supplies and learning first" },
  { id: "fun", e: "ShoppingBasket", label: "Snacks & fun", share: 0.3, tint: "bg-amber-100 text-amber-700", note: "Treats, games and time with friends" },
  { id: "rainy", e: "ShieldCheck", label: "Rainy day pocket", share: 0.2, tint: "bg-violet-100 text-violet-700", note: "Keep a little aside, just in case" },
];

export const MONTHLY_CAP = 300000; // UZS
