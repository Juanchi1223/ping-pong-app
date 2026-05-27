import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatGrid from '../components/ui/StatGrid';
import MatchRow from '../components/ui/MatchRow';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import { PageLoader, PageError } from '../components/common/Loader';
import { Icons } from '../components/common/Icons';

export default function PlayerProfile() {
  const { id } = useParams();
  const numId = Number(id);
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => Promise.all([api.getPlayer(id), api.getPlayerMatches(id)])
    .then(([p, m]) => { setPlayer(p); setMatches(m); })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const handleDeleteMatch = async (matchId) => {
    if (!confirm('¿Borrar este partido? Se revertirán los cambios de MMR y estadísticas.')) return;
    setDeletingId(matchId);
    try { await api.deleteMatch(matchId); await load(); }
    catch (err) { alert(err.message); }
    finally { setDeletingId(null); }
  };

  if (loading) return <PageLoader />;
  if (error || !player) return <PageError message={error || 'Player not found'} />;

  const diff = (player.points_scored ?? 0) - (player.points_conceded ?? 0);
  const totalGames = player.wins + player.losses;
  const winPct = totalGames > 0 ? Math.round(player.wins / totalGames * 100) : 0;

  const stats = [
    { label: 'WINS',   value: player.wins,   color: 'var(--win)' },
    { label: 'LOSSES', value: player.losses,  color: 'var(--loss)' },
    { label: 'WIN %',  value: `${winPct}%` },
    { label: 'DIFF',   value: `${diff >= 0 ? '+' : ''}${diff}`, color: diff >= 0 ? 'var(--win)' : 'var(--loss)' },
    { label: 'GAMES',  value: totalGames },
    { label: 'STREAK', value: player.current_win_streak > 0 ? `W${player.current_win_streak}` : player.current_loss_streak > 0 ? `L${player.current_loss_streak}` : '—', color: player.current_win_streak > 0 ? 'var(--win)' : player.current_loss_streak > 0 ? 'var(--loss)' : 'var(--text-3)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <Link to="/players" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 12, textDecoration: 'none', padding: '4px 0' }}>
          <Icons.back style={{ width: 18, height: 18 }} /> PLAYERS
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, paddingTop: 10, paddingBottom: 14 }}>
          <Avatar name={player.name} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="disp-ex" style={{ fontSize: 24, lineHeight: 0.95, textTransform: 'uppercase' }}>{player.name}</div>
            <div className="label-eyebrow" style={{ marginTop: 4, color: 'var(--text-2)' }}>
              {player.department} · since {new Date(player.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="num" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1 }}>{player.mmr}</div>
            <div className="label-eyebrow" style={{ fontSize: 9 }}>MMR</div>
          </div>
        </div>
      </div>

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 16px' }}>
        <StatGrid items={stats} cols={3} />

        <div style={{ marginTop: 18, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label-eyebrow">MATCH HISTORY · {matches.length}</div>
        </div>

        {matches.length === 0 ? (
          <EmptyState icon="📋" message="No matches played yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                perspectiveId={numId}
                mode="profile"
                onDelete={handleDeleteMatch}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
