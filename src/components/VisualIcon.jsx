import React from "react";
import { Bike, Bell, BookOpen, BriefcaseBusiness, Brush, Camera, Cat, Check, CircleHelp, Clock3, Code2, Coffee, Gamepad2, Gift, Goal, Headphones, House, Lightbulb, LockKeyhole, Music, NotebookPen, PawPrint, Plane, ReceiptText, Rocket, ShieldCheck, ShoppingBag, ShoppingBasket, Smartphone, Sparkles, Star, Store, WalletCards } from "lucide-react";
import { CAREER_ICONS, HABIT_ICONS } from "../lib/data";

const icons = {
  Bike,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Brush,
  Camera,
  Cat,
  Check,
  CircleHelp,
  Clock3,
  Code2,
  Coffee,
  Gamepad2,
  Gift,
  Goal,
  Headphones,
  House,
  Lightbulb,
  LockKeyhole,
  Music,
  NotebookPen,
  PawPrint,
  Plane,
  ReceiptText,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Store,
  WalletCards,
};

const avatarIcons = { fox: Cat, panda: PawPrint, tiger: Cat, unicorn: Star, frog: PawPrint, rocket: Rocket };
const legacyAvatars = { "🦊": "fox", "🐼": "panda", "🐯": "tiger", "🦄": "unicorn", "🐸": "frog", "🚀": "rocket" };

export function CareerIcon({ id, kind = "career", size = 20, strokeWidth = 1.8 }) {
  const iconName = kind === "habit" ? HABIT_ICONS[id] : CAREER_ICONS[id];
  const Icon = icons[iconName] || BriefcaseBusiness;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function AvatarIcon({ avatar, size = 20, strokeWidth = 1.8 }) {
  const normalized = legacyAvatars[avatar] || avatar;
  const Icon = avatarIcons[normalized] || PawPrint;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

const symbolIcons = {
  "💰": WalletCards, "🏦": WalletCards, "🏛️": ShieldCheck, "🏛": ShieldCheck,
  "🎯": Goal, "💼": BriefcaseBusiness, "🌱": Sparkles, "💡": Lightbulb, Lightbulb,
  "🧠": Lightbulb, "📋": NotebookPen, "🧾": NotebookPen, "💳": WalletCards,
  "🔒": LockKeyhole, "🛡️": ShieldCheck, "🛡": ShieldCheck, "⭐": Star,
  "🎉": Sparkles, "🏅": Goal, "⏳": Clock3, "🎁": Gift, "🚲": Bike, Receipt: ReceiptText,
  "🎮": Goal, "👟": ShoppingBag, "🛹": Bike, "🎸": Sparkles, "📱": WalletCards,
  "⌚": Clock3, "🎧": Sparkles, "⚽": Goal, "🏀": Goal, "🧸": PawPrint,
  "📷": Star, "🛴": Bike, "🎨": Brush, "📚": BookOpen, "🐶": PawPrint,
  "✈️": Rocket, "✈": Rocket, "🍿": ShoppingBasket, "☔": ShieldCheck,
  Bike, Bell, BookOpen, Camera, Clock3, Code2, Coffee, Gamepad2, Gift, Goal, Headphones, House,
  LockKeyhole, Music, NotebookPen, PawPrint, Plane, ShieldCheck, ShoppingBag, ShoppingBasket,
  Smartphone, Sparkles, Star, Store, WalletCards,
};

export function SymbolIcon({ value, size = 18, strokeWidth = 1.8 }) {
  const Icon = symbolIcons[value] || Sparkles;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
