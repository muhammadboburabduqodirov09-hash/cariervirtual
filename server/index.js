import "dotenv/config";
import bcrypt from "bcryptjs";
import MongoStore from "connect-mongo";
import express from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import mongoose from "mongoose";
import { randomBytes, randomUUID } from "node:crypto";

const PORT = Number(process.env.API_PORT || 3001);
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === "production";
if (!MONGODB_URI || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error("Unable to start the API: configure MONGODB_URI and a SESSION_SECRET of at least 32 characters in .env.");
  process.exit(1);
}
const app = express();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["parent", "child", "admin"], required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", default: null },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
}, { timestamps: true });

const familySchema = new mongoose.Schema({
  inviteCode: { type: String, required: true, unique: true, index: true },
  childUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
  state: { type: mongoose.Schema.Types.Mixed, required: true },
  revision: { type: Number, default: 0 },
}, { timestamps: true });

const auditSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetEmail: { type: String, default: "" },
}, { timestamps: true });
const messageSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true, maxlength: 2000 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Family = mongoose.model("Family", familySchema);
const AuditEvent = mongoose.model("AuditEvent", auditSchema);
const Message = mongoose.model("Message", messageSchema);

const defaultWorkspace = (childName = "") => ({
  onboarded: true,
  child: { name: childName, avatar: "fox", career: "Barista" },
  parentName: "",
  currency: "UZS",
  tasks: [],
  wallet: { spendable: 0, savings: 0, taxPaid: 0 },
  xp: 0,
  goals: [
    { id: "g-bike", name: "New Bicycle", emoji: "Bike", target: 100000 },
    { id: "g-ps5", name: "PlayStation 5", emoji: "Gamepad2", target: 500000 },
  ],
  activeGoalId: "g-bike",
  monthlyBudget: 300000,
  punishment: null,
  vouchers: [],
  voucherRequests: [],
});

const createInviteCode = () => randomBytes(5).toString("hex").toUpperCase();
const dummyPasswordHash = bcrypt.hashSync(randomBytes(24).toString("hex"), 12);
const publicUser = async (user) => {
  const result = {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    status: user.status,
  };
  if (user.role === "parent" && user.familyId) {
    const family = await Family.findById(user.familyId).select("inviteCode").lean();
    result.inviteCode = family?.inviteCode || "";
  }
  return result;
};

const regenerateSession = (req) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => error ? reject(error) : resolve());
});
const saveSession = (req) => new Promise((resolve, reject) => {
  req.session.save((error) => error ? reject(error) : resolve());
});
const authRequired = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: "Sign in to continue." });
  const user = await User.findById(req.session.userId);
  if (!user || user.status !== "active") {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "This account is unavailable. Please contact your family administrator." });
  }
  req.user = user;
  next();
};
const adminRequired = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access is required." });
  next();
};
const normalizeWorkspace = (input, existingState = null, role = "parent") => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (!input.child || typeof input.child !== "object" || Array.isArray(input.child)) return null;
  if (!Array.isArray(input.tasks) || input.tasks.length > 1000) return null;
  if (!Array.isArray(input.goals) || input.goals.length > 100) return null;
  const money = input.wallet;
  if (!money || !["spendable", "savings", "taxPaid"].every((key) => Number.isFinite(money[key]) && money[key] >= 0)) return null;
  const currency = ["UZS", "USD", "RUB"].includes(input.currency) ? input.currency : null;
  if (!currency || !Number.isFinite(input.xp) || input.xp < 0) return null;
  const state = {
    onboarded: true,
    child: {
      name: String(input.child.name || "").slice(0, 60),
      avatar: String(input.child.avatar || "fox").slice(0, 32),
      career: String(input.child.career || "Barista").slice(0, 60),
    },
    parentName: String(input.parentName || "").slice(0, 60),
    currency,
    tasks: input.tasks,
    wallet: { spendable: money.spendable, savings: money.savings, taxPaid: money.taxPaid },
    xp: input.xp,
    goals: input.goals,
    activeGoalId: String(input.activeGoalId || "").slice(0, 100),
    monthlyBudget: Number.isSafeInteger(input.monthlyBudget) && input.monthlyBudget >= 1000 && input.monthlyBudget <= 1000000000
      ? input.monthlyBudget
      : 300000,
    punishment: input.punishment && ["reward25", "reward50", "voucherTimed", "voucherManual"].includes(input.punishment.type)
      ? {
        type: input.punishment.type,
        setAt: typeof input.punishment.setAt === "string" && Number.isFinite(Date.parse(input.punishment.setAt)) ? input.punishment.setAt : new Date().toISOString(),
        until: input.punishment.until == null ? null : Number.isFinite(Date.parse(input.punishment.until)) ? new Date(input.punishment.until).toISOString() : null,
        note: String(input.punishment.note || "").slice(0, 240),
      }
      : null,
    vouchers: Array.isArray(input.vouchers) ? input.vouchers.slice(0, 30).flatMap((voucher) => {
      if (!voucher || typeof voucher !== "object" || Array.isArray(voucher)) return [];
      const name = String(voucher.name || "").trim().slice(0, 60);
      const price = Number(voucher.price);
      if (name.length < 2 || !Number.isSafeInteger(price) || price < 1 || price > 1000000000) return [];
      return [{
        id: String(voucher.id || randomUUID()).slice(0, 100),
        name,
        description: String(voucher.description || "").trim().slice(0, 200),
        price,
        active: voucher.active !== false,
      }];
    }) : [],
    voucherRequests: Array.isArray(input.voucherRequests) ? input.voucherRequests.slice(-200).flatMap((request) => {
      if (!request || typeof request !== "object" || Array.isArray(request)) return [];
      const name = String(request.name || "").trim().slice(0, 60);
      const price = Number(request.price);
      if (name.length < 2 || !Number.isSafeInteger(price) || price < 1 || !["pending", "approved", "declined"].includes(request.status)) return [];
      return [{
        id: String(request.id || randomUUID()).slice(0, 100),
        voucherId: String(request.voucherId || "").slice(0, 100),
        name,
        price,
        status: request.status,
        requestedAt: typeof request.requestedAt === "string" && Number.isFinite(Date.parse(request.requestedAt)) ? request.requestedAt : new Date().toISOString(),
        reviewedAt: request.reviewedAt == null ? null : Number.isFinite(Date.parse(request.reviewedAt)) ? new Date(request.reviewedAt).toISOString() : null,
      }];
    }) : [],
  };
  if (role === "child" && existingState) {
    state.monthlyBudget = existingState.monthlyBudget ?? 300000;
    state.punishment = existingState.punishment ?? null;
    state.vouchers = existingState.vouchers || [];
    state.voucherRequests = existingState.voucherRequests || [];
    state.wallet = existingState.wallet || state.wallet;
    state.xp = existingState.xp ?? state.xp;
    const existingTasks = new Map((existingState.tasks || []).map((task) => [String(task.id), task]));
    state.tasks = state.tasks.flatMap((task) => {
      const existing = existingTasks.get(String(task.id));
      if (!existing) return [];
      if (existing.status === "active" && task.status === "review") {
        const score = Number.isInteger(task.score) && task.score >= 0 && task.score <= 3 ? task.score : 0;
        return [{ ...existing, status: "review", score }];
      }
      return [existing];
    });
    for (const task of existingTasks.values()) {
      if (!state.tasks.some((candidate) => String(candidate.id) === String(task.id))) state.tasks.push(task);
    }
  }
  if (role === "parent" && existingState) {
    const existingTasks = new Map((existingState.tasks || []).map((task) => [String(task.id), task]));
    state.tasks = state.tasks.map((task) => {
      const existing = existingTasks.get(String(task.id));
      return existing ? { ...existing, status: task.status, score: task.score, rewardPaid: task.rewardPaid, punishmentApplied: task.punishmentApplied, parentNote: task.parentNote } : task;
    });
    for (const task of existingTasks.values()) {
      if (!state.tasks.some((candidate) => String(candidate.id) === String(task.id))) state.tasks.push(task);
    }
    state.voucherRequests = existingState.voucherRequests || [];
  }
  return state;
};

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many account attempts. Please wait a few minutes and try again." },
});

app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);
app.use(express.json({ limit: "256kb" }));
app.use(session({
  name: "mvk.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "sessions", ttl: 60 * 60 * 24 * 7 }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get("/api/health", (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));

app.post("/api/auth/register", accountLimiter, async (req, res) => {
  const { email, password, role, displayName, childName, familyCode, career, avatar, currency } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedName = typeof displayName === "string" ? displayName.trim() : "";
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: "Enter a valid email address." });
  if (typeof password !== "string" || password.length < 8 || password.length > 128 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "Use a password of 8–128 characters and no more than 72 UTF-8 bytes." });
  }
  if (!["parent", "child"].includes(role)) return res.status(400).json({ error: "Choose a parent or child account." });
  if (normalizedName.length < 2 || normalizedName.length > 60) return res.status(400).json({ error: "Name must be between 2 and 60 characters." });
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ error: "That email is already registered. Sign in instead." });

  const passwordHash = await bcrypt.hash(password, 12);
  let family;
  let createdFamily = false;
  let workspace;

  if (role === "parent") {
    const kid = typeof childName === "string" ? childName.trim() : "";
    if (kid.length < 2 || kid.length > 60) return res.status(400).json({ error: "Enter your child's name (2–60 characters)." });
    family = await Family.create({ inviteCode: createInviteCode(), state: defaultWorkspace(kid) });
    family.state = { ...family.state, parentName: normalizedName };
    createdFamily = true;
    workspace = family.state;
  } else {
    const code = typeof familyCode === "string" ? familyCode.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{10}$/.test(code)) return res.status(400).json({ error: "Enter the 10-character family invite code from your parent." });
    family = await Family.findOne({ inviteCode: code });
    if (!family) return res.status(404).json({ error: "That family invite code was not found." });
    if (family.childUserId) return res.status(409).json({ error: "This family already has a child account linked." });
    workspace = {
      ...defaultWorkspace(normalizedName),
      ...family.state,
      child: {
        ...family.state.child,
        name: normalizedName,
        career: typeof career === "string" ? career.slice(0, 60) : family.state.child?.career || "Barista",
        avatar: typeof avatar === "string" ? avatar.slice(0, 32) : family.state.child?.avatar || "fox",
      },
      currency: ["UZS", "USD", "RUB"].includes(currency) ? currency : family.state.currency || "UZS",
    };
  }

  let user;
  try {
    user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role,
      displayName: normalizedName,
      familyId: family._id,
    });
    if (role === "parent") {
      family.state = workspace;
      await family.save();
    } else {
      const claimedFamily = await Family.findOneAndUpdate(
        { _id: family._id, childUserId: null },
        { $set: { childUserId: user._id, state: workspace } },
        { new: true },
      );
      if (!claimedFamily) {
        await User.findByIdAndDelete(user._id);
        return res.status(409).json({ error: "This family already has a child account linked." });
      }
      family = claimedFamily;
    }
  } catch (error) {
    if (createdFamily) await Family.findByIdAndDelete(family._id);
    if (user) await User.findByIdAndDelete(user._id);
    if (error?.code === 11000) return res.status(409).json({ error: "That email is already registered. Sign in instead." });
    throw error;
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);
  return res.status(201).json({ user: await publicUser(user), workspace: family.state, version: family.revision });
});

app.post("/api/auth/login", accountLimiter, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expectedRole = ["parent", "child", "admin"].includes(req.body?.expectedRole) ? req.body.expectedRole : null;
  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyPasswordHash);
  if (!user || !passwordMatches || user.status !== "active") return res.status(401).json({ error: "Email or password is incorrect." });
  if (expectedRole && user.role !== expectedRole) return res.status(403).json({ error: `This account belongs to the ${user.role} space. Choose that role to sign in.` });
  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);
  const family = user.familyId ? await Family.findById(user.familyId).select("state revision").lean() : null;
  return res.json({ user: await publicUser(user), workspace: family?.state || null, version: family?.revision ?? null });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const family = req.user.familyId ? await Family.findById(req.user.familyId).select("state revision").lean() : null;
  res.json({ user: await publicUser(req.user), workspace: family?.state || null, version: family?.revision ?? null });
});

app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("mvk.sid", { httpOnly: true, sameSite: "lax", secure: isProduction });
    res.status(204).end();
  });
});

app.get("/api/workspace", authRequired, async (req, res) => {
  if (!req.user.familyId || req.user.role === "admin") return res.status(403).json({ error: "Family workspace access is not available for this account." });
  const family = await Family.findById(req.user.familyId).select("state revision").lean();
  if (!family) return res.status(404).json({ error: "Family workspace not found." });
  res.json({ workspace: family.state, version: family.revision });
});

app.put("/api/workspace", authRequired, async (req, res) => {
  if (!req.user.familyId || req.user.role === "admin") return res.status(403).json({ error: "Family workspace access is not available for this account." });
  const version = req.body?.version;
  if (!Number.isSafeInteger(version) || version < 0) return res.status(400).json({ error: "Workspace version is invalid." });
  const current = await Family.findById(req.user.familyId).select("state revision").lean();
  if (!current) return res.status(404).json({ error: "Family workspace not found." });
  if (current.revision !== version) {
    return res.status(409).json({ error: "The family workspace changed on another device.", workspace: current.state, version: current.revision });
  }
  const state = normalizeWorkspace(req.body?.workspace, current.state, req.user.role);
  if (!state) return res.status(400).json({ error: "Workspace data is invalid or too large." });
  if (req.user.role === "parent") {
    const monthKey = new Date().toISOString().slice(0, 7);
    const existingIds = new Set((current.state?.tasks || []).map((task) => String(task.id)));
    const now = Date.now();
    const newTasks = state.tasks.filter((task) => !existingIds.has(String(task.id)));
    const invalidNewTask = newTasks.some((task) => {
      const created = task.createdAt ? new Date(task.createdAt) : new Date(Number(task.id));
      return !Number.isFinite(created.getTime())
        || created.toISOString().slice(0, 7) !== monthKey
        || created.getTime() > now + 60_000
        || task.status !== "active"
        || typeof task.name !== "string"
        || task.name.trim().length < 3
        || !Number.isSafeInteger(task.base)
        || task.base <= 0
        || !Number.isSafeInteger(task.tip)
        || task.tip < 0;
    });
    if (invalidNewTask) return res.status(400).json({ error: "New tasks must have valid rewards and be dated in the current month." });
    const monthCommitment = (current.state?.tasks || []).reduce((total, task) => {
      const created = task.createdAt ? new Date(task.createdAt) : new Date(Number(task.id));
      return Number.isFinite(created.getTime()) && created.toISOString().slice(0, 7) === monthKey
        ? total + (Number(task.base) || 0) + (Number(task.tip) || 0)
        : total;
    }, 0);
    const newCommitment = newTasks.reduce((total, task) => total + (Number(task.base) || 0) + (Number(task.tip) || 0), 0);
    if (newTasks.length && monthCommitment + newCommitment > state.monthlyBudget) {
      return res.status(400).json({ error: "The task would exceed this month’s budget. Increase the monthly limit before posting it." });
    }
  }
  const family = await Family.findOneAndUpdate(
    { _id: req.user.familyId, revision: version },
    { $set: { state }, $inc: { revision: 1 } },
    { new: true },
  ).select("state revision").lean();
  if (!family) {
    const current = await Family.findById(req.user.familyId).select("state revision").lean();
    if (!current) return res.status(404).json({ error: "Family workspace not found." });
    return res.status(409).json({ error: "The family workspace changed on another device.", workspace: current.state, version: current.revision });
  }
  res.json({ workspace: family.state, version: family.revision });
});

app.post("/api/vouchers/:id/request", authRequired, async (req, res) => {
  if (req.user.role !== "child" || !req.user.familyId) return res.status(403).json({ error: "Only the linked child can request a family voucher." });
  if (typeof req.params.id !== "string" || req.params.id.length > 100) return res.status(400).json({ error: "Invalid voucher ID." });
  const family = await Family.findById(req.user.familyId).select("state revision");
  if (!family) return res.status(404).json({ error: "Family workspace not found." });
  const state = family.state || {};
  const voucher = (state.vouchers || []).find((item) => item.id === req.params.id);
  if (!voucher || voucher.active === false) return res.status(404).json({ error: "That voucher is no longer available." });
  const punishment = state.punishment;
  if (punishment && ["voucherTimed", "voucherManual"].includes(punishment.type)
    && (punishment.until == null || Date.parse(punishment.until) > Date.now())) {
    return res.status(403).json({ error: "Voucher requests are temporarily paused by your parent." });
  }
  if ((state.voucherRequests || []).some((request) => request.voucherId === voucher.id && request.status === "pending")) {
    return res.status(409).json({ error: "You already have a request waiting for this voucher." });
  }
  const request = {
    id: randomUUID(),
    voucherId: voucher.id,
    name: voucher.name,
    price: voucher.price,
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
  };
  family.state = { ...state, voucherRequests: [...(state.voucherRequests || []), request].slice(-200) };
  const saved = await Family.findOneAndUpdate(
    { _id: family._id, revision: family.revision },
    { $set: { state: family.state }, $inc: { revision: 1 } },
    { new: true },
  ).select("state revision").lean();
  if (!saved) return res.status(409).json({ error: "The family workspace changed while submitting your request. Please try again." });
  res.status(201).json({ workspace: saved.state, version: saved.revision, request });
});

app.patch("/api/vouchers/requests/:id", authRequired, async (req, res) => {
  if (req.user.role !== "parent" || !req.user.familyId) return res.status(403).json({ error: "Only the parent can review voucher requests." });
  const decision = req.body?.decision;
  if (!["approve", "decline"].includes(decision)) return res.status(400).json({ error: "Choose approve or decline." });
  const family = await Family.findById(req.user.familyId).select("state revision");
  if (!family) return res.status(404).json({ error: "Family workspace not found." });
  const state = family.state || {};
  const requests = state.voucherRequests || [];
  const request = requests.find((item) => item.id === req.params.id && item.status === "pending");
  if (!request) return res.status(404).json({ error: "Pending voucher request not found." });
  const nextRequests = requests.map((item) => item.id === request.id
    ? { ...item, status: decision === "approve" ? "approved" : "declined", reviewedAt: new Date().toISOString() }
    : item);
  const wallet = { spendable: 0, savings: 0, taxPaid: 0, ...(state.wallet || {}) };
  if (decision === "approve" && wallet.spendable < request.price) {
    return res.status(409).json({ error: "The child no longer has enough spendable balance to pay for this voucher." });
  }
  family.state = {
    ...state,
    voucherRequests: nextRequests,
    wallet: decision === "approve" ? { ...wallet, spendable: wallet.spendable - request.price } : wallet,
  };
  const saved = await Family.findOneAndUpdate(
    { _id: family._id, revision: family.revision },
    { $set: { state: family.state }, $inc: { revision: 1 } },
    { new: true },
  ).select("state revision").lean();
  if (!saved) return res.status(409).json({ error: "The family workspace changed while reviewing the request. Refresh and try again." });
  res.json({ workspace: saved.state, version: saved.revision });
});

async function authorizeMessageRecipient(sender, recipientId) {
  if (!mongoose.isValidObjectId(recipientId) || String(sender._id) === String(recipientId)) return null;
  if (sender.role === "admin") {
    return User.findOne({ _id: recipientId, role: { $ne: "admin" } }).select("_id email role displayName status").lean();
  }
  if (!sender.familyId || !["parent", "child"].includes(sender.role)) return null;
  const recipientRole = sender.role === "parent" ? "child" : "parent";
  return User.findOne({ _id: recipientId, familyId: sender.familyId, role: recipientRole }).select("_id email role displayName status").lean();
}

app.get("/api/messages/contacts", authRequired, async (req, res) => {
  if (req.user.role === "admin") {
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const filter = { _id: { $ne: req.user._id }, role: { $ne: "admin" } };
    if (query) {
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { email: { $regex: safeQuery, $options: "i" } },
        { displayName: { $regex: safeQuery, $options: "i" } },
      ];
    }
    const contacts = await User.find(filter).sort({ displayName: 1 }).limit(200).select("email role displayName status").lean();
    return res.json({ contacts });
  }
  if (!req.user.familyId || !["parent", "child"].includes(req.user.role)) return res.json({ contacts: [] });
  const otherRole = req.user.role === "parent" ? "child" : "parent";
  const contact = await User.findOne({ familyId: req.user.familyId, role: otherRole }).select("email role displayName status").lean();
  res.json({ contacts: contact ? [contact] : [] });
});

app.get("/api/messages/:recipientId", authRequired, async (req, res) => {
  const recipient = await authorizeMessageRecipient(req.user, req.params.recipientId);
  if (!recipient) return res.status(403).json({ error: "You cannot message this account." });
  const messages = await Message.find({
    $or: [
      { fromUserId: req.user._id, toUserId: recipient._id },
      { fromUserId: recipient._id, toUserId: req.user._id },
    ],
  }).sort({ createdAt: -1 }).limit(100).lean();
  await Message.updateMany({ fromUserId: recipient._id, toUserId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ messages: messages.reverse(), contact: recipient });
});

app.post("/api/messages/:recipientId", authRequired, async (req, res) => {
  const recipient = await authorizeMessageRecipient(req.user, req.params.recipientId);
  if (!recipient) return res.status(403).json({ error: "You cannot message this account." });
  if (recipient.status !== "active") return res.status(403).json({ error: "This account is suspended and cannot receive messages." });
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 2000) return res.status(400).json({ error: "Messages must contain 1–2000 characters." });
  const message = await Message.create({ fromUserId: req.user._id, toUserId: recipient._id, content });
  res.status(201).json({
    message: {
      id: message.id,
      fromUserId: String(message.fromUserId),
      toUserId: String(message.toUserId),
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
    },
  });
});

app.get("/api/admin/overview", authRequired, adminRequired, async (_req, res) => {
  const [totalUsers, activeUsers, suspendedUsers, parentCount, childCount, familyCount, recentEvents] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    User.countDocuments({ role: { $ne: "admin" }, status: "active" }),
    User.countDocuments({ role: { $ne: "admin" }, status: "suspended" }),
    User.countDocuments({ role: "parent" }),
    User.countDocuments({ role: "child" }),
    Family.countDocuments(),
    AuditEvent.find().sort({ createdAt: -1 }).limit(10).select("-__v").lean(),
  ]);
  res.json({
    totalUsers,
    activeUsers,
    suspendedUsers,
    parentCount,
    childCount,
    familyCount,
    databaseConnected: mongoose.connection.readyState === 1,
    recentEvents,
  });
});

app.get("/api/admin/users", authRequired, adminRequired, async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const filter = { role: { $ne: "admin" } };
  const role = typeof req.query.role === "string" ? req.query.role : "all";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const page = /^\d+$/.test(req.query.page) ? Math.max(1, Number(req.query.page)) : 1;
  const pageSize = 25;
  if (!["all", "parent", "child"].includes(role)) return res.status(400).json({ error: "Choose all, parent or child as the role filter." });
  if (!["all", "active", "suspended"].includes(status)) return res.status(400).json({ error: "Choose all, active or suspended as the status filter." });
  if (role !== "all") filter.role = role;
  if (status !== "all") filter.status = status;
  if (query) {
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { email: { $regex: safeQuery, $options: "i" } },
      { displayName: { $regex: safeQuery, $options: "i" } },
    ];
  }
  const total = await User.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const users = await User.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .select("email role displayName status createdAt")
    .lean();
  res.json({ users, page: currentPage, pageSize, total, totalPages });
});

app.get("/api/admin/users/:id/details", authRequired, adminRequired, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid account ID." });
  const user = await User.findOne({ _id: req.params.id, role: { $ne: "admin" } })
    .select("email role displayName status createdAt familyId")
    .lean();
  if (!user) return res.status(404).json({ error: "Account not found." });
  if (!user.familyId) return res.json({ user, family: null });

  const [family, linkedAccounts] = await Promise.all([
    Family.findById(user.familyId).select("state revision createdAt updatedAt").lean(),
    User.find({ familyId: user.familyId, role: { $ne: "admin" }, _id: { $ne: user._id } })
      .select("email role displayName status")
      .lean(),
  ]);
  if (!family) return res.json({ user, family: null });
  const state = family.state || {};
  const tasks = Array.isArray(state.tasks) ? state.tasks.filter((task) => task && typeof task === "object" && !Array.isArray(task)) : [];
  const wallet = state.wallet || {};
  res.json({
    user,
    family: {
      id: String(user.familyId),
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      revision: family.revision,
      linkedAccounts,
      taskCounts: {
        total: tasks.length,
        active: tasks.filter((task) => task.status === "active").length,
        review: tasks.filter((task) => task.status === "review").length,
        paid: tasks.filter((task) => task.status === "paid").length,
      },
      virtualWallet: {
        spendable: Number(wallet.spendable) || 0,
        savings: Number(wallet.savings) || 0,
        taxPaid: Number(wallet.taxPaid) || 0,
      },
    },
  });
});

app.patch("/api/admin/users/:id/status", authRequired, adminRequired, async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "Choose active or suspended status." });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid account ID." });
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: { $ne: "admin" }, status: { $ne: status } },
    { $set: { status } },
    { new: true },
  ).select("email role displayName status createdAt").lean();
  if (!user) {
    const existing = await User.findOne({ _id: req.params.id, role: { $ne: "admin" } })
      .select("email role displayName status createdAt")
      .lean();
    if (!existing) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: existing });
  }
  await AuditEvent.create({ adminEmail: req.user.email, action: `account_${status}`, targetEmail: user.email });
  res.json({ user });
});

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "The request could not be completed. Check the server logs for details." });
});

async function start() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is required. Configure it in the server .env file.");
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  await mongoose.connect(MONGODB_URI);
  await Promise.all([User.init(), Family.init(), AuditEvent.init(), Message.init()]);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the admin account.");
  if (adminEmail && adminPassword) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error("ADMIN_EMAIL must be a valid email address.");
    if (adminPassword.length < 12 || Buffer.byteLength(adminPassword, "utf8") > 72) throw new Error("ADMIN_PASSWORD must be at least 12 characters and no more than 72 UTF-8 bytes.");
    const existingAccount = await User.findOne({ email: adminEmail });
    if (existingAccount && existingAccount.role !== "admin") throw new Error("ADMIN_EMAIL is already used by a non-admin account.");
    if (!existingAccount) {
      await User.create({
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "admin",
        displayName: "Administrator",
      });
      console.info(`Bootstrapped admin account: ${adminEmail}`);
    }
  } else {
    console.warn("Admin account not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD to enable the admin panel.");
  }

  app.listen(PORT, "0.0.0.0", () => console.info(`API listening on http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error("Unable to start the API:", error.message);
  process.exitCode = 1;
});
