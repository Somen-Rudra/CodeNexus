/**
 * contestStatusJob.js
 *
 * Runs on a schedule (every 60 s recommended) to advance contest statuses:
 *   UPCOMING → LIVE  (when startTime is reached)
 *   LIVE     → ENDED (when endTime is reached)
 *
 * This is a safety net for edge cases where no request triggers
 * syncContestStatus() in the controller. In production, use node-cron
 * or a proper job queue (Bull / BullMQ).
 *
 * Usage in app.js:
 *   import { startContestStatusJob } from "./jobs/contestStatusJob.js";
 *   startContestStatusJob();
 */

import Contest, { CONTEST_STATUS } from "../models/contestModel.js";
import { getRedis } from "./db.js";

async function runStatusSync() {
  const now = new Date();

  try {
    // UPCOMING → LIVE
    const toStart = await Contest.updateMany(
      {
        status:    CONTEST_STATUS.UPCOMING,
        startTime: { $lte: now },
        isPublished: true,
      },
      { $set: { status: CONTEST_STATUS.LIVE } },
    );

    // LIVE → ENDED
    const toEnd = await Contest.updateMany(
      {
        status:   CONTEST_STATUS.LIVE,
        endTime:  { $lte: now },
        isPublished: true,
      },
      { $set: { status: CONTEST_STATUS.ENDED } },
    );

    if (toStart.modifiedCount > 0 || toEnd.modifiedCount > 0) {
      console.log(
        `[contestStatusJob] Started: ${toStart.modifiedCount}, Ended: ${toEnd.modifiedCount}`,
      );

      // Bust timer caches for affected contests so the next poll gets fresh data.
      // We don't have the slugs here, so flush all contest-timer keys.
      // If your Redis key volume is a concern, switch to a targeted approach
      // by querying the affected contest slugs before the updateMany calls.
      try {
        const redis = getRedis();
        const keys  = await redis.keys("contest-timer:*");
        if (keys.length) await redis.del(keys);
      } catch (e) {
        console.error("[contestStatusJob] Redis flush error:", e.message);
      }
    }
  } catch (err) {
    console.error("[contestStatusJob] Error:", err.message);
  }
}

/**
 * Start the cron-style interval.
 * @param {number} intervalMs - How often to run (default: 60 000 ms)
 */
export function startContestStatusJob(intervalMs = 60_000) {
  // Run immediately on startup, then on interval
  runStatusSync();
  const handle = setInterval(runStatusSync, intervalMs);

  // Graceful shutdown support
  process.on("SIGTERM", () => clearInterval(handle));
  process.on("SIGINT",  () => clearInterval(handle));

  console.log(`[contestStatusJob] Running every ${intervalMs / 1000}s`);
}