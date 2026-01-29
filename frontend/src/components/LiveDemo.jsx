import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';

export function LiveDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, allowed: 0, blocked: 0 });
  const [rps, setRps] = useState(10);
  const [bucketTokens, setBucketTokens] = useState(100);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  const BUCKET_CAPACITY = 100;
  const REFILL_RATE = 10; // tokens per second

  useEffect(() => {
    if (!isRunning) return;

    const requestInterval = 1000 / rps;

    intervalRef.current = setInterval(() => {
      const allowed = bucketTokens > 0;

      if (allowed) {
        setBucketTokens((t) => Math.max(0, t - 1));
      }

      const newRequest = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        allowed,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`
      };

      setRequests((prev) => [...prev.slice(-49), newRequest]);
      setStats((s) => ({
        total: s.total + 1,
        allowed: s.allowed + (allowed ? 1 : 0),
        blocked: s.blocked + (allowed ? 0 : 1)
      }));
    }, requestInterval);

    // Refill tokens
    const refillInterval = setInterval(() => {
      setBucketTokens((t) => Math.min(BUCKET_CAPACITY, t + REFILL_RATE / 10));
    }, 100);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(refillInterval);
    };
  }, [isRunning, rps, bucketTokens]);

  const reset = () => {
    setIsRunning(false);
    setRequests([]);
    setStats({ total: 0, allowed: 0, blocked: 0 });
    setBucketTokens(BUCKET_CAPACITY);
  };

  const blockRate = stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="card noise overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] relative z-10">
        <div className="flex items-center gap-3">
          <Zap size={16} className={isRunning ? 'phosphor animate-pulse' : 'text-[var(--text-tertiary)]'} />
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
            Live Demo // Token Bucket Visualization
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`btn text-xs py-1 px-3 flex items-center gap-2 ${isRunning ? 'btn-danger' : 'btn-primary'}`}
          >
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
            {isRunning ? 'Stop' : 'Start'}
          </button>
          <button onClick={reset} className="btn text-xs py-1 px-3">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 relative z-10">
        {/* Controls */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-tertiary)] uppercase">Requests/sec:</span>
            <input
              type="range"
              min="1"
              max="50"
              value={rps}
              onChange={(e) => setRps(parseInt(e.target.value))}
              className="w-32 accent-[var(--phosphor)]"
            />
            <span className="data-value text-sm w-8">{rps}</span>
          </div>
          <div className="h-6 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[var(--text-tertiary)]">Total: </span>
              <span className="data-value">{stats.total}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Allowed: </span>
              <span className="data-value phosphor-dim">{stats.allowed}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Blocked: </span>
              <span className="data-value alert-glow">{stats.blocked}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Block Rate: </span>
              <span className={`data-value ${parseFloat(blockRate) > 20 ? 'alert-glow' : 'amber-glow'}`}>
                {blockRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Token Bucket Visualization */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Token Bucket</span>
            <span className="text-xs">
              <span className="data-value phosphor-dim">{Math.floor(bucketTokens)}</span>
              <span className="text-[var(--text-tertiary)]"> / {BUCKET_CAPACITY}</span>
            </span>
          </div>
          <div className="h-8 bg-[var(--surface-0)] border border-[var(--border)] relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-100"
              style={{
                width: `${(bucketTokens / BUCKET_CAPACITY) * 100}%`,
                background: `linear-gradient(90deg, var(--phosphor-muted) 0%, var(--phosphor) 100%)`,
                boxShadow: bucketTokens > 20 ? '0 0 20px var(--phosphor-glow)' : 'none'
              }}
            />
            {/* Refill indicator */}
            {isRunning && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--phosphor)] animate-pulse" />
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>EMPTY</span>
            <span>REFILL: {REFILL_RATE}/sec</span>
            <span>FULL</span>
          </div>
        </div>

        {/* Request Stream */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Request Stream</span>
          </div>
          <div
            ref={containerRef}
            className="h-32 bg-[var(--surface-0)] border border-[var(--border)] overflow-hidden relative"
          >
            <div className="absolute inset-0 flex items-end gap-px p-2">
              {requests.slice(-100).map((req) => (
                <div
                  key={req.id}
                  className={`w-1 transition-all duration-150 ${
                    req.allowed ? 'bg-[var(--phosphor)]' : 'bg-[var(--alert-red)]'
                  }`}
                  style={{
                    height: req.allowed ? '100%' : '30%',
                    opacity: req.allowed ? 0.8 : 1,
                    boxShadow: req.allowed
                      ? '0 0 4px var(--phosphor-glow)'
                      : '0 0 4px rgba(255, 51, 51, 0.5)'
                  }}
                />
              ))}
            </div>
            {requests.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-tertiary)]">
                Press Start to simulate requests
              </div>
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[var(--phosphor)]" /> ALLOWED
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[var(--alert-red)]" /> BLOCKED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveDemo;
