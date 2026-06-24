import express from "express";
import {
  analyzeComplexity,
  explainApproach,
  findBugs,
  scoreResume,
  generateHint,
  optimizeCode,
  generateTestCases,
  explainConcept,
} from "../controllers/aiController.js";

const aiRouter = express.Router();

/* =========================
   AI Routes (Groq-powered)
========================= */

aiRouter.post("/complexity", analyzeComplexity);
aiRouter.post("/approach", explainApproach);
aiRouter.post("/bug-finder", findBugs);
aiRouter.post("/resume-score", scoreResume);
aiRouter.post("/hint", generateHint);
aiRouter.post("/optimize", optimizeCode);
aiRouter.post("/test-cases", generateTestCases);
aiRouter.post("/concept", explainConcept);

export default aiRouter;