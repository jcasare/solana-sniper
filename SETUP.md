# Quick Setup Guide

## 1. Prerequisites

### Required Services
```bash
# Install MongoDB (Windows)
# Download from https://www.mongodb.com/try/download/community
# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Install Redis (optional, for caching)
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Node.js Setup
```bash
# Ensure Node.js 18+ is installed
node --version  # Should be 18+
npm --version
```

## 2. Environment Configuration

### Create .env file:
```bash
cp .env.example .env
```

### Minimal Configuration:
```env
# Database (required)
MONGODB_URI=mongodb://localhost:27017/solana-security-monitor

# Solana RPC (use one of these)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR for better reliability:
HELIUS_API_KEY=your_helius_api_key_here

# Application
PORT=3000
NODE_ENV=development
```

### API Keys (Recommended)

1. **Helius** (Solana RPC): https://www.helius.dev/
   - Sign up for free tier
   - Add to `.env`: `HELIUS_API_KEY=your_key`

2. **Birdeye** (Token Data): https://docs.birdeye.so/
   - Get API key for enhanced data
   - Add to `.env`: `BIRDEYE_API_KEY=your_key`

## 3. Installation & Startup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode
npm run start:dev

# OR start in production mode
npm run start:prod
```

## 4. Verify Installation

### Check System Health
```bash
curl http://localhost:3000/api/health
```

### View Dashboard
Open browser to: `http://localhost:3000/dashboard`

### Check API Endpoints
```bash
# System overview
curl http://localhost:3000/api/overview

# Recent tokens
curl http://localhost:3000/api/tokens?limit=10
```

## 5. Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
netstat -an | grep 27017

# Test connection
mongo mongodb://localhost:27017/test
```

### API Rate Limits
- Free APIs have rate limits
- System automatically handles retries
- Consider upgrading to paid tiers for better performance

### Memory Usage
- System analyzes tokens continuously
- Monitor memory usage in production
- Adjust batch sizes in configuration if needed

## 6. Configuration Options

### Risk Thresholds
```env
HIGH_RISK_THRESHOLD=0.7    # Tokens above this are high risk
MEDIUM_RISK_THRESHOLD=0.4  # Medium risk threshold
MIN_LIQUIDITY_USD=1000     # Minimum liquidity to analyze
```

### Performance Tuning
```env
MAX_CONCURRENT_ANALYSES=5  # Simultaneous analyses
API_RATE_LIMIT=100        # Requests per minute
```

## 7. Development Mode

### With Hot Reload
```bash
npm run start:dev
```

### With Debug Logging
```bash
LOG_LEVEL=debug npm run start:dev
```

### Running Tests
```bash
npm test
npm run test:watch
npm run test:cov
```

## 8. Production Deployment

### Environment Setup
```env
NODE_ENV=production
LOG_LEVEL=info
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start dist/main.js --name solana-security-monitor

# Using Docker
docker build -t solana-security-monitor .
docker run -d -p 3000:3000 --env-file .env solana-security-monitor
```

## 9. Monitoring

### Logs Location
- Console output in development
- `logs/security-monitor.log` in production

### Health Endpoints
- `/api/health` - Basic health check
- `/api/overview` - System status
- `/api/monitoring/status` - Detailed monitoring

### WebSocket Connection
```javascript
// Connect to real-time updates
const socket = io('ws://localhost:3000');
socket.on('overview_update', (data) => console.log(data));
```

## 10. Next Steps

1. **Monitor the logs** for token discoveries
2. **Check the dashboard** for real-time updates  
3. **Review API documentation** for integration
4. **Adjust risk thresholds** based on your research needs
5. **Set up alerts** for high-risk detections

---

**🎯 You're ready to start researching Solana token security patterns!**