import React, { useState, useEffect } from 'react';
import * as dataClient from '@/lib/dataClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export default function PoolJoin() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [pool, setPool] = useState(null);
  // status: 'loading' | 'ready' | 'joining' | 'error' | 'notfound'
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    dataClient.auth.me()
      .then(u => {
        setCurrentUser(u);
        if (!code) {
          setStatus('notfound');
          return;
        }
        return dataClient.Pool.findByInviteCode(code.toUpperCase())
          .then(p => { setPool(p); setStatus('ready'); })
          .catch(() => setStatus('notfound'));
      })
      .catch(() => dataClient.auth.redirectToLogin());
  }, [code]);

  const handleJoin = async () => {
    setStatus('joining');
    try {
      await dataClient.PoolMember.create({ pool_id: pool.id, user_email: currentUser.email });
    } catch (err) {
      // Unique constraint = already a member; redirect anyway
      if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) {
        setStatus('error');
        setErrorMsg(err.message);
        return;
      }
    }
    navigate(`/Pools/${pool.id}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-4">
        <Trophy className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Invalid invite link</p>
        <p className="text-muted-foreground text-sm text-center">
          This invite code is not valid or has expired.
        </p>
        <Link to="/Pools">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />My Pools</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-4">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <div>
            <h2 className="text-xl font-bold">{pool?.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">You've been invited to join this pool</p>
          </div>
          {status === 'error' && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={status === 'joining'}
          >
            {status === 'joining' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Join Pool
          </Button>
          <Link to="/Pools">
            <Button variant="ghost" size="sm" className="w-full">Cancel</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
