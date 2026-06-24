import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  avatar: { type: String, default: null },

  // ── Stats ──────────────────────────────────────────────
  solvedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],

  solvedCount: {
    easy:   { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard:   { type: Number, default: 0 },
  },

  // ── Streak ─────────────────────────────────────────────
  streak: {
    current:    { type: Number, default: 0 },
    best:       { type: Number, default: 0 },
    lastSolvedDate: { type: Date, default: null },
  },

  // ── Contest ────────────────────────────────────────────
  contestRating: { type: Number, default: 1500 },
  globalRank:    { type: Number, default: null },

  // ── Activity heatmap ───────────────────────────────────
  // { "2025-05-24": 3 }  — date string → submissions count
  activityMap: {
    type: Map,
    of: Number,
    default: {},
  },

  // ── Badges ─────────────────────────────────────────────
  badges: [{
    label:    { type: String },
    icon:     { type: String },
    earnedAt: { type: Date, default: Date.now },
  }],

  // ── Premium ────────────────────────────────────────────
  isPremium:  { type: Boolean, default: false },
  premiumExpiry: { type: Date, default: null },

}, { timestamps: true });

// Virtual: total solved
userSchema.virtual("totalSolved").get(function () {
  return this.solvedCount.easy + this.solvedCount.medium + this.solvedCount.hard;
});

const User = mongoose.model("User", userSchema);
export default User;