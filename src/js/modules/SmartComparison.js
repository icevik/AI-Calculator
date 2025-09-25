import { formatCurrency, numberToTurkishCurrencyText } from '../utils/formatters.js'
import { getTranslation, getCurrentLanguage } from '../utils/translations.js'
import { GENERATIVE_MODELS, EMBEDDING_MODELS } from '../data/models.js'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export class SmartComparison {
  constructor() {
    this.currentView = 'grid'
    this.currentSort = 'yearly'
    this.currentFilter = 'all'
    this.selectedModelA = null
    this.selectedModelB = null
    this.currentResults = null
    this.currentUsdRate = 1
    this.currentCurrency = 'USD'
    this.currentModelType = 'generative' // 'generative' or 'embedding'
    this.currentLanguage = getCurrentLanguage()
  }
  initialize() {
    // Default chart type and initial event wiring
    this.currentChartType = 'bar'
    this.setupEventListeners()

    // React to language changes
    document.addEventListener('languagechange', (e) => {
      this.currentLanguage = e?.detail?.language || getCurrentLanguage()
      // Re-render with current cached data
      this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
    })
  }

  setupEventListeners() {
    // Sort and filter controls
    const sortBy = document.getElementById('sortBy')
    const filterBy = document.getElementById('filterBy')
    const modelA = document.getElementById('modelA')
    const modelB = document.getElementById('modelB')

    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        this.currentSort = e.target.value
        this.updateComparison()
      })
    }

    if (filterBy) {
      filterBy.addEventListener('change', (e) => {
        this.currentFilter = e.target.value
        this.updateComparison()
      })
    }

    if (modelA && modelB) {
      modelA.addEventListener('change', () => this.updateHeadToHead())
      modelB.addEventListener('change', () => this.updateHeadToHead())
    }
  }

  switchSort(sort) {
    this.currentSort = sort
    if (this.currentResults) {
      this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
    } else {
      this.updateComparison()
    }
  }

  switchFilter(filter) {
    this.currentFilter = filter
    if (this.currentResults) {
      this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
    } else {
      this.updateComparison()
    }
  }

  calculateEfficiencyScore(result) {
    // Calculate efficiency based on true cost per token (uses token counts when available)
    const totalTokens = result.totalDailyTokens ?? 0
    const costPerMillion = totalTokens > 0 ? (result.dailyTotal / totalTokens) * 1_000_000 : Infinity
    // Lower $/1M token = higher efficiency (inverted scale 1-100)
    const costEfficiency = Number.isFinite(costPerMillion) ? Math.max(0, 100 - (costPerMillion * 10)) : 0

    // For generative models, also consider input/output price balance
    if (this.currentModelType === 'generative') {
      const inputOutputRatio = result.inputPrice > 0 ? (result.outputPrice / result.inputPrice) : Infinity
      const balanceEfficiency = Number.isFinite(inputOutputRatio)
        ? Math.max(0, 100 - Math.abs(inputOutputRatio - 5) * 10)
        : 0
      return Math.round((costEfficiency + balanceEfficiency) / 2)
    }
    // For embedding models, rely solely on cost efficiency
    return Math.round(costEfficiency)
  }

  filterModels(results) {
    // First filter by model type
    const typeFilteredResults = results.filter(result => {
      const modelName = result.model
      if (this.currentModelType === 'generative') {
        return GENERATIVE_MODELS[modelName] !== undefined
      } else {
        return EMBEDDING_MODELS[modelName] !== undefined
      }
    })

    // Then filter by provider if not 'all'
    if (this.currentFilter === 'all') return typeFilteredResults
    
    return typeFilteredResults.filter(result => {
      const modelName = result.model
      const modelData = this.currentModelType === 'generative' 
        ? GENERATIVE_MODELS[modelName] 
        : EMBEDDING_MODELS[modelName]
      
      return modelData && modelData.provider === this.currentFilter
    })
  }

  sortModels(results) {
    return [...results].sort((a, b) => {
      switch (this.currentSort) {
        case 'yearly':
          return a.yearlyTotal - b.yearlyTotal
        case 'monthly':
          return a.monthlyTotal - b.monthlyTotal
        case 'perMessage':
          return a.perMessage - b.perMessage
        case 'efficiency':
          const efficiencyA = this.calculateEfficiencyScore(a)
          const efficiencyB = this.calculateEfficiencyScore(b)
          return efficiencyB - efficiencyA // Higher efficiency first
        default:
          return a.yearlyTotal - b.yearlyTotal
      }
    })
  }

  updateModelSelectors(results) {
    const modelAEl = document.getElementById('modelA')
    const modelBEl = document.getElementById('modelB')
    if (!modelAEl || !modelBEl || !Array.isArray(results)) return

    // Preserve current selections if possible
    const currentA = modelAEl.value
    const currentB = modelBEl.value

    // Unique model names
    const models = [...new Set(results.map(r => r.model))]

    // Populate Model A
    modelAEl.innerHTML = `<option value="">${getTranslation('modelA', this.currentLanguage)}</option>`
    models.forEach(model => {
      const opt = document.createElement('option')
      opt.value = model
      opt.textContent = model
      modelAEl.appendChild(opt)
    })

    // Populate Model B
    modelBEl.innerHTML = `<option value="">${getTranslation('modelB', this.currentLanguage)}</option>`
    models.forEach(model => {
      const opt = document.createElement('option')
      opt.value = model
      opt.textContent = model
      modelBEl.appendChild(opt)
    })

    // Restore selections if still valid
    if (currentA && models.includes(currentA)) modelAEl.value = currentA
    if (currentB && models.includes(currentB)) modelBEl.value = currentB
  }

  updateComparison(results = this.currentResults, usdRate = this.currentUsdRate, currency = this.currentCurrency) {
    if (!results) return

    // Store current results and currency info for head-to-head comparison
    this.currentResults = results
    this.currentUsdRate = usdRate
    this.currentCurrency = currency

    const filteredResults = this.filterModels(results)
    const sortedResults = this.sortModels(filteredResults)

    // Update model selectors
    this.updateModelSelectors(results)

    // Update head-to-head comparison
    this.updateHeadToHead()

    // Update current view
    if (this.currentView === 'grid') {
      this.updateGridView(sortedResults, usdRate, currency)
    } else if (this.currentView === 'list') {
      this.updateListView(sortedResults, usdRate, currency)
    } else if (this.currentView === 'chart') {
      this.updateChartView(sortedResults, usdRate, currency)
    }

    // Update recommendations
    this.updateRecommendations(sortedResults, usdRate, currency)
  }

  updateGridView(results, usdRate, currency) {
    const container = document.getElementById('comparisonGrid')
    if (!container) return

    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'
    const currencyCode = currency === 'TL' ? 'TL' : 'USD'

    container.innerHTML = results.map((result, index) => {
      const efficiency = this.calculateEfficiencyScore(result)
      const isRecommended = index < 3
      const isCheapest = index === 0

      const yearlyReading = numberToTurkishCurrencyText(result.yearlyTotal * multiplier, currencyCode)

      return `
        <div class="comparison-card ${isCheapest ? 'cheapest' : ''} ${isRecommended ? 'recommended' : ''}">
          <div class="card-header">
            <div class="model-name">
              <h3>${result.model}</h3>
              ${isCheapest ? `<span class="badge best">${getTranslation('cheapest', this.currentLanguage)}</span>` : ''}
              ${isRecommended && !isCheapest ? `<span class="badge recommended">${getTranslation('recommended', this.currentLanguage)}</span>` : ''}
            </div>
            <div class="efficiency-indicator">
              <div class="efficiency-score" style="--score: ${efficiency}%">
                <span class="score-value">${efficiency}</span>
                <span class="score-label">${getTranslation('efficiency', this.currentLanguage)}</span>
              </div>
            </div>
          </div>
          
          <div class="pricing-section">
            <div class="price-row">
              <span class="price-label">${getTranslation('pricingInput', this.currentLanguage)}:</span>
              <span class="price-value">$${result.inputPrice.toFixed(3)}${getTranslation('pricingPerMillion', this.currentLanguage)}</span>
            </div>
            <div class="price-row">
              <span class="price-label">${getTranslation('pricingOutput', this.currentLanguage)}:</span>
              <span class="price-value">$${result.outputPrice.toFixed(3)}${getTranslation('pricingPerMillion', this.currentLanguage)}</span>
            </div>
          </div>

          <div class="cost-section">
            <div class="cost-highlight">
              <div class="cost-amount">${symbol}${formatCurrency(result.yearlyTotal * multiplier)}</div>
              <div class="cost-period">${getTranslation('yearly', this.currentLanguage)}</div>
              <div class="cost-reading">${getTranslation('reading', this.currentLanguage)}: <span class="reading-text">${yearlyReading}</span></div>
            </div>
            <div class="cost-breakdown">
              <div class="cost-item">
                <span>${getTranslation('monthly', this.currentLanguage)}:</span>
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}', event)">${symbol}${formatCurrency(result.monthlyTotal * multiplier)}</span>
              </div>
              <div class="cost-item">
                <span>${getTranslation('daily', this.currentLanguage)}:</span>
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.dailyTotal * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.dailyTotal * multiplier, currencyCode)}', event)">${symbol}${formatCurrency(result.dailyTotal * multiplier)}</span>
              </div>
              ${this.currentModelType === 'generative' ? `
              <div class="cost-item">
                <span>${getTranslation('perConversation', this.currentLanguage)}:</span>
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}', event)">${symbol}${formatCurrency(result.perConversation * multiplier, 4)}</span>
              </div>
              <div class="cost-item">
                <span>${getTranslation('perMessage', this.currentLanguage)}:</span>
                <span class="click-reading" title="${numberToTurkishCurrencyText(result.perMessage * multiplier, currencyCode)}" onclick="showReading('${numberToTurkishCurrencyText(result.perMessage * multiplier, currencyCode)}', event)">${symbol}${formatCurrency(result.perMessage * multiplier, 5)}</span>
              </div>` : ''}
            </div>
          </div>

          <div class="card-actions">
            <button class="compare-btn" onclick="selectForComparison('${result.model}')">
              <i class="fas fa-balance-scale"></i> ${getTranslation('compare', this.currentLanguage)}
            </button>
            <button class="favorite-btn" onclick="toggleFavorite('${result.model}', event)">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
      `
    }).join('')
  }

  updateListView(results, usdRate, currency) {
    const container = document.getElementById('comparisonListItems')
    if (!container) return

    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'
    const currencyCode = currency === 'TL' ? 'TL' : 'USD'

    container.innerHTML = results.map((result, index) => {
      const efficiency = this.calculateEfficiencyScore(result)
      const yearlyReading = numberToTurkishCurrencyText(result.yearlyTotal * multiplier, currencyCode)
      return `
        <div class="list-item ${index === 0 ? 'cheapest' : ''}">
          <div class="model-info">
            <div class="model-title">${result.model}</div>
            ${index === 0 ? `<span class="mini-badge">${getTranslation('cheapest', this.currentLanguage)}</span>` : ''}
          </div>
          <div class="pricing-info">
            <div class="price-small">$${result.inputPrice.toFixed(3)} / $${result.outputPrice.toFixed(3)}</div>
            <div class="price-label">${getTranslation('pricingInput', this.currentLanguage)} / ${getTranslation('pricingOutput', this.currentLanguage)} (1M token)</div>
          </div>
          <div class="cost-info">
            <div class="cost-main" title="${yearlyReading}">${symbol}${formatCurrency(result.yearlyTotal * multiplier)}</div>
            <div class="cost-sub">${getTranslation('reading', this.currentLanguage)}: <span class="reading-text">${yearlyReading}</span></div>
            <div class="cost-sub" title="${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}">
              <span class="click-reading" onclick="showReading('${numberToTurkishCurrencyText(result.monthlyTotal * multiplier, currencyCode)}', event)">${symbol}${formatCurrency(result.monthlyTotal * multiplier)}</span>
            </div>
            ${this.currentModelType === 'generative' ? `
            <div class="cost-sub" title="${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}"><span class="click-reading" onclick="showReading('${numberToTurkishCurrencyText(result.perConversation * multiplier, currencyCode)}', event)">${getTranslation('perConversation', this.currentLanguage)}: ${symbol}${formatCurrency(result.perConversation * multiplier, 4)}</span></div>
            <div class="cost-sub" title="${numberToTurkishCurrencyText(result.perMessage * multiplier, currencyCode)}"><span class="click-reading" onclick="showReading('${numberToTurkishCurrencyText(result.perMessage * multiplier, currencyCode)}', event)">${getTranslation('perMessage', this.currentLanguage)}: ${symbol}${formatCurrency(result.perMessage * multiplier, 5)}</span></div>
            ` : ''}
          </div>
          <div class="efficiency-info">
            <div class="efficiency-bar">
              <div class="efficiency-fill" style="width: ${efficiency}%"></div>
            </div>
            <div class="efficiency-text">${efficiency}%</div>
          </div>
          <div class="actions-info">
            <button class="mini-btn" onclick="selectForComparison('${result.model}')">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      `
    }).join('')
  }

  switchModelType(type) {
    this.currentModelType = type
    
    // Update header tab buttons
    document.querySelectorAll('.model-tab').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-mode="${type}"]`).classList.add('active')
    
    // Update page titles and subtitles based on mode
    const comparisonTitle = document.getElementById('comparisonTitle')
    const headerSubtitle = document.getElementById('headerSubtitle')
    
    if (type === 'embedding') {
      if (comparisonTitle) {
        comparisonTitle.innerHTML = '<i class="fas fa-vector-square"></i> Akıllı Fiyat Karşılaştırması - Embedding Modeller'
      }
      if (headerSubtitle) {
        headerSubtitle.textContent = 'Metin vektörleme modellerinin maliyetlerini karşılaştırın'
      }
    } else {
      if (comparisonTitle) {
        comparisonTitle.innerHTML = '<i class="fas fa-microscope"></i> Akıllı Fiyat Karşılaştırması - Üretken Modeller'
      }
      if (headerSubtitle) {
        headerSubtitle.textContent = 'Farklı AI modellerinin maliyetlerini karşılaştırın ve en uygun seçimi yapın'
      }
    }
    
    // Toggle parameter panels and calc mode hidden field
    const chatParams = document.getElementById('parameters')
    const embedParams = document.getElementById('embeddingParameters')
    const calcMode = document.getElementById('calcMode')
    const generativeStats = document.getElementById('generativeStats')
    const embeddingStats = document.getElementById('embeddingStats')

    if (type === 'embedding') {
      if (chatParams) chatParams.style.display = 'none'
      if (embedParams) embedParams.style.display = 'grid'
      if (calcMode) calcMode.value = 'embedding'
      if (generativeStats) generativeStats.style.display = 'none'
      if (embeddingStats) embeddingStats.style.display = 'block'
    } else {
      if (chatParams) chatParams.style.display = 'grid'
      if (embedParams) embedParams.style.display = 'none'
      if (calcMode) calcMode.value = 'generative'
      if (generativeStats) generativeStats.style.display = 'block'
      if (embeddingStats) embeddingStats.style.display = 'none'
    }

    // Trigger full recalculation from App to refresh tokens/results
    if (window.app) {
      window.app.updateAll()
    } else if (this.currentResults) {
      this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
    }
  }

  createBarChart(ctx, results, multiplier, symbol) {
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: results.slice(0, 8).map(r => r.model.split(' ')[0]),
        datasets: [{
          label: `${getTranslation('yearlyCost', this.currentLanguage)} (${symbol})`,
          data: results.slice(0, 8).map(r => r.yearlyTotal * multiplier),
          backgroundColor: results.slice(0, 8).map((_, i) => {
            const hue = (i * 45) % 360
            return `hsla(${hue}, 70%, 60%, 0.8)`
          }),
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => symbol + formatCurrency(value)
            }
          }
        }
      }
    })
  }

  createScatterChart(ctx, results, multiplier, symbol) {
    // Scatter: X = input price ($/1M), Y = yearly cost (current currency)
    const dataPoints = results.slice(0, 12).map(r => ({ x: r.inputPrice, y: r.yearlyTotal * multiplier }))
    this.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: `${getTranslation('inputPrice', this.currentLanguage)} vs ${getTranslation('yearlyCost', this.currentLanguage)} (${symbol})`,
          data: dataPoints,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgba(16, 185, 129, 1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          x: {
            title: { display: true, text: `${getTranslation('inputPrice', this.currentLanguage)} ($/1M token)` },
            ticks: { callback: (value) => '$' + formatCurrency(value) }
          },
          y: {
            title: { display: true, text: `${getTranslation('yearlyCost', this.currentLanguage)} (${symbol})` },
            ticks: { callback: (value) => symbol + formatCurrency(value) }
          }
        }
      }
    })
  }

  updateHeadToHead() {
    const modelA = document.getElementById('modelA')?.value
    const modelB = document.getElementById('modelB')?.value
    const container = document.getElementById('headToHeadResults')
    
    if (!modelA || !modelB || !container || !this.currentResults) return
    
    // Find the selected models in results
    const resultA = this.currentResults.find(r => r.model === modelA)
    const resultB = this.currentResults.find(r => r.model === modelB)
    
    if (!resultA || !resultB) return
    
    const multiplier = this.currentCurrency === 'TL' ? this.currentUsdRate : 1
    const symbol = this.currentCurrency === 'TL' ? '₺' : '$'
    
    // Calculate differences
    const yearlyDiff = ((resultB.yearlyTotal - resultA.yearlyTotal) / resultA.yearlyTotal) * 100
    const monthlyDiff = ((resultB.monthlyTotal - resultA.monthlyTotal) / resultA.monthlyTotal) * 100
    const perMessageDiff = ((resultB.perMessage - resultA.perMessage) / resultA.perMessage) * 100
    const perConversationDiff = ((resultB.perConversation - resultA.perConversation) / resultA.perConversation) * 100
    
    const efficiencyA = this.calculateEfficiencyScore(resultA)
    const efficiencyB = this.calculateEfficiencyScore(resultB)
    
    // Determine winner
    const cheaperModel = resultA.yearlyTotal < resultB.yearlyTotal ? 'A' : 'B'
    const moreEfficient = efficiencyA > efficiencyB ? 'A' : 'B'
    
    container.innerHTML = `
      <div class="head-to-head-grid">
        <div class="comparison-row header-row">
          <div class="metric-label"></div>
          <div class="model-a-header">
            <h4>${resultA.model}</h4>
            ${cheaperModel === 'A' ? `<span class="winner-badge">💰 ${getTranslation('cheapBadge', this.currentLanguage)}</span>` : ''}
            ${moreEfficient === 'A' ? `<span class="winner-badge efficiency">⚡ ${getTranslation('efficientBadge', this.currentLanguage)}</span>` : ''}
          </div>
          <div class="vs-divider">${getTranslation('vs', this.currentLanguage)}</div>
          <div class="model-b-header">
            <h4>${resultB.model}</h4>
            ${cheaperModel === 'B' ? `<span class="winner-badge">💰 ${getTranslation('cheapBadge', this.currentLanguage)}</span>` : ''}
            ${moreEfficient === 'B' ? `<span class="winner-badge efficiency">⚡ ${getTranslation('efficientBadge', this.currentLanguage)}</span>` : ''}
          </div>
        </div>
        
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-calendar-alt"></i>
            <span>${getTranslation('yearlyCost', this.currentLanguage)}</span>
          </div>
          <div class="metric-value ${cheaperModel === 'A' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultA.yearlyTotal * multiplier)}
          </div>
          <div class="difference ${yearlyDiff > 0 ? 'negative' : 'positive'}">
            ${yearlyDiff > 0 ? '+' : ''}${yearlyDiff.toFixed(1)}%
          </div>
          <div class="metric-value ${cheaperModel === 'B' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultB.yearlyTotal * multiplier)}
          </div>
        </div>
        
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-calendar"></i>
            <span>${getTranslation('monthly', this.currentLanguage)}</span>
          </div>
          <div class="metric-value ${cheaperModel === 'A' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultA.monthlyTotal * multiplier)}
          </div>
          <div class="difference ${monthlyDiff > 0 ? 'negative' : 'positive'}">
            ${monthlyDiff > 0 ? '+' : ''}${monthlyDiff.toFixed(1)}%
          </div>
          <div class="metric-value ${cheaperModel === 'B' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultB.monthlyTotal * multiplier)}
          </div>
        </div>

        ${this.currentModelType === 'generative' ? `
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-comments"></i>
            <span>${getTranslation('perConversation', this.currentLanguage)}</span>
          </div>
          <div class="metric-value ${resultA.perConversation <= resultB.perConversation ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultA.perConversation * multiplier, 4)}
          </div>
          <div class="difference ${perConversationDiff > 0 ? 'negative' : 'positive'}">
            ${perConversationDiff > 0 ? '+' : ''}${perConversationDiff.toFixed(1)}%
          </div>
          <div class="metric-value ${resultB.perConversation < resultA.perConversation ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultB.perConversation * multiplier, 4)}
          </div>
        </div>` : ''}
        
        ${this.currentModelType === 'generative' ? `
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-comment"></i>
            <span>${getTranslation('perMessage', this.currentLanguage)}</span>
          </div>
          <div class="metric-value ${cheaperModel === 'A' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultA.perMessage * multiplier, 5)}
          </div>
          <div class="difference ${perMessageDiff > 0 ? 'negative' : 'positive'}">
            ${perMessageDiff > 0 ? '+' : ''}${perMessageDiff.toFixed(1)}%
          </div>
          <div class="metric-value ${cheaperModel === 'B' ? 'winner' : ''}">
            ${symbol}${formatCurrency(resultB.perMessage * multiplier, 5)}
          </div>
        </div>` : ''}
        
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-dollar-sign"></i>
            <span>${getTranslation('inputPrice', this.currentLanguage)}</span>
          </div>
          <div class="metric-value">
            $${resultA.inputPrice.toFixed(3)}/1M
          </div>
          <div class="difference">
            ${((resultB.inputPrice - resultA.inputPrice) / resultA.inputPrice * 100).toFixed(1)}%
          </div>
          <div class="metric-value">
            $${resultB.inputPrice.toFixed(3)}/1M
          </div>
        </div>
        
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-arrow-up"></i>
            <span>${getTranslation('outputPrice', this.currentLanguage)}</span>
          </div>
          <div class="metric-value">
            $${resultA.outputPrice.toFixed(3)}/1M
          </div>
          <div class="difference">
            ${resultA.outputPrice === 0 || resultB.outputPrice === 0 ? 'N/A' : 
              ((resultB.outputPrice - resultA.outputPrice) / Math.max(resultA.outputPrice, 0.001) * 100).toFixed(1) + '%'}
          </div>
          <div class="metric-value">
            $${resultB.outputPrice.toFixed(3)}/1M
          </div>
        </div>
        
        <div class="comparison-row">
          <div class="metric-label">
            <i class="fas fa-bolt"></i>
            <span>${getTranslation('efficiencyScore', this.currentLanguage)}</span>
          </div>
          <div class="metric-value ${moreEfficient === 'A' ? 'winner' : ''}">
            <div class="efficiency-mini" style="--score: ${efficiencyA}%">
              ${efficiencyA}%
            </div>
          </div>
          <div class="difference">
            ${(efficiencyB - efficiencyA).toFixed(0)}
          </div>
          <div class="metric-value ${moreEfficient === 'B' ? 'winner' : ''}">
            <div class="efficiency-mini" style="--score: ${efficiencyB}%">
              ${efficiencyB}%
            </div>
          </div>
        </div>
        
        <div class="comparison-summary">
          <h4>📊 ${getTranslation('comparisonSummary', this.currentLanguage)}</h4>
          <div class="summary-content">
            ${this.generateComparisonSummary(resultA, resultB, cheaperModel, moreEfficient, multiplier, symbol)}
          </div>
        </div>
      </div>
    `
  }
  
  generateComparisonSummary(resultA, resultB, cheaperModel, moreEfficient, multiplier, symbol) {
    const cheaperResult = cheaperModel === 'A' ? resultA : resultB
    const expensiveResult = cheaperModel === 'A' ? resultB : resultA
    const savings = (expensiveResult.yearlyTotal - cheaperResult.yearlyTotal) * multiplier
    const savingsPercent = ((expensiveResult.yearlyTotal - cheaperResult.yearlyTotal) / expensiveResult.yearlyTotal * 100)
    
    const cheaperText = getTranslation('summaryCheaper', this.currentLanguage)
      .replace('{model}', `<strong>${cheaperResult.model}</strong>`)
      .replace('{amount}', `<strong>${symbol}${formatCurrency(savings)}</strong>`)
      .replace('{percent}', savingsPercent.toFixed(1))

    let summary = `<div class="summary-item">
      <span class="summary-icon">💰</span>
      ${cheaperText}
    </div>`
    
    if (cheaperModel !== moreEfficient) {
      const efficientResult = moreEfficient === 'A' ? resultA : resultB
      const efficientText = getTranslation('summaryEfficient', this.currentLanguage)
        .replace('{model}', `<strong>${efficientResult.model}</strong>`)
      summary += `<div class="summary-item">
        <span class="summary-icon">⚡</span>
        ${efficientText}
      </div>`
    } else {
      const bestText = getTranslation('summaryBest', this.currentLanguage)
        .replace('{model}', `<strong>${cheaperResult.model}</strong>`)
      summary += `<div class="summary-item">
        <span class="summary-icon">🏆</span>
        ${bestText}
      </div>`
    }
    
    return summary
  }

  updateRecommendations(results, usdRate, currency) {
    const container = document.getElementById('smartRecommendations')
    if (!container || results.length === 0) return

    const best = results[0]
    const mostEfficient = results.reduce((prev, current) => 
      this.calculateEfficiencyScore(current) > this.calculateEfficiencyScore(prev) ? current : prev
    )
    
    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'

    container.innerHTML = `
      <div class="recommendation-card budget">
        <div class="rec-icon"><i class="fas fa-piggy-bank"></i></div>
        <div class="rec-content">
          <h4>${getTranslation('budgetFriendly', this.currentLanguage)}</h4>
          <p><strong>${best.model}</strong></p>
          <div class="rec-value">${symbol}${formatCurrency(best.yearlyTotal * multiplier)}${getTranslation('perYearSuffix', this.currentLanguage)}</div>
        </div>
      </div>
      
      <div class="recommendation-card efficiency">
        <div class="rec-icon"><i class="fas fa-zap"></i></div>
        <div class="rec-content">
          <h4>${getTranslation('mostEfficientCard', this.currentLanguage)}</h4>
          <p><strong>${mostEfficient.model}</strong></p>
          <div class="rec-value">${this.calculateEfficiencyScore(mostEfficient)}% ${getTranslation('efficiency', this.currentLanguage).toLowerCase()}</div>
        </div>
      </div>
      
      <div class="recommendation-card balanced">
        <div class="rec-icon"><i class="fas fa-balance-scale"></i></div>
        <div class="rec-content">
          <h4>${getTranslation('balancedChoice', this.currentLanguage)}</h4>
          <p><strong>${results[Math.floor(results.length / 3)].model}</strong></p>
          <div class="rec-value">${getTranslation('costPerformanceBalance', this.currentLanguage)}</div>
        </div>
      </div>
    `
  }

  switchView(view) {
    this.currentView = view
    
    // Update button states
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'))
    
    // Show/hide views
    const views = ['comparisonGrid', 'comparisonList', 'comparisonChart']
    views.forEach(viewId => {
      const element = document.getElementById(viewId)
      if (element) {
        element.style.display = viewId.includes(view) ? 'block' : 'none'
      }
    })

    // Re-render the active view with current data
    this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
  }

  changeChartType(type) {
    this.currentChartType = type
    
    // Update button states
    document.querySelectorAll('.chart-type-btn').forEach(btn => btn.classList.remove('active'))
    
    // Re-render chart
    this.updateComparison(this.currentResults, this.currentUsdRate, this.currentCurrency)
  }
}

// Global helper to show a floating tooltip with the Turkish reading near click
if (!window.showReading) {
  window.showReading = (text, evt) => {
    try {
      const existing = document.getElementById('reading-tooltip')
      const tooltip = existing || document.createElement('div')
      if (!existing) {
        tooltip.id = 'reading-tooltip'
        tooltip.style.position = 'fixed'
        tooltip.style.zIndex = '10050'
        tooltip.style.maxWidth = '280px'
        tooltip.style.padding = '10px 12px'
        tooltip.style.borderRadius = '8px'
        tooltip.style.background = 'rgba(17, 24, 39, 0.95)'
        tooltip.style.color = '#fff'
        tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
        tooltip.style.fontSize = '13px'
        tooltip.style.lineHeight = '1.3'
        tooltip.style.border = '1px solid rgba(255,255,255,0.1)'
        tooltip.style.pointerEvents = 'auto'
        tooltip.style.cursor = 'default'
        tooltip.style.transition = 'opacity 120ms ease'
        document.body.appendChild(tooltip)
      }

      tooltip.textContent = text

      const x = evt?.clientX ?? window.innerWidth / 2
      const y = evt?.clientY ?? window.innerHeight / 2
      const offset = 14
      tooltip.style.left = Math.min(x + offset, window.innerWidth - 20) + 'px'
      tooltip.style.top = Math.min(y + offset, window.innerHeight - 20) + 'px'
      tooltip.style.opacity = '1'
      tooltip.style.display = 'block'

      clearTimeout(window.__readingTooltipTimer)
      window.__readingTooltipTimer = setTimeout(() => {
        tooltip.style.opacity = '0'
        setTimeout(() => { tooltip.style.display = 'none' }, 150)
      }, 3500)

      // Dismiss on outside click or Escape
      const dismiss = (e) => {
        if (e.type === 'keydown' && e.key !== 'Escape') return
        tooltip.style.opacity = '0'
        setTimeout(() => { tooltip.style.display = 'none' }, 150)
        window.removeEventListener('click', dismiss, true)
        window.removeEventListener('keydown', dismiss, true)
      }
      window.addEventListener('click', dismiss, true)
      window.addEventListener('keydown', dismiss, true)
    } catch (e) {
      console.error('showReading error:', e)
    }
  }
}
