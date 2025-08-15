# 🚀 Quick Start Guide

## ✅ Current Status

Your Solana DeFi Security Monitor is now set up and ready to run!

## 🎯 Start Everything

### Option 1: PowerShell Script (Recommended)
```powershell
# Run this to start both services:
.\start.ps1
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd dashboard
npm run dev
```

## 🌐 Access the Dashboard

The frontend may start on different ports if 3001 is busy. Check the terminal output for the actual port.

Common URLs:
- **http://localhost:3001** (default)
- **http://localhost:3002** 
- **http://localhost:3003**
- **http://localhost:3004**
- **http://localhost:3005**

## ✨ Features to Try

### 1. **Token Watchlist** (Homepage)
- View real-time token discoveries
- See risk scores with color coding
- Filter by risk level
- Sort by various metrics

### 2. **Manual Lookup** 
- Test with Wrapped SOL: `So11111111111111111111111111111111111111112`
- Search by token name or symbol
- Analyze any Solana token instantly

### 3. **Settings**
- Adjust risk thresholds
- Configure alert preferences
- Set simulation parameters

### 4. **Token Details**
- Click any token in the watchlist
- View comprehensive risk analysis
- See security flags and holder distribution
- Run simulations with different profiles

## 🔍 Verify Setup

Run the verification script to check if everything is working:
```powershell
.\verify-setup.ps1
```

## 📊 What You Should See

### Backend Console:
```
🚀 Solana DeFi Security Monitor running on port 3000
📊 Dashboard available at http://localhost:3000/dashboard
Connected to MongoDB
Starting token discovery...
Token discovery completed. Processed X new tokens.
```

### Frontend Console:
```
▲ Next.js 14.0.3
- Local: http://localhost:3001 (or another port)
✓ Ready in X.Xs
✓ Compiled /
```

### Dashboard:
- **Green "Live Updates" indicator** in sidebar
- **System overview cards** showing token counts
- **Real-time notifications** for high-risk tokens
- **Token list** updating automatically

## 🛠️ Troubleshooting

### Frontend Port Issues
If you see "Port 3001 is in use", the frontend will automatically use the next available port (3002, 3003, etc.). Check the terminal output for the actual URL.

### MongoDB Not Connected
```bash
# Start MongoDB with Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or check if it's already running:
docker ps
```

### No Tokens Appearing
- Wait 30-60 seconds for token discovery to start
- Check backend console for "Starting token discovery..."
- Try manual analysis first to verify the system works

### WebSocket Disconnected
- Ensure backend is running on port 3000
- Check for any firewall blocking WebSocket connections
- Refresh the browser page

## 🎓 Educational Use

This system is designed for:
- **Security Research**: Understanding DeFi attack patterns
- **Risk Analysis**: Learning about token security metrics
- **Defensive Strategies**: Developing safer trading practices
- **Educational Purposes**: Academic analysis of blockchain security

## ⚡ Quick Commands

### Stop All Services
```bash
# Windows - Kill all Node processes
taskkill /F /IM node.exe

# Or press Ctrl+C in each terminal window
```

### Check Logs
```bash
# Backend logs are in the terminal
# Frontend logs are in browser console (F12)
```

### Reset Database
```bash
# Connect to MongoDB
mongo

# Switch to database
use solana-security-monitor

# Clear collections (optional)
db.tokens.deleteMany({})
db.riskanalyses.deleteMany({})
db.simulationlogs.deleteMany({})
```

## 🔗 Important URLs

- **Frontend Dashboard**: http://localhost:3001 (or check terminal for actual port)
- **Backend API Health**: http://localhost:3000/api/health
- **Backend API Docs**: http://localhost:3000/api/overview
- **WebSocket Status**: Check green indicator in dashboard sidebar

## 🚨 Security Notes

- This is for **educational and research purposes only**
- Do **NOT** use for actual trading decisions
- Always conduct your own research
- The risk analysis is probabilistic, not definitive

---

**Your Solana DeFi Security Monitor is ready for defensive security research!**

If you encounter any issues, check:
1. The verification script: `.\verify-setup.ps1`
2. Backend terminal for errors
3. Frontend terminal for the correct port
4. Browser console (F12) for client-side errors