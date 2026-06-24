// controllers/adminController.js
import User from "../models/userModel.js";
import Submission from "../models/submissionModel.js";
import Problem from "../models/problemModel.js";
import TryCatch from "../middlewares/TryCatch.js";
import { getRedis } from "../config/db.js";

export const getAllUsers = TryCatch(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || "1",  10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  const search = req.query.search?.trim();

  const filter = {};
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (req.query.role)      filter.role      = req.query.role;
  if (req.query.isPremium) filter.isPremium = req.query.isPremium === "true";

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    },
  });
});

export const updateUserRole = TryCatch(async (req, res) => {
  const { role } = req.body;
  const allowed  = ["user", "admin"];

  if (!allowed.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Role must be one of: ${allowed.join(", ")}`,
    });
  }

  // Prevent self-demotion — easy to accidentally lock yourself out
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "Cannot change your own role.",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Bust cache so the updated role is reflected immediately on next request
  // instead of waiting for the access token (and cache entry) to expire
  const redis = getRedis();
  await redis.del(`user:${req.params.id}`);

  return res.status(200).json({ success: true, data: user });
});

export const toggleUserPremium = TryCatch(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  user.isPremium = !user.isPremium;
  await user.save();

  // Bust cache — isPremium is likely checked on every authenticated request
  // so stale cache here would let a demoted user keep premium access
  const redis = getRedis();
  await redis.del(`user:${req.params.id}`);

  return res.status(200).json({ success: true, data: user });
});

export const deleteUser = TryCatch(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete your own account.",
    });
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Remove from cache entirely — subsequent requests with their token
  // will hit the DB, find nothing, and get a 401 (see isAuthenticated)
  const redis = getRedis();
  await redis.del(`user:${req.params.id}`);

  return res.status(200).json({ success: true, message: "User deleted." });
});

export const getAllSubmissions = TryCatch(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || "1",  10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

  const filter = {};
  if (req.query.verdict)  filter.verdict     = req.query.verdict;
  if (req.query.language) filter.language    = req.query.language;
  if (req.query.mode)     filter.mode        = req.query.mode;
  if (req.query.slug)     filter.problemSlug = req.query.slug;

  const [submissions, total] = await Promise.all([
    Submission.find(filter)
      .select("-testCaseResults -code")
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
});

export const getPlatformStats = TryCatch(async (req, res) => {
  const [
    totalUsers,
    totalSubmissions,
    acceptedSubmissions,
    totalProblems,
  ] = await Promise.all([
    User.countDocuments(),
    Submission.countDocuments({ isOfficial: true }),
    Submission.countDocuments({ isOfficial: true, verdict: "accepted" }),
    Problem.countDocuments({ isPublished: true }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalSubmissions,
      acceptedSubmissions,
      globalAcceptanceRate: totalSubmissions
        ? +((acceptedSubmissions / totalSubmissions) * 100).toFixed(1)
        : 0,
      totalProblems,
    },
  });
});