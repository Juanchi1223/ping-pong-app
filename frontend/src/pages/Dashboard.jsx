import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useRealtimeRankings } from '../hooks/useRealtimeRankings';
import PageHeader from '../components/ui/PageHeader';
import BadgeStrip from '../components/ui/BadgeStrip';
import Podium from '../components/ui/Podium';
import RankingTable from '../components/ui/RankingTable';
import EmptyState from '../components/common/EmptyState';
import { PageLoader, PageError } from '../components/common/Loader';

function deriveBadges(players) {
  const bestDiff = players.find(p => p.badges?.bestDiff);
  const onFire = players.find(p => p.badges?.onFire);
  const badStreak = players.find(p => p.badges?.badStreak);
  return {
    wall: bestDiff ? { player: bestDiff, stat: `+${bestDiff.diff} pts` } : null,
    fire: onFire ? { player: onFire, stat: `${onFire.current_win_streak} consecutive` } : null,
    cold: badStreak ? { player: badStreak, stat: `${badStreak.current_loss_streak} consecutive` } : null,
  };
}

function buildBadgesMap(players) {
  const out = {};
  players.forEach(p => {
    if (p.badges?.bestDiff) out.wall = p.id;
    if (p.badges?.onFire) out.fire = p.id;
    if (p.badges?.badStreak) out.cold = p.id;
  });
  return out;
}

export default function Dashboard() {
  const [selectedSeason, setSelectedSeason] = useState(2); // Default to Season 2
  const [players, setPlayers] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadSeasonData = useCallback((seasonId) => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getPlayers({ season: seasonId }),
      api.getMatches({ season: seasonId }),
    ])
      .then(([pList, mList]) => {
        setPlayers(pList);
        setMatchCount(mList.length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSeasonData(selectedSeason);
  }, [selectedSeason, loadSeasonData]);

  // Realtime updates if viewing active Season 2
  const { data: liveRankings } = useRealtimeRankings();
  useEffect(() => {
    if (liveRankings && selectedSeason === 2) {
      setPlayers(liveRankings);
    }
  }, [liveRankings, selectedSeason]);

  const badges = deriveBadges(players);
  const badgesMap = buildBadgesMap(players);
  const top3 = players.slice(0, 3);
  const tail = players.slice(3);

  const seasonSelector = (
    <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <button
        type="button"
        onClick={() => setSelectedSeason(2)}
        className="label-eyebrow"
        style={{
          padding: '6px 10px',
          borderRadius: 3,
          background: selectedSeason === 2 ? 'var(--accent)' : 'transparent',
          color: selectedSeason === 2 ? '#0a0a0d' : 'var(--text-2)',
          border: 0,
          cursor: 'pointer',
          fontWeight: selectedSeason === 2 ? 700 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        <span className="hidden sm:inline">SEASON 2 (ACTIVE)</span>
        <span className="sm:hidden">S2 (ACTIVE)</span>
      </button>
      <button
        type="button"
        onClick={() => setSelectedSeason(1)}
        className="label-eyebrow"
        style={{
          padding: '6px 10px',
          borderRadius: 3,
          background: selectedSeason === 1 ? 'var(--accent)' : 'transparent',
          color: selectedSeason === 1 ? '#0a0a0d' : 'var(--text-2)',
          border: 0,
          cursor: 'pointer',
          fontWeight: selectedSeason === 1 ? 700 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        <span className="hidden sm:inline">SEASON 1 (ARCHIVE)</span>
        <span className="sm:hidden">S1 (ARCHIVE)</span>
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        eyebrow={`LEADERBOARD · SEASON ${selectedSeason} ${selectedSeason === 1 ? '(ARCHIVE)' : '(ACTIVE)'}`}
        title="PingPongZS"
        sub={`${players.length} players · ${matchCount} matches recorded in Season ${selectedSeason}`}
        right={seasonSelector}
        hideEyebrowOnMobile
        hideSubOnMobile
      />

      <div className="scrollarea" style={{ flex: 1 }}>
        {loading ? (
          <PageLoader />
        ) : error ? (
          <PageError message={error} />
        ) : players.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState message={`No match records for Season ${selectedSeason} yet.`} />
          </div>
        ) : (
          <>
            <BadgeStrip badges={badges} />

            {/* Desktop table */}
            <div className="hidden md:block" style={{ padding: '16px 24px 24px' }}>
              <RankingTable
                players={players}
                variant="desktop"
                badges={badgesMap}
                onOpenPlayer={id => navigate(`/players/${id}`)}
              />
            </div>

            {/* Mobile: podium + challengers */}
            <div className="md:hidden">
              <Podium top3={top3} onPick={id => navigate(`/players/${id}`)} />

              <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="label-eyebrow">CHALLENGERS</div>
                <div className="label-eyebrow" style={{ color: 'var(--text-3)' }}>MMR · W-L · STK</div>
              </div>

              <RankingTable
                players={tail}
                variant="mobile"
                podium
                badges={badgesMap}
                onOpenPlayer={id => navigate(`/players/${id}`)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
