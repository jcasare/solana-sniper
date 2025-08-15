# 🚀 Complete Setup Guide - Solana DeFi Security Monitor

This guide will walk you through setting up both the backend (NestJS) and frontend (Next.js) components of the Solana DeFi Security Monitor system.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 18.0 or higher - [Download](https://nodejs.org/)
- **MongoDB** 4.4 or higher - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)
- **npm** or **yarn** (comes with Node.js)

### Optional but Recommended:
- **Redis** - For caching (optional) - [Download](https://redis.io/download)
- **Docker** - For containerized MongoDB/Redis - [Download](https://www.docker.com/)

## 🏗️ Project Structure

```
mpm/
├── src/                    # Backend source code (NestJS)
│   ├── modules/           # Feature modules
│   └── main.ts           # Backend entry point
├── dashboard/             # Frontend application (Next.js)
│   ├── src/              # Frontend source code
│   └── package.json      # Frontend dependencies
├── package.json          # Backend dependencies
└── .env                  # Environment configuration
```

## 🔧 Step 1: Clone or Set Up Project

If you haven't already set up the project:

```bash
# Navigate to your project directory
cd C:\Users\iJAY\Documents\CODEX\mpm

# Initialize git (if needed)
git init
```

## 🗄️ Step 2: Set Up Database

### Option A: Local MongoDB Installation

1. **Install MongoDB:**
   - Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Install with default settings
   - MongoDB will run on `localhost:27017` by default

2. **Start MongoDB:**
   ```bash
   # Windows
   net start MongoDB

   # Or manually start mongod
   mongod
   ```

### Option B: Docker (Recommended)

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb-security-monitor mongo:latest

# Optional: Run Redis for caching
docker run -d -p 6379:6379 --name redis-security-monitor redis:alpine
```

### Option C: MongoDB Atlas (Cloud)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `.env` with the connection string

## 🔑 Step 3: Configure Environment Variables

### Backend Configuration

1. **Create `.env` file in root directory:**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

2. **Edit `.env` with your configuration:**
   ```env
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/solana-security-monitor
   REDIS_URL=redis://localhost:6379  # Optional

   # Solana RPC Configuration (Choose one or more)
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   SOLANA_RPC_BACKUP_URL=https://rpc.ankr.com/solana
   
   # Optional: Premium RPC Services (Better reliability)
   HELIUS_API_KEY=your_helius_api_key_here      # Get from helius.dev
   QUICKNODE_API_KEY=your_quicknode_api_key_here # Get from quicknode.com

   # DEX APIs (Optional but recommended)
   DEXSCREENER_API_URL=https://api.dexscreener.com/latest
   BIRDEYE_API_URL=https://public-api.birdeye.so
   BIRDEYE_API_KEY=your_birdeye_api_key_here     # Get from birdeye.so

   # Application Configuration
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=info

   # Security Configuration
   API_RATE_LIMIT=100
   MAX_CONCURRENT_ANALYSES=5

   # Risk Analysis Thresholds
   HIGH_RISK_THRESHOLD=0.7
   MEDIUM_RISK_THRESHOLD=0.4
   MIN_LIQUIDITY_USD=1000
   MAX_HOLDER_CONCENTRATION=0.5
   ```

### Frontend Configuration

1. **Create `.env.local` in dashboard directory:**
   ```bash
   cd dashboard
   cp .env.example .env.local
   ```

2. **Edit `dashboard/.env.local`:**
   ```env
   # Backend API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_WS_URL=ws://localhost:3000

   # Application Configuration
   NEXT_PUBLIC_APP_NAME=Solana Security Monitor
   NEXT_PUBLIC_APP_VERSION=1.0.0

   # Optional
   NEXT_PUBLIC_ENABLE_ANALYTICS=false
   NODE_ENV=development
   ```

## 📦 Step 4: Install Dependencies

### Backend Dependencies

```bash
# In root directory (C:\Users\iJAY\Documents\CODEX\mpm)
npm install

# Or using yarn
yarn install
```

### Frontend Dependencies

```bash
# Navigate to dashboard
cd dashboard

# Install dependencies
npm install

# Or using yarn
yarn install

# Return to root
cd ..
```

## 🚀 Step 5: Start the Applications

### Method 1: Start Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
# In root directory
npm run start:dev

# Backend will start on http://localhost:3000
# You should see:
# 🚀 Solana DeFi Security Monitor running on port 3000
# 📊 Dashboard available at http://localhost:3000/dashboard
```

**Terminal 2 - Frontend:**
```bash
# Navigate to dashboard
cd dashboard

# Start frontend
npm run dev

# Frontend will start on http://localhost:3001
# You should see:
# ready - started server on http://localhost:3001
```

### Method 2: Using Concurrent Start (Optional)

First, install concurrently:
```bash
npm install -g concurrently
```

Then create a start script in root `package.json`:
```json
{
  "scripts": {
    "start:all": "concurrently \"npm run start:dev\" \"cd dashboard && npm run dev\""
  }
}
```

Run both:
```bash
npm run start:all
```

## ✅ Step 6: Verify Installation

1. **Check Backend Health:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "uptime": ...,
     "version": "1.0.0"
   }
   ```

2. **Check Frontend:**
   - Open browser to `http://localhost:3001`
   - You should see the Token Watchlist dashboard
   - Check for green "Live Updates" indicator in sidebar

3. **Check Database Connection:**
   - Look for console message: "Connected to MongoDB"
   - No error messages about database connection

4. **Check WebSocket:**
   - In the dashboard, look for the green connection indicator
   - Open browser console (F12) and check for: "WebSocket connected"

## 🔍 Step 7: Test the System

### 1. Token Discovery
- Wait 30 seconds for automatic token discovery to start
- Check console for: "Starting token discovery..."
- New tokens should appear in the dashboard

### 2. Manual Token Analysis
- Go to "Manual Lookup" page
- Enter a known Solana token address:
  ```
  Example: So11111111111111111111111111111111111111112 (Wrapped SOL)
  ```
- Click "Lookup" and then "Analyze"

### 3. Check Real-time Updates
- Keep the dashboard open
- Watch for notifications when new tokens are discovered
- High-risk tokens will trigger red alert notifications

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Failed
```
Error: MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running:
```bash
# Windows
net start MongoDB

# Check if MongoDB is listening
netstat -an | findstr 27017
```

#### Frontend Can't Connect to Backend
```
Error: Network error - Failed to fetch
```
**Solution:** 
1. Check backend is running on port 3000
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check for CORS issues in browser console

#### WebSocket Connection Failed
```
WebSocket connection error: Error: connect ECONNREFUSED
```
**Solution:**
1. Ensure backend is running
2. Check `NEXT_PUBLIC_WS_URL` matches backend port
3. Verify no firewall blocking WebSocket connections

#### Rate Limiting on Free APIs
```
Error: 429 Too Many Requests
```
**Solution:**
1. Reduce `MAX_CONCURRENT_ANALYSES` in `.env`
2. Consider getting API keys for Helius or QuickNode
3. Implement caching with Redis

#### No Tokens Appearing
**Solution:**
1. Check console for "Token discovery completed"
2. Verify RPC endpoints are working
3. Try manually analyzing a token first
4. Check MongoDB has write permissions

## 🎯 API Keys (Optional but Recommended)

For better reliability and performance, consider getting API keys:

### 1. Helius (Recommended)
- Sign up at [helius.dev](https://www.helius.dev/)
- Free tier: 100,000 credits/month
- Add to `.env`: `HELIUS_API_KEY=your_key`

### 2. QuickNode
- Sign up at [quicknode.com](https://www.quicknode.com/)
- Free tier available
- Add to `.env`: `QUICKNODE_API_KEY=your_key`

### 3. Birdeye
- Sign up at [birdeye.so](https://birdeye.so/)
- API access for token data
- Add to `.env`: `BIRDEYE_API_KEY=your_key`

## 🚦 System Status Indicators

### Backend Running Properly
- ✅ Console shows: "Solana DeFi Security Monitor running on port 3000"
- ✅ No error messages in console
- ✅ MongoDB connection established
- ✅ Token discovery running (every 30 seconds)

### Frontend Running Properly
- ✅ Dashboard loads at `http://localhost:3001`
- ✅ "Live Updates" shows green connection icon
- ✅ No errors in browser console
- ✅ Real-time notifications working

## 📊 Using the System

### Token Watchlist
1. Navigate to homepage (`http://localhost:3001`)
2. View real-time token discoveries
3. Click on any token for detailed analysis
4. Use filters to find specific risk levels

### Manual Analysis
1. Go to "Manual Lookup" page
2. Enter any Solana token address
3. Click "Analyze" for instant risk assessment
4. View detailed security breakdown

### Settings
1. Go to "Settings" page
2. Adjust risk thresholds
3. Configure alert preferences
4. Save changes

## 🔄 Updating the System

### Pull Latest Changes
```bash
git pull origin main
```

### Update Dependencies
```bash
# Backend
npm update

# Frontend
cd dashboard
npm update
```

### Rebuild
```bash
# Backend
npm run build

# Frontend
cd dashboard
npm run build
```

## 🐳 Docker Deployment (Optional)

### Create Dockerfile for Backend
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Create docker-compose.yml
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/solana-security
    depends_on:
      - mongodb

  frontend:
    build: ./dashboard
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
    depends_on:
      - backend

volumes:
  mongo-data:
```

Run with Docker Compose:
```bash
docker-compose up
```

## 📝 Development Tips

1. **Watch Logs:** Keep terminal windows open to monitor both backend and frontend logs
2. **Use Dev Tools:** React Query DevTools available in development mode
3. **Test WebSocket:** Open multiple browser tabs to test real-time updates
4. **Monitor Performance:** Check Memory usage if analyzing many tokens
5. **Database GUI:** Use MongoDB Compass for database inspection

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Verify all prerequisites are installed
3. Ensure all environment variables are set correctly
4. Try restarting both backend and frontend
5. Clear browser cache and cookies
6. Check if ports 3000 and 3001 are available

## 🎉 Success Checklist

- [ ] MongoDB is running and accessible
- [ ] Backend starts without errors on port 3000
- [ ] Frontend starts without errors on port 3001
- [ ] Dashboard loads in browser
- [ ] WebSocket shows "Connected" status
- [ ] Token discovery is working (check logs)
- [ ] Manual token lookup works
- [ ] Risk analysis completes successfully
- [ ] Real-time notifications appear
- [ ] Settings can be saved and loaded

---

**🚀 Your Solana DeFi Security Monitor is now ready for defensive security research and education!**

Remember: This system is for educational and defensive security research only. Always conduct your own research before making any trading decisions.