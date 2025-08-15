# Solana Security Monitor Dashboard

A comprehensive React/Next.js dashboard for monitoring and analyzing Solana token security in real-time.

## 🚀 Features

### Real-Time Monitoring
- Live token discovery and analysis updates via WebSocket
- Real-time risk alerts and notifications
- Auto-refreshing system status and statistics

### Token Analysis
- **Risk Scoring**: Comprehensive 0-100% risk assessment
- **Security Checks**: Honeypot detection, rugpull analysis, LP lock verification
- **Holder Analysis**: Whale detection and concentration metrics
- **Market Data**: Price, volume, liquidity, and market cap tracking

### Interactive Dashboard
- **Token Watchlist**: Sortable, filterable table with live updates
- **Token Details**: Deep-dive analysis with risk breakdown
- **Manual Lookup**: Search and analyze any token by address or name
- **Simulation Engine**: Test automated trading strategies
- **Settings**: Customizable risk thresholds and alert preferences

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: WebSocket integration for live data
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Loading States**: Smooth loading indicators throughout
- **Accessibility**: Screen reader friendly with proper ARIA labels

## 📁 Project Structure

```
dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Basic components (Button, Badge, etc.)
│   │   ├── layout/         # Layout components (Navigation, etc.)
│   │   └── tokens/         # Token-specific components
│   ├── hooks/              # Custom React hooks
│   │   ├── useApi.ts       # API data fetching hooks
│   │   └── useWebSocket.ts # Real-time WebSocket hooks
│   ├── pages/              # Next.js pages
│   │   ├── index.tsx       # Token Watchlist (homepage)
│   │   ├── lookup.tsx      # Manual Token Lookup
│   │   ├── settings.tsx    # Settings page
│   │   └── token/[address].tsx # Token detail page
│   ├── services/           # API and service layer
│   │   ├── api.ts          # REST API service
│   │   └── websocket.ts    # WebSocket service
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── globals.css         # Global styles and Tailwind CSS
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── next.config.js          # Next.js configuration
```

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Query for server state
- **Real-time**: Socket.IO client for WebSocket connections
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React icon library
- **Notifications**: React Hot Toast

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Backend API running (see main README)

### Installation

1. **Navigate to dashboard directory:**
   ```bash
   cd dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_WS_URL=ws://localhost:3000
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:3001`

## 📊 Pages Overview

### 1. Token Watchlist (`/`)
- **Main dashboard** with live token monitoring
- **System overview cards** showing key metrics
- **Filterable token table** with risk scoring
- **Real-time updates** via WebSocket
- **Sorting and pagination** for large datasets

### 2. Token Details (`/token/[address]`)
- **Comprehensive token analysis** with multiple tabs
- **Risk breakdown** with detailed explanations
- **Holder distribution** charts and statistics
- **Security flags** and safety indicators
- **Simulation results** for different strategies
- **Analysis history** showing risk changes over time

### 3. Manual Lookup (`/lookup`)
- **Search functionality** by address, name, or symbol
- **On-demand analysis** for any Solana token
- **Quick security summary** with key metrics
- **Integration** with main token database

### 4. Settings (`/settings`)
- **Risk threshold configuration** for personalized alerts
- **Alert preferences** for notifications
- **Simulation parameters** for strategy testing
- **Minimum requirements** for token filtering

## 🔧 Configuration Options

### Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000      # Backend API URL
NEXT_PUBLIC_WS_URL=ws://localhost:3000         # WebSocket URL

# Application Settings
NEXT_PUBLIC_APP_NAME=Solana Security Monitor   # App name
NEXT_PUBLIC_APP_VERSION=1.0.0                  # Version display
NEXT_PUBLIC_ENABLE_ANALYTICS=false             # Analytics toggle
```

### Customization
- **Styling**: Modify `tailwind.config.js` for theme changes
- **API Endpoints**: Update `src/services/api.ts` for different backends
- **Components**: Extend components in `src/components/`
- **Types**: Add new types in `src/types/index.ts`

## 🔌 API Integration

The dashboard connects to the NestJS backend with these key endpoints:

```typescript
// System Overview
GET /api/overview              // Dashboard statistics
GET /api/health               // System health check

// Token Management
GET /api/tokens               // Token list with filters
GET /api/tokens/:address      // Token details
POST /api/tokens/:address/analyze    // Trigger analysis
POST /api/tokens/:address/simulate   // Run simulation

// Real-time Updates
WebSocket Events:
- overview_update             // System stats updates
- new_token                   // New token discovered
- risk_alert                  // High-risk token alert
- simulation_result           // Simulation completed
```

## 🎨 UI Components

### Common Components
- **Button**: Primary, secondary, outline, and icon variants
- **Badge**: Risk levels, status indicators, and custom badges
- **LoadingSpinner**: Various sizes with overlay support
- **ErrorBoundary**: Graceful error handling with retry options

### Token Components
- **TokenTable**: Sortable table with real-time updates
- **TokenFilters**: Advanced filtering with search
- **RiskBadge**: Color-coded risk level indicators
- **SimulationBadge**: Action recommendations

## 📱 Responsive Design

The dashboard is fully responsive with breakpoints:
- **Mobile**: 320px - 768px (single column, collapsible sidebar)
- **Tablet**: 768px - 1024px (two columns, persistent sidebar)
- **Desktop**: 1024px+ (full layout, multiple columns)

## 🔔 Real-time Features

### WebSocket Events
- **Connection Management**: Auto-reconnect with exponential backoff
- **Live Updates**: Token data, system status, alerts
- **Notifications**: Toast alerts for important events
- **Subscription Management**: Selective event listening

### Notification Types
- **High Risk Tokens**: Immediate alerts for dangerous tokens
- **New Discoveries**: Notifications for newly found tokens
- **System Status**: Connection and monitoring status updates
- **Analysis Complete**: Confirmation when manual analysis finishes

## 🧪 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint checks
npm run type-check   # Run TypeScript checks
```

### Development Tips
- **Hot Reload**: Changes auto-refresh in development
- **React Query DevTools**: Available in development mode
- **Error Boundaries**: Comprehensive error catching and reporting
- **TypeScript**: Full type safety throughout the application

## 🚨 Error Handling

### Error Boundaries
- **Global Error Boundary**: Catches all unhandled errors
- **Component-Level**: Specific error handling for API calls
- **Fallback Components**: Graceful degradation with retry options

### API Error Handling
- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Graceful handling of API limits
- **Invalid Responses**: Proper error messages and fallbacks

## 📈 Performance Optimizations

### Data Management
- **React Query**: Intelligent caching and background updates
- **Pagination**: Efficient loading of large token lists
- **Virtual Scrolling**: Smooth performance with thousands of tokens
- **Debounced Search**: Optimized search with reduced API calls

### UI Optimizations
- **Code Splitting**: Pages loaded on demand
- **Image Optimization**: Next.js automatic image optimization
- **CSS Optimization**: Tailwind CSS purging for smaller bundles
- **Lazy Loading**: Components loaded when needed

## 🔒 Security Considerations

### Client-Side Security
- **Input Validation**: All user inputs properly validated
- **XSS Prevention**: Proper escaping of dynamic content
- **CSRF Protection**: SameSite cookies and proper headers
- **Environment Variables**: Sensitive data properly handled

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Coding Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting enforced
- **Conventional Commits**: Commit message standards

---

**🎯 The dashboard provides a complete interface for monitoring Solana token security, making it easy for researchers and developers to identify and analyze potential risks in real-time.**