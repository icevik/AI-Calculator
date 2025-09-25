import { CostCalculator } from './modules/CostCalculator.js'
import { UIManager } from './modules/UIManager.js'
import { ChartManager } from './modules/ChartManager.js'
import { SmartComparison } from './modules/SmartComparison.js'
import { ScenarioCalculator } from './modules/ScenarioCalculator.js'
import { LanguageManager } from './modules/LanguageManager.js'

class App {
  constructor() {
    this.calculator = new CostCalculator()
    this.uiManager = new UIManager()
    this.chartManager = new ChartManager()
    this.smartComparison = new SmartComparison()
    this.scenarioCalculator = new ScenarioCalculator()
    this.languageManager = new LanguageManager()
    
    this.init()
  }

  init() {
    // Initialize event listeners
    this.setupEventListeners()
    
    // Initialize smart comparison
    this.smartComparison.initialize()
    
    // Initialize scenario calculator
    this.scenarioCalculator.initialize()
    
    // Initial calculation and display
    this.updateAll()
    
    console.log('AI Cost Calculator initialized successfully')
  }

  setupEventListeners() {
    // Parameter inputs
    const inputs = ['dailyConversations', 'messagesPerConv', 'inputWords', 'outputWords', 'usdRate', 'daysPerYear']
    inputs.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.addEventListener('input', () => this.updateAll())
      }
    })

    // Embedding inputs
    const embedInputs = ['embeddingWords', 'embeddingTokens', 'usdRate-embed', 'daysPerYear-embed']
    embedInputs.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.addEventListener('input', () => this.updateAll())
      }
    })
    const periodSelect = document.getElementById('embeddingPeriod')
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.updateAll())
    }

    // Currency toggle
    const currencyToggle = document.getElementById('currencyToggle')
    if (currencyToggle) {
      currencyToggle.addEventListener('click', () => this.toggleCurrency())
    }

    // View switch buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.view-btn')) {
        const view = e.target.closest('.view-btn').onclick?.toString().includes('table') ? 'table' : 'chart'
        this.switchView(view)
      }
    })

    // Section collapse buttons
    // Note: collapse handled via inline onclick -> window.toggleSection(sectionId)
  }

  updateAll() {
    const params = this.uiManager.getParameters()
    const tokens = this.calculator.calculateTokens(params)
    const results = this.calculator.calculateAllModels(tokens, params)
    
    // Update UI components
    this.uiManager.updateSummaryStats(tokens, params)
    this.uiManager.updateCostTable(results, params.usdRate)
    this.uiManager.updateAnalysis(results, params.usdRate)
    
    // Update smart comparison
    this.smartComparison.updateComparison(results, params.usdRate, this.uiManager.currentCurrency)
    
    // Update chart if visible
    if (this.uiManager.currentView === 'chart') {
      this.chartManager.updateChart(results, params.usdRate, this.uiManager.currentCurrency)
    }

    // Apply language translations to updated UI
    if (this.languageManager) {
      this.languageManager.updateAllTranslations()
    }
  }

  toggleCurrency() {
    this.uiManager.toggleCurrency()
    this.updateAll()
    // Also refresh scenario modal/pricing if open so currency propagates everywhere
    this.scenarioCalculator.refreshOnCurrencyChange()
  }

  switchView(view) {
    this.uiManager.switchView(view)
    if (view === 'chart') {
      // Small delay to ensure chart container is visible
      setTimeout(() => {
        const params = this.uiManager.getParameters()
        const tokens = this.calculator.calculateTokens(params)
        const results = this.calculator.calculateAllModels(tokens, params)
        this.chartManager.updateChart(results, params.usdRate, this.uiManager.currentCurrency)
      }, 100)
    }
  }

  toggleSection(section) {
    if (section.style.display === 'none') {
      section.style.display = 'grid'
    } else {
      section.style.display = 'none'
    }
  }
}

// Global functions for HTML onclick handlers
window.switchView = (view) => {
  if (window.app) {
    window.app.switchView(view)
    // Update legacy view buttons' active state without relying on global event
    const buttons = document.querySelectorAll('.view-btn')
    buttons.forEach(btn => btn.classList.remove('active'))
    const activeBtn = document.querySelector(`.view-btn[data-view="${view}"]`)
    if (activeBtn) activeBtn.classList.add('active')
  }
}

window.switchComparisonView = (view) => {
  if (window.app && window.app.smartComparison) {
    window.app.smartComparison.switchView(view)
    // Update active button without relying on global event
    const buttons = document.querySelectorAll('.view-toggle .toggle-btn')
    buttons.forEach(btn => btn.classList.remove('active'))
    const activeBtn = document.querySelector(`.view-toggle .toggle-btn[data-view="${view}"]`)
    if (activeBtn) activeBtn.classList.add('active')
  }
}

window.changeChartType = (type) => {
  if (window.app && window.app.smartComparison) {
    window.app.smartComparison.changeChartType(type)
    // Update active button without relying on global event
    const buttons = document.querySelectorAll('.chart-type-btn')
    buttons.forEach(btn => btn.classList.remove('active'))
    const activeBtn = document.querySelector(`.chart-type-btn[data-type="${type}"]`)
    if (activeBtn) activeBtn.classList.add('active')
  }
}

window.selectForComparison = (modelName) => {
  console.log(`Selected ${modelName} for comparison`)
  // This could open a comparison modal or add to comparison list
}

window.toggleFavorite = (modelName, evt) => {
  const button = evt?.target?.closest('.favorite-btn')
  if (!button) return
  const icon = button.querySelector('i')
  
  if (icon.classList.contains('far')) {
    icon.classList.remove('far')
    icon.classList.add('fas')
    button.style.background = 'var(--danger-color)'
    button.style.borderColor = 'var(--danger-color)'
    button.style.color = 'white'
  } else {
    icon.classList.remove('fas')
    icon.classList.add('far')
    button.style.background = ''
    button.style.borderColor = ''
    button.style.color = ''
  }
}

window.toggleSection = (sectionId) => {
  const section = document.getElementById(sectionId)
  if (section && window.app) {
    window.app.toggleSection(section)
  }
}

// Additional Smart Comparison helpers
window.switchModelType = (type) => {
  if (window.app && window.app.smartComparison) {
    window.app.smartComparison.switchModelType(type)
    // Ensure titles and labels are translated for the selected model type
    if (window.app.languageManager) {
      window.app.languageManager.updateAllTranslations()
    }
  }
}

window.switchSortBy = (sort) => {
  if (window.app && window.app.smartComparison) {
    window.app.smartComparison.switchSort(sort)
  }
}

window.switchFilterBy = (filter) => {
  if (window.app && window.app.smartComparison) {
    window.app.smartComparison.switchFilter(filter)
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App()
})
