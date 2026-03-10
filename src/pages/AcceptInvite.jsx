import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient } from '@/lib/backends/supabaseBackend';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    async function hydrateSession() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type !== 'invite' || !accessToken || !refreshToken) {
        setError('Invalid or expired invite link.');
        return;
      }

      const { error } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setError('Invalid or expired invite link.');
      } else {
        setSessionReady(true);
      }
    }

    hydrateSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      await checkAppState();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to set password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-slate-900 border-slate-800">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            <span className="text-2xl font-bold text-white tracking-tight">AlphaSpread</span>
          </div>

          {error && !sessionReady ? (
            <p className="text-sm text-red-400 text-center">{error}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400 text-center mb-2">Set your password to complete account setup.</p>

              <div className="space-y-2">
                <label className="text-sm text-slate-400" htmlFor="password">New Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400" htmlFor="confirm-password">Confirm Password</label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !sessionReady}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting password...</>
                ) : (
                  'Set Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
