import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import '../styles/auth.css';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, verifyOtp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      // AuthContext sets user → App.jsx re-renders → dashboard appears automatically
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Verify OTP</h1>
            <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
          </div>

          <form onSubmit={handleOtp}>
            <div className="form-group">
              <label className="form-label">One-Time Password</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <FiLock size={18} />
                </div>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="______"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // digits only
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && <p style={{ color: '#ff3555', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
          </form>

          <div className="auth-footer">
            Wrong email?{' '}
            <button
              className="auth-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Credentials Step ───────────────────────────────────────────────────────
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Login</h1>
        </div>

        <form onSubmit={handleLogin}>
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
                type={showPassword ? 'text' : 'password'}
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
          </div>

          <div className="flex-between">
            <label className="checkbox-group">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          {error && <p style={{ color: '#ff3555', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending OTP…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;