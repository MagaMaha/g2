
import React, { useState, useEffect } from 'react';
import { supabase, TruckIcon } from '../lib';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for errors in URL hash (e.g. from email confirmation redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('error_description')) {
        try {
            const params = new URLSearchParams(hash.substring(1)); // remove #
            const errorDesc = params.get('error_description');
            if (errorDesc) {
                setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
            }
        } catch (e) {
            console.error('Error parsing hash:', e);
        }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (data && !data.session && data.user) {
           alert('Registration successful! Please check your email for the confirmation link.');
           setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
            <TruckIcon />
        </div>
        <h2>{isSignUp ? 'Create Account' : 'Routes & Drivers Login'}</h2>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="form-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="form-btn save-btn" disabled={loading}>
            {loading ? (isSignUp ? 'Creating Account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        <div style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--subtle-text-color)' }}>
            {isSignUp ? (
                <span>Already have an account? <button className="link-style-button" onClick={() => { setIsSignUp(false); setError(null); }}>Sign In</button></span>
            ) : (
                <span>Don't have an account? <button className="link-style-button" onClick={() => { setIsSignUp(true); setError(null); }}>Sign Up</button></span>
            )}
        </div>
      </div>
    </div>
  );
};