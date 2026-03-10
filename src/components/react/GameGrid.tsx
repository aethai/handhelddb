import { useState, useEffect, useRef } from 'react';

interface Game {
  slug: string;
  name: string;
  headerImage: string | null;
  genres: string[];
  developers: string;
  metacritic: number | null;
}

interface ConsensusEntry {
  fps_avg: number;
  fps_low: number | null;
  recommended_preset: string | null;
  recommended_tdp: number | null;
  estimated_battery: number | null;
  overall_verdict: string | null;
  report_count: number;
  confidence_level: string | null;
  devices: { slug: string; name: string };
}

const fc = (f: number) =>
  f >= 55 ? '#22c55e' : f >= 40 ? '#eab308' : f >= 30 ? '#f97316' : '#ef4444';

const tierMap: Record<string, string> = {
  excellent: 'Portable Perfect',
  good: 'Commute Ready',
  fair: 'Playable',
  poor: 'Rough Ride',
  unplayable: 'Unplayable',
};

function Ct({ v }: { v: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => { done.current = false; setN(0); }, [v]);

  useEffect(() => {
    if (!ref.current || done.current) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const t = performance.now();
        const r = (now: number) => {
          const p = Math.min((now - t) / 500, 1);
          setN(Math.round((1 - (1 - p) ** 3) * v));
          if (p < 1) requestAnimationFrame(r);
        };
        requestAnimationFrame(r);
      }
    });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [v]);

  return <span ref={ref}>{n}</span>;
}

export default function GameGrid({ games }: { games: Game[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const [consensus, setConsensus] = useState<ConsensusEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [mob, setMob] = useState(false);

  useEffect(() => {
    const check = () => setMob(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!sel) { setConsensus([]); return; }
    setLoading(true);
    fetch(`/api/consensus?game=${sel}`)
      .then(r => r.json())
      .then(d => setConsensus(d.data ?? []))
      .catch(() => setConsensus([]))
      .finally(() => setLoading(false));
  }, [sel]);

  // Primary device: Steam Deck OLED, fallback to first entry
  const deckSlugs = ['steam-deck-oled', 'steam-deck-lcd'];
  const primary = consensus.find(c => deckSlugs.includes(c.devices?.slug)) ?? consensus[0];
  const others = consensus.filter(c => c !== primary);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mob ? 'repeat(auto-fill,minmax(160px,1fr))' : 'repeat(auto-fill,minmax(210px,1fr))',
      gap: 10,
      marginBottom: 10,
    }}>
      {games.map((g, i) => {
        const isA = sel === g.slug;
        const gc = primary && isA ? fc(primary.fps_avg) : fc(g.metacritic ?? 0);
        const tierInfo = g.metacritic && g.metacritic >= 90
          ? { label: 'TOP RATED', color: '#4ade80' }
          : g.metacritic && g.metacritic >= 80
          ? { label: 'GREAT', color: '#a3e635' }
          : { label: 'GOOD', color: '#facc15' };

        return (
          <div
            key={g.slug}
            onClick={() => setSel(isA ? null : g.slug)}
            style={{
              borderRadius: mob ? 12 : 14,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              gridColumn: isA ? '1 / -1' : 'auto',
              border: isA ? `1px solid ${gc}20` : '1px solid rgba(255,255,255,0.06)',
              boxShadow: isA ? `0 0 30px ${gc}08` : 'none',
              animation: `rise 0.3s ease ${i * 0.04}s both`,
            }}
          >
            {/* COLLAPSED */}
            {!isA && (
              <>
                <div style={{ position: 'relative', height: mob ? 90 : 110, overflow: 'hidden' }}>
                  {g.headerImage ? (
                    <img src={g.headerImage} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, var(--color-raised), var(--color-border))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800,
                        color: '#ffffff12', letterSpacing: '0.06em', textTransform: 'uppercase',
                        userSelect: 'none',
                      }}>{g.name}</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 10%, var(--color-raised))' }} />
                  {g.metacritic && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      display: 'flex', alignItems: 'baseline', gap: 2,
                      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: mob ? 16 : 18, fontWeight: 800,
                        color: fc(g.metacritic), textShadow: `0 0 12px ${fc(g.metacritic)}40`,
                        letterSpacing: '-0.03em',
                      }}>{g.metacritic}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-2)' }}>mc</span>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.06em', color: tierInfo.color,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>{tierInfo.label}</div>
                </div>
                <div style={{ padding: '8px 12px 12px', background: 'var(--color-raised)' }}>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontSize: mob ? 15 : 14, fontWeight: 700,
                    color: '#e0dce8', marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{g.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-3)' }}>
                    {g.genres.join(' · ')}
                  </div>
                </div>
              </>
            )}

            {/* EXPANDED */}
            {isA && (
              <div style={{
                display: 'flex',
                flexDirection: mob ? 'column' : 'row',
                background: 'var(--color-raised)',
              }}>
                {/* Left: Game art */}
                <div style={{
                  position: 'relative',
                  width: mob ? '100%' : 280,
                  height: mob ? 160 : 'auto',
                  minHeight: mob ? 0 : 200,
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {g.headerImage ? (
                    <img src={g.headerImage} alt={g.name} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      position: 'absolute', inset: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, var(--color-raised), var(--color-border))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800,
                        color: '#ffffff12', letterSpacing: '0.06em', textTransform: 'uppercase',
                        userSelect: 'none',
                      }}>{g.name}</span>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: mob
                      ? 'linear-gradient(transparent 30%, var(--color-raised))'
                      : 'linear-gradient(90deg, transparent 40%, var(--color-raised))',
                  }} />
                  <div style={{ position: 'absolute', bottom: mob ? 12 : 16, left: mob ? 12 : 16 }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)', fontSize: mob ? 18 : 20, fontWeight: 800,
                      color: '#fff', textShadow: '0 2px 8px #00000080', marginBottom: 2,
                    }}>{g.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ffffffaa' }}>
                      {g.genres.join(' · ')} · {g.developers} · {g.metacritic}
                    </div>
                  </div>
                </div>

                {/* Right: Performance details */}
                <div style={{
                  flex: 1, padding: mob ? 16 : '20px 24px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  gap: mob ? 12 : 14,
                }}>
                  {loading ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-3)',
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid var(--color-text-dim)', borderTopColor: '#D4FF00',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Loading performance data...
                    </div>
                  ) : primary ? (
                    <>
                      {/* FPS + Tier */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: mob ? 40 : 48, fontWeight: 800,
                          color: gc, textShadow: `0 0 30px ${gc}30`,
                          letterSpacing: '-0.05em', lineHeight: 1,
                        }}><Ct v={primary.fps_avg} /></span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-3)' }}>fps</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.08em', color: gc,
                          background: `${gc}12`, padding: '3px 8px', borderRadius: 4,
                        }}>
                          {(tierMap[primary.overall_verdict ?? ''] ?? 'Unknown').toUpperCase()}
                        </span>
                      </div>

                      {/* Battery / Power / Settings */}
                      <div style={{ display: 'flex', gap: mob ? 12 : 16, flexWrap: 'wrap' }}>
                        {[
                          [primary.estimated_battery ? `${primary.estimated_battery}h` : '—', 'Battery'],
                          [primary.recommended_tdp ? `${primary.recommended_tdp}W` : '—', 'Power'],
                          [
                            [
                              primary.recommended_preset ?? '',
                              '720p',
                              'FSR',
                            ].filter(Boolean).join(' · '),
                            'Settings',
                          ],
                        ].map(([v, l]) => (
                          <div key={l as string}>
                            <div style={{
                              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                              color: '#c8c4d4',
                            }}>{v}</div>
                            <div style={{
                              fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-dim)',
                              letterSpacing: '0.06em', marginTop: 1,
                            }}>{l}</div>
                          </div>
                        ))}
                      </div>

                      {/* ALSO ON */}
                      {others.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-dim)',
                            letterSpacing: '0.06em',
                          }}>ALSO ON</span>
                          {others.map(o => {
                            const shortName = o.devices?.name?.replace('Steam Deck ', '').replace('ASUS ', '') ?? '';
                            return (
                              <span key={o.devices?.slug} style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-3)',
                              }}>
                                {shortName}{' '}
                                <span style={{ color: fc(o.fps_avg), fontWeight: 700 }}>{o.fps_avg}</span>
                                <span style={{ color: 'var(--color-text-dim)' }}> fps</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* VIEW FULL REPORT */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <a
                          href={`/games/${g.slug}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '10px 20px', borderRadius: 8, border: 'none',
                            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.06em', color: 'var(--color-base)', background: gc,
                            cursor: 'pointer', boxShadow: `0 0 20px ${gc}25`,
                            textDecoration: 'none', display: 'inline-block',
                          }}
                        >VIEW FULL REPORT</a>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a4458' }}>
                          {primary.report_count} reports
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-3)' }}>
                      No performance data yet.{' '}
                      <a
                        href={`/report/new`}
                        onClick={e => e.stopPropagation()}
                        style={{ color: '#D4FF00', textDecoration: 'none' }}
                      >Be the first to report →</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
