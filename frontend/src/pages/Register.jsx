import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import "../styles/auth.css";
import { useAuth } from "../context/AuthContext";


export default function Register () {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const getStrength = (password) => {
    if (!password) return { label: "", class: "" };

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;/]/.test(password);

    let score = 0;
    if (password.length >= 8) score++;
    if (hasLower) score++;
    if (hasUpper) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    if (score <= 2) return { label: "Weak", class: "weak" };
    if (score <= 4) return { label: "Medium", class: "medium" };
    return { label: "Strong", class: "strong" };
  };

  const strength = getStrength(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (strength.class === "weak") {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);
    try {
      const res = await register(name, email, password);
      setSuccess(res.message); // "A verification link has been sent to your email."
      // Don't navigate — user needs to check email first
    } catch (err) {
      setError(
        err.response?.data?.message ?? "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Success state ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Check your email</h1>
            <p>{success}</p>
          </div>
          <div className="auth-footer">
            Already verified?{" "}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Register form ───────────────────────────────────────────────────────────
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join us and start your journey</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <FiUser size={18} />
              </div>
              <input
                type="text"
                className="auth-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <FiMail size={18} />
              </div>
              <input
                type="email"
                className="auth-input"
                placeholder="abc@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <FiLock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {password && (
              <div className="strength-container">
                <div className="strength-bar-wrapper">
                  <div className={`strength-bar ${strength.class}`}></div>
                </div>
                <span className="strength-text">
                  Password strength: {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <FiLock size={18} />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={18} />
                ) : (
                  <FiEye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              style={{
                color: "#ff3555",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

 
