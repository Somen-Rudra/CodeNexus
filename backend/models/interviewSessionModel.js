import mongoose from "mongoose";

/* =========================
   Constants
========================= */

export const SESSION_STATUS = Object.freeze({
  SCHEDULED: "scheduled",  // booked, not yet started
  WAITING:   "waiting",    // waiting for both parties to join
  LIVE:      "live",       // in progress
  COMPLETED: "completed",  // ended normally
  CANCELLED: "cancelled",  // cancelled before or during
  NO_SHOW:   "no_show",    // one or both parties didn't join
});

export const SESSION_TYPE = Object.freeze({
  PEER:         "peer",         // user ↔ user (random match or friend)
  SELF:         "self",         // solo timed mock (no second person)
  COMPANY_MOCK: "company_mock", // platform provides an interviewer
});

export const INTERVIEW_ROLE = Object.freeze({
  INTERVIEWER: "interviewer",
  INTERVIEWEE: "interviewee",
});

/* =========================
   Schema
========================= */

const interviewSessionSchema = new mongoose.Schema(
  {
    // ── Type & Status ────────────────────────────────────────────────────
    type: {
      type: String,
      enum: Object.values(SESSION_TYPE),
      default: SESSION_TYPE.PEER,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
      index: true,
    },

    // ── Participants ──────────────────────────────────────────────────────
    // For PEER / COMPANY_MOCK: two participants
    // For SELF: only interviewee
    interviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ── Scheduling ────────────────────────────────────────────────────────
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 180,
    },

    // Actual start / end (set at runtime)
    startedAt:  { type: Date, default: null },
    endedAt:    { type: Date, default: null },

    // ── Problems ──────────────────────────────────────────────────────────
    // 1–3 problems selected for the session
    problems: [
      {
        problem:       { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
        slug:          { type: String },
        title:         { type: String },
        difficulty:    { type: String },
        order:         { type: Number },
      },
    ],

    // ── Room ─────────────────────────────────────────────────────────────
    // Video / collaboration room ID (e.g. from a WebRTC / LiveKit room)
    roomId:    { type: String, default: null, index: true },
    roomToken: { type: String, default: null, select: false },

    // Collaborative code (last saved snapshot per language)
    sharedCode: {
      type: Map,
      of: String, // language → code
      default: {},
      select: false,
    },

    // ── Notes (interviewer's private notes during session) ────────────────
    interviewerNotes: {
      type: String,
      default: null,
      select: false,
    },

    // ── Topic focus ───────────────────────────────────────────────────────
    topics: [{ type: String, trim: true, lowercase: true }],

    // ── Match metadata (for random PEER matching) ─────────────────────────
    matchedFromQueue: { type: Boolean, default: false },

    // ── Tags / notes visible to both parties ─────────────────────────────
    title: { type: String, default: null, trim: true },
    notes: { type: String, default: null },
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

interviewSessionSchema.virtual("actualDurationMinutes").get(function () {
  if (!this.startedAt || !this.endedAt) return null;
  return Math.round((this.endedAt - this.startedAt) / 60000);
});

/* =========================
   Indexes
========================= */

interviewSessionSchema.index({ interviewee: 1, scheduledAt: -1 });
interviewSessionSchema.index({ interviewer: 1, scheduledAt: -1 });
interviewSessionSchema.index({ status: 1, scheduledAt: 1 });

/* =========================
   Model
========================= */

const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model("InterviewSession", interviewSessionSchema);

export default InterviewSession;