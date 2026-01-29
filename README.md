# Throttle.io

Distributed API rate limiting service with multi-algorithm support, real-time dashboards, and webhook alerts.

## Features

- **Multiple Algorithms**: Token bucket, sliding window, fixed window
- **Multi-Layer Protection**: IP → API Key → User ID → Endpoint
- **Real-time Dashboard**: Live metrics, traffic visualization, top violators
- **Geographic Rules**: Different limits per region
- **Webhook Alerts**: Configurable notifications for threshold violations
- **Burst Handling**: Allow temporary spikes without blocking legitimate users

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development servers (requires Redis)
npm run dev

# Or run separately:
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:5173
```

## API Usage

### Check Rate Limit

```bash
curl -X POST http://localhost:3001/api/v1/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"ip": "192.168.1.1", "userId": "user123", "endpoint": "/api/data"}'
```

### Response

```json
{
  "allowed": true,
  "remaining": 95,
  "resetAt": 1706500000000,
  "blockedBy": null
}
```

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706500000
X-RateLimit-Policy: sliding_window
```

## Algorithm Comparison

| Algorithm | Memory | Precision | Burst Handling | Use Case |
|-----------|--------|-----------|----------------|----------|
| Token Bucket | Low | Good | Excellent | APIs with variable load |
| Sliding Window | Medium | High | Good | General purpose |
| Fixed Window | Lowest | Lower | Poor | Simple scenarios |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Throttle   │────▶│    Redis    │
│   Request   │     │     API     │     │   Counters  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    │     UI      │
                    └─────────────┘
```

## Environment Variables

```bash
PORT=3001
REDIS_URL=redis://localhost:6379
```

## License

MIT
