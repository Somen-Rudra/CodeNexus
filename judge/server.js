const express = require("express");
const { spawn } = require("child_process");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const morgan = require("morgan")

const app = express();

app.use(express.json({ limit: "64kb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(morgan('dev'))

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || "10000", 10);
const POOL_SIZE = parseInt(process.env.POOL_SIZE || "1", 10);
const RECYCLE_AFTER = parseInt(process.env.RECYCLE_AFTER || "200", 10);
const MAX_OUTPUT = parseInt(process.env.MAX_OUTPUT || "10000", 10);
const MAX_CODE_LENGTH = parseInt(process.env.MAX_CODE_LENGTH || "65536", 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || "60000", 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "10", 10);
const MAX_TEST_CASES = parseInt(process.env.MAX_TEST_CASES || "20", 10);

// ─────────────────────────────────────────────
// Language definitions
// ─────────────────────────────────────────────

const LANGUAGES = {
  javascript: {
    ext: "js",
    image: "judge-sandbox:latest",
    command: (file, _bin) => ["timeout", "5s", "node", `/tmp/${file}`],
  },
  python: {
    ext: "py",
    image: "judge-sandbox:latest",
    command: (file, _bin) => ["timeout", "5s", "python3", "-u", `/tmp/${file}`],
  },
  c: {
    ext: "c",
    image: "judge-sandbox:latest",
    command: (file, bin) => [
      "timeout", "5s", "sh", "-c",
      `gcc /tmp/${file} -O2 -pipe -s -o /tmp/${bin} -lm && /tmp/${bin}`,
    ],
  },
  cpp: {
    ext: "cpp",
    image: "judge-sandbox:latest",
    command: (file, bin) => [
      "timeout", "5s", "sh", "-c",
      `g++ /tmp/${file} -O2 -pipe -s -o /tmp/${bin} && /tmp/${bin}`,
    ],
  },
  java: {
    ext: "java",
    image: "judge-sandbox:latest",
    command: (file, bin) => [
      "timeout", "10s", "sh", "-c",
      `cd /tmp && javac ${file} && java -cp /tmp ${bin}`,
    ],
  },
  kotlin: {
    ext: "kt",
    image: "judge-sandbox:latest",
    memory: "512m",          // ← add this
    command: (file, bin) => [
      "timeout", "15s", "sh", "-c",
      `kotlinc /tmp/${file} -include-runtime -d /tmp/${bin}.jar 2>/dev/null && java -jar /tmp/${bin}.jar`,
    ],
  },
  swift: {
    ext: "swift",
    image: "judge-sandbox:latest",
    command: (file, _bin) => ["timeout", "10s", "swift", `/tmp/${file}`],
  },
};
// ─────────────────────────────────────────────
// Spawn helper
// ─────────────────────────────────────────────

function runProcess(command, args, stdin = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";
    let killed = false;
    let outputExceeded = false;

    const killChild = (reason) => {
      if (killed) return;
      killed = true;
      if (reason === "output") outputExceeded = true;
      try { child.kill("SIGKILL"); } catch {}
    };

    const timer = setTimeout(() => killChild("timeout"), TIMEOUT_MS);

    child.stdout.on("data", (data) => {
      if (killed) return;
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT) {
        stdout = stdout.slice(0, MAX_OUTPUT);
        stderr += "\n[Output limit exceeded]";
        killChild("output");
      }
    });

    child.stderr.on("data", (data) => {
      if (killed) return;
      stderr += data.toString();
      if (stderr.length > MAX_OUTPUT) {
        stderr = stderr.slice(0, MAX_OUTPUT);
        killChild("output");
      }
    });

    child.on("error", reject);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, signal, timedOut: killed && !outputExceeded, outputExceeded });
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

// ─────────────────────────────────────────────
// Container helpers
// ─────────────────────────────────────────────
// In server.js, add this helper
function javaFilename(code, fallbackUUID) {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? `${match[1]}.java` : `${fallbackUUID}.java`;
}
async function containerExists(name) {
  const r = await runProcess("docker", [
    "ps", "-a", "--filter", `name=^${name}$`, "--format", "{{.Names}}",
  ]);
  return r.stdout.trim() === name;
}

async function startContainer(name, language) {
  const lang = LANGUAGES[language];
  const memory = lang.memory || "256m";
  
  await runProcess("docker", [
    "run", "-d", "--init", "--name", name,
    "--network", "none",
    "--memory", memory,
    "--memory-swap",  memory, 
    "--memory-swappiness", "0",
    "--oom-kill-disable=false",
    "--cpus", "1",
    "--pids-limit", "64",
    "--read-only",
    "--tmpfs", "/tmp:rw,exec,nosuid,size=64m",
    "--tmpfs", "/home/sandbox/.cache:rw,nosuid,size=32m",  // ← add this
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--user", "1000:1000",
    lang.image, "sleep", "infinity",
  ]);
}

async function removeContainer(name) {
  await runProcess("docker", ["rm", "-f", name]);
}

async function copyCode(container, filename, code) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "tee", `/tmp/${filename}`]);
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.stdin.write(code);
    child.stdin.end();
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tee failed (exit ${code}): ${stderr.trim()}`));
    });
  });
}

async function cleanupTmp(container) {
  try {
    await runProcess("docker", ["exec", container, "find", "/tmp", "-mindepth", "1", "-delete"]);
  } catch { /* best-effort */ }
}

// ─────────────────────────────────────────────
// Container pool
// ─────────────────────────────────────────────

class ContainerPool {
  constructor(language, size) {
    this.language = language;
    this.size = size;
    this.slots = [];
    this.roundRobin = 0;
  }

  slotName(index) {
    return `judge-${this.language}-${index}`;
  }

  async init() {
    for (let i = 0; i < this.size; i++) {
      const name = this.slotName(i);
      if (await containerExists(name)) {
        console.log(`[pool:${this.language}:${i}] removing stale container`);
        await removeContainer(name);
      }
      console.log(`[pool:${this.language}:${i}] starting`);
      await startContainer(name, this.language);

      let release;
      const ready = new Promise((r) => { release = r; });
      release();

      this.slots.push({ name, ready, release, executions: 0, recycling: false });
    }
  }

  _nextSlot() {
    const slot = this.slots[this.roundRobin % this.size];
    this.roundRobin++;
    return slot;
  }

  /**
   * Execute a single run (code + stdin) on the pool.
   * Used internally by both /run and /run-tests.
   */
  async execute(code, stdin = "") {
    const lang = LANGUAGES[this.language];
    const slot = this._nextSlot();

    const previous = slot.ready;
    let release;
    slot.ready = new Promise((r) => { release = r; });

    await previous;

    const uuid = crypto.randomUUID();
const filename = this.language === "java"
  ? javaFilename(code, uuid)
  : `${uuid}.${lang.ext}`;

   const binary = this.language === "java"
  ? filename.replace(".java", "")
  : crypto.randomUUID();

    let result;

    try {
      await copyCode(slot.name, filename, code);
      result = await runProcess(
        "docker",
        ["exec", "-i", slot.name, ...lang.command(filename, binary)],
        stdin,
      );
    } finally {
      await cleanupTmp(slot.name);
      slot.executions++;

      if (slot.executions >= RECYCLE_AFTER && !slot.recycling) {
        slot.recycling = true;
        setImmediate(() => this._recycle(slot));
      }

      release();
    }

    return result;
  }

  /**
   * Run multiple test cases against the same code, sequentially on one slot.
   * The code is copied once; each test case feeds a different stdin.
   *
   * Returns an array of per-testcase result objects.
   */
  async executeTests(code, testCases) {
    const lang = LANGUAGES[this.language];
    const slot = this._nextSlot();

    const previous = slot.ready;
    let release;
    slot.ready = new Promise((r) => { release = r; });

    await previous;

    const filename = `${crypto.randomUUID()}.${lang.ext}`;

    // For compiled languages the binary name stays the same across test cases —
    // we compile once and run N times.
    const binary = crypto.randomUUID();

    const results = [];

    try {
      // ── Copy source once ──────────────────────────────────────────────────
      await copyCode(slot.name, filename, code);

      // ── For compiled languages: compile once, then run N times ───────────
      const isCompiled = ["c", "cpp", "java", "kotlin"].includes(this.language);

      if (isCompiled) {
        let compileCmd;
if (this.language === "c") {
  compileCmd = `gcc /tmp/${filename} -O2 -pipe -s -o /tmp/${binary} -lm`;
} else if (this.language === "cpp") {
  compileCmd = `g++ /tmp/${filename} -O2 -pipe -s -o /tmp/${binary}`;
} else if (this.language === "java") {
  compileCmd = `javac /tmp/${filename}`;
} else if (this.language === "kotlin") {
  compileCmd = `kotlinc /tmp/${filename} -include-runtime -d /tmp/${binary}.jar 2>/dev/null`;
}

        const compileResult = await runProcess(
          "docker",
          ["exec", "-i", slot.name, "sh", "-c", compileCmd],
        );

        // If compilation fails, mark ALL test cases as failed with the same error
        if (compileResult.exitCode !== 0) {
          for (let i = 0; i < testCases.length; i++) {
            results.push({
              index: i,
              passed: false,
              status: "compile_error",
              stdin: testCases[i].input,
              expectedOutput: testCases[i].output,
              actualOutput: "",
              stderr: compileResult.stderr,
              exitCode: compileResult.exitCode,
              timedOut: false,
              outputExceeded: false,
              elapsed: 0,
            });
          }
          return results;
        }
      }

      // ── Run each test case ────────────────────────────────────────────────
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const stdin = tc.input ?? "";
        const expected = normalizeOutput(tc.output ?? "");

        const runCmd = (() => {
  if (!isCompiled) return ["exec", "-i", slot.name, ...lang.command(filename, binary)];
  if (this.language === "java")   return ["exec", "-i", slot.name, "timeout", "10s", "java", "-cp", "/tmp", binary];
  if (this.language === "kotlin") return ["exec", "-i", slot.name, "timeout", "15s", "java", "-jar", `/tmp/${binary}.jar`];
  return ["exec", "-i", slot.name, "timeout", "5s", `/tmp/${binary}`];
})();

        const t0 = Date.now();
        const runResult = await runProcess("docker", runCmd, stdin);
        const elapsed = Date.now() - t0;

        const actual = normalizeOutput(runResult.stdout);
        const passed = !runResult.timedOut
          && !runResult.outputExceeded
          && runResult.exitCode === 0
          && actual === expected;

        results.push({
          index: i,
          passed,
          status: deriveStatus(runResult, passed),
          stdin,
          expectedOutput: tc.output ?? "",
          actualOutput: runResult.stdout,
          stderr: runResult.stderr,
          exitCode: runResult.exitCode,
          signal: runResult.signal,
          timedOut: runResult.timedOut || false,
          outputExceeded: runResult.outputExceeded || false,
          elapsed,
        });
      }
    } finally {
      await cleanupTmp(slot.name);
      slot.executions += testCases.length;

      if (slot.executions >= RECYCLE_AFTER && !slot.recycling) {
        slot.recycling = true;
        setImmediate(() => this._recycle(slot));
      }

      release();
    }

    return results;
  }

  async _recycle(slot) {
    const index = this.slots.indexOf(slot);
    console.log(`[pool:${this.language}:${index}] recycling after ${slot.executions} executions`);
    try {
      await removeContainer(slot.name);
      await startContainer(slot.name, this.language);
      slot.executions = 0;
      slot.recycling = false;
      console.log(`[pool:${this.language}:${index}] recycled OK`);
    } catch (err) {
      console.error(`[pool:${this.language}:${index}] recycle failed`, err);
      setTimeout(() => this._recycle(slot), 5000);
    }
  }

  async destroy() {
    for (let i = 0; i < this.size; i++) {
      const name = this.slotName(i);
      try { await removeContainer(name); } catch {}
    }
  }

  status() {
    return this.slots.map((s) => ({
      name: s.name,
      executions: s.executions,
      recycling: s.recycling,
    }));
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Trim trailing whitespace / normalise line endings for comparison */
function normalizeOutput(str) {
  return (str || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

function deriveStatus(result, passed) {
  if (result.timedOut) return "time_limit_exceeded";
  if (result.outputExceeded) return "output_limit_exceeded";
  if (result.exitCode !== 0) return "runtime_error";
  if (!passed) return "wrong_answer";
  return "accepted";
}

// ─────────────────────────────────────────────
// Pool registry
// ─────────────────────────────────────────────

const pools = {};

async function initPools() {
  for (const language of Object.keys(LANGUAGES)) {
    pools[language] = new ContainerPool(language, POOL_SIZE);
    await pools[language].init();
  }
}

async function destroyPools() {
  for (const pool of Object.values(pools)) {
    await pool.destroy();
  }
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

function validate(body) {
  const { language, code, stdin } = body || {};
  if (!language || !LANGUAGES[language]) return "Unsupported language";
  if (typeof code !== "string" || !code.trim()) return "Code must be non-empty";
  if (code.length > MAX_CODE_LENGTH) return `Code exceeds ${MAX_CODE_LENGTH} byte limit`;
  if (stdin !== undefined && typeof stdin !== "string") return "stdin must be a string";
  return null;
}

function validateTests(body) {
  const { language, code, testCases } = body || {};
  if (!language || !LANGUAGES[language]) return "Unsupported language";
  if (typeof code !== "string" || !code.trim()) return "Code must be non-empty";
  if (code.length > MAX_CODE_LENGTH) return `Code exceeds ${MAX_CODE_LENGTH} byte limit`;
  if (!Array.isArray(testCases) || testCases.length === 0)
    return "testCases must be a non-empty array";
  if (testCases.length > MAX_TEST_CASES)
    return `testCases exceeds the limit of ${MAX_TEST_CASES}`;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (typeof tc !== "object" || tc === null)
      return `testCases[${i}] must be an object`;
    if (tc.input !== undefined && typeof tc.input !== "string")
      return `testCases[${i}].input must be a string`;
    if (tc.output !== undefined && typeof tc.output !== "string")
      return `testCases[${i}].output must be a string`;
  }
  return null;
}

// ─────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

app.use("/run", limiter);
app.use("/run-tests", limiter); // shared budget — same window

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.get("/health", (_req, res) => {
  const poolStatus = {};
  for (const [lang, pool] of Object.entries(pools)) {
    poolStatus[lang] = pool.status();
  }
  res.json({ status: "ok", poolSize: POOL_SIZE, pools: poolStatus });
});

// Single run (unchanged behaviour)
app.post("/run", async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });

  const { language, code, stdin = "" } = req.body;
  const pool = pools[language];
  if (!pool) return res.status(503).json({ error: "Pool not ready" });

  const queuedAt = Date.now();
  try {
    const result = await pool.execute(code, stdin);
    return res.json({
      elapsed: Date.now() - queuedAt,
      exitCode: result.exitCode,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: result.timedOut || false,
      outputExceeded: result.outputExceeded || false,
    });
  } catch (err) {
    console.error("[/run]", err);
    return res.status(500).json({ error: "Execution failed" });
  }
});
 
app.post("/run-tests", async (req, res) => {
  const error = validateTests(req.body);
  if (error) return res.status(400).json({ error });

  const { language, code, testCases } = req.body;
  const pool = pools[language];
  if (!pool) return res.status(503).json({ error: "Pool not ready" });

  const batchStart = Date.now();
  try {
    const results = await pool.executeTests(code, testCases);
    const passed = results.filter((r) => r.passed).length;

    return res.json({
      totalElapsed: Date.now() - batchStart,
      passed,
      failed: results.length - passed,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error("[/run-tests]", err);
    return res.status(500).json({ error: "Test execution failed" });
  }
});

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[shutdown] received ${signal}`);
  await destroyPools();
  console.log("[shutdown] all containers removed");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────

(async () => {
  console.log(`[boot] starting ${POOL_SIZE} containers per language...`);
  await initPools();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[boot] judge running on port ${PORT}`);
  });
})();