import mongoose from "mongoose";
import { VERDICT, ALLOWED_LANGUAGES } from "./submissionModel.js";

/**
 * A submission made during a contest.
 * Separate from the general Submission model so contest scoring
 * (penalty, elapsed time, score) doesn't pollute the global feed.
 *
 * Linked to a ContestRegistration so the leaderboard can aggregate
 * per-user scores efficiently.
 */
const contestSubmissionSchema = new mongoose.Schema(
  {
    // ── Contest context ───────────────────────────────────────────────
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
      index: true,
    },

    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContestRegistration",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userName: { type: String, required: true },

    // ── Problem context ───────────────────────────────────────────────
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },

    problemSlug:   { type: String, required: true, index: true },
    problemNumber: { type: Number, required: true },

    // ── Code ─────────────────────────────────────────────────────────
    language: {
      type: String,
      enum: ALLOWED_LANGUAGES,
      required: true,
    },

    code: {
      type: String,
      required: true,
      maxlength: 65536,
      select: false,
    },

    // ── Verdict ───────────────────────────────────────────────────────
    verdict: {
      type: String,
      enum: Object.values(VERDICT),
      default: VERDICT.PENDING,
      index: true,
    },

    passedCount: { type: Number, default: 0 },
    totalCount:  { type: Number, default: 0 },
    totalElapsed: { type: Number, default: 0 }, // ms judge time

    firstFailure: {
      index:        { type: Number, default: null },
      status:       { type: String, default: null },
      actualOutput: { type: String, default: null },
      stderr:       { type: String, default: null },
      elapsed:      { type: Number, default: null },
    },

    // ── Scoring ───────────────────────────────────────────────────────
    // Minutes elapsed from contest start when this submission was made
    // (used for ICPC penalty calculation)
    minutesFromStart: { type: Number, required: true, min: 0 },

    // Score awarded by this submission (0 if WA/TLE/etc.)
    scoreAwarded: { type: Number, default: 0 },

    // Whether this is the first Accepted submission for this problem by this user
    isFirstAccepted: { type: Boolean, default: false },

    // Penalty minutes contributed (0 for AC, penaltyMinutes * priorWAs for first AC)
    penaltyContributed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* =========================
   Indexes
========================= */

// Leaderboard: all accepted submissions for a contest, sorted by time
contestSubmissionSchema.index({ contest: 1, verdict: 1, minutesFromStart: 1 });

// User's submissions for a specific problem in a contest
contestSubmissionSchema.index({ contest: 1, user: 1, problem: 1, createdAt: -1 });

// Per-registration aggregation
contestSubmissionSchema.index({ registration: 1, problem: 1 });

/* =========================
   Model
========================= */

const ContestSubmission =
  mongoose.models.ContestSubmission ||
  mongoose.model("ContestSubmission", contestSubmissionSchema);

export default ContestSubmission;