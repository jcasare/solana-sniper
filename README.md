# Solana DeFi Security Monitor

A comprehensive defensive security research platform for analyzing Solana token launches in real-time. This system monitors newly launched tokens, performs risk analysis using multiple security heuristics, and simulates automated response behavior for educational and research purposes.

## 🔒 Security Focus

This platform is designed for **defensive security research only**:
- ✅ **Detect honeypots and rugpulls**
- ✅ **Analyze token security patterns**  
- ✅ **Simulate defensive trading strategies**
- ✅ **Educational security research**
- ❌ **No actual trading or exploits**

## 🚀 Features

### Real-Time Token Monitoring
- Monitors newly launched Solana tokens via DEX APIs (DexScreener, Birdeye)
- Automatic discovery and tracking of new token pairs
- Continuous data refresh and analysis

### Advanced Risk Analysis Engine
- **Honeypot Detection**: Identifies tokens that can't be sold
- **Rugpull Risk Assessment**: Analyzes LP locks, ownership, and dev wallets
- **Liquidity Analysis**: Evaluates pool depth and lock status
- **Holder Distribution**: Examines whale concentration and dev holdings
- **Multi-factor Risk Scoring**: Comprehensive 0-1 risk score with confidence levels

### Simulation & Response System
- **Automated Decision Making**: Simulates how a defensive system would respond
- **Multiple Risk Profiles**: Conservative, Moderate, and Aggressive strategies
- **Backtesting Engine**: Analyzes historical decision accuracy
- **Response Logging**: Tracks all simulated decisions for analysis

### Real-Time Dashboard
- Live monitoring interface with WebSocket updates
- Risk-filtered token views and search functionality
- Detailed token analysis with historical trends
- Alert system for high-risk detections
- Performance analytics and system health monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Token Monitor │    │  Risk Analysis   │    │   Simulation    │
│                 │    │                  │    │                 │
│ • DEX APIs      │───▶│ • Honeypot Det.  │───▶│ • Response Sim. │
│ • RPC Clients   │    │ • Rugpull Det.   │    │ • Backtesting   │
│ • Discovery     │    │ • Risk Scoring   │    │ • Logging       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────▼────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │        Database            │
                    │                            │
                    │ • Token Data              │
                    │ • Risk Analyses           │
                    │ • Simulation Logs         │
                    └────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    Dashboard & APIs        │
                    │                            │
                    │ • REST Endpoints          │
                    │ • WebSocket Gateway       │
                    │ • Real-time Updates       │
                    └────────────────────────────┘
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- Redis (optional, for caching)

### Setup
1. **Clone and install dependencies:**
   ```bash
   git clone <repository>
   cd solana-defi-security-monitor
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database URLs
   ```

3. **Required API Keys:**
   ```env
   # Solana RPC (choose one)
   HELIUS_API_KEY=your_helius_key
   QUICKNODE_API_KEY=your_quicknode_key
   
   # DEX APIs (optional but recommended)
   BIRDEYE_API_KEY=your_birdeye_key
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/solana-security-monitor
   ```

4. **Start the system:**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

## 📊 API Endpoints

### System Overview
```http
GET /api/overview
# Returns system status, token counts, and risk distribution
```

### Token Management
```http
GET /api/tokens?riskLevel=high&limit=50
# Get tokens filtered by risk level

GET /api/tokens/{mintAddress}
# Get detailed token information

POST /api/tokens/{mintAddress}/analyze
# Trigger manual risk analysis

POST /api/tokens/{mintAddress}/simulate
# Run simulation for specific token
```

### Analytics & Simulation
```http
GET /api/statistics
# System-wide statistics

GET /api/simulation/insights
# Simulation performance metrics

POST /api/backtest
# Run backtesting analysis
```

## 🔍 Risk Analysis Components

### Honeypot Detection
- **Mint/Freeze Authority**: Checks for token control mechanisms
- **Liquidity Patterns**: Analyzes LP behavior and locks
- **Transaction Patterns**: Examines volume/liquidity ratios
- **Price Volatility**: Detects extreme price movements

### Rugpull Risk Assessment
- **Developer Holdings**: Analyzes creator wallet concentration
- **LP Token Status**: Verifies liquidity pool locks
- **Ownership Analysis**: Checks for renounced contracts
- **Social Signals**: Evaluates project legitimacy markers

### Risk Scoring Algorithm
```typescript
Risk Score = (
  0.30 * Honeypot Risk +
  0.35 * Rugpull Risk +
  0.15 * Liquidity Risk +
  0.15 * Holder Risk +
  0.05 * Social Risk
)
```

## 🎯 Simulation Profiles

### Conservative Profile
- Max investment: $500
- Risk threshold: 30%
- Requires LP locks and >100 holders
- Minimum $10K liquidity

### Moderate Profile  
- Max investment: $1,000
- Risk threshold: 50%
- Requires LP locks and >50 holders
- Minimum $5K liquidity

### Aggressive Profile
- Max investment: $2,000
- Risk threshold: 70%
- No LP lock requirement
- Minimum $1K liquidity

## 📈 Dashboard Features

### Real-Time Monitoring
- Live token discovery feed
- Risk alerts and notifications
- System health indicators

### Token Analysis Views
- Risk-filtered token lists
- Detailed security breakdowns
- Historical analysis trends
- Holder distribution charts

### Simulation Analytics
- Decision accuracy metrics
- Backtesting results
- Performance by risk profile
- Alert effectiveness analysis

## 🔧 Configuration

### Environment Variables
```env
# Core Settings
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Risk Thresholds
HIGH_RISK_THRESHOLD=0.7
MEDIUM_RISK_THRESHOLD=0.4
MIN_LIQUIDITY_USD=1000
MAX_HOLDER_CONCENTRATION=0.5

# Rate Limiting
API_RATE_LIMIT=100
MAX_CONCURRENT_ANALYSES=5
```

### Database Configuration
The system uses MongoDB with the following collections:
- `tokens`: Token metadata and current risk assessments
- `riskanalyses`: Historical analysis results
- `simulationlogs`: Simulated response decisions

## 🚨 Educational Use & Disclaimers

### Purpose
This system is designed for:
- **Security research and education**
- **Understanding DeFi attack patterns**
- **Developing defensive strategies**
- **Academic analysis of token behavior**

### Not Intended For
- ❌ Actual trading or investment decisions
- ❌ Financial advice or recommendations  
- ❌ Exploiting vulnerabilities
- ❌ Production trading systems

### Risk Warnings
- **No guarantees**: Risk analysis is probabilistic, not definitive
- **Educational only**: Not financial or investment advice
- **Research purpose**: Intended for learning and analysis
- **No liability**: Use at your own risk for educational purposes

## 🤝 Contributing

Contributions are welcome for educational and defensive security improvements:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

### Development Guidelines
- Focus on defensive security features
- Include comprehensive tests
- Document security implications
- Follow existing code patterns

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions, issues, or educational discussions:
- Open a GitHub issue
- Check the documentation
- Review the code comments

---

**⚠️ Remember: This is an educational defensive security research platform. Always conduct your own research and never rely solely on automated analysis for actual trading decisions.**