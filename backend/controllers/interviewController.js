import InterviewSession, {
  SESSION_STATUS,
  SESSION_TYPE,
} from "../models/interviewSessionModel.js";
import InterviewFeedback from "../models/interviewFeedbackModel.js";
import Problem from "../models/problemModel.js";
import TryCatch from "../middlewares/TryCatch.js";

/* =========================
   Helpers
========================= */

/**
 * Pick N random problems matching optional filters.
 * Used when creating a session without explicit problem IDs.
 */
async function pickProblems({ difficulty, topics, count = 2 }) {
  const filter = { isPublished: true };
  if (difficulty) filter.difficulty = difficulty;
  if (topics?.length) filter.topics = { $in: topics };

  return Problem.aggregate([
    { $match: filter },
    { $sample: { size: count } },
    { $project: { _id: 1, slug: 1, title: 1, difficulty: 1 } },
  ]);
}

/* =========================
   POST /interviews
   Create a self-practice or peer interview session
========================= */

export const createSession = TryCatch(async (req, res) => {
  const {
    type          = SESSION_TYPE.SELF,
    scheduledAt,
    durationMinutes = 60,
    problemIds,           // optional explicit problem IDs
    difficulty,
    topics,
    title,
    notes,
  } = req.body;

  if (!scheduledAt) {
    return res.status(400).json({ success: false, message: "scheduledAt is required." });
  }

  let problems = [];

  if (Array.isArray(problemIds) && problemIds.length > 0) {
    const docs = await Problem.find({
      _id: { $in: problemIds },
      isPublished: true,
    })
      .select("_id slug title difficulty")
      .lean();

    problems = docs.map((p, i) => ({
      problem: p._id, slug: p.slug, title: p.title, difficulty: p.difficulty, order: i,
    }));
  } else {
    const picked = await pickProblems({ difficulty, topics, count: 2 });
    problems = picked.map((p, i) => ({
      problem: p._id, slug: p.slug, title: p.title, difficulty: p.difficulty, order: i,
    }));
  }

  const session = await InterviewSession.create({
    type,
    interviewee: req.user._id,
    scheduledAt:     new Date(scheduledAt),
    durationMinutes,
    problems,
    topics:  topics ?? [],
    title:   title  ?? null,
    notes:   notes  ?? null,
    status:  SESSION_STATUS.SCHEDULED,
  });

  return res.status(201).json({ success: true, data: session });
});

/* =========================
   GET /interviews
   List user's sessions (as interviewee or interviewer)
========================= */

export const listSessions = TryCatch(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || "1",  10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);

  const filter = {
    $or: [
      { interviewee: req.user._id },
      { interviewer: req.user._id },
    ],
  };

  if (req.query.status) filter.status = req.query.status;

  const [sessions, total] = await Promise.all([
    InterviewSession.find(filter)
      .select("-sharedCode -roomToken -interviewerNotes")
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("interviewee", "name avatar")
      .populate("interviewer", "name avatar")
      .lean(),
    InterviewSession.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: sessions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    },
  });
});

/* =========================
   GET /interviews/:sessionId
========================= */

export const getSession = TryCatch(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId)
    .populate("interviewee", "name avatar contestRating")
    .populate("interviewer", "name avatar contestRating")
    .populate("problems.problem", "title slug difficulty topics")
    .lean();

  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found." });
  }

  const userId = String(req.user._id);
  const isParticipant =
    String(session.interviewee?._id) === userId ||
    String(session.interviewer?._id) === userId;

  if (!isParticipant && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  return res.status(200).json({ success: true, data: session });
});

/* =========================
   PATCH /interviews/:sessionId/start
   Mark session as live (called when both parties join the room)
========================= */

export const startSession = TryCatch(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found." });
  }

  const userId = String(req.user._id);
  const isParticipant =
    String(session.interviewee) === userId ||
    String(session.interviewer) === userId;

  if (!isParticipant) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  if (session.status !== SESSION_STATUS.SCHEDULED && session.status !== SESSION_STATUS.WAITING) {
    return res.status(400).json({
      success: false,
      message: `Cannot start a session with status: ${session.status}`,
    });
  }

  session.status    = SESSION_STATUS.LIVE;
  session.startedAt = new Date();

  // Attach a room ID if not already set (your WebRTC layer generates this)
  if (!session.roomId && req.body.roomId) {
    session.roomId = req.body.roomId;
  }

  await session.save();

  return res.status(200).json({ success: true, data: session });
});

/* =========================
   PATCH /interviews/:sessionId/end
========================= */

export const endSession = TryCatch(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found." });
  }

  const userId = String(req.user._id);
  const isParticipant =
    String(session.interviewee) === userId ||
    String(session.interviewer) === userId;

  if (!isParticipant && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  if (session.status !== SESSION_STATUS.LIVE) {
    return res.status(400).json({
      success: false,
      message: "Session is not currently live.",
    });
  }

  session.status  = SESSION_STATUS.COMPLETED;
  session.endedAt = new Date();

  // Save final code snapshot if provided
  if (req.body.sharedCode && typeof req.body.sharedCode === "object") {
    for (const [lang, code] of Object.entries(req.body.sharedCode)) {
      session.sharedCode.set(lang, code);
    }
  }

  // Save interviewer notes if provided (interviewer only)
  if (
    req.body.interviewerNotes &&
    String(session.interviewer) === userId
  ) {
    session.interviewerNotes = req.body.interviewerNotes;
  }

  await session.save();

  return res.status(200).json({ success: true, data: session });
});

/* =========================
   POST /interviews/:sessionId/feedback
========================= */

export const submitFeedback = TryCatch(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId).lean();
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found." });
  }

  if (session.status !== SESSION_STATUS.COMPLETED) {
    return res.status(400).json({
      success: false,
      message: "Feedback can only be submitted after the session is completed.",
    });
  }

  const userId = String(req.user._id);
  const isInterviewee = String(session.interviewee) === userId;
  const isInterviewer = String(session.interviewer) === userId;

  if (!isInterviewee && !isInterviewer) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  // Determine subject (the OTHER party)
  const subjectId   = isInterviewee ? session.interviewer : session.interviewee;
  const subjectRole = isInterviewee ? "interviewer" : "interviewee";

  if (!subjectId) {
    return res.status(400).json({
      success: false,
      message: "No other participant to give feedback to.",
    });
  }

  const existing = await InterviewFeedback.findOne({
    session: session._id,
    author:  req.user._id,
  });
  if (existing) {
    return res.status(409).json({ success: false, message: "You have already submitted feedback." });
  }

  const feedback = await InterviewFeedback.create({
    session:     session._id,
    author:      req.user._id,
    subject:     subjectId,
    subjectRole,
    ratings:     req.body.ratings,
    strengths:   req.body.strengths   ?? null,
    improvements: req.body.improvements ?? null,
    additionalNotes: req.body.additionalNotes ?? null,
    isAnonymous: req.body.isAnonymous ?? false,
  });

  return res.status(201).json({ success: true, data: feedback });
});

/* =========================
   GET /interviews/:sessionId/feedback
   Returns feedback about the requesting user from this session
========================= */

export const getSessionFeedback = TryCatch(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId).lean();
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found." });
  }

  const userId      = String(req.user._id);
  const isParticipant =
    String(session.interviewee) === userId ||
    String(session.interviewer) === userId;

  if (!isParticipant && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const feedbacks = await InterviewFeedback.find({
    session: session._id,
    subject: req.user._id,
    isVisible: true,
  }).lean();

  const sanitized = feedbacks.map((f) => ({
    ...f,
    author: f.isAnonymous ? "Anonymous" : f.author,
  }));

  return res.status(200).json({ success: true, data: sanitized });
});