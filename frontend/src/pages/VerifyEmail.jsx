import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../config/axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // "idle" | "verifying" | "success" | "error"
  const [message, setMessage] = useState("");

  const handleVerify = () => {
    setStatus("verifying");
    API.get(`/auth/verify/${token}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.message ?? "Verification failed. Please register again."
        );
      });
  };

  return (
    <div>
      {status === "idle" && (
        <div>
          <p>Click below to verify your email address.</p>
          <button onClick={handleVerify}>Verify my email</button>
        </div>
      )}
      {status === "verifying" && <p>Verifying your email…</p>}
      {status === "success" && <p>✓ {message} — redirecting to login…</p>}
      {status === "error" && <p>✗ {message}</p>}
    </div>
  );
}