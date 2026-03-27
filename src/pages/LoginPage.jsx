import { useState } from 'react';
import styles from './LoginPage.module.css';
import logo from '../assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function LoginPage({ onLogin }) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/auth/google/signin?intent=login`;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.token) localStorage.setItem('bd_token', data.token);
      onLogin(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src={logo} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span className={styles.logoText}>BrandDesk</span>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your support inbox</p>

        <button className={styles.googleBtn} onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        {!showEmail ? (
          <p style={{ textAlign: 'center', fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            <button
              onClick={() => setShowEmail(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'underline',
              }}>
              Sign in with email instead
            </button>
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleEmailLogin} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email" required placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password" required placeholder="Your password"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in\u2026' : 'Sign in'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, margin: 0 }}>
              <button
                type="button" onClick={() => { setShowEmail(false); setError(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--text-tertiary)', fontSize: 12,
                }}>
                Back to Google sign-in
              </button>
            </p>
          </form>
        )}

        <p className={styles.signupHint}>
          Don't have an account? <a href={`${API_URL}/auth/google/signin?intent=signup`}>Sign up</a>
        </p>
      </div>
    </div>
  );
}
