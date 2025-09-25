# AI Cost Calculator

Professional AI model cost calculator with interactive interface built with Node.js and Vite.

## 🚀 Features

- **Interactive Parameter Adjustment**: Real-time calculation with customizable parameters
- **Multi-Currency & Multi-Language Support**: Toggle between USD/TL and switch UI language (TR/EN)
- **Smart Comparison Views**: Grid, list, and chart modes with badges, readings, and efficiency scores
- **Scenario Calculator & Pricing Panel**: Build what-if scenarios and generate margin-aware sales prices
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Modern UI**: Beautiful, professional interface with smooth animations
- **Comprehensive Analysis**: Detailed cost breakdown, savings insights, and provider recommendations

## 🛠️ Tech Stack

- **Build Tool**: Vite 5.x
- **Language**: Modern JavaScript (ES2021+)  
- **Charts**: Chart.js 4.x
- **Styling**: Custom CSS with CSS Variables
- **Code Quality**: ESLint + Prettier
- **Package Manager**: npm

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
src/
├── index.html                  # Main HTML shell with data-translate attributes
├── js/
│   ├── main.js                 # Application entry point & orchestrator
│   ├── modules/
│   │   ├── CostCalculator.js   # Core cost calculation utilities
│   │   ├── UIManager.js        # UI state, currency toggle, analysis cards
│   │   ├── SmartComparison.js  # Grid/List/Chart rendering & head-to-head
│   │   ├── ScenarioCalculator.js # Scenario modal, insights, pricing panel
│   │   └── LanguageManager.js  # TR/EN selector & runtime translations
│   ├── data/
│   │   └── models.js           # AI model pricing data
│   └── utils/
│       ├── formatters.js       # Number/currency formatting helpers
│       └── translations.js     # Translation dictionary & helpers
└── styles/
    ├── main.css                # Core styling
    └── header-tabs.css         # Header tab layout
```

## 🎯 Usage

1. **Select Language & Currency**: Use the header toggles to switch between TR/EN and USD/TL.
2. **Adjust Parameters**: Modify daily conversations, message counts, word counts, and exchange rates.
3. **Explore Comparison Views**: Switch between grid, list, and chart modes to evaluate models.
4. **Open Scenario Calculator**: Launch the modal to run what-if projections and review smart insights.
5. **Review Pricing Panel**: From comparison or scenario views, open pricing to apply profit margins.
6. **Analyse Recommendations**: Check best/worst cards, savings breakdown, and provider diversity hints.

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## 📈 Supported AI Models

- **OpenAI**: GPT-4o, GPT-4o mini, GPT-5, GPT-5 mini
- **OpenAI Embeddings**: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
- **Google Gemini**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash-Lite
- **Anthropic Claude**: Claude Sonnet 4 (different context lengths)

## 🌐 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request