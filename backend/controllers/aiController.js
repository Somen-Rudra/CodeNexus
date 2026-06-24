import { callGroq, parseAIJson } from "../config/groqClient.js";
import {
  COMPLEXITY_PROMPT,
  APPROACH_PROMPT,
  BUG_FINDER_PROMPT,
  RESUME_SCORE_PROMPT,
  HINT_PROMPT,
  OPTIMIZE_PROMPT,
  TEST_CASES_PROMPT,
  CONCEPT_PROMPT,
} from "../config/aiPrompt.js";

/* =========================
   Constants
========================= */

const ALLOWED_LANGUAGES = ["c", "cpp", "js", "py", "java", "kotlin", "swift"];
const MAX_CODE_LENGTH = 20000;
const MAX_RESUME_LENGTH = 15000;

/* =========================
   Helpers
========================= */

const validateCode = (code, res) => {
  if (!code?.trim()) {
    res.status(400).json({ success: false, message: "Code is required" });
    return false;
  }

  if (code.length > MAX_CODE_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
    });
    return false;
  }

  return true;
};

/* =========================
   1. Complexity Analysis
========================= */

// POST /api/ai/complexity
export const analyzeComplexity = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!validateCode(code, res)) return;

    const user = `Language: ${language || "unspecified"}\n\nCode:\n${code}`;

    const raw = await callGroq({ system: COMPLEXITY_PROMPT, user });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("analyzeComplexity error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   2. Approach Explainer
========================= */

// POST /api/ai/approach
export const explainApproach = async (req, res) => {
  try {
    const { code, language, problemDescription } = req.body;

    if (!validateCode(code, res)) return;

    const user = `Problem context: ${problemDescription || "Not provided"}\nLanguage: ${language || "unspecified"}\n\nCode:\n${code}`;

    const raw = await callGroq({ system: APPROACH_PROMPT, user, maxTokens: 1800 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("explainApproach error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   3. Bug Finder
========================= */

// POST /api/ai/bug-finder
export const findBugs = async (req, res) => {
  try {
    const { code, language, problemDescription } = req.body;

    if (!validateCode(code, res)) return;

    const user = `Problem context: ${problemDescription || "Not provided"}\nLanguage: ${language || "unspecified"}\n\nCode:\n${code}`;

    const raw = await callGroq({ system: BUG_FINDER_PROMPT, user, maxTokens: 1800 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("findBugs error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   4. Resume Score Generator
========================= */

// POST /api/ai/resume-score
export const scoreResume = async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;

    if (!resumeText?.trim()) {
      return res.status(400).json({ success: false, message: "Resume text is required" });
    }

    if (resumeText.length > MAX_RESUME_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Resume text exceeds maximum length of ${MAX_RESUME_LENGTH} characters`,
      });
    }

    const user = `Target role: ${targetRole || "Software Engineer (general, fresher)"}\n\nResume text:\n${resumeText}`;

    const raw = await callGroq({ system: RESUME_SCORE_PROMPT, user, maxTokens: 2000 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("scoreResume error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   5. Progressive Hint Generator
========================= */

// POST /api/ai/hint
export const generateHint = async (req, res) => {
  try {
    const { problemDescription, code, hintLevel = 1 } = req.body;

    if (!problemDescription?.trim()) {
      return res.status(400).json({ success: false, message: "Problem description is required" });
    }

    const level = Math.min(Math.max(parseInt(hintLevel, 10) || 1, 1), 3);

    const user = `Problem:\n${problemDescription}\n\nUser's current code (may be empty/incomplete):\n${code || "None"}\n\nRequested hint level: ${level}`;

    const raw = await callGroq({ system: HINT_PROMPT, user, maxTokens: 800 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("generateHint error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   6. Code Optimizer
========================= */

// POST /api/ai/optimize
export const optimizeCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!validateCode(code, res)) return;

    if (language && !ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language. Allowed: ${ALLOWED_LANGUAGES.join(", ")}`,
      });
    }

    const user = `Language: ${language || "unspecified"}\n\nCode:\n${code}`;

    const raw = await callGroq({ system: OPTIMIZE_PROMPT, user, maxTokens: 2500 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("optimizeCode error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   7. Test Case Generator
========================= */

// POST /api/ai/test-cases
export const generateTestCases = async (req, res) => {
  try {
    const { problemDescription, constraints } = req.body;

    if (!problemDescription?.trim()) {
      return res.status(400).json({ success: false, message: "Problem description is required" });
    }

    const user = `Problem:\n${problemDescription}\n\nConstraints:\n${constraints || "Not specified"}`;

    const raw = await callGroq({ system: TEST_CASES_PROMPT, user, maxTokens: 1800 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("generateTestCases error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/* =========================
   8. Concept Explainer
========================= */

// POST /api/ai/concept
export const explainConcept = async (req, res) => {
  try {
    const { concept, level = "beginner" } = req.body;

    if (!concept?.trim()) {
      return res.status(400).json({ success: false, message: "Concept is required" });
    }

    const user = `Concept: ${concept}\nExplanation level: ${level}`;

    const raw = await callGroq({ system: CONCEPT_PROMPT, user, maxTokens: 2000 });
    const result = parseAIJson(raw);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("explainConcept error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};