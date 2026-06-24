import mongoose from "mongoose";

/**
 * Feedback submitted after an interview session ends.
 * Both parties can submit feedback independently.
 * Each (session, author) pair produces exactly one document.
 */
const interviewFeedbackSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      index: true,
    },

    // Who wrote this feedback
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who this feedback is about
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Role of the SUBJECT during the session
    subjectRole: {
      type: String,
      enum: ["interviewer", "interviewee"],
      required: true,
    },

    // ── Ratings (1–5) ─────────────────────────────────────────────────────
    ratings: {
      // For interviewee
      problemSolving:   { type: Number, min: 1, max: 5, default: null },
      codeQuality:      { type: Number, min: 1, max: 5, default: null },
      communication:    { type: Number, min: 1, max: 5, default: null },
      timeManagement:   { type: Number, min: 1, max: 5, default: null },

      // For interviewer
      questionClarity:  { type: Number, min: 1, max: 5, default: null },
      helpfulness:      { type: Number, min: 1, max: 5, default: null },
      professionalism:  { type: Number, min: 1, max: 5, default: null },

      // Overall
      overall:          { type: Number, min: 1, max: 5, required: true },
    },

    // ── Text feedback ─────────────────────────────────────────────────────
    strengths:        { type: String, default: null, maxlength: 2000 },
    improvements:     { type: String, default: null, maxlength: 2000 },
    additionalNotes:  { type: String, default: null, maxlength: 1000 },

    // Whether the subject can see this feedback
    isVisible: { type: Boolean, default: true },

    // Whether the author wants to be anonymous (subject sees "Anonymous")
    isAnonymous: { type: Boolean, default: false },
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

// One feedback per (session, author) — can't submit twice
interviewFeedbackSchema.index({ session: 1, author: 1 }, { unique: true });

// All feedback about a user
interviewFeedbackSchema.index({ subject: 1, createdAt: -1 });

/* =========================
   Model
========================= */

const InterviewFeedback =
  mongoose.models.InterviewFeedback ||
  mongoose.model("InterviewFeedback", interviewFeedbackSchema);

export default InterviewFeedback;