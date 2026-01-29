import { useState } from 'react';
import { ChevronRight, ChevronLeft, MessageSquare, Code, Zap, Shield, Database, Globe, AlertTriangle } from 'lucide-react';

const slides = [
  {
    id: 'intro',
    title: 'Why Rate Limiting Matters',
    icon: Shield,
    content: `Rate limiting is critical infrastructure for any API at scale.

Without it:
• A single bad actor can DDoS your service
• Runaway scripts can exhaust resources
• Billing APIs get abused
• Databases get overwhelmed

This project demonstrates understanding of:
• Distributed systems constraints
• Redis atomic operations
• Algorithm tradeoffs
• Multi-layer defense`,
    code: null,
    visual: 'shield'
  },
  {
    id: 'algorithms',
    title: 'Algorithm Selection Matters',
    icon: Zap,
    content: `Each algorithm has real tradeoffs:

TOKEN BUCKET
✓ Best for: APIs with variable load
✓ Allows legitimate bursts
✗ More complex state

SLIDING WINDOW
✓ Best for: Precise enforcement
✓ No boundary spikes
✗ Higher memory (tracks timestamps)

FIXED WINDOW
✓ Best for: Simple scenarios
✓ Lowest memory
✗ Boundary spike vulnerability (2x traffic possible)`,
    code: `// Token bucket: smooth rate with bursts
tokens = min(capacity, tokens + elapsed * refillRate)
if tokens >= 1: allow() && tokens--

// Sliding window: weighted count
count = current + (previous * overlap%)
if count < limit: allow()`,
    visual: 'algorithms'
  },
  {
    id: 'redis',
    title: 'Why Redis + Lua Scripts',
    icon: Database,
    content: `Rate limiting MUST be atomic in distributed systems.

The problem:
1. Server A reads count = 99
2. Server B reads count = 99
3. Both increment to 100
4. User makes 2 requests, only 1 counted!

The solution: Redis Lua scripts
• Entire check-and-increment is atomic
• No race conditions
• Works across multiple server instances`,
    code: `-- Lua script runs atomically in Redis
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('PEXPIRE', key, windowMs)
end
if current <= limit then
  return {1, limit - current}  -- allowed
else
  return {0, 0}  -- blocked
end`,
    visual: 'redis'
  },
  {
    id: 'layers',
    title: 'Multi-Layer Defense',
    icon: Shield,
    content: `Single-layer limiting isn't enough.

Layer 1: IP-based (DDoS protection)
→ Stops volumetric attacks before auth

Layer 2: API Key (customer quotas)
→ Enforces plan limits per customer

Layer 3: User ID (abuse prevention)
→ Catches compromised credentials

Layer 4: Endpoint (resource protection)
→ Expensive endpoints get lower limits

Each layer uses different limits and algorithms.`,
    code: `// Multi-layer check (fail fast)
for layer in [ip, apiKey, userId, endpoint]:
  result = checkLimit(layer, rules[layer])
  if !result.allowed:
    return blocked(layer)  // Stop early
return allowed()`,
    visual: 'layers'
  },
  {
    id: 'geo',
    title: 'Geographic Awareness',
    icon: Globe,
    content: `Different regions need different limits.

Why?
• Traffic patterns vary by timezone
• Some regions have more bot traffic
• Compliance requirements differ
• Network latency affects user behavior

Implementation:
• GeoIP lookup on request IP
• Region-specific rule overrides
• Separate analytics per region`,
    code: `const geo = geoip.lookup(request.ip)
const region = geo?.country || 'UNKNOWN'

// Apply region-specific rules
const rules = baseRules.geoOverrides?.[region]
  ?? baseRules.default`,
    visual: 'geo'
  },
  {
    id: 'boundary',
    title: 'The Boundary Spike Problem',
    icon: AlertTriangle,
    content: `Fixed window's critical vulnerability:

Timeline:
• Window 1 (0:00-1:00): User makes 100 requests at 0:59
• Window 2 (1:00-2:00): User makes 100 requests at 1:01

Result: 200 requests in 2 seconds!
(While limit is 100/minute)

This is why sliding window or token bucket
are preferred for strict enforcement.

Use the Attack button in the Arena to see this live!`,
    code: null,
    visual: 'boundary'
  }
];

function SlideVisual({ type }) {
  if (type === 'shield') {
    return (
      <div className="visual-container">
        <div className="shield-visual">
          <div className="attack-arrows">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="attack-arrow" style={{ '--delay': `${i * 0.1}s` }}>→</div>
            ))}
          </div>
          <div className="shield-wall">
            <Shield size={48} />
          </div>
          <div className="protected-server">
            <Database size={32} />
            <span>API</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'algorithms') {
    return (
      <div className="visual-container algo-comparison">
        <div className="algo-box token">
          <div className="algo-name">TOKEN BUCKET</div>
          <div className="bucket-icon">🪣</div>
          <div className="algo-trait good">Bursts OK</div>
        </div>
        <div className="algo-box sliding">
          <div className="algo-name">SLIDING</div>
          <div className="bucket-icon">📊</div>
          <div className="algo-trait good">Precise</div>
        </div>
        <div className="algo-box fixed">
          <div className="algo-name">FIXED</div>
          <div className="bucket-icon">⏱️</div>
          <div className="algo-trait bad">Spike Risk</div>
        </div>
      </div>
    );
  }

  if (type === 'redis') {
    return (
      <div className="visual-container redis-visual">
        <div className="server-box">Server A</div>
        <div className="server-box">Server B</div>
        <div className="arrow-down">↓</div>
        <div className="redis-box">
          <span>Redis</span>
          <div className="atomic-badge">ATOMIC</div>
        </div>
      </div>
    );
  }

  if (type === 'layers') {
    return (
      <div className="visual-container layers-visual">
        {['IP', 'API Key', 'User ID', 'Endpoint'].map((layer, i) => (
          <div key={layer} className="layer-box" style={{ '--index': i }}>
            <span className="layer-num">{i + 1}</span>
            <span className="layer-name">{layer}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'geo') {
    return (
      <div className="visual-container geo-visual">
        <div className="globe-icon">🌍</div>
        <div className="region-list">
          <div className="region">US: 100/min</div>
          <div className="region">EU: 80/min</div>
          <div className="region">APAC: 60/min</div>
        </div>
      </div>
    );
  }

  if (type === 'boundary') {
    return (
      <div className="visual-container boundary-visual">
        <div className="timeline">
          <div className="window w1">
            <div className="requests r1">100 req</div>
            <span>Window 1</span>
          </div>
          <div className="boundary-line">
            <AlertTriangle size={16} />
          </div>
          <div className="window w2">
            <div className="requests r2">100 req</div>
            <span>Window 2</span>
          </div>
        </div>
        <div className="result">= 200 requests in 2 seconds!</div>
      </div>
    );
  }

  return null;
}

export function InterviewMode({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="interview-mode">
      <style>{`
        .interview-mode {
          position: fixed;
          inset: 0;
          background: rgba(3, 3, 3, 0.95);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(10px);
        }

        .interview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--border);
        }

        .interview-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--phosphor);
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .slide-counter {
          font-family: var(--font-data);
          color: var(--text-secondary);
        }

        .close-btn {
          padding: 0.5rem 1rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .close-btn:hover {
          border-color: var(--phosphor);
        }

        .interview-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 2rem;
          overflow: auto;
        }

        .slide-main {
          display: flex;
          flex-direction: column;
        }

        .slide-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .slide-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--phosphor);
          color: var(--void);
        }

        .slide-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          letter-spacing: 0.05em;
        }

        .slide-content {
          font-size: 0.9rem;
          line-height: 1.8;
          color: var(--text-secondary);
          white-space: pre-line;
        }

        .slide-code {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--surface-0);
          border: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--phosphor-dim);
          overflow-x: auto;
          white-space: pre;
        }

        .slide-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-1);
          border: 1px solid var(--border);
        }

        .visual-container {
          padding: 2rem;
          text-align: center;
        }

        .interview-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          border-top: 1px solid var(--border);
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .nav-btn:hover:not(:disabled) {
          border-color: var(--phosphor);
          background: var(--surface-3);
        }

        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .nav-btn.primary {
          background: var(--phosphor-muted);
          border-color: var(--phosphor);
          color: var(--void);
        }

        .slide-dots {
          display: flex;
          gap: 0.5rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: var(--surface-3);
          cursor: pointer;
        }

        .dot.active {
          background: var(--phosphor);
          box-shadow: 0 0 10px var(--phosphor-glow);
        }

        /* Visual styles */
        .shield-visual {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .attack-arrows {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: var(--alert-red);
          font-size: 1.5rem;
        }

        .attack-arrow {
          animation: arrow-attack 1s ease-in-out infinite;
          animation-delay: var(--delay);
        }

        @keyframes arrow-attack {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(20px); opacity: 0.5; }
        }

        .shield-wall {
          color: var(--phosphor);
          animation: shield-pulse 2s ease-in-out infinite;
        }

        @keyframes shield-pulse {
          0%, 100% { filter: drop-shadow(0 0 10px var(--phosphor)); }
          50% { filter: drop-shadow(0 0 30px var(--phosphor)); }
        }

        .protected-server {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-secondary);
        }

        .algo-comparison {
          display: flex;
          gap: 1rem;
        }

        .algo-box {
          padding: 1rem;
          border: 2px solid var(--border);
          text-align: center;
        }

        .algo-box.token { border-color: var(--phosphor); }
        .algo-box.sliding { border-color: var(--alert-amber); }
        .algo-box.fixed { border-color: #8b5cf6; }

        .algo-name {
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        .bucket-icon {
          font-size: 2rem;
          margin: 0.5rem 0;
        }

        .algo-trait {
          font-size: 0.65rem;
          padding: 0.25rem 0.5rem;
        }

        .algo-trait.good { color: var(--phosphor); }
        .algo-trait.bad { color: var(--alert-red); }

        .redis-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .server-box {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          font-size: 0.8rem;
        }

        .arrow-down {
          font-size: 1.5rem;
          color: var(--phosphor);
        }

        .redis-box {
          padding: 1rem 2rem;
          background: #dc382d;
          color: white;
          position: relative;
        }

        .atomic-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--phosphor);
          color: var(--void);
          font-size: 0.5rem;
          padding: 0.25rem 0.5rem;
        }

        .layers-visual {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .layer-box {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--surface-2);
          border-left: 3px solid var(--phosphor);
          animation: layer-slide 0.5s ease-out forwards;
          animation-delay: calc(var(--index) * 0.1s);
          opacity: 0;
          transform: translateX(-20px);
        }

        @keyframes layer-slide {
          to { opacity: 1; transform: translateX(0); }
        }

        .layer-num {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--phosphor);
          color: var(--void);
          font-weight: bold;
          font-size: 0.75rem;
        }

        .geo-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .globe-icon {
          font-size: 4rem;
        }

        .region-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .region {
          padding: 0.5rem 1rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          font-family: var(--font-data);
          font-size: 0.8rem;
        }

        .boundary-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .timeline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .window {
          padding: 1rem;
          border: 2px solid var(--border);
          text-align: center;
          position: relative;
        }

        .requests {
          font-family: var(--font-data);
          font-size: 1.25rem;
          color: var(--phosphor);
        }

        .boundary-line {
          color: var(--alert-red);
          animation: blink 0.5s step-end infinite;
        }

        .result {
          font-family: var(--font-display);
          color: var(--alert-red);
          font-size: 1.1rem;
        }
      `}</style>

      <div className="interview-header">
        <div className="interview-title">
          <MessageSquare size={18} />
          <span>Interview Mode</span>
        </div>
        <span className="slide-counter">{currentSlide + 1} / {slides.length}</span>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>

      <div className="interview-content">
        <div className="slide-main">
          <div className="slide-header">
            <div className="slide-icon">
              <Icon size={24} />
            </div>
            <h2 className="slide-title">{slide.title}</h2>
          </div>
          <div className="slide-content">{slide.content}</div>
          {slide.code && (
            <pre className="slide-code">{slide.code}</pre>
          )}
        </div>
        <div className="slide-visual">
          <SlideVisual type={slide.visual} />
        </div>
      </div>

      <div className="interview-nav">
        <button
          className="nav-btn"
          onClick={() => setCurrentSlide(c => c - 1)}
          disabled={currentSlide === 0}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <div className="slide-dots">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>

        <button
          className={`nav-btn ${currentSlide < slides.length - 1 ? 'primary' : ''}`}
          onClick={() => currentSlide < slides.length - 1 ? setCurrentSlide(c => c + 1) : onClose()}
        >
          {currentSlide < slides.length - 1 ? 'Next' : 'Finish'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default InterviewMode;
