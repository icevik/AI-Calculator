import { formatNumber, formatTokens, formatCurrency } from '../utils/formatters.js'
import { getTranslation, getCurrentLanguage } from '../utils/translations.js'

export class UIManager {
  constructor() {
    this.currentCurrency = 'TL'
    this.currentView = 'table'
    this.currentLanguage = getCurrentLanguage()

    document.addEventListener('languagechange', (e) => {
      this.currentLanguage = e?.detail?.language || getCurrentLanguage()
    })
  }

  getParameters() {
    const calcMode = document.getElementById('calcMode')?.value || 'generative'
    if (calcMode === 'embedding') {
      // Read embedding-specific fields
      const usdEmbed = parseFloat(document.getElementById('usdRate-embed')?.value || 42)
      const daysEmbed = parseInt(document.getElementById('daysPerYear-embed')?.value || 365)
      const embeddingWords = parseInt(document.getElementById('embeddingWords')?.value || 0)
      const embeddingTokens = parseInt(document.getElementById('embeddingTokens')?.value || 0)
      const embeddingPeriod = document.getElementById('embeddingPeriod')?.value || 'daily'

      return {
        calcMode: 'embedding',
        // Generative fields kept for compatibility but not used in calculations
        dailyConversations: 1,
        messagesPerConv: 1,
        inputWords: 0,
        outputWords: 0,
        // Embedding fields
        embeddingWords,
        embeddingTokens,
        embeddingPeriod,
        usdRate: usdEmbed,
        daysPerYear: daysEmbed
      }
    }

    // Default: generative/chat mode
    return {
      calcMode: 'generative',
      dailyConversations: parseInt(document.getElementById('dailyConversations')?.value || 70000),
      messagesPerConv: parseInt(document.getElementById('messagesPerConv')?.value || 5),
      inputWords: parseInt(document.getElementById('inputWords')?.value || 30),
      outputWords: parseInt(document.getElementById('outputWords')?.value || 200),
      usdRate: parseFloat(document.getElementById('usdRate')?.value || 42),
      daysPerYear: parseInt(document.getElementById('daysPerYear')?.value || 365)
    }
  }

  updateSummaryStats(tokens, params) {
    const calcMode = params?.calcMode || 'generative'
    
    if (calcMode === 'embedding') {
      this.updateEmbeddingStats(tokens, params)
    } else {
      this.updateGenerativeStats(tokens, params)
    }
  }

  updateGenerativeStats(tokens, params) {
    const elements = {
      totalMessages: document.getElementById('totalMessages'),
      totalConversations: document.getElementById('totalConversations'),
      avgInputWords: document.getElementById('avgInputWords'),
      avgOutputWords: document.getElementById('avgOutputWords')
    }

    if (elements.totalMessages) {
      elements.totalMessages.textContent = formatNumber(tokens.totalDailyMessages)
    }
    if (elements.totalConversations) {
      elements.totalConversations.textContent = formatNumber(params.dailyConversations)
    }
    if (elements.avgInputWords) {
      elements.avgInputWords.textContent = formatNumber(params.inputWords)
    }
    if (elements.avgOutputWords) {
      elements.avgOutputWords.textContent = formatNumber(params.outputWords)
    }
  }

  updateEmbeddingStats(tokens, params) {
    const elements = {
      embeddingWordsCount: document.getElementById('embeddingWordsCount'),
      embeddingTokensCount: document.getElementById('embeddingTokensCount'),
      embeddingPeriodDisplay: document.getElementById('embeddingPeriodDisplay'),
      embeddingDailyTokens: document.getElementById('embeddingDailyTokens')
    }

    // Calculate actual token count used
    const actualTokens = params.embeddingTokens && params.embeddingTokens > 0 
      ? params.embeddingTokens 
      : (params.embeddingWords || 0) * (4/3)

    if (elements.embeddingWordsCount) {
      elements.embeddingWordsCount.textContent = formatTokens(params.embeddingWords || 0)
    }
    if (elements.embeddingTokensCount) {
      elements.embeddingTokensCount.textContent = formatTokens(actualTokens)
    }
    if (elements.embeddingPeriodDisplay) {
      const periodMap = {
        daily: getTranslation('embeddingPeriodDaily', this.currentLanguage),
        monthly: getTranslation('embeddingPeriodMonthly', this.currentLanguage),
        yearly: getTranslation('embeddingPeriodYearly', this.currentLanguage)
      }
      elements.embeddingPeriodDisplay.textContent = periodMap[params.embeddingPeriod] || periodMap.daily
    }
    if (elements.embeddingDailyTokens) {
      elements.embeddingDailyTokens.textContent = formatTokens(tokens.dailyInputTokens)
    }
  }

  updateCostTable(results, usdRate) {
    const tbody = document.getElementById('costTableBody')
    if (!tbody) return

    tbody.innerHTML = ''
    
    const multiplier = this.currentCurrency === 'TL' ? usdRate : 1
    const symbol = this.currentCurrency === 'TL' ? '₺' : '$'
    
    results.forEach((result, index) => {
      const row = document.createElement('tr')
      if (index === 0) row.classList.add('best-option')
      if (index === results.length - 1) row.classList.add('worst-option')
      
      row.innerHTML = `
        <td class="model-name">
          <div class="model-info">
            <span class="model-title">${result.model}</span>
            <div class="model-badges">
              ${index === 0 ? `<span class="badge best">${getTranslation('cheapest', this.currentLanguage)}</span>` : ''}
              ${index === results.length - 1 ? `<span class="badge worst">${getTranslation('mostExpensive', this.currentLanguage)}</span>` : ''}
            </div>
          </div>
        </td>
        <td>${symbol}${formatCurrency(result.dailyTotal * multiplier)}</td>
        <td>${symbol}${formatCurrency(result.monthlyTotal * multiplier)}</td>
        <td>${symbol}${formatCurrency(result.yearlyTotal * multiplier)}</td>
        <td>${result.perConversation != null ? `${symbol}${formatCurrency(result.perConversation * multiplier, 4)}` : '-'}</td>
        <td>${result.perMessage != null ? `${symbol}${formatCurrency(result.perMessage * multiplier, 5)}` : '-'}</td>
        <td class="pricing-info">
          <div class="pricing-details">
            <div>${getTranslation('pricingInput', this.currentLanguage)}: $${result.inputPrice.toFixed(3)}${getTranslation('pricingPerMillion', this.currentLanguage)}</div>
            <div>${getTranslation('pricingOutput', this.currentLanguage)}: $${result.outputPrice.toFixed(3)}${getTranslation('pricingPerMillion', this.currentLanguage)}</div>
          </div>
        </td>
      `
      tbody.appendChild(row)
    })
  }

  updateAnalysis(results, usdRate) {
    if (results.length === 0) return

    const best = results[0]
    const worst = results[results.length - 1]
    const savings = worst.yearlyTotal - best.yearlyTotal
    const savingsPercent = (savings / worst.yearlyTotal) * 100
    
    const multiplier = this.currentCurrency === 'TL' ? usdRate : 1
    const symbol = this.currentCurrency === 'TL' ? '₺' : '$'
    
    // Best model
    const bestModelElement = document.getElementById('bestModel')
    if (bestModelElement) {
      bestModelElement.innerHTML = `
        <div class="model-highlight">${best.model}</div>
        <div class="cost-details">
          <div class="cost-item">
            <span class="cost-label">${getTranslation('yearlyCost', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(best.yearlyTotal * multiplier)}</span>
          </div>
          ${best.perConversation != null ? `
          <div class="cost-item">
            <span class="cost-label">${getTranslation('perConv', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(best.perConversation * multiplier, 4)}</span>
          </div>` : ''}
          ${best.perMessage != null ? `
          <div class="cost-item">
            <span class="cost-label">${getTranslation('perMsg', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(best.perMessage * multiplier, 5)}</span>
          </div>` : ''}
        </div>
      `
    }
    
    // Worst model
    const worstModelElement = document.getElementById('worstModel')
    if (worstModelElement) {
      worstModelElement.innerHTML = `
        <div class="model-highlight">${worst.model}</div>
        <div class="cost-details">
          <div class="cost-item">
            <span class="cost-label">${getTranslation('yearlyCost', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(worst.yearlyTotal * multiplier)}</span>
          </div>
          ${worst.perConversation != null ? `
          <div class="cost-item">
            <span class="cost-label">${getTranslation('perConv', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(worst.perConversation * multiplier, 4)}</span>
          </div>` : ''}
          ${worst.perMessage != null ? `
          <div class="cost-item">
            <span class="cost-label">${getTranslation('perMsg', this.currentLanguage)}:</span>
            <span class="cost-value">${symbol}${formatCurrency(worst.perMessage * multiplier, 5)}</span>
          </div>` : ''}
        </div>
      `
    }
    
    // Savings analysis
    const savingsAnalysisElement = document.getElementById('savingsAnalysis')
    if (savingsAnalysisElement) {
      savingsAnalysisElement.innerHTML = `
        <div class="savings-highlight">
          <div class="savings-amount">${symbol}${formatCurrency(savings * multiplier)}</div>
          <div class="savings-percent">${savingsPercent.toFixed(1)}% ${getTranslation('savingsAmount', this.currentLanguage)}</div>
        </div>
        <div class="savings-description">
          ${getTranslation('savingsDesc', this.currentLanguage)}
        </div>
      `
    }
  }

  toggleCurrency() {
    this.currentCurrency = this.currentCurrency === 'TL' ? 'USD' : 'TL'
    const button = document.getElementById('currencyToggle')
    if (button) {
      if (this.currentCurrency === 'TL') {
        button.innerHTML = '<span id="currencySymbol">₺</span> TL'
      } else {
        button.innerHTML = '<span id="currencySymbol">$</span> USD'
      }
    }
  }

  switchView(view) {
    this.currentView = view
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'))
    const activeBtn = Array.from(document.querySelectorAll('.view-btn')).find(btn => 
      btn.onclick?.toString().includes(view)
    )
    if (activeBtn) {
      activeBtn.classList.add('active')
    }
    
    // Show/hide views
    const tableView = document.getElementById('tableView')
    const chartView = document.getElementById('chartView')
    
    if (tableView && chartView) {
      if (view === 'table') {
        tableView.style.display = 'block'
        chartView.style.display = 'none'
      } else {
        tableView.style.display = 'none'
        chartView.style.display = 'block'
      }
    }
  }
}
