import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

const snippets = {
  node: {
    label: 'Node.js',
    code: `const throttle = require('throttle-io');

const limiter = new throttle.RateLimiter({
  apiKey: 'th_live_xxxxx',
  rules: {
    ip: { limit: 100, window: '1m' },
    user: { limit: 500, window: '1m' }
  }
});

// Middleware usage
app.use(async (req, res, next) => {
  const result = await limiter.check({
    ip: req.ip,
    userId: req.user?.id
  });

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: result.resetAt
    });
  }

  res.set(result.headers);
  next();
});`
  },
  python: {
    label: 'Python',
    code: `from throttle_io import RateLimiter

limiter = RateLimiter(
    api_key='th_live_xxxxx',
    rules={
        'ip': {'limit': 100, 'window': '1m'},
        'user': {'limit': 500, 'window': '1m'}
    }
)

# Flask middleware
@app.before_request
def check_rate_limit():
    result = limiter.check(
        ip=request.remote_addr,
        user_id=getattr(g, 'user_id', None)
    )

    if not result.allowed:
        return jsonify({
            'error': 'Rate limit exceeded',
            'retry_after': result.reset_at
        }), 429`
  },
  curl: {
    label: 'cURL',
    code: `# Check rate limit
curl -X POST https://api.throttle.io/v1/check \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: th_live_xxxxx" \\
  -d '{
    "ip": "192.168.1.1",
    "userId": "user_123",
    "endpoint": "/api/data"
  }'

# Response
{
  "allowed": true,
  "remaining": 95,
  "resetAt": 1706500000000,
  "headers": {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "95",
    "X-RateLimit-Reset": "1706500000"
  }
}`
  }
};

export function CodeSnippet() {
  const [activeTab, setActiveTab] = useState('node');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const copyCode = () => {
    navigator.clipboard.writeText(snippets[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card noise overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 border-b border-[var(--border)] relative z-10 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
            Integration Guide // Quick Start
          </span>
        </div>
      </button>

      {expanded && (
        <div className="relative z-10">
          <div className="flex border-b border-[var(--border)]">
            {Object.entries(snippets).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-xs uppercase tracking-wider transition-all ${
                  activeTab === key
                    ? 'bg-[var(--surface-2)] text-[var(--phosphor)] border-b border-[var(--phosphor)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={copyCode}
              className="px-4 py-2 flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--phosphor)] transition-colors"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-[var(--phosphor)]" />
                  <span className="phosphor-dim">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs leading-relaxed">
              <code className="text-[var(--text-secondary)]">
                {snippets[activeTab].code.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-8 text-[var(--text-tertiary)] select-none">
                      {(i + 1).toString().padStart(2, ' ')}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightSyntax(line, activeTab)
                      }}
                    />
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function highlightSyntax(line, lang) {
  // Simple syntax highlighting
  let result = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Strings
  result = result.replace(
    /(['"`])(.*?)\1/g,
    '<span style="color: var(--phosphor-dim)">$1$2$1</span>'
  );

  // Comments
  result = result.replace(
    /(\/\/.*$|#.*$)/g,
    '<span style="color: var(--text-tertiary)">$1</span>'
  );

  // Keywords
  const keywords = ['const', 'let', 'var', 'async', 'await', 'function', 'return', 'if', 'from', 'import', 'def', 'class', 'new', 'require'];
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    result = result.replace(
      regex,
      '<span style="color: var(--alert-amber)">$1</span>'
    );
  });

  // Numbers
  result = result.replace(
    /\b(\d+)\b/g,
    '<span style="color: var(--phosphor)">$1</span>'
  );

  return result;
}

export default CodeSnippet;
