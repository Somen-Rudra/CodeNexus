import mongoose from "mongoose";

/**
 * One document per (contest, user) pair.
 * Upserted on every accepted contest submission so the leaderboard
 * endpoint can do a single sorted find() instead of a heavy aggregation.
 *
 * Re-ranked by a background job (or on finalization) using:
 *   1. totalScore DESC
 *   2. totalPenalty ASC
 *   3. lastAcceptedAt ASC (tiebreaker)
 */
const contestLeaderboardSchema = new mongoose.Schema(
  {
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userName:      { type: String, required: true },
    ratingAtStart: { type: Number, required: true },

    // Aggregated scoring
    totalScore:   { type: Number, default: 0 },  // sum of scoreAwarded for first ACs
    totalPenalty: { type: Number, default: 0 },  // sum of penaltyContributed

    // Number of problems fully solved
    solvedCount: { type: Number, default: 0 },

    // Timestamp of the last accepted submission (tiebreaker)
    lastAcceptedAt: { type: Date, default: null },

    // Per-problem breakdown — keyed by problemSlug
    // { "two-sum": { attempts: 3, accepted: true, acceptedAt: Date, score: 100, penalty: 40 } }
    problemStatus: {
      type: Map,
      of: new mongoose.Schema(
        {
          attempts:   { type: Number, default: 0 },
          accepted:   { type: Boolean, default: false },
          acceptedAt: { type: Date, default: null },
          score:      { type: Number, default: 0 },
          penalty:    { type: Number, default: 0 }, // minutes
        },
        { _id: false },
      ),
      default: {},
    },

    // Filled in after finalization
    rank:        { type: Number, default: null },
    ratingDelta: { type: Number, default: null },
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

// One entry per (contest, user)
contestLeaderboardSchema.index({ contest: 1, user: 1 }, { unique: true });

// Sorted leaderboard fetch
contestLeaderboardSchema.index(
  { contest: 1, totalScore: -1, totalPenalty: 1, lastAcceptedAt: 1 },
);

/* =========================
   Model
========================= */

const ContestLeaderboard =
  mongoose.models.ContestLeaderboard ||
  mongoose.model("ContestLeaderboard", contestLeaderboardSchema);

export default ContestLeaderboard;