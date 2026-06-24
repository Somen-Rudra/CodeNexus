import axios from "axios";
import Problem from "../models/problemModel.js";
import Submission, {
  VERDICT,
  ALLOWED_LANGUAGES,
} from "../models/submissionModel.js";
import User from "../models/userModel.js";
import { getRedis } from "../config/db.js";

/* =========================
   Config
========================= */

const JUDGE_URL = process.env.JUDGE_URL || "http://localhost:3000";
const JUDGE_TIMEOUT_MS = parseInt(process.env.JUDGE_TIMEOUT_MS || "60000", 10);

const LANGUAGE_MAP = {
  js: "javascript",
  py: "python",
  c: "c",
  cpp: "cpp",
  java: "java",
  kotlin: "kotlin",
  swift: "swift",
};

/* =========================
   Helpers
========================= */

function stitchCode(langTemplate, userCode) {
  const { header = "", driver = "" } = langTemplate;
  const parts = [header, userCode, driver].filter((p) => p && p.trim() !== "");
  return parts.join("\n\n");
}

async function callJudge(language, stitchedCode, testCases) {
  const judgeLanguage = LANGUAGE_MAP[language];
  if (!judgeLanguage)
    throw new Error(`No judge mapping for language: ${language}`);

  const { data } = await axios.post(
    `${JUDGE_URL}/run-tests`,
    {
      language: judgeLanguage,
      code: stitchedCode,
      testCases,
    },
    { timeout: JUDGE_TIMEOUT_MS },
  );

  return data;
}

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

function buildFirstFailure(results, includeExpected = false) {
  const failing = results.find((r) => !r.passed);
  if (!failing) return null;

  const obj = {
    index: failing.index,
    status: failing.status,
    actualOutput: failing.actualOutput,
    stderr: failing.stderr,
    elapsed: failing.elapsed,
  };

  if (includeExpected) obj.expectedOutput = failing.expectedOutput;

  return obj;
}

/* =========================
   POST /:slug/run
========================= */

export const runCode = async (req, res) => {
  try {
    const { slug } = req.params;
    const { language, code, customCases = [] } = req.body;

    if (!language || !ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: "Unsupported language" });
    }
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Code must be non-empty" });
    }
    if (code.length > 65536) {
      return res.status(400).json({ success: false, message: "Code exceeds 64 KB limit" });
    }

    const problem = await Problem.findOne({ slug, isPublished: true })
      .select("languages visibleTestCases timeLimit memoryLimit _id problemNumber")
      .lean();

    if (!problem) {
      return res.status(404).json({ success: false, message: "Problem not found" });
    }

    const langTemplate = problem.languages?.[language];
    if (!langTemplate) {
      return res.status(400).json({
        success: false,
        message: `Language "${language}" is not available for this problem`,
      });
    }

    if (!problem.visibleTestCases?.length) {
      return res.status(422).json({ success: false, message: "No visible test cases configured" });
    }

    const testCases = [
      ...(problem.visibleTestCases || []),
      ...(customCases || []),
    ];

    if (!testCases.length) {
      return res.status(422).json({ success: false, message: "No test cases configured" });
    }

    const stitchedCode = stitchCode(langTemplate, code);
    const judgeResponse = await callJudge(language, stitchedCode, testCases);

    const results = judgeResponse.results || [];
    const verdict = deriveVerdict(results);
    const firstFail = buildFirstFailure(results, true);

    if (req.user) {
      await Submission.create({
        user: req.user._id,
        userName: req.user.name,
        problem: problem._id,
        problemSlug: slug,
        problemNumber: problem.problemNumber,
        language,
        code,
        verdict,
        passedCount: judgeResponse.passed ?? 0,
        totalCount: judgeResponse.total ?? results.length,
        totalElapsed: judgeResponse.totalElapsed ?? 0,
        testCaseResults: results,
        firstFailure: firstFail,
        mode: "run",
        isOfficial: false,
      });
    }

    return res.status(200).json({
      success: true,
      mode: "run",
      verdict,
      passed: judgeResponse.passed ?? 0,
      failed: judgeResponse.failed ?? 0,
      total: judgeResponse.total ?? results.length,
      totalElapsed: judgeResponse.totalElapsed ?? 0,
      firstFailure: firstFail,
      results: results.map((r) => ({
        index: r.index,
        passed: r.passed,
        status: r.status,
        stdin: r.stdin,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput,
        stderr: r.stderr,
        elapsed: r.elapsed,
        timedOut: r.timedOut,
        outputExceeded: r.outputExceeded,
      })),
    });
  } catch (err) {
    console.error("[runCode]", err.message);

    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      return res.status(503).json({ success: false, message: "Judge service unavailable" });
    }
    if (err.response) {
      return res.status(502).json({
        success: false,
        message: "Judge returned an error",
        detail: err.response.data,
      });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* =========================
   POST /:slug/submit
========================= */

export const submitCode = async (req, res) => {
  try {
    const { slug } = req.params;
    const { language, code } = req.body;

    if (!language || !ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: "Unsupported language" });
    }
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Code must be non-empty" });
    }
    if (code.length > 65536) {
      return res.status(400).json({ success: false, message: "Code exceeds 64 KB limit" });
    }

    /* ── Fetch problem WITH hidden test cases + difficulty ────────────── */
    const problem = await Problem.findOne({ slug, isPublished: true })
  .select("languages visibleTestCases hiddenTestCases timeLimit memoryLimit _id problemNumber slug acceptanceRate difficulty")
  .lean();

    if (!problem) {
      return res.status(404).json({ success: false, message: "Problem not found" });
    }

    const langTemplate = problem.languages?.[language];
    if (!langTemplate) {
      return res.status(400).json({
        success: false,
        message: `Language "${language}" is not available for this problem`,
      });
    }

    const testCases = problem.hiddenTestCases;
    if (!testCases?.length) {
      return res.status(422).json({ success: false, message: "No hidden test cases configured" });
    }

    /* ── Stitch & judge ───────────────────────────────────────────────── */
    const stitchedCode = stitchCode(langTemplate, code);
    const judgeResponse = await callJudge(language, stitchedCode, testCases);

    /* ── Derive result ────────────────────────────────────────────────── */
    const results = judgeResponse.results || [];
    const verdict = deriveVerdict(results);
    const firstFail = buildFirstFailure(results, false);
    const passedCount = judgeResponse.passed ?? 0;
    const totalCount = judgeResponse.total ?? results.length;

    /* ── Persist submission ───────────────────────────────────────────── */
    const submission = await Submission.create({
      user: req.user._id,
      userName: req.user.name,
      problem: problem._id,
      problemSlug: slug,
      problemNumber: problem.problemNumber,
      language,
      code,
      verdict,
      passedCount,
      totalCount,
      totalElapsed: judgeResponse.totalElapsed ?? 0,
      testCaseResults: results,
      firstFailure: firstFail,
      mode: "submit",
      isOfficial: true,
    });

    /* ── Update problem acceptance stats (fire-and-forget) ────────────── */
    Problem.findByIdAndUpdate(problem._id, {
      $inc: {
        "acceptanceRate.totalSubs": 1,
        "acceptanceRate.acceptedSubs": verdict === VERDICT.ACCEPTED ? 1 : 0,
      },
    })
      .exec()
      .catch((e) => console.error("[submitCode] acceptance update failed", e));

    /* ── Update user stats on accepted verdict (fire-and-forget) ─────── */
    if (verdict === VERDICT.ACCEPTED && req.user) {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

      // Check if already solved to avoid double-counting solvedCount
      const alreadySolved = (req.user.solvedProblems ?? []).some(
        (id) => String(id) === String(problem._id)
      );

      const update = {
        $addToSet: { solvedProblems: problem._id },
        $inc: { [`activityMap.${today}`]: 1 },
      };

      // Only bump difficulty counter if this is first time solving
      if (!alreadySolved) {
        update.$inc[`solvedCount.${problem.difficulty}`] = 1;
      }

      User.findByIdAndUpdate(req.user._id, update)
        .exec()
        .then(async () => {
          // Bust Redis cache so next /auth/me or /user/stats returns fresh data
          const redis = getRedis();
          await redis.del(`user:${req.user._id}`);
        })
        .catch((e) => console.error("[submitCode] user stats update failed", e));
    }

    /* ── Response ─────────────────────────────────────────────────────── */
    return res.status(200).json({
      success: true,
      mode: "submit",
      submissionId: submission._id,
      verdict,
      passed: passedCount,
      failed: totalCount - passedCount,
      total: totalCount,
      totalElapsed: judgeResponse.totalElapsed ?? 0,
      firstFailure: firstFail,
    });
  } catch (err) {
    console.error("[submitCode]", err.message);

    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      return res.status(503).json({ success: false, message: "Judge service unavailable" });
    }
    if (err.response) {
      return res.status(502).json({
        success: false,
        message: "Judge returned an error",
        detail: err.response.data,
      });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* =========================
   GET /submissions/:submissionId
========================= */

export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .select("+testCaseResults")
      .populate("problem", "title slug problemNumber difficulty")
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    return res.status(200).json({ success: true, data: submission });
  } catch (err) {
    console.error("[getSubmissionById]", err.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* =========================
   GET /problemSet/:slug/submissions
========================= */

export const getSubmissionsForProblem = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

    const filter = {
      problemSlug: slug,
      isOfficial: true,
      user: req.user._id,
    };

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .select("-testCaseResults -firstFailure.expectedOutput")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (err) {
    console.error("[getSubmissionsForProblem]", err.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};