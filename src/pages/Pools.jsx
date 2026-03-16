import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as dataClient from '@/lib/dataClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Users, Trophy, Loader2, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { generateInviteCode } from '@/lib/alpha';

export default function Pools() {
  const [currentUser, setCurrentUser] = useState(null);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    dataClient.auth.me().then(setCurrentUser).catch(() => {
      dataClient.auth.redirectToLogin();
    });
  }, []);

  const { data: memberRows = [], isLoading: membersLoading } = useQuery({
    queryKey: ['poolMembers', currentUser?.email],
    queryFn: () => dataClient.PoolMember.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: allPools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: () => dataClient.Pool.list(),
    enabled: !!currentUser,
  });

  const myPoolIds = new Set(memberRows.map(m => m.pool_id));
  const myPools = allPools.filter(p => myPoolIds.has(p.id));

  const createMutation = useMutation({
    mutationFn: async (name) => {
      const pool = await dataClient.Pool.create({
        name,
        created_by: currentUser.email,
        invite_code: generateInviteCode(),
        sport: 'ncaab',
        season: '2026',
      });
      await dataClient.PoolMember.create({ pool_id: pool.id, user_email: currentUser.email });
      return pool;
    },
    onSuccess: (pool) => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      queryClient.invalidateQueries({ queryKey: ['poolMembers'] });
      setCreateOpen(false);
      setCreateName('');
      navigate(`/Pools/${pool.id}`);
    },
    onError: (err) => setCreateError(err.message),
  });

  const joinMutation = useMutation({
    mutationFn: async (code) => {
      const pool = await dataClient.Pool.findByInviteCode(code.trim().toUpperCase());
      try {
        await dataClient.PoolMember.create({ pool_id: pool.id, user_email: currentUser.email });
      } catch (err) {
        // Unique constraint = already a member; treat as success
        if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) throw err;
      }
      return pool;
    },
    onSuccess: (pool) => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      queryClient.invalidateQueries({ queryKey: ['poolMembers'] });
      setJoinOpen(false);
      setJoinCode('');
      navigate(`/Pools/${pool.id}`);
    },
    onError: (err) =>
      setJoinError(err.message?.includes('No rows') || err.message?.includes('JSON')
        ? 'Invalid invite code.'
        : err.message),
  });

  const isLoading = membersLoading || poolsLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">My Pools</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={(v) => { setJoinOpen(v); setJoinError(''); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Link2 className="w-4 h-4" />
                  Join
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Pool</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Enter invite code (e.g. ABC12345)"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && joinCode.trim() && joinMutation.mutate(joinCode)}
                  />
                  {joinError && <p className="text-sm text-destructive">{joinError}</p>}
                  <Button
                    className="w-full"
                    onClick={() => joinMutation.mutate(joinCode)}
                    disabled={!joinCode.trim() || joinMutation.isPending}
                  >
                    {joinMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Join Pool
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); setCreateError(''); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Pool</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Pool name (e.g. Office March Madness)"
                    value={createName}
                    onChange={e => { setCreateName(e.target.value); setCreateError(''); }}
                    onKeyDown={e => e.key === 'Enter' && createName.trim() && createMutation.mutate(createName)}
                  />
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate(createName)}
                    disabled={!createName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create Pool
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : myPools.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No pools yet</h3>
            <p className="text-muted-foreground mb-6">Create a pool or join one with an invite code.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPools.map(pool => (
              <Link key={pool.id} to={`/Pools/${pool.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pool.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Code: {pool.invite_code} · {pool.season}
                      </p>
                    </div>
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
