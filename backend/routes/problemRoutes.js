import express from "express";

import {
  getProblems,
  getProblemBySlug,
  getProblemByNumber,
  createProblem,
  updateProblem,
  deleteProblem,
  getProblemMetadata,
  getFeaturedProblems,
  getRandomProblem,
  getProblemStats,
  togglePublishProblem,
  getProblemEditorData,
  getRecommended,
} from "../controllers/problemController.js";

import {
  runCode,
  submitCode,
  getSubmissionsForProblem,
} from "../controllers/submissionController.js";

import { isAuthenticated, checkRole } from "../middlewares/isAuthenticated.js";

const problemRouter = express.Router();

/* =========================
   Public Routes
========================= */
problemRouter.get("/",               getProblems);
problemRouter.get("/metadata",       getProblemMetadata);
problemRouter.get("/featured",       getFeaturedProblems);
problemRouter.get("/random",         getRandomProblem);
problemRouter.get("/stats/overview", getProblemStats);
problemRouter.get("/number/:number", getProblemByNumber);
problemRouter.get("/recommended",    isAuthenticated, getRecommended);
problemRouter.get("/:slug/editor",   getProblemEditorData);
problemRouter.get("/:slug",          getProblemBySlug);

/* =========================
   Execution Routes (auth required)
========================= */
problemRouter.post("/:slug/run",         isAuthenticated, runCode);
problemRouter.post("/:slug/submit",      isAuthenticated, submitCode);
problemRouter.get( "/:slug/submissions", isAuthenticated, getSubmissionsForProblem);

/* =========================
   Admin Routes (auth + admin role required)
========================= */
problemRouter.post("/",               isAuthenticated, checkRole("admin"), createProblem);
problemRouter.patch("/:slug/publish", isAuthenticated, checkRole("admin"), togglePublishProblem);
problemRouter.patch("/:slug",         isAuthenticated, checkRole("admin"), updateProblem);
problemRouter.delete("/:slug",        isAuthenticated, checkRole("admin"), deleteProblem);

export default problemRouter;