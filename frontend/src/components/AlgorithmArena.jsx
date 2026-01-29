import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Shield, Clock, AlertTriangle, Play, Pause, RotateCcw, Crosshair, Flame } from 'lucide-react';

// Request particle class
class RequestParticle {
  constructor(id, timestamp) {
    this.id = id;
    this.timestamp = timestamp;
    this.y = 0;
    this.speed = 3 + Math.random() * 2;
    this.allowed = null;
    this.processed = false;
    this.fadeOut = 0;
  }
}

// Algorithm state managers
class TokenBucketState {
  constructor(capacity = 20, refillRate = 5) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  process() {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  getVisualState() {
    return {
      fillPercent: (this.tokens / this.capacity) * 100,
      tokens: Math.floor(this.tokens)
    };
  }
}

class SlidingWindowState {
  constructor(limit = 20, windowMs = 5000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = [];
  }

  process() {
    const now = Date.now();
    // Remove requests outside window
    this.requests = this.requests.filter(t => now - t < this.windowMs);

    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getVisualState() {
    const now = Date.now();
    return {
      fillPercent: (this.requests.length / this.limit) * 100,
      count: this.requests.length,
      windowProgress: ((now % this.windowMs) / this.windowMs) * 100
    };
  }
}

class FixedWindowState {
  constructor(limit = 20, windowMs = 5000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.count = 0;
    this.windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    this.boundarySpike = false;
  }

  process() {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.windowMs) * this.windowMs;

    // Check for boundary spike condition
    const timeInWindow = now - currentWindow;
    const nearBoundary = timeInWindow < 500 || timeInWindow > this.windowMs - 500;

    if (currentWindow !== this.windowStart) {
      // Window reset - this is where boundary spike happens
      if (this.count > this.limit * 0.8 && nearBoundary) {
        this.boundarySpike = true;
        setTimeout(() => this.boundarySpike = false, 1000);
      }
      this.windowStart = currentWindow;
      this.count = 0;
    }

    if (this.count < this.limit) {
      this.count++;
      return true;
    }
    return false;
  }

  getVisualState() {
    const now = Date.now();
    const windowProgress = ((now - this.windowStart) / this.windowMs) * 100;
    return {
      fillPercent: (this.count / this.limit) * 100,
      count: this.count,
      windowProgress,
      boundarySpike: this.boundarySpike,
      nearReset: windowProgress > 90
    };
  }
}

// Individual algorithm lane component
function AlgorithmLane({
  name,
  icon: Icon,
  color,
  algorithm,
  requests,
  stats,
  isAttackMode,
  description
}) {
  const canvasRef = useRef(null);
  const visualState = algorithm.getVisualState();

  // Draw requests on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw lane lines
    ctx.strokeStyle = 'rgba(37, 37, 37, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw processing zone
    const zoneY = height * 0.7;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.fillRect(0, zoneY - 20, width, 40);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, zoneY);
    ctx.lineTo(width, zoneY);
    ctx.stroke();

    // Draw requests as particles
    requests.forEach(req => {
      const x = width / 2 + (Math.sin(req.id * 0.5) * 30);
      const y = req.y;

      if (req.processed) {
        // Explosion effect
        const alpha = 1 - req.fadeOut;
        if (req.allowed) {
          // Green burst
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 + req.fadeOut * 30);
          gradient.addColorStop(0, `rgba(0, 255, 136, ${alpha * 0.8})`);
          gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 20 + req.fadeOut * 30, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Red burst
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15 + req.fadeOut * 20);
          gradient.addColorStop(0, `rgba(255, 51, 51, ${alpha})`);
          gradient.addColorStop(1, 'rgba(255, 51, 51, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 15 + req.fadeOut * 20, 0, Math.PI * 2);
          ctx.fill();

          // X mark
          ctx.strokeStyle = `rgba(255, 51, 51, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x - 8, y - 8);
          ctx.lineTo(x + 8, y + 8);
          ctx.moveTo(x + 8, y - 8);
          ctx.lineTo(x - 8, y + 8);
          ctx.stroke();
        }
      } else {
        // Incoming request particle
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
        gradient.addColorStop(0, isAttackMode ? '#ff3333' : '#ffffff');
        gradient.addColorStop(0.5, isAttackMode ? 'rgba(255, 51, 51, 0.5)' : 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        ctx.strokeStyle = isAttackMode ? 'rgba(255, 51, 51, 0.3)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, Math.max(0, y - 30));
        ctx.stroke();
      }
    });
  }, [requests, color, isAttackMode]);

  const efficiency = stats.total > 0 ? ((stats.allowed / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="algorithm-lane">
      {/* Header */}
      <div className="lane-header" style={{ borderColor: color }}>
        <div className="lane-icon" style={{ background: color }}>
          <Icon size={20} color="#030303" />
        </div>
        <div className="lane-title">
          <h3 style={{ color }}>{name}</h3>
          <p>{description}</p>
        </div>
      </div>

      {/* Visual state indicator */}
      <div className="state-indicator">
        {name === 'Token Bucket' && (
          <div className="bucket-viz">
            <div className="bucket-container">
              <div
                className="bucket-fill"
                style={{
                  height: `${visualState.fillPercent}%`,
                  background: `linear-gradient(to top, ${color}, ${color}88)`
                }}
              />
              <div className="bucket-tokens">{visualState.tokens}</div>
              <div className="refill-indicator">
                <Zap size={12} />
                <span>+5/s</span>
              </div>
            </div>
            <div className="bucket-label">TOKENS</div>
          </div>
        )}

        {name === 'Sliding Window' && (
          <div className="window-viz">
            <div className="window-container">
              <div
                className="window-fill"
                style={{ width: `${visualState.fillPercent}%` }}
              />
              <div
                className="window-slider"
                style={{ left: `${visualState.windowProgress}%` }}
              />
              <div className="window-count">{visualState.count}/20</div>
            </div>
            <div className="window-label">5s SLIDING WINDOW</div>
          </div>
        )}

        {name === 'Fixed Window' && (
          <div className={`window-viz ${visualState.boundarySpike ? 'boundary-spike' : ''}`}>
            <div className="window-container">
              <div
                className="window-fill fixed"
                style={{ width: `${visualState.fillPercent}%` }}
              />
              <div className="window-count">{visualState.count}/20</div>
              {visualState.nearReset && (
                <div className="reset-warning">RESET IMMINENT</div>
              )}
            </div>
            <div className="window-progress-bar">
              <div
                className="window-progress-fill"
                style={{ width: `${visualState.windowProgress}%` }}
              />
            </div>
            <div className="window-label">
              {visualState.boundarySpike && (
                <span className="spike-alert">
                  <AlertTriangle size={12} />
                  BOUNDARY SPIKE!
                </span>
              )}
              {!visualState.boundarySpike && '5s FIXED WINDOW'}
            </div>
          </div>
        )}
      </div>

      {/* Request visualization canvas */}
      <div className="lane-canvas-container">
        <canvas
          ref={canvasRef}
          width={200}
          height={300}
          className="lane-canvas"
        />
      </div>

      {/* Stats */}
      <div className="lane-stats">
        <div className="stat">
          <span className="stat-value allowed">{stats.allowed}</span>
          <span className="stat-label">ALLOWED</span>
        </div>
        <div className="stat">
          <span className="stat-value blocked">{stats.blocked}</span>
          <span className="stat-label">BLOCKED</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color }}>{efficiency}%</span>
          <span className="stat-label">EFFICIENCY</span>
        </div>
      </div>
    </div>
  );
}

// Main Arena component
export function AlgorithmArena() {
  const [isRunning, setIsRunning] = useState(false);
  const [isAttackMode, setIsAttackMode] = useState(false);
  const [rps, setRps] = useState(8);
  const [requests, setRequests] = useState({ tb: [], sw: [], fw: [] });
  const [stats, setStats] = useState({
    tb: { allowed: 0, blocked: 0, total: 0 },
    sw: { allowed: 0, blocked: 0, total: 0 },
    fw: { allowed: 0, blocked: 0, total: 0 }
  });

  const algorithmsRef = useRef({
    tb: new TokenBucketState(20, 5),
    sw: new SlidingWindowState(20, 5000),
    fw: new FixedWindowState(20, 5000)
  });

  const requestIdRef = useRef(0);
  const animationRef = useRef(null);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsAttackMode(false);
    setRequests({ tb: [], sw: [], fw: [] });
    setStats({
      tb: { allowed: 0, blocked: 0, total: 0 },
      sw: { allowed: 0, blocked: 0, total: 0 },
      fw: { allowed: 0, blocked: 0, total: 0 }
    });
    algorithmsRef.current = {
      tb: new TokenBucketState(20, 5),
      sw: new SlidingWindowState(20, 5000),
      fw: new FixedWindowState(20, 5000)
    };
    requestIdRef.current = 0;
  }, []);

  const triggerAttack = useCallback(() => {
    setIsAttackMode(true);
    setRps(50);
    setTimeout(() => {
      setIsAttackMode(false);
      setRps(8);
    }, 3000);
  }, []);

  // Request generation
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const id = requestIdRef.current++;
      const newRequest = new RequestParticle(id, Date.now());

      setRequests(prev => ({
        tb: [...prev.tb, { ...newRequest }],
        sw: [...prev.sw, { ...newRequest }],
        fw: [...prev.fw, { ...newRequest }]
      }));
    }, 1000 / rps);

    return () => clearInterval(interval);
  }, [isRunning, rps]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) return;

    const processZoneY = 210; // 70% of 300px canvas

    const animate = () => {
      setRequests(prev => {
        const newRequests = { tb: [], sw: [], fw: [] };

        ['tb', 'sw', 'fw'].forEach(key => {
          newRequests[key] = prev[key]
            .map(req => {
              if (req.processed) {
                req.fadeOut += 0.05;
                return req.fadeOut < 1 ? req : null;
              }

              req.y += req.speed;

              if (req.y >= processZoneY && !req.processed) {
                req.processed = true;
                req.allowed = algorithmsRef.current[key].process();

                setStats(s => ({
                  ...s,
                  [key]: {
                    allowed: s[key].allowed + (req.allowed ? 1 : 0),
                    blocked: s[key].blocked + (req.allowed ? 0 : 1),
                    total: s[key].total + 1
                  }
                }));
              }

              return req;
            })
            .filter(Boolean);
        });

        return newRequests;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning]);

  return (
    <div className="algorithm-arena">
      {/* Header */}
      <div className="arena-header">
        <div className="arena-title">
          <Crosshair className="arena-icon" />
          <div>
            <h2>ALGORITHM BATTLE ARENA</h2>
            <p>Real-time comparison of rate limiting strategies</p>
          </div>
        </div>

        <div className="arena-controls">
          <div className="rps-control">
            <label>TRAFFIC RATE</label>
            <div className="rps-display">
              <span className="rps-value">{rps}</span>
              <span className="rps-unit">req/s</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={Math.min(rps, 30)}
              onChange={(e) => setRps(parseInt(e.target.value))}
              disabled={isAttackMode}
            />
          </div>

          <div className="control-buttons">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`control-btn ${isRunning ? 'running' : ''}`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'PAUSE' : 'START'}
            </button>

            <button
              onClick={triggerAttack}
              disabled={!isRunning || isAttackMode}
              className={`control-btn attack ${isAttackMode ? 'active' : ''}`}
            >
              <Flame size={18} />
              {isAttackMode ? 'ATTACKING!' : 'ATTACK'}
            </button>

            <button onClick={reset} className="control-btn reset">
              <RotateCcw size={18} />
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Attack mode overlay */}
      {isAttackMode && (
        <div className="attack-overlay">
          <div className="attack-banner">
            <Flame className="attack-flame" />
            <span>BURST ATTACK IN PROGRESS — 50 req/s</span>
            <Flame className="attack-flame" />
          </div>
        </div>
      )}

      {/* Traffic generator visualization */}
      <div className="traffic-generator">
        <div className={`generator-core ${isRunning ? 'active' : ''} ${isAttackMode ? 'attack' : ''}`}>
          <div className="generator-ring" />
          <div className="generator-ring" />
          <div className="generator-ring" />
          <Zap size={24} />
        </div>
        <div className="generator-label">TRAFFIC GENERATOR</div>
        <div className="traffic-lines">
          <div className="traffic-line" />
          <div className="traffic-line" />
          <div className="traffic-line" />
        </div>
      </div>

      {/* Algorithm lanes */}
      <div className="arena-lanes">
        <AlgorithmLane
          name="Token Bucket"
          icon={Zap}
          color="var(--phosphor)"
          algorithm={algorithmsRef.current.tb}
          requests={requests.tb}
          stats={stats.tb}
          isAttackMode={isAttackMode}
          description="Allows bursts, smooth rate"
        />
        <AlgorithmLane
          name="Sliding Window"
          icon={Clock}
          color="var(--alert-amber)"
          algorithm={algorithmsRef.current.sw}
          requests={requests.sw}
          stats={stats.sw}
          isAttackMode={isAttackMode}
          description="Precise tracking, no spikes"
        />
        <AlgorithmLane
          name="Fixed Window"
          icon={Shield}
          color="#8b5cf6"
          algorithm={algorithmsRef.current.fw}
          requests={requests.fw}
          stats={stats.fw}
          isAttackMode={isAttackMode}
          description="Simple but boundary vulnerable"
        />
      </div>

      {/* Legend */}
      <div className="arena-legend">
        <div className="legend-item">
          <div className="legend-dot allowed" />
          <span>Request Allowed</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot blocked" />
          <span>Request Blocked</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot attack" />
          <span>Attack Traffic</span>
        </div>
        <div className="legend-item warning">
          <AlertTriangle size={14} />
          <span>Boundary Spike = 2x traffic at window reset</span>
        </div>
      </div>
    </div>
  );
}

export default AlgorithmArena;
