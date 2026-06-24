import mongoose from "mongoose";

/* =========================
   Constants
========================= */

export const VERDICT = Object.freeze({
  ACCEPTED:              "accepted",
  WRONG_ANSWER:          "wrong_answer",
  TIME_LIMIT_EXCEEDED:   "time_limit_exceeded",
  MEMORY_LIMIT_EXCEEDED: "memory_limit_exceeded",
  RUNTIME_ERROR:         "runtime_error",
  COMPILE_ERROR:         "compile_error",
  OUTPUT_LIMIT_EXCEEDED: "output_limit_exceeded",
  PENDING:               "pending",
  RUNNING:               "running",
});

export const ALLOWED_LANGUAGES = ["c", "cpp", "js", "py", "java", "kotlin", "swift"];

/* =========================
   Sub-schemas
========================= */

// One test-case result stored inside a submission
const testCaseResultSchema = new mongoose.Schema(
  {
    index:          { type: Number,  required: true },
    passed:         { type: Boolean, required: true },
    status:         { type: String,  enum: Object.values(VERDICT), required: true },

    // We store stdin / expected for run-mode (visible cases).
    // For submit-mode (hidden cases) we deliberately omit them.
    stdin:          { type: String,  default: null, select: false },
    expectedOutput: { type: String,  default: null, select: false },

    actualOutput:   { type: String,  default: "" },
    stderr:         { type: String,  default: "" },
    exitCode:       { type: Number,  default: null },
    timedOut:       { type: Boolean, default: false },
    outputExceeded: { type: Boolean, default: false },
    elapsed:        { type: Number,  default: 0 },   // ms
  },
  { _id: false },
);

/* =========================
   Submission Schema
========================= */

const submissionSchema = new mongoose.Schema(
  {
    // ── Who & what ────────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userName:{
      type:String,
      required:true
    },

    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },

    // Denormalised for fast listing without a join
    problemSlug:   { type: String, required: true, index: true },
    problemNumber: { type: Number, required: true },

    // ── Code ─────────────────────────────────────────────────────────────
    language: {
      type: String,
      enum: ALLOWED_LANGUAGES,
      required: true,
      index: true,
    },

    // Raw user code (what the editor sent — NOT the stitched code)
    code: {
      type: String,
      required: true,
      maxlength: 65536,
    },

    // ── Result ───────────────────────────────────────────────────────────
    verdict: {
      type: String,
      enum: Object.values(VERDICT),
      default: VERDICT.PENDING,
      index: true,
    },

    // Overall stats
    passedCount: { type: Number, default: 0 },
    totalCount:  { type: Number, default: 0 },
    totalElapsed: { type: Number, default: 0 },   // ms — wall-clock for entire batch

    // Per-test-case breakdown (hidden for submit-mode)
    testCaseResults: {
      type: [testCaseResultSchema],
      default: [],
      select: false,   // not returned by default; caller must .select("+testCaseResults")
    },

    // First failing test case (surfaced to the user for submit-mode)
    firstFailure: {
      index:          { type: Number, default: null },
      status:         { type: String, default: null },
      actualOutput:   { type: String, default: null },
      expectedOutput: { type: String, default: null, select: false },
      stderr:         { type: String, default: null },
      elapsed:        { type: Number, default: null },
    },

    // ── Mode ─────────────────────────────────────────────────────────────
    // "run"    → ran against visible test cases only, NOT persisted as an
    //            official attempt (isOfficial = false)
    // "submit" → ran against hidden test cases, counts toward the user's
    //            acceptance record (isOfficial = true)
    mode: {
      type: String,
      enum: ["run", "submit"],
      required: true,
      index: true,
    },

    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,

    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* =========================
   Compound Indexes
========================= */

// Fast "my submissions for this problem" queries
submissionSchema.index({ user: 1, problem: 1, createdAt: -1 });

// Leaderboard / stats queries
submissionSchema.index({ problem: 1, verdict: 1, isOfficial: 1 });

// Global submission feed
submissionSchema.index({ createdAt: -1 });

/* =========================
   Model
========================= */

const Submission =
  mongoose.models.Submission || mongoose.model("Submission", submissionSchema);

export default Submission;