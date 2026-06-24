import axios from "axios";
import Contest, {
  CONTEST_STATUS,
  CONTEST_TYPE,
} from "../models/contestModel.js";
import ContestRegistration from "../models/contestRegistrationModel.js";
import ContestSubmission from "../models/contestSubmissionModel.js";
import ContestLeaderboard from "../models/contestLeaderboardModel.js";
import Problem from "../models/problemModel.js";
import User from "../models/userModel.js";
import TryCatch from "../middlewares/TryCatch.js";
import { getRedis } from "../config/db.js";
import { VERDICT, ALLOWED_LANGUAGES } from "../models/submissionModel.js";

/* =========================
   Config
========================= */

const JUDGE_URL         = process.env.JUDGE_URL         || "http://localhost:3000";
const JUDGE_TIMEOUT_MS  = parseInt(process.env.JUDGE_TIMEOUT_MS || "60000", 10);

const LANGUAGE_MAP = {
  js: "javascript", py: "python", c: "c",
  cpp: "cpp", java: "java", kotlin: "kotlin", swift: "swift",
};

/* =========================
   Internal Helpers
========================= */

/** Stitch header + user code + driver (mirrors submissionController) */
function stitchCode(langTemplate, userCode) {
  const { header = "", driver = "" } = langTemplate;
  return [header, userCode, driver].filter((p) => p?.trim()).join("\n\n");
}

/** POST to judge service */
async function callJudge(language, stitchedCode, testCases) {
  const judgeLanguage = LANGUAGE_MAP[language];
  if (!judgeLanguage) throw new Error(`No judge mapping for: ${language}`);

  const { data } = await axios.post(
    `${JUDGE_URL}/run-tests`,
    { language: judgeLanguage, code: stitchedCode, testCases },
    { timeout: JUDGE_TIMEOUT_MS },
  );
  return data;
}

/** Derive overall verdict from per-test-case results */
function deriveVerdict(results) {
  const priority = [
    VERDICT.COMPILE_ERROR,
    VERDICT.TIME_LIMIT_EXCEEDED,
    VERDICT.RUNTIME_ERROR,
    VERDICT.OUTPUT_LIMIT_EXCEEDED,
    VERDICT.WRONG_ANSWER,
  ];
  for (const v of priority) {
    if (results.some((r) => r.status === v)) return v;
  }
  return VERDICT.ACCEPTED;
}

/** First failing test case without exposing expected output */
function buildFirstFailure(results) {
  const f = results.find((r) => !r.passed);
  if (!f) return null;
  return {
    index: f.index, status: f.status,
    actualOutput: f.actualOutput, stderr: f.stderr, elapsed: f.elapsed,
  };
}

/**
 * Upsert leaderboard entry after a contest submission.
 * Called fire-and-forget style — errors are logged, not thrown.
 */
async function updateLeaderboard(contest, registration, submission, problem) {
  try {
    const isAC      = submission.verdict === VERDICT.ACCEPTED;
    const slug      = submission.problemSlug;
    const redis     = getRedis();
    const cacheKey  = `contest-lb:${contest._id}`;

    // Load or create leaderboard entry
    let entry = await ContestLeaderboard.findOne({
      contest: contest._id,
      user:    submission.user,
    });

    if (!entry) {
      entry = new ContestLeaderboard({
        contest:       contest._id,
        user:          submission.user,
        userName:      submission.userName,
        ratingAtStart: registration.ratingAtStart,
      });
    }

    // Get (or init) per-problem status
    let ps = entry.problemStatus.get(slug) ?? {
      attempts: 0, accepted: false, acceptedAt: null, score: 0, penalty: 0,
    };

    // Count this attempt regardless
    ps.attempts += 1;

    if (isAC && !ps.accepted) {
      // First accepted submission for this problem
      ps.accepted   = true;
      ps.acceptedAt = submission.createdAt;

      if (contest.scoringMode === "icpc") {
        // ICPC: score = maxScore (binary), penalty = time + wrong-attempt penalty
        const maxScore        = problem.maxScore ?? 100;
        const wrongAttempts   = ps.attempts - 1; // excluding this AC
        const timePenalty     = submission.minutesFromStart;
        const wrongPenalty    = wrongAttempts * (contest.penaltyMinutes ?? 20);

        ps.score   = maxScore;
        ps.penalty = timePenalty + wrongPenalty;
      } else {
        // Score mode: partial credit possible (simplification: binary here too)
        ps.score   = problem.maxScore ?? 100;
        ps.penalty = 0;
      }

      entry.solvedCount    += 1;
      entry.totalScore     += ps.score;
      entry.totalPenalty   += ps.penalty;
      entry.lastAcceptedAt  = submission.createdAt;

      // Mark the submission itself
      submission.isFirstAccepted      = true;
      submission.scoreAwarded         = ps.score;
      submission.penaltyContributed   = ps.penalty;
      await submission.save();
    }

    entry.problemStatus.set(slug, ps);
    await entry.save();

    // Bust leaderboard cache so next read reflects this submission
    await redis.del(cacheKey);
  } catch (err) {
    console.error("[updateLeaderboard]", err.message);
  }
}

/**
 * Codeforces-style rating algorithm (Elo-like approximation).
 * Returns an array of { userId, delta } objects.
 *
 * This is a simplified seed/expected-rank formula.
 * Replace with your own algorithm as needed.
 */
function computeRatingDeltas(leaderboardEntries) {
  const n = leaderboardEntries.length;
  if (n === 0) return [];

  // seed[i] = expected rank based on pre-contest ratings
  const seeds = leaderboardEntries.map((e, i) => {
    let seed = 1;
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        seed += 1 / (1 + Math.pow(10, (e.ratingAtStart - leaderboardEntries[j].ratingAtStart) / 400));
      }
    }
    return seed;
  });

  return leaderboardEntries.map((e, i) => {
    const actualRank = i + 1; // already sorted
    const seed       = seeds[i];
    // Optimal rank = geometric mean of seed and actual rank
    const optimal    = Math.sqrt(seed * actualRank);
    // Rating of a user whose expected rank equals optimal
    const ratingForOptimal = e.ratingAtStart + 400 * Math.log10((n - optimal + 1) / optimal);
    // Delta capped at ±500 and rounded
    const delta = Math.max(-500, Math.min(500, Math.round((ratingForOptimal - e.ratingAtStart) / 2)));
    return { userId: e.user, delta };
  });
}

/* =========================
   Status Sync Helper
   (called before returning a contest to keep status fresh)
========================= */

async function syncContestStatus(contest) {
  const now    = new Date();
  let updated  = false;

  if (
    contest.status === CONTEST_STATUS.UPCOMING &&
    now >= contest.startTime
  ) {
    contest.status = CONTEST_STATUS.LIVE;
    updated = true;
  }

  if (
    contest.status === CONTEST_STATUS.LIVE &&
    now > contest.endTime
  ) {
    contest.status = CONTEST_STATUS.ENDED;
    updated = true;
  }

  if (updated) await contest.save();
  return contest;
}

/* =========================
   PUBLIC — GET /contests
========================= */

export const listContests = TryCatch(async (req, res) => {
  const page   = Math.max(parseInt(req.query.page  || "1",  10), 1);
  const limit  = Math.min(parseInt(req.query.limit || "20", 10), 100);

  const filter = { isPublished: true };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type)   filter.type   = req.query.type;

  const [contests, total] = await Promise.all([
    Contest.find(filter)
      .select("-problems.problem") // keep lightweight
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Contest.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: contests,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    },
  });
});

/* =========================
   PUBLIC — GET /contests/:slug
========================= */

export const getContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).populate("problems.problem", "title slug difficulty acceptancePercentage");

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  // Auto-advance status (upcoming → live → ended)
  await syncContestStatus(contest);

  // Hide problem details before contest starts
  const now = new Date();
  const problemsVisible = now >= contest.startTime;

  const data = contest.toObject();
  if (!problemsVisible) {
    data.problems = data.problems.map(({ order, maxScore }) => ({ order, maxScore }));
  }

  // Attach registration status for authenticated users
  if (req.user) {
    data.isRegistered = !!(await ContestRegistration.exists({
      contest: contest._id,
      user: req.user._id,
    }));
  }

  return res.status(200).json({ success: true, data });
});

/* =========================
   GET /contests/:slug/timer
   Lightweight endpoint polled by the frontend countdown
========================= */

export const getContestTimer = TryCatch(async (req, res) => {
  const redis    = getRedis();
  const cacheKey = `contest-timer:${req.params.slug}`;

  // Cache for 10 s to absorb polling spikes
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.status(200).json(JSON.parse(cached));

  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).select("slug status startTime endTime durationMinutes").lean();

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  const now              = new Date();
  const serverTimeMs     = now.getTime();
  const startsInMs       = Math.max(0, contest.startTime - now);
  const endsInMs         = Math.max(0, contest.endTime   - now);
  const elapsedMs        = Math.max(0, now - contest.startTime);
  const durationMs       = contest.durationMinutes * 60_000;
  const progressPercent  = durationMs > 0
    ? Math.min(100, (elapsedMs / durationMs) * 100)
    : 0;

  const payload = {
    success: true,
    slug:            contest.slug,
    status:          contest.status,
    serverTimeMs,
    startTime:       contest.startTime,
    endTime:         contest.endTime,
    startsInMs,
    endsInMs,
    elapsedMs,
    durationMs,
    progressPercent: +progressPercent.toFixed(2),
  };

  await redis.set(cacheKey, JSON.stringify(payload), { EX: 10 }).catch(() => {});
  return res.status(200).json(payload);
});

/* =========================
   POST /contests/:slug/register
========================= */

export const registerForContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  });

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  await syncContestStatus(contest);

  if (!contest.registrationOpen) {
    return res.status(400).json({ success: false, message: "Registration is closed." });
  }
  if (contest.status === CONTEST_STATUS.ENDED || contest.status === CONTEST_STATUS.FINALIZED) {
    return res.status(400).json({ success: false, message: "Contest has already ended." });
  }
  if (contest.maxParticipants && contest.registeredCount >= contest.maxParticipants) {
    return res.status(400).json({ success: false, message: "Contest is full." });
  }

  const user = await User.findById(req.user._id).select("contestRating").lean();

  const existing = await ContestRegistration.findOne({
    contest: contest._id,
    user:    req.user._id,
  });
  if (existing) {
    return res.status(409).json({ success: false, message: "Already registered." });
  }

  const registration = await ContestRegistration.create({
    contest:       contest._id,
    user:          req.user._id,
    userName:      req.user.name,
    ratingAtStart: user.contestRating ?? 1500,
  });

  await Contest.findByIdAndUpdate(contest._id, { $inc: { registeredCount: 1 } });

  return res.status(201).json({ success: true, data: registration });
});

/* =========================
   DELETE /contests/:slug/register
   (Unregister — only allowed before contest starts)
========================= */

export const unregisterFromContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).select("_id startTime status registeredCount");

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  if (new Date() >= contest.startTime) {
    return res.status(400).json({
      success: false,
      message: "Cannot unregister after contest has started.",
    });
  }

  const deleted = await ContestRegistration.findOneAndDelete({
    contest: contest._id,
    user:    req.user._id,
  });

  if (!deleted) {
    return res.status(404).json({ success: false, message: "Registration not found." });
  }

  await Contest.findByIdAndUpdate(contest._id, { $inc: { registeredCount: -1 } });

  return res.status(200).json({ success: true, message: "Unregistered successfully." });
});

/* =========================
   POST /contests/:slug/submit
========================= */

export const contestSubmit = TryCatch(async (req, res) => {
  const { slug } = req.params;
  const { language, code, problemSlug } = req.body;

  /* ── Basic validation ─────────────────────────────────────────────── */
  if (!language || !ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ success: false, message: "Unsupported language." });
  }
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ success: false, message: "Code must be non-empty." });
  }
  if (code.length > 65536) {
    return res.status(400).json({ success: false, message: "Code exceeds 64 KB limit." });
  }
  if (!problemSlug) {
    return res.status(400).json({ success: false, message: "problemSlug is required." });
  }

  /* ── Fetch & validate contest ────────────────────────────────────── */
  const contest = await Contest.findOne({ slug, isPublished: true });
  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  await syncContestStatus(contest);

  if (contest.status !== CONTEST_STATUS.LIVE) {
    return res.status(400).json({
      success: false,
      message: contest.status === CONTEST_STATUS.UPCOMING
        ? "Contest has not started yet."
        : "Contest has ended.",
    });
  }

  /* ── Verify registration ─────────────────────────────────────────── */
  const registration = await ContestRegistration.findOne({
    contest: contest._id,
    user:    req.user._id,
  });
  if (!registration) {
    return res.status(403).json({ success: false, message: "You are not registered for this contest." });
  }

  /* ── Verify problem is part of contest ───────────────────────────── */
  const contestProblem = contest.problems.find((p) => p.slug === problemSlug);
  if (!contestProblem) {
    return res.status(404).json({ success: false, message: "Problem not found in this contest." });
  }

  /* ── Check if already solved ─────────────────────────────────────── */
  const alreadySolved = await ContestLeaderboard.findOne({
    contest: contest._id,
    user:    req.user._id,
  }).then((lb) => lb?.problemStatus?.get(problemSlug)?.accepted ?? false);

  if (alreadySolved) {
    return res.status(400).json({
      success: false,
      message: "You have already solved this problem in this contest.",
    });
  }

  /* ── Fetch problem with hidden test cases ────────────────────────── */
  const problem = await Problem.findById(contestProblem.problem)
    .select("+hiddenTestCases languages timeLimit memoryLimit _id problemNumber")
    .lean();

  if (!problem) {
    return res.status(404).json({ success: false, message: "Problem data not found." });
  }

  const langTemplate = problem.languages?.[language];
  if (!langTemplate) {
    return res.status(400).json({
      success: false,
      message: `Language "${language}" not available for this problem.`,
    });
  }

  if (!problem.hiddenTestCases?.length) {
    return res.status(422).json({ success: false, message: "No test cases configured for this problem." });
  }

  /* ── Judge ───────────────────────────────────────────────────────── */
  const stitchedCode  = stitchCode(langTemplate, code);
  const judgeResponse = await callJudge(language, stitchedCode, problem.hiddenTestCases);

  const results       = judgeResponse.results || [];
  const verdict       = deriveVerdict(results);
  const firstFail     = buildFirstFailure(results);
  const passedCount   = judgeResponse.passed ?? 0;
  const totalCount    = judgeResponse.total  ?? results.length;

  /* ── Elapsed minutes since contest start (for scoring) ───────────── */
  const minutesFromStart = Math.floor((Date.now() - contest.startTime) / 60_000);

  /* ── Persist contest submission ──────────────────────────────────── */
  const submission = await ContestSubmission.create({
    contest:        contest._id,
    registration:   registration._id,
    user:           req.user._id,
    userName:       req.user.name,
    problem:        problem._id,
    problemSlug,
    problemNumber:  problem.problemNumber,
    language,
    code,
    verdict,
    passedCount,
    totalCount,
    totalElapsed:   judgeResponse.totalElapsed ?? 0,
    firstFailure:   firstFail,
    minutesFromStart,
  });

  /* ── Update acceptance stats on Problem (fire-and-forget) ────────── */
  Problem.findByIdAndUpdate(problem._id, {
    $inc: {
      "acceptanceRate.totalSubs":    1,
      "acceptanceRate.acceptedSubs": verdict === VERDICT.ACCEPTED ? 1 : 0,
    },
  }).exec().catch((e) => console.error("[contestSubmit] acceptance update:", e));

  /* ── Update leaderboard (fire-and-forget) ────────────────────────── */
  updateLeaderboard(contest, registration, submission, contestProblem);

  /* ── Response ────────────────────────────────────────────────────── */
  return res.status(200).json({
    success: true,
    verdict,
    passed:       passedCount,
    failed:       totalCount - passedCount,
    total:        totalCount,
    totalElapsed: judgeResponse.totalElapsed ?? 0,
    firstFailure: firstFail,
    minutesFromStart,
  });
});

/* =========================
   GET /contests/:slug/leaderboard
========================= */

export const getLeaderboard = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).select("_id status startTime").lean();

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  // Leaderboard is hidden until contest starts
  if (new Date() < contest.startTime && contest.status === CONTEST_STATUS.UPCOMING) {
    return res.status(403).json({
      success: false,
      message: "Leaderboard is not available until the contest starts.",
    });
  }

  const redis    = getRedis();
  const cacheKey = `contest-lb:${contest._id}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.status(200).json(JSON.parse(cached));

  const page  = Math.max(parseInt(req.query.page  || "1",  10), 1);
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);

  const [entries, total] = await Promise.all([
    ContestLeaderboard.find({ contest: contest._id })
      .sort({ totalScore: -1, totalPenalty: 1, lastAcceptedAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContestLeaderboard.countDocuments({ contest: contest._id }),
  ]);

  // Add live rank numbers to this page
  const ranked = entries.map((e, i) => ({
    ...e,
    rank: (page - 1) * limit + i + 1,
  }));

  const payload = {
    success: true,
    data: ranked,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    },
  };

  // Cache live leaderboard for 15 s; longer for ended/finalized
  const ttl = [CONTEST_STATUS.ENDED, CONTEST_STATUS.FINALIZED].includes(contest.status)
    ? 300
    : 15;
  await redis.set(cacheKey, JSON.stringify(payload), { EX: ttl }).catch(() => {});

  return res.status(200).json(payload);
});

/* =========================
   GET /contests/:slug/my-status
   Returns current user's leaderboard entry + per-problem attempt counts
========================= */

export const getMyContestStatus = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).select("_id status startTime problems").lean();

  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  const [registration, leaderboardEntry] = await Promise.all([
    ContestRegistration.findOne({ contest: contest._id, user: req.user._id }).lean(),
    ContestLeaderboard.findOne({ contest: contest._id, user: req.user._id }).lean(),
  ]);

  if (!registration) {
    return res.status(403).json({ success: false, message: "You are not registered for this contest." });
  }

  // Recent submissions for this user in this contest
  const recentSubmissions = await ContestSubmission.find({
    contest: contest._id,
    user:    req.user._id,
  })
    .select("-code")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.status(200).json({
    success: true,
    data: {
      registration,
      leaderboard: leaderboardEntry ?? null,
      recentSubmissions,
    },
  });
});

/* =========================
   ADMIN — POST /contests
========================= */

export const createContest = TryCatch(async (req, res) => {
  const {
    title, description, type, startTime, endTime,
    problems, isRated, scoringMode, penaltyMinutes,
    maxParticipants, company, reward, registrationOpen,
  } = req.body;

  // Validate problems exist and enrich with title/difficulty
  const enrichedProblems = [];
  if (Array.isArray(problems) && problems.length > 0) {
    for (let i = 0; i < problems.length; i++) {
      const { problemId, maxScore, order } = problems[i];
      const p = await Problem.findById(problemId)
        .select("title slug difficulty problemNumber isPublished")
        .lean();

      if (!p) {
        return res.status(400).json({
          success: false,
          message: `Problem ${problemId} not found.`,
        });
      }
      if (!p.isPublished) {
        return res.status(400).json({
          success: false,
          message: `Problem "${p.title}" is not published.`,
        });
      }

      enrichedProblems.push({
        problem:       p._id,
        slug:          p.slug,
        problemNumber: p.problemNumber,
        title:         p.title,
        difficulty:    p.difficulty,
        maxScore:      maxScore ?? 100,
        order:         order    ?? i,
      });
    }
  }

  const contest = await Contest.create({
    title,
    description,
    type:             type          ?? CONTEST_TYPE.NORMAL,
    startTime:        new Date(startTime),
    endTime:          new Date(endTime),
    problems:         enrichedProblems,
    isRated:          isRated       ?? true,
    scoringMode:      scoringMode   ?? "icpc",
    penaltyMinutes:   penaltyMinutes ?? 20,
    maxParticipants:  maxParticipants ?? null,
    company:          company        ?? {},
    reward:           reward         ?? { type: "none" },
    registrationOpen: registrationOpen ?? true,
    createdBy:        req.user._id,
    status:           CONTEST_STATUS.DRAFT,
  });

  return res.status(201).json({ success: true, data: contest });
});

/* =========================
   ADMIN — PATCH /contests/:slug
========================= */

export const updateContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({ slug: req.params.slug });
  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  if (
    [CONTEST_STATUS.LIVE, CONTEST_STATUS.ENDED, CONTEST_STATUS.FINALIZED].includes(contest.status)
  ) {
    // Only allow safe fields to be updated after contest starts
    const allowed = ["description", "editorialUrl", "editorialPublishedAt"];
    const unsafe  = Object.keys(req.body).filter((k) => !allowed.includes(k));
    if (unsafe.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${unsafe.join(", ")} after contest has started.`,
      });
    }
  }

  const { slug: _s, createdBy: _c, ...safeBody } = req.body;
  Object.assign(contest, safeBody);
  await contest.save();

  return res.status(200).json({ success: true, data: contest });
});

/* =========================
   ADMIN — PATCH /contests/:slug/publish
========================= */

export const togglePublishContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({ slug: req.params.slug });
  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  // Auto-set status to UPCOMING when publishing
  if (!contest.isPublished && contest.status === CONTEST_STATUS.DRAFT) {
    contest.status = CONTEST_STATUS.UPCOMING;
  }

  contest.isPublished = !contest.isPublished;
  await contest.save();

  return res.status(200).json({ success: true, data: contest });
});

/* =========================
   ADMIN — POST /contests/:slug/finalize
   Computes final ranks, rating deltas, updates User.contestRating,
   marks contest as FINALIZED. Idempotent if called again.
========================= */

export const finalizeContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({ slug: req.params.slug });
  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  if (contest.status === CONTEST_STATUS.FINALIZED) {
    return res.status(400).json({ success: false, message: "Contest is already finalized." });
  }
  if (contest.status !== CONTEST_STATUS.ENDED && new Date() <= contest.endTime) {
    return res.status(400).json({ success: false, message: "Contest has not ended yet." });
  }

  // Force status to ENDED so syncContestStatus already ran if needed
  contest.status = CONTEST_STATUS.ENDED;
  await contest.save();

  // Fetch all leaderboard entries sorted by score
  const entries = await ContestLeaderboard.find({ contest: contest._id })
    .sort({ totalScore: -1, totalPenalty: 1, lastAcceptedAt: 1 })
    .lean();

  const deltas = contest.isRated ? computeRatingDeltas(entries) : [];

  // Build a lookup for fast delta access
  const deltaMap = new Map(deltas.map((d) => [String(d.userId), d.delta]));

  // Bulk-update leaderboard entries + registrations + user ratings
  const bulkLB   = [];
  const bulkReg  = [];
  const bulkUser = [];

  entries.forEach((e, i) => {
    const rank  = i + 1;
    const delta = deltaMap.get(String(e.user)) ?? 0;
    const ratingAfter = (e.ratingAtStart ?? 1500) + delta;

    bulkLB.push({
      updateOne: {
        filter: { _id: e._id },
        update: { $set: { rank, ratingDelta: delta } },
      },
    });

    bulkReg.push({
      updateOne: {
        filter: { contest: contest._id, user: e.user },
        update: {
          $set: {
            finalRank:   rank,
            ratingDelta: delta,
            ratingAfter,
          },
        },
      },
    });

    if (contest.isRated) {
      bulkUser.push({
        updateOne: {
          filter: { _id: e.user },
          update: { $set: { contestRating: ratingAfter } },
        },
      });
    }

    // Mark reward eligibility
    const reward = contest.reward;
    if (reward?.type !== "none") {
      const topN =
        reward.hiringDetails?.topNEligible ??
        reward.interviewDetails?.topNEligible ??
        (reward.prizeTiers?.length ?? 0);

      if (rank <= topN) {
        bulkReg[bulkReg.length - 1].updateOne.update.$set.rewardEligible = true;
        bulkReg[bulkReg.length - 1].updateOne.update.$set.rewardNote =
          `Ranked #${rank} — eligible for ${reward.type} reward`;
      }
    }
  });

  await Promise.all([
    bulkLB.length   ? ContestLeaderboard.bulkWrite(bulkLB)          : null,
    bulkReg.length  ? ContestRegistration.bulkWrite(bulkReg)         : null,
    bulkUser.length ? User.bulkWrite(bulkUser)                        : null,
  ]);

  // Invalidate Redis caches
  const redis     = getRedis();
  const cacheKeys = entries.map((e) => `user:${e.user}`);
  if (cacheKeys.length) {
    await redis.del(cacheKeys).catch(() => {});
  }
  await redis.del(`contest-lb:${contest._id}`).catch(() => {});

  // Mark finalized
  contest.status = CONTEST_STATUS.FINALIZED;
  await contest.save();

  return res.status(200).json({
    success: true,
    message: `Contest finalized. ${entries.length} participants ranked.`,
    participantCount: entries.length,
  });
});

/* =========================
   ADMIN — DELETE /contests/:slug
========================= */

export const deleteContest = TryCatch(async (req, res) => {
  const contest = await Contest.findOne({ slug: req.params.slug });
  if (!contest) {
    return res.status(404).json({ success: false, message: "Contest not found." });
  }

  if (contest.status === CONTEST_STATUS.LIVE) {
    return res.status(400).json({ success: false, message: "Cannot delete a live contest." });
  }

  await Promise.all([
    Contest.findByIdAndDelete(contest._id),
    ContestRegistration.deleteMany({ contest: contest._id }),
    ContestSubmission.deleteMany({ contest: contest._id }),
    ContestLeaderboard.deleteMany({ contest: contest._id }),
  ]);

  return res.status(200).json({ success: true, message: "Contest deleted." });
});