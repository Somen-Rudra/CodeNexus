import Problem from "../models/problemModel.js";
import User from "../models/userModel.js";
import TryCatch from "../middlewares/TryCatch.js";

const PROBLEM_LIST_FIELDS = `
  problemNumber
  title
  slug
  difficulty
  topics
  companies
  acceptancePercentage
  isPremium
  isFeatured
  isPublished
`;

const FEATURED_FIELDS = `
  problemNumber
  title
  slug
  difficulty
  topics
  acceptancePercentage
  isPremium
  isFeatured
`;

// ─── GET /problemSet/ ────────────────────────────────────────────────────
export const getProblems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,

      search,

      // Difficulty: single value OR comma-separated list  e.g. "easy,medium"
      difficulty,

      // Topics / companies: comma-separated
      topics,
      companies,

      // Boolean flags
      premium,
      featured,

      // Acceptance range
      acceptanceMin,
      acceptanceMax,

      // Published filter (admin-facing): "true" | "false" | "all"
      published = "true",
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10), 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);

    /* ─── Filters ─────────────────────────────────────────── */

    const filter = {};

    // Published: "all" means no filter at all (admin wants to see everything).
    // Anything else defaults to true unless explicitly "false".
    if (published !== "all") {
      filter.isPublished = published === "false" ? false : true;
    }

    // Difficulty: support single value AND comma-separated multi-select
    if (difficulty) {
      const diffList = difficulty
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      filter.difficulty =
        diffList.length === 1 ? diffList[0] : { $in: diffList };
    }

    // Boolean: premium
    if (premium !== undefined && premium !== "") {
      filter.isPremium = premium === "true";
    }

    // Boolean: featured
    if (featured !== undefined && featured !== "") {
      filter.isFeatured = featured === "true";
    }

    // Text search via $regex
    if (search?.trim()) {
      const query = search.trim();
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    // Topics ($in = OR match; swap to $all for strict AND)
    if (topics) {
      const topicList = topics
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (topicList.length) filter.topics = { $in: topicList };
    }

    // Companies
    if (companies) {
      const companyList = companies
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (companyList.length) filter.companies = { $in: companyList };
    }

    // Acceptance percentage range
    if (acceptanceMin !== undefined || acceptanceMax !== undefined) {
      filter.acceptancePercentage = {};
      if (acceptanceMin !== undefined && !isNaN(Number(acceptanceMin))) {
        filter.acceptancePercentage.$gte = Number(acceptanceMin);
      }
      if (acceptanceMax !== undefined && !isNaN(Number(acceptanceMax))) {
        filter.acceptancePercentage.$lte = Number(acceptanceMax);
      }
      if (!Object.keys(filter.acceptancePercentage).length) {
        delete filter.acceptancePercentage;
      }
    }

    /* ─── Sorting ─────────────────────────────────────────── */

    let sortObj = {};

    switch (sort) {
      case "acceptanceAsc":
        sortObj = { acceptancePercentage: 1 };
        break;
      case "acceptanceDesc":
        sortObj = { acceptancePercentage: -1 };
        break;
      case "titleAsc":
        sortObj = { title: 1 };
        break;
      case "titleDesc":
        sortObj = { title: -1 };
        break;
      case "difficultyAsc":
        sortObj = { difficulty: 1, problemNumber: 1 };
        break;
      case "difficultyDesc":
        sortObj = { difficulty: -1, problemNumber: 1 };
        break;
      case "numberAsc":
        sortObj = { problemNumber: 1 };
        break;
      case "numberDesc":
        sortObj = { problemNumber: -1 };
        break;
      case "newest":
        sortObj = { _id: -1 };
        break;
      case "oldest":
        sortObj = { _id: 1 };
        break;
      default:
        sortObj = { problemNumber: 1 };
    }

    /* ─── Query ───────────────────────────────────────────── */

    const totalProblems = await Problem.countDocuments(filter);

    const problems = await Problem.find(filter)
      .select(PROBLEM_LIST_FIELDS)
      .sort(sortObj)
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    const totalPages = Math.ceil(totalProblems / pageLimit);

    return res.status(200).json({
      success: true,
      data: problems,
      pagination: {
        currentPage,
        totalPages,
        totalProblems,
        limit: pageLimit,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("getProblems error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/:slug ────────────────────────────────────────────────────
export const getProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    const problem = await Problem.findOne({
      slug: slug.trim(),
      isPublished: true,
    })
      .select(
        `
        title
        problemNumber
        slug
        difficulty
        topics
        acceptanceRate
        acceptancePercentage
        examples
        constraints
        followUps
        hints
        companies
        similarQuestions
        description
        languages
        visibleTestCases
        timeLimit
        memoryLimit
        isPremium
      `,
      )
      .populate("similarQuestions", "problemNumber title slug difficulty")
      .lean();

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: problem,
    });
  } catch (error) {
    console.error("getProblemBySlug error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// ─── GET /problemSet/number/:number ──────────────────────────────────────────
export const getProblemByNumber = async (req, res) => {
  try {
    const number = Number(req.params.number);

    if (isNaN(number)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid problem number" });
    }

    const problem = await Problem.findOne({
      problemNumber: number,
      isPublished: true,
    }).lean();

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    }

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    console.error("getProblemByNumber error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── POST /problemSet/ ───────────────────────────────────────────────────────
export const createProblem = async (req, res) => {
  try {
    const problem = await Problem.create(req.body);
    return res.status(201).json({ success: true, data: problem });
  } catch (error) {
    console.error("createProblem error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ─── PATCH /problemSet/:slug ─────────────────────────────────────────────────
export const updateProblem = async (req, res) => {
  try {
    const slug = req.params.slug?.trim();

    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Slug is required" });
    }

    const problem = await Problem.findOne({ slug });

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    }

    // Prevent the slug from being overwritten via the request body
    const { slug: _ignoredSlug, ...safeBody } = req.body;
    Object.assign(problem, safeBody);
    await problem.save();

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    console.error("updateProblem error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ─── DELETE /problemSet/:slug ─────────────────────────────────────────────────
export const deleteProblem = async (req, res) => {
  try {
    const slug = req.params.slug?.trim();

    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Slug is required" });
    }

    const deleted = await Problem.findOneAndDelete({ slug });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Problem deleted successfully" });
  } catch (error) {
    console.error("deleteProblem error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/metadata ────────────────────────────────────────────────
export const getProblemMetadata = async (req, res) => {
  try {
    const [topics, companies] = await Promise.all([
      Problem.distinct("topics"),
      Problem.distinct("companies"),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        topics: topics.sort(),
        companies: companies.sort(),
        difficulties: ["easy", "medium", "hard"],
        sortOptions: [
          { value: "numberAsc", label: "Number ↑" },
          { value: "numberDesc", label: "Number ↓" },
          { value: "titleAsc", label: "Title A→Z" },
          { value: "titleDesc", label: "Title Z→A" },
          { value: "difficultyAsc", label: "Difficulty ↑" },
          { value: "difficultyDesc", label: "Difficulty ↓" },
          { value: "acceptanceAsc", label: "Acceptance ↑" },
          { value: "acceptanceDesc", label: "Acceptance ↓" },
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
        ],
      },
    });
  } catch (error) {
    console.error("getProblemMetadata error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/featured ────────────────────────────────────────────────
export const getFeaturedProblems = async (req, res) => {
  try {
    const problems = await Problem.find({ isFeatured: true, isPublished: true })
      .select(FEATURED_FIELDS)
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, data: problems });
  } catch (error) {
    console.error("getFeaturedProblems error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/random ──────────────────────────────────────────────────
export const getRandomProblem = async (req, res) => {
  try {
    const matchStage = { isPublished: true };

    if (req.query.difficulty) {
      const diffList = req.query.difficulty
        .split(",")
        .map((d) => d.trim().toLowerCase());
      matchStage.difficulty =
        diffList.length === 1 ? diffList[0] : { $in: diffList };
    }

    if (req.query.topics) {
      const topicList = req.query.topics
        .split(",")
        .map((t) => t.trim().toLowerCase());
      if (topicList.length) matchStage.topics = { $in: topicList };
    }

    const problems = await Problem.aggregate([
      { $match: matchStage },
      { $sample: { size: 1 } },
      {
        $project: {
          problemNumber: 1,
          title: 1,
          slug: 1,
          difficulty: 1,
          topics: 1,
          acceptancePercentage: 1,
          isPremium: 1,
          isFeatured: 1,
        },
      },
    ]);

    if (!problems.length) {
      return res
        .status(404)
        .json({ success: false, message: "No problems found" });
    }

    return res.status(200).json({ success: true, data: problems[0] });
  } catch (error) {
    console.error("getRandomProblem error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/stats/overview ─────────────────────────────────────────
export const getProblemStats = async (req, res) => {
  try {
    const [diffStats, premiumCount, featuredCount, totalCount] =
      await Promise.all([
        Problem.aggregate([
          { $match: { isPublished: true } },
          { $group: { _id: "$difficulty", count: { $sum: 1 } } },
        ]),
        Problem.countDocuments({ isPremium: true, isPublished: true }),
        Problem.countDocuments({ isFeatured: true, isPublished: true }),
        Problem.countDocuments({ isPublished: true }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        byDifficulty: diffStats,
        premiumCount,
        featuredCount,
        totalCount,
      },
    });
  } catch (error) {
    console.error("getProblemStats error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── PATCH /problemSet/:slug/publish ─────────────────────────────────────────
export const togglePublishProblem = async (req, res) => {
  try {
    const slug = req.params.slug?.trim();

    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Slug is required" });
    }

    const problem = await Problem.findOne({ slug });

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    }

    problem.isPublished = !problem.isPublished;
    await problem.save();

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    console.error("togglePublishProblem error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ─── GET /problemSet/:slug/editor ───────────────────────────────────────────
export const getProblemEditorData = async (req, res) => {
  try {
    const slug = req.params.slug?.trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    const problem = await Problem.findOne({
      slug,
      isPublished: true,
    })
      .select(
        `
        problemNumber
        title
        slug
        difficulty
        languages
        timeLimit
        memoryLimit
      `,
      )
      .lean();

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        problemNumber: problem.problemNumber,
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        languages: problem.languages,
      },
    });
  } catch (error) {
    console.error("getProblemEditorData error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getRecommended = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("solvedProblems")
    .lean();

  const solved = user.solvedProblems ?? [];

  // Fetch unsolved problems, mix of difficulties
  const problems = await Problem.find({
    _id: { $nin: solved },
    isPublished: true,
  })
    .select("title slug difficulty topics acceptancePercentage")
    .limit(6)
    .lean();

  return res.status(200).json({ success: true, problems });
});

// ─── GET /problemSet/:slug/manage (admin only, no publish filter) ──────────
export const getProblemForEdit = async (req, res) => {
  try {
    const slug = req.params.slug?.trim();
    if (!slug) return res.status(400).json({ success: false, message: "Slug is required" });

    const problem = await Problem.findOne({ slug }).lean();
    if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    console.error("getProblemForEdit error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};