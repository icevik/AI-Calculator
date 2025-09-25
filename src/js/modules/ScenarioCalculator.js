import { formatCurrency, formatNumber, numberToTurkishCurrencyText } from '../utils/formatters.js'
import { GENERATIVE_MODELS } from '../data/models.js'
import { getTranslation, getCurrentLanguage } from '../utils/translations.js'

export class ScenarioCalculator {
  constructor() {
    this.currentScenario = null
    this.currentResults = null
    this.currentTokens = null
    this.modal = null
    this.lastFocused = null
    this.currentLanguage = getCurrentLanguage()

    document.addEventListener('languagechange', (e) => {
      this.currentLanguage = e?.detail?.language || getCurrentLanguage()
      this.refreshTranslations()
    })
  }

  // Re-render scenario outputs and pricing panel when currency changes
  refreshOnCurrencyChange() {
    try {
      if (this.currentResults && this.currentScenario) {
        // Re-render scenario comparison and insights with the new currency
        this.updateScenarioComparison(this.currentResults, this.currentScenario.usdRate)
        const tokens = this.currentTokens || this.calculateTokens(this.currentScenario)
        this.currentTokens = tokens
        this.generateInsights(this.currentResults, this.currentScenario, tokens)
      }
      // If pricing panel is open and a model is selected, refresh KPIs with current margin
      if (this.currentPricingModel) {
        const margin = parseFloat(this.pricingMarginInput?.value || '0')
        this.updatePricingKPIs(this.currentPricingModel, margin)
      }
    } catch (e) {
      console.warn('Scenario currency refresh skipped:', e)
    }
  }

  initialize() {
    this.setupEventListeners()
    this.setupModal()
    this.setupPricingPanel()
  }

  translate(key) {
    return getTranslation(key, this.currentLanguage)
  }

  formatTranslation(key, replacements = {}) {
    let text = this.translate(key)
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`{${placeholder}}`, 'g'), value)
    })
    return text
  }

  refreshTranslations() {
    if (this.currentResults && this.currentScenario) {
      this.updateScenarioComparison(this.currentResults, this.currentScenario.usdRate)
      const tokens = this.currentTokens || this.calculateTokens(this.currentScenario)
      this.currentTokens = tokens
      this.generateInsights(this.currentResults, this.currentScenario, tokens)
    }
    if (this.currentPricingModel) {
      const margin = parseFloat(this.pricingMarginInput?.value || '0')
      this.updatePricingKPIs(this.currentPricingModel, margin)
    }
  }

  setupEventListeners() {
    const calculateBtn = document.getElementById('calculateScenario')
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.calculateScenario())
    }

    // Auto-calculate on input change with debounce
    const inputs = ['scenarioConversations', 'scenarioMessages', 'scenarioInputWords', 'scenarioOutputWords']
    inputs.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.addEventListener('input', this.debounce(() => this.calculateScenario(), 500))
      }
    })
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Modal wiring for scenario calculator
  setupModal() {
    this.modal = document.getElementById('scenarioModal')
    const openBtn = document.getElementById('openScenarioModal')
    const closeBtn = this.modal?.querySelector('.modal-close')

    if (openBtn) openBtn.addEventListener('click', () => this.openModal())
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal())

    if (this.modal) {
      // Close on overlay click
      this.modal.addEventListener('mousedown', (e) => {
        if (e.target === this.modal) this.closeModal()
      })
      // ESC and focus trap
      this.modal.addEventListener('keydown', (e) => this.handleKeydown(e))
    }

    // Expose globals used by HTML
    window.closeScenarioModal = () => this.closeModal()
    window.openScenarioModal = () => this.openModal()
  }

  handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closeModal()
      return
    }
    if (e.key === 'Tab') {
      const focusable = this.getFocusableElements()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  getFocusableElements() {
    if (!this.modal) return []
    return Array.from(this.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1)
  }

  openModal() {
    if (!this.modal) return
    this.lastFocused = document.activeElement
    this.modal.style.display = 'flex'
    this.modal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('modal-open')
    // Focus first input
    const firstInput = this.modal.querySelector('#scenarioConversations')
    if (firstInput) firstInput.focus()
  }

  closeModal() {
    if (!this.modal) return
    this.modal.style.display = 'none'
    this.modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('modal-open')
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus()
    }
  }

  getScenarioParameters() {
    return {
      dailyConversations: parseInt(document.getElementById('scenarioConversations')?.value || 5000),
      messagesPerConv: parseInt(document.getElementById('scenarioMessages')?.value || 5),
      inputWords: parseInt(document.getElementById('scenarioInputWords')?.value || 30),
      outputWords: parseInt(document.getElementById('scenarioOutputWords')?.value || 200),
      usdRate: parseFloat(document.getElementById('usdRate')?.value || 42),
      daysPerYear: parseInt(document.getElementById('daysPerYear')?.value || 365)
    }
  }

  calculateTokens(params) {
    const totalDailyMessages = params.dailyConversations * params.messagesPerConv
    const dailyInputTokens = totalDailyMessages * params.inputWords * (4/3) // Words to tokens
    const dailyOutputTokens = totalDailyMessages * params.outputWords * (4/3)
    
    return {
      totalDailyMessages,
      dailyInputTokens,
      dailyOutputTokens,
      monthlyInputTokens: dailyInputTokens * 30,
      monthlyOutputTokens: dailyOutputTokens * 30,
      yearlyInputTokens: dailyInputTokens * params.daysPerYear,
      yearlyOutputTokens: dailyOutputTokens * params.daysPerYear
    }
  }

  calculateModelCosts(tokens, params) {
    const results = []
    
    Object.entries(GENERATIVE_MODELS).forEach(([modelName, modelData]) => {
      const dailyInputCost = tokens.dailyInputTokens * modelData.input
      const dailyOutputCost = tokens.dailyOutputTokens * modelData.output
      const dailyTotal = dailyInputCost + dailyOutputCost
      
      const monthlyTotal = dailyTotal * 30
      const yearlyTotal = dailyTotal * params.daysPerYear
      const perConversation = dailyTotal / params.dailyConversations
      const perMessage = dailyTotal / tokens.totalDailyMessages

      results.push({
        model: modelName,
        provider: modelData.provider,
        inputPrice: modelData.input * 1_000_000, // Convert to per 1M tokens
        outputPrice: modelData.output * 1_000_000,
        dailyTotal,
        monthlyTotal,
        yearlyTotal,
        perConversation,
        perMessage,
        dailyInput: tokens.dailyInputTokens,
        dailyOutput: tokens.dailyOutputTokens
      })
    })

    return results.sort((a, b) => a.yearlyTotal - b.yearlyTotal)
  }

  calculateScenario() {
    const params = this.getScenarioParameters()
    const tokens = this.calculateTokens(params)
    const results = this.calculateModelCosts(tokens, params)
    
    this.currentScenario = params
    this.currentResults = results
    
    this.updateScenarioSummary(tokens, params)
    this.updateScenarioComparison(results, params.usdRate)
    this.generateInsights(results, params, tokens)
    
    // Show results section
    const resultsSection = document.getElementById('scenarioResults')
    if (resultsSection) {
      resultsSection.style.display = 'block'
    }
  }

  updateScenarioSummary(tokens, params) {
    const elements = {
      scenarioTotalConversations: document.getElementById('scenarioTotalConversations'),
      scenarioTotalMessages: document.getElementById('scenarioTotalMessages'),
      scenarioTotalTokens: document.getElementById('scenarioTotalTokens')
    }

    if (elements.scenarioTotalConversations) {
      elements.scenarioTotalConversations.textContent = formatNumber(params.dailyConversations)
    }
    if (elements.scenarioTotalMessages) {
      elements.scenarioTotalMessages.textContent = formatNumber(tokens.totalDailyMessages)
    }
    if (elements.scenarioTotalTokens) {
      const totalTokens = tokens.dailyInputTokens + tokens.dailyOutputTokens
      elements.scenarioTotalTokens.textContent = this.formatTokens(totalTokens)
    }
  }

  formatTokens(tokens) {
    if (tokens >= 1_000_000) {
      return (tokens / 1_000_000).toFixed(1) + 'M'
    } else if (tokens >= 1_000) {
      return (tokens / 1_000).toFixed(1) + 'K'
    }
    return Math.round(tokens).toString()
  }

  updateScenarioComparison(results, usdRate) {
    const container = document.getElementById('scenarioComparison')
    if (!container) return

    const currency = window.app?.uiManager?.currentCurrency || 'TL'
    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'
    const currencyCode = currency === 'TL' ? 'TL' : 'USD'

    const topModels = results.slice(0, 5) // Show top 5 most cost-effective
    const best = results[0]
    const dailyReading = numberToTurkishCurrencyText(best.dailyTotal * multiplier, currencyCode)
    const monthlyReading = numberToTurkishCurrencyText(best.monthlyTotal * multiplier, currencyCode)
    const yearlyReadingBest = numberToTurkishCurrencyText(best.yearlyTotal * multiplier, currencyCode)
    const perConvReading = numberToTurkishCurrencyText(best.perConversation * multiplier, currencyCode)
    const perMsgReading = numberToTurkishCurrencyText(best.perMessage * multiplier, currencyCode)

    container.innerHTML = `
      <div class="scenario-highlight">
        <div>
          <div class="title">${best.model} <span class="provider-badge">${best.provider}</span> <span class="best-badge">${this.translate('scenarioHighlightBestBadge')}</span></div>
          <div class="label" title="${perConvReading} / ${perMsgReading}">${this.translate('perConversation')}: <strong>${symbol}${formatCurrency(best.perConversation * multiplier, 4)}</strong> • ${this.translate('perMessage')}: <strong>${symbol}${formatCurrency(best.perMessage * multiplier, 5)}</strong></div>
          <div style="margin-top:8px;"><button class="price-btn" onclick="openPricing('${best.model}')" title="${this.translate('pricingOpenTooltip')}"><i class="fas fa-tags"></i> ${this.translate('pricingAction')}</button></div>
        </div>
        <div>
          <div class="label">${this.translate('daily')}</div>
          <div class="value" title="${dailyReading}">${symbol}${formatCurrency(best.dailyTotal * multiplier)}</div>
          <div class="label">${this.translate('reading')}: ${dailyReading}</div>
        </div>
        <div>
          <div class="label">${this.translate('monthly')}</div>
          <div class="value" title="${monthlyReading}">${symbol}${formatCurrency(best.monthlyTotal * multiplier)}</div>
          <div class="label">${this.translate('reading')}: ${monthlyReading}</div>
        </div>
        <div>
          <div class="label">${this.translate('yearly')}</div>
          <div class="value" title="${yearlyReadingBest}">${symbol}${formatCurrency(best.yearlyTotal * multiplier)}</div>
          <div class="label">${this.translate('reading')}: ${yearlyReadingBest}</div>
        </div>
      </div>

      <div class="scenario-table">
        <div class="scenario-table-header">
          <div class="model-col">${this.translate('model')}</div>
          <div class="daily-col">${this.translate('daily')}</div>
          <div class="monthly-col">${this.translate('monthly')}</div>
          <div class="yearly-col">${this.translate('yearly')}</div>
          <div class="per-conv-col">${this.translate('perConversation')}</div>
          <div class="reading-col">${this.translate('reading')}</div>
          <div class="price-col">${this.translate('pricing')}</div>
        </div>
        ${topModels.map((result, index) => {
          const yearlyReading = numberToTurkishCurrencyText(result.yearlyTotal * multiplier, currencyCode)
          return `
            <div class="scenario-table-row ${index === 0 ? 'best-option' : ''}">
              <div class="model-col">
                <div class="model-name">${result.model}</div>
                <div class="provider-badge">${result.provider}</div>
                ${index === 0 ? `<span class="best-badge">${this.translate('scenarioHighlightBestBadge')}</span>` : ''}
              </div>
              <div class="daily-col">
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.dailyTotal * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.dailyTotal * multiplier, currencyCode)}', event)">
                  ${symbol}${formatCurrency(result.dailyTotal * multiplier)}
                </span>
              </div>
              <div class="monthly-col">
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}', event)">
                  ${symbol}${formatCurrency(result.monthlyTotal * multiplier)}
                </span>
              </div>
              <div class="yearly-col">
                <div class="yearly-amount">${symbol}${formatCurrency(result.yearlyTotal * multiplier)}</div>
                <div class="yearly-reading">${yearlyReading}</div>
              </div>
              <div class="per-conv-col">
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}', event)">
                  ${symbol}${formatCurrency(result.perConversation * multiplier, 4)}
                </span>
              </div>
              <div class="reading-col">
                <button class="reading-btn" onclick="showReading('${yearlyReading}', event)" title="${this.translate('scenarioReadingButtonTooltip')}">
                  <i class="fas fa-volume-up"></i>
                </button>
              </div>
              <div class="price-col">
                <button class="price-btn" onclick="openPricing('${result.model}')" title="${this.translate('pricingOpenTooltip')}">
                  <i class="fas fa-tags"></i> ${this.translate('pricingAction')}
                </button>
              </div>
            </div>
          `
        }).join('')}
      </div>
    `
  }

  generateInsights(results, params, tokens) {
    const container = document.getElementById('scenarioInsights')
    if (!container || results.length === 0) return

    const currency = window.app?.uiManager?.currentCurrency || 'TL'
    const multiplier = currency === 'TL' ? params.usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'

    const best = results[0]
    const worst = results[results.length - 1]
    const savings = (worst.yearlyTotal - best.yearlyTotal) * multiplier
    const savingsPercent = ((worst.yearlyTotal - best.yearlyTotal) / worst.yearlyTotal) * 100

    // Calculate volume insights
    const isHighVolume = params.dailyConversations > 10000
    const isVeryHighVolume = params.dailyConversations > 50000
    const totalDailyTokens = tokens.dailyInputTokens + tokens.dailyOutputTokens

    const insights = []

    // Cost savings insight
    insights.push({
      icon: 'fas fa-piggy-bank',
      title: this.translate('scenarioInsightCostSavingsTitle'),
      content: this.formatTranslation('scenarioInsightCostSavingsContent', {
        model: `<strong>${best.model}</strong>`,
        amount: `<strong>${symbol}${formatCurrency(savings)}</strong>`,
        percent: savingsPercent.toFixed(1)
      })
    })

    // Volume-based insights
    if (isVeryHighVolume) {
      insights.push({
        icon: 'fas fa-rocket',
        title: this.translate('scenarioInsightVeryHighVolumeTitle'),
        content: this.formatTranslation('scenarioInsightVeryHighVolumeContent', {
          count: formatNumber(params.dailyConversations)
        })
      })
    } else if (isHighVolume) {
      insights.push({
        icon: 'fas fa-chart-line',
        title: this.translate('scenarioInsightHighVolumeTitle'),
        content: this.translate('scenarioInsightHighVolumeContent')
      })
    }

    // Token efficiency insight
    const avgTokensPerMessage = (tokens.dailyInputTokens + tokens.dailyOutputTokens) / tokens.totalDailyMessages
    if (avgTokensPerMessage > 400) {
      insights.push({
        icon: 'fas fa-exclamation-triangle',
        title: this.translate('scenarioInsightTokenOptTitle'),
        content: this.formatTranslation('scenarioInsightTokenOptContent', {
          tokens: Math.round(avgTokensPerMessage)
        })
      })
    }

    // Provider diversity insight
    const providers = [...new Set(results.slice(0, 3).map(r => r.provider))]
    if (providers.length > 1) {
      insights.push({
        icon: 'fas fa-balance-scale',
        title: this.translate('scenarioInsightProviderDiversityTitle'),
        content: this.formatTranslation('scenarioInsightProviderDiversityContent', {
          providers: providers.join(', ')
        })
      })
    }

    // Cost per conversation insight
    const avgCostPerConv = best.perConversation * multiplier
    if (avgCostPerConv < 0.01) {
      insights.push({
        icon: 'fas fa-thumbs-up',
        title: this.translate('scenarioInsightExcellentEfficiencyTitle'),
        content: this.formatTranslation('scenarioInsightExcellentEfficiencyContent', {
          amount: `${symbol}${formatCurrency(avgCostPerConv, 4)}`
        })
      })
    } else if (avgCostPerConv > 0.1) {
      insights.push({
        icon: 'fas fa-search',
        title: this.translate('scenarioInsightOptimizationChanceTitle'),
        content: this.formatTranslation('scenarioInsightOptimizationChanceContent', {
          amount: `${symbol}${formatCurrency(avgCostPerConv, 4)}`
        })
      })
    }

    container.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <div class="insight-icon">
          <i class="${insight.icon}"></i>
        </div>
        <div class="insight-content">
          <h5>${insight.title}</h5>
          <p>${insight.content}</p>
        </div>
      </div>
    `).join('')
  }

  // Pricing Panel Logic
  setupPricingPanel() {
    this.pricingPanel = document.getElementById('pricingPanel')
    this.pricingCloseBtn = document.getElementById('pricingCloseBtn')
    this.pricingMarginInput = document.getElementById('pricingMargin')
    this.pricingModelName = document.getElementById('pricingModelName')

    if (this.pricingCloseBtn) this.pricingCloseBtn.addEventListener('click', () => this.closePricingPanel())
    if (this.pricingPanel) {
      // Close with ESC when panel is open
      this.pricingPanel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closePricingPanel()
      })
    }

    if (this.pricingMarginInput) {
      this.pricingMarginInput.addEventListener('input', () => {
        const margin = parseFloat(this.pricingMarginInput.value || '0')
        if (this.currentPricingModel) this.updatePricingKPIs(this.currentPricingModel, margin)
      })
    }

    // Expose global opener for inline buttons
    window.openPricing = (modelName) => this.openPricingPanel(modelName)
  }

  openPricingPanel(modelName) {
    if (!this.currentResults || !this.pricingPanel) return
    const result = this.currentResults.find(r => r.model === modelName)
    if (!result) return
    this.currentPricingModel = result

    if (this.pricingModelName) this.pricingModelName.value = `${result.model} (${result.provider})`

    const margin = parseFloat(this.pricingMarginInput?.value || '0')
    this.updatePricingKPIs(result, margin)

    this.pricingPanel.classList.add('open')
    this.pricingPanel.setAttribute('aria-hidden', 'false')
    // focus margin input for quick adjustment
    setTimeout(() => this.pricingMarginInput?.focus(), 0)
  }

  closePricingPanel() {
    if (!this.pricingPanel) return
    this.pricingPanel.classList.remove('open')
    this.pricingPanel.setAttribute('aria-hidden', 'true')
  }

  updatePricingKPIs(result, marginPercent) {
    const params = this.currentScenario || this.getScenarioParameters()
    const currency = window.app?.uiManager?.currentCurrency || 'TL'
    const usdRate = params.usdRate
    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'
    const currencyCode = currency === 'TL' ? 'TL' : 'USD'

    const m = Math.max(0, marginPercent || 0) / 100
    const toPrice = (cost) => cost * (1 + m)

    const dailyCost = result.dailyTotal * multiplier
    const monthlyCost = result.monthlyTotal * multiplier
    const yearlyCost = result.yearlyTotal * multiplier
    const perConvCost = result.perConversation * multiplier
    const perMsgCost = result.perMessage * multiplier

    const dailyPrice = toPrice(dailyCost)
    const monthlyPrice = toPrice(monthlyCost)
    const yearlyPrice = toPrice(yearlyCost)
    const perConvPrice = toPrice(perConvCost)
    const perMsgPrice = toPrice(perMsgCost)

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }
    const setRead = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = numberToTurkishCurrencyText(val, currencyCode) }
    const formatAmount = (value, decimals = 2) => `${symbol}${formatCurrency(value, decimals)}`
    const formatAdded = (value, decimals = 2) => this.formatTranslation('pricingAddedAmount', {
      amount: `${symbol}${formatCurrency(value, decimals)}`
    })

    set('kpiDailyCost', formatAmount(dailyCost))
    set('kpiMonthlyCost', formatAmount(monthlyCost))
    set('kpiYearlyCost', formatAmount(yearlyCost))
    set('kpiPerConvCost', formatAmount(perConvCost, 4))
    set('kpiPerMsgCost', formatAmount(perMsgCost, 5))
    setRead('kpiDailyCostRead', dailyCost); setRead('kpiMonthlyCostRead', monthlyCost); setRead('kpiYearlyCostRead', yearlyCost)
    setRead('kpiPerConvCostRead', perConvCost); setRead('kpiPerMsgCost', perMsgCost)

    set('kpiDailyPrice', formatAmount(dailyPrice))
    set('kpiMonthlyPrice', formatAmount(monthlyPrice))
    set('kpiYearlyPrice', formatAmount(yearlyPrice))
    set('kpiPerConvPrice', formatAmount(perConvPrice, 4))
    set('kpiPerMsgPrice', formatAmount(perMsgPrice, 5))
    // Added amount over cost
    set('kpiDailyAdd', formatAdded(dailyPrice - dailyCost))
    set('kpiMonthlyAdd', formatAdded(monthlyPrice - monthlyCost))
    set('kpiYearlyAdd', formatAdded(yearlyPrice - yearlyCost))
    set('kpiPerConvAdd', formatAdded(perConvPrice - perConvCost, 4))
    set('kpiPerMsgAdd', formatAdded(perMsgPrice - perMsgCost, 5))
    setRead('kpiDailyPriceRead', dailyPrice); setRead('kpiMonthlyPriceRead', monthlyPrice); setRead('kpiYearlyPriceRead', yearlyPrice)
    setRead('kpiPerConvPriceRead', perConvPrice); setRead('kpiPerMsgPriceRead', perMsgPrice)

    // Smart suggestions based on typical SaaS margins and rounding
    const suggestions = []
    const roundTo = (val, step) => Math.ceil(val / step) * step
    // Suggest rounded per-conversation price to nearest 0.01 TL/USD
    const pcStep = currency === 'TL' ? 0.05 : 0.01
    const pmStep = currency === 'TL' ? 0.01 : 0.005
    const pcRounded = roundTo(perConvPrice, pcStep)
    const pmRounded = roundTo(perMsgPrice, pmStep)
    suggestions.push(`
      <div class="insight-item">
        <div class="insight-icon"><i class="fas fa-magic"></i></div>
        <div class="insight-content">
          <h5>${this.translate('pricingSuggestionRoundingTitle')}</h5>
          <p>${this.formatTranslation('pricingSuggestionRoundingContent', {
            perConv: `${symbol}${formatCurrency(pcRounded, 4)}`,
            perMsg: `${symbol}${formatCurrency(pmRounded, 5)}`
          })}</p>
        </div>
      </div>
    `)

    // Margin advice
    if (m < 0.2) {
      const percent = (m * 100).toFixed(1)
      suggestions.push(`
        <div class="insight-item">
          <div class="insight-icon"><i class="fas fa-balance-scale"></i></div>
          <div class="insight-content">
            <h5>${this.translate('pricingSuggestionLowMarginTitle')}</h5>
            <p>${this.formatTranslation('pricingSuggestionLowMarginContent', { percent })}</p>
          </div>
        </div>
      `)
    } else if (m > 1.0) {
      const percent = (m * 100).toFixed(1)
      suggestions.push(`
        <div class="insight-item">
          <div class="insight-icon"><i class="fas99fe"></i></div>
          <div class="insight-content">
            <h5>${this.translate('pricingSuggestionHighMarginTitle')}</h5>
            <p>${this.formatTranslation('pricingSuggestionHighMarginContent', { percent })}</p>
          </div>
        </div>
      `)
    }

    const sugContainer = document.getElementById('pricingSuggestions')
    if (sugContainer) sugContainer.innerHTML = suggestions.join('')
  }
}
