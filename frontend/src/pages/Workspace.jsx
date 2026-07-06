// src/pages/Workspace.jsx
import { useEffect, useState, useRef } from "react";
import { Layout, Model } from "flexlayout-react";
import "flexlayout-react/style/dark.css";

import "../styles/code-editor.css";
import "../styles/flex-layout.css";

import CodeEditor from "../components/CodeEditor";
import Output from "../components/Output";
import ProblemDescription from "../components/ProblemDescription";
import TestCases from "../components/TestCases";
import { useParams } from "react-router-dom";
import { API } from "../config/axios";

// All judge calls now go through YOUR backend — no direct judge access from frontend.
// Backend stitches header + userCode + driver before forwarding to judge.

const layoutJson = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
    tabEnableDrag: true,
  },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 40,
        children: [
          { type: "tab", name: "Problem", component: "ProblemDescription" },
        ],
      },
      {
        type: "row",
        weight: 60,
        orientation: "column",
        children: [
          {
            type: "tabset",
            weight: 60,
            children: [
              { type: "tab", name: "Editor", component: "CodeEditor" },
            ],
          },
          {
            type: "tabset",
            weight: 40,
            children: [
              { type: "tab", name: "Testcases", component: "TestCases" }
               
            ],
          },
        ],
      },
    ],
  },
};

export default function Workspace() {
  const [model] = useState(() => Model.fromJson(layoutJson));
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isErrorOutput, setIsErrorOutput] = useState(false);
  const [submitResults, setSubmitResults] = useState(null);

  // { code, judgeKey } — judgeKey is judge-ready: "javascript", "python", "cpp" etc.
  const codeRef = useRef({ code: "", judgeKey: "cpp" });

  const { slug } = useParams();

  useEffect(() => {
    async function loadProblem() {
      try {
        setLoading(true);
        setProblem(null);
        setSubmitResults(null);
        setTerminalOutput("");
        setIsErrorOutput(false);
        const res = await API.get(`/problemSet/${slug}`);
        setProblem(res.data.data);
        console.log(res.data);
      } catch (error) {
        console.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [slug]);

  function handleCodeChange(code, judgeKey) {
    codeRef.current = { code, judgeKey };
  }

  // /run — free run, backend stitches code, returns stdout/stderr
  async function handleRun(code, judgeKey, customCases = []) {
    codeRef.current = { code, judgeKey };
    setIsRunning(true);
    setTerminalOutput("");
    setIsErrorOutput(false);
    setSubmitResults(null);

    try {
      const res = await API.post(`/problemSet/${slug}/run`, {
        language: judgeKey,
        code,
        customCases,
      });
      const data = res.data;

      setSubmitResults(data.results || []);

      const fail = data.firstFailure;
      if (fail?.status === "compile_error") {
        setIsErrorOutput(true);
        setTerminalOutput(fail.stderr || "Compile error");
      } else if (fail?.status === "time_limit_exceeded") {
        setIsErrorOutput(true);
        setTerminalOutput("Time Limit Exceeded");
      } else if (fail?.status === "runtime_error") {
        setIsErrorOutput(true);
        setTerminalOutput(fail.stderr || "Runtime Error");
      } else if (data.verdict === "accepted" || !fail) {
        setIsErrorOutput(false);
        setTerminalOutput(`All ${data.total} test cases passed`);
      } else {
        setIsErrorOutput(true);
        setTerminalOutput(
          `${data.passed}/${data.total} passed\n` +
            (fail.stderr || fail.actualOutput || "Wrong answer"),
        );
      }
    } catch (err) {
      setIsErrorOutput(true);
      setTerminalOutput(err.response?.data?.error || err.message);
    } finally {
      setIsRunning(false);
    }
  }

  // /submit — backend fetches hidden cases, stitches code, runs all cases
  async function handleSubmit() {
    const { code, judgeKey } = codeRef.current;

    if (!code.trim()) {
      setIsErrorOutput(true);
      setTerminalOutput("Please write some code before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitResults(null);

    try {
      const res = await API.post(`/problemSet/${slug}/submit`, {
        language: judgeKey,
        code,
      });
      const data = res.data;

      // Backend only returns firstFailure, not full results array.
      // Build a synthetic array so TestCases tab dots render correctly.
      const syntheticResults = Array.from({ length: data.total }, (_, i) => {
        if (i < data.passed)
          return { index: i, passed: true, status: "accepted" };
        if (data.firstFailure && i === data.passed)
          return { index: i, passed: false, ...data.firstFailure };
        return { index: i, passed: false, status: "wrong_answer" };
      });

      setSubmitResults(syntheticResults);

      // Show verdict in Output tab too
      setIsErrorOutput(data.verdict !== "accepted");
      setTerminalOutput(
        data.verdict === "accepted"
          ? `Accepted — ${data.passed}/${data.total} passed`
          : `${data.verdict.replace(/_/g, " ")} — ${data.passed}/${data.total} passed`,
      );
    } catch (err) {
      setIsErrorOutput(true);
      setTerminalOutput(err.response?.data?.error || err.message);
      console.error("[submit error]", err);
    } finally {
      setIsSubmitting(false);
    }
  }
  

  function clearOutput() {
    setTerminalOutput("");
    setIsErrorOutput(false);
  }

  const factory = (node) => {
    switch (node.getComponent()) {
      case "ProblemDescription":
        return <ProblemDescription key={slug} problem={problem} />;
      case "CodeEditor":
        return (
          <CodeEditor
            onRun={handleRun}
            onSubmit={handleSubmit} // ← lifted here
            isRunning={isRunning}
            isSubmitting={isSubmitting} // ← lifted here
            onCodeChange={handleCodeChange}
            problem={problem}
          />
        );

      case "TestCases":
        return (
          <TestCases
            problem={problem}
            onRun={(customCases) => {
              // ← wrapper: pulls code+judgeKey from codeRef
              const { code, judgeKey } = codeRef.current;
              handleRun(code, judgeKey, customCases);
            }}
            submitResults={submitResults}
            isSubmitting={isSubmitting}
          />
        );
      case "Output":
        return (
          <Output
            terminalOutput={terminalOutput}
            isErrorOutput={isErrorOutput}
            clearOutput={clearOutput}
          />
        );

      default:
        return <div className="placeholder">{node.getName()}</div>;
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "85vw",
        height: "100vh",
        margin: "10px",
      }}
    >
      {<Layout model={model} factory={factory} />}
    </div>
  );
}
