import mongoose from "mongoose";

/**
 * One document per (user, contest) pair.
 * Created when a user registers; deleted if they unregister before start.
 */
const contestRegistrationSchema = new mongoose.Schema(
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
      index: true,
    },

    // Denormalised for leaderboard queries without a join
    userName: { type: String, required: true },

    // Rating snapshot at time of registration (needed for delta calculation)
    ratingAtStart: { type: Number, required: true },

    // Filled in after contest is finalized
    finalRank:   { type: Number, default: null },
    ratingDelta: { type: Number, default: null }, // + or -
    ratingAfter: { type: Number, default: null },

    // Reward eligibility (set during finalization)
    rewardEligible: { type: Boolean, default: false },
    rewardNote:     { type: String, default: null }, // e.g. "Eligible for live interview"
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

// Each user can register once per contest
contestRegistrationSchema.index({ contest: 1, user: 1 }, { unique: true });

// Leaderboard sorted by rank
contestRegistrationSchema.index({ contest: 1, finalRank: 1 });

/* =========================
   Model
========================= */

const ContestRegistration =
  mongoose.models.ContestRegistration ||
  mongoose.model("ContestRegistration", contestRegistrationSchema);

export default ContestRegistration;