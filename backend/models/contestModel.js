import mongoose from "mongoose";

/* =========================
   Constants
========================= */

export const CONTEST_STATUS = Object.freeze({
  DRAFT:     "draft",      // admin created, not visible
  UPCOMING:  "upcoming",   // visible, registration open
  LIVE:      "live",       // currently running
  ENDED:     "ended",      // finished, ratings not yet updated
  FINALIZED: "finalized",  // ratings updated, leaderboard frozen
});

export const CONTEST_TYPE = Object.freeze({
  NORMAL:  "normal",   // platform-run, rating-affecting
  COMPANY: "company",  // sponsored by a company, may have rewards
  PRACTICE: "practice", // unrated, open-ended
});

export const REWARD_TYPE = Object.freeze({
  NONE:      "none",
  MONEY:     "money",       // cash prize
  HIRING:    "hiring",      // job offer / fast-track
  INTERVIEW: "interview",   // live interview with company
  MIXED:     "mixed",       // multiple reward types
});

/* =========================
   Sub-schemas
========================= */

const rewardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(REWARD_TYPE),
      default: REWARD_TYPE.NONE,
    },

    // Cash prizes — index = rank (0-based), value = USD cents to avoid floats
    prizeTiers: [
      {
        rank:        { type: Number, required: true }, // 1st, 2nd, 3rd ...
        amountCents: { type: Number, required: true, min: 0 },
        currency:    { type: String, default: "USD" },
        label:       { type: String }, // e.g. "$500 cash"
      },
    ],

    // Hiring reward details
    hiringDetails: {
      positions:   [{ type: String }],  // e.g. ["SDE-1", "SDE-2"]
      topNEligible: { type: Number, default: 10 }, // top N qualify
      description: { type: String },
    },

    // Live interview with company
    interviewDetails: {
      topNEligible: { type: Number, default: 5 },
      scheduledWithin: { type: Number, default: 7 }, // days after contest ends
      description: { type: String },
    },

    // Generic description for mixed / custom rewards
    description: { type: String },
  },
  { _id: false },
);

const contestProblemSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    slug:          { type: String, required: true },
    problemNumber: { type: Number, required: true },
    title:         { type: String, required: true },
    difficulty:    { type: String, enum: ["easy", "medium", "hard"], required: true },

    // Points awarded for a full-correct solve (ICPC-style scoring uses this)
    maxScore: { type: Number, default: 100, min: 1 },

    // Order in which problem appears on the contest page (A, B, C … or 1, 2, 3)
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/* =========================
   Contest Schema
========================= */

const contestSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    // ── Type & Status ────────────────────────────────────────────────────
    type: {
      type: String,
      enum: Object.values(CONTEST_TYPE),
      default: CONTEST_TYPE.NORMAL,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(CONTEST_STATUS),
      default: CONTEST_STATUS.DRAFT,
      index: true,
    },

    // ── Timing ───────────────────────────────────────────────────────────
    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    // Duration in minutes (denormalised for quick reads)
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    // ── Problems ─────────────────────────────────────────────────────────
    problems: {
      type: [contestProblemSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A contest can have at most 10 problems.",
      },
    },

    // ── Participation ─────────────────────────────────────────────────────
    registrationOpen: { type: Boolean, default: true },
    maxParticipants:  { type: Number, default: null }, // null = unlimited
    registeredCount:  { type: Number, default: 0 },

    // ── Rating ────────────────────────────────────────────────────────────
    isRated: { type: Boolean, default: true },

    // ── Company sponsor (for COMPANY type) ────────────────────────────────
    company: {
      name:    { type: String, default: null },
      logoUrl: { type: String, default: null },
      website: { type: String, default: null },
    },

    // ── Rewards ──────────────────────────────────────────────────────────
    reward: {
      type: rewardSchema,
      default: () => ({ type: REWARD_TYPE.NONE }),
    },

    // ── Scoring config ────────────────────────────────────────────────────
    // "icpc"  → penalty-based (wrong submissions add time penalty)
    // "score" → raw score only, faster submission wins ties
    scoringMode: {
      type: String,
      enum: ["icpc", "score"],
      default: "icpc",
    },

    penaltyMinutes: { type: Number, default: 20 }, // per wrong submission (icpc)

    // ── Visibility ────────────────────────────────────────────────────────
    isPublished: { type: Boolean, default: false },

    // ── Authored by ───────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Editorial ─────────────────────────────────────────────────────────
    editorialUrl: { type: String, default: null },
    editorialPublishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* =========================
   Virtuals
========================= */

contestSchema.virtual("isLive").get(function () {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

contestSchema.virtual("hasEnded").get(function () {
  return new Date() > this.endTime;
});

contestSchema.virtual("timeRemainingMs").get(function () {
  return Math.max(0, this.endTime - new Date());
});

/* =========================
   Indexes
========================= */

contestSchema.index({ startTime: 1, status: 1 });
contestSchema.index({ type: 1, status: 1 });

/* =========================
   Hooks
========================= */

// Auto-generate slug from title if not set
contestSchema.pre("validate", async function () {
  if (this.slug || !this.isModified("title")) return;

  const base = this.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  let slug = base;
  let i = 1;
  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${i++}`;
  }
  this.slug = slug;
});

// Compute durationMinutes from startTime/endTime
contestSchema.pre("save", function () {
  if (this.startTime && this.endTime) {
    this.durationMinutes = Math.round(
      (this.endTime - this.startTime) / 60000,
    );
  }
});

/* =========================
   Model
========================= */

const Contest =
  mongoose.models.Contest || mongoose.model("Contest", contestSchema);

export default Contest;