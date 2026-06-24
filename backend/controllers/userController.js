import TryCatch from "../middlewares/TryCatch.js";
import User from "../models/userModel.js";
import Submission from "../models/submissionModel.js";

// ─── GET /user/stats ──────────────────────────────────────────────────────────
export const getUserStats = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId)
    .select("solvedCount streak contestRating globalRank badges activityMap")
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const solvedCount = user.solvedCount ?? { easy: 0, medium: 0, hard: 0 };
  const heatmap = user.activityMap
    ? user.activityMap instanceof Map
      ? Object.fromEntries(user.activityMap)
      : user.activityMap // .lean() already gives a plain object
    : {};


  return res.status(200).json({
    success: true,
    stats: {
      solvedCount,
      totalSolved: solvedCount.easy + solvedCount.medium + solvedCount.hard,
      streak: user.streak ?? { current: 0, best: 0, lastSolvedDate: null },
      contestRating: user.contestRating ?? 1500,
      globalRank: user.globalRank ?? null,
      badgeCount: user.badges?.length ?? 0,
      heatmap,
    },
  });
});

// ─── GET /user/submissions/recent ─────────────────────────────────────────────
export const recentSubmissions = TryCatch(async (req, res) => {
  const submissions = await Submission.find({
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("problem", "title slug difficulty topics")
    .lean();

  const seen = new Set();
  const unique = submissions.filter(({ problem }) => {
    if (!problem) return false;
    if (seen.has(String(problem._id))) return false;
    seen.add(String(problem._id));
    return true;
  });

  return res.status(200).json({ success: true, submissions: unique });
});

// ─── GET /user/submissions ────────────────────────────────────────────────────
// Query params:
//   page      (default 1)
//   limit     (default 20, max 50)
//   mode      "run" | "submit" | "" (all)
//   verdict   e.g. "accepted" | "wrong_answer" | ""
//   language  e.g. "cpp" | "py" | ""
export const getAllSubmissions = TryCatch(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);

  const filter = { user: req.user._id };

  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.verdict) filter.verdict = req.query.verdict;
  if (req.query.language) filter.language = req.query.language;

  const [submissions, total] = await Promise.all([
    Submission.find(filter)
      .select(
        "problemSlug problemNumber language verdict passedCount totalCount totalElapsed mode isOfficial createdAt code",
      )
      .populate("problem", "title slug difficulty")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Submission.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    submissions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    },
  });
});
