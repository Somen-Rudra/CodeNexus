import mongoose from "mongoose";

/* =========================
   Constants
========================= */

const ALLOWED_LANGUAGES = ["c", "cpp", "js", "py", "java", "kotlin", "swift"];

/* =========================
   Reusable Schemas
========================= */

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
      maxlength: 50000,
    },

    output: {
      type: String,
      required: true,
      maxlength: 50000,
    },
  },
  { _id: false },
);

const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
    },

    output: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    explanation: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const languageTemplateSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: false,
      default: "",
    },

    inputOutput: {
      type: String,
      required: true,
    },

    codeStub: {
      type: String,
      required: true,
    },

    driver: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

/* =========================
   Problem Schema
========================= */

const problemSchema = new mongoose.Schema(
  {
    problemNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      index: true,
    },

    topics: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    acceptanceRate: {
      totalSubs: {
        type: Number,
        default: 0,
        min: 0,
      },

      acceptedSubs: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    acceptancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    examples: {
      type: [exampleSchema],
      default: [],
    },

    constraints: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    followUps: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    hints: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    companies: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    similarQuestions: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "Max 10 similar questions allowed.",
      },
      default: [],
    },

    languages: {
      type: Map,
      of: languageTemplateSchema,
      required: true,

      validate: {
        validator(map) {
          return [...map.keys()].every((lang) =>
            ALLOWED_LANGUAGES.includes(lang),
          );
        },

        message: "Unsupported language found.",
      },
    },

    timeLimit: {
      type: Number,
      required: true,
      default: 10000, // milliseconds
      min: 1000,
    },

    memoryLimit: {
      type: Number,
      required: true,
      default: 128, // MB
      min: 64,
    },

    visibleTestCases: {
      type: [testCaseSchema],
      required: true,

      validate: {
        validator(arr) {
          return arr.length >= 1 && arr.length <= 20;
        },

        message: "Visible test cases must contain between 1 and 20 cases.",
      },
    },

    hiddenTestCases: {
      type: [testCaseSchema],
      required: true,
      select: false,

      validate: {
        validator(arr) {
          return arr.length >= 1 && arr.length <= 100;
        },

        message: "Hidden test cases must contain between 1 and 100 cases.",
      },
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  },
);

/* =========================
   Indexes
========================= */

problemSchema.index({
  difficulty: 1,
  topics: 1,
});

problemSchema.index({
  title: "text",
});

problemSchema.index({
  companies: 1,
});

/* =========================
   Hooks
========================= */

// Slug generation
problemSchema.pre("validate", async function () {
  if (!this.isModified("title")) return;

  const baseSlug = this.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  let slug = baseSlug;
  let counter = 1;

  while (
    await this.constructor.exists({
      slug,
      _id: { $ne: this._id },
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
});

problemSchema.pre("save", async function () {
  if (this.topics?.length) {
    this.topics = [
      ...new Set(this.topics.map((topic) => topic.trim().toLowerCase())),
    ];
  }

  if (this.companies?.length) {
    this.companies = [
      ...new Set(this.companies.map((company) => company.trim())),
    ];
  }

  const { totalSubs, acceptedSubs } = this.acceptanceRate;
  this.acceptancePercentage =
    totalSubs === 0 ? 0 : Number(((acceptedSubs / totalSubs) * 100).toFixed(2));
});

/* =========================
   Statics
========================= */

problemSchema.statics.findForJudge = function (id) {
  return this.findById(id).select("+hiddenTestCases");
};

/* =========================
   Model
========================= */

const Problem =
  mongoose.models.Problem || mongoose.model("Problem", problemSchema);

export default Problem;
