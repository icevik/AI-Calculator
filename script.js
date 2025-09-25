// AI Model Pricing Data (USD per 1M tokens)
const models = {
    "GPT-4o": {
        input: 2.50 / 1_000_000,
        output: 10.00 / 1_000_000
    },
    "GPT-4o mini": {
        input: 0.15 / 1_000_000,
        output: 0.60 / 1_000_000
    },
    "GPT-5": {
        input: 1.250 / 1_000_000,
        output: 10.000 / 1_000_000
    },
    "GPT-5 mini": {
        input: 0.250 / 1_000_000,
        output: 2.000 / 1_000_000
    },
    "text-embedding-3-small": {
        input: 0.02 / 1_000_000,
        output: 0.0 / 1_000_000
    },
    "text-embedding-3-large": {
        input: 0.13 / 1_000_000,
        output: 0.0 / 1_000_000
    },
    "text-embedding-ada-002": {
        input: 0.10 / 1_000_000,
        output: 0.0 / 1_000_000
    },
    "Gemini 2.5 Pro": {
        input: 2.50 / 1_000_000,
        output: 15.00 / 1_000_000
    },
    "Gemini 2.5 Flash": {
        input: 0.30 / 1_000_000,
        output: 2.50 / 1_000_000
    },
    "Gemini 2.5 Flash-Lite": {
        input: 0.10 / 1_000_000,
        output: 0.40 / 1_000_000
    },
    "Claude Sonnet 4 (≤200K)": {
        input: 3.00 / 1_000_000,
        output: 15.00 / 1_000_000
    },
    "Claude Sonnet 4 (>200K)": {
        input: 6.00 / 1_000_000,
        output: 22.50 / 1_000_000
    }
};

// Global state
let currentCurrency = 'TL';
let currentView = 'table';
let costChart = null;

// Constants
const WORD_TO_TOKEN_RATIO = 4/3;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    calculateAndDisplay();
});

function initializeEventListeners() {
    // Parameter inputs
    const inputs = ['dailyConversations', 'messagesPerConv', 'inputWords', 'outputWords', 'usdRate', 'daysPerYear'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateAndDisplay);
    });

    // Currency toggle
    document.getElementById('currencyToggle').addEventListener('click', toggleCurrency);
}

function getParameters() {
    return {
        dailyConversations: parseInt(document.getElementById('dailyConversations').value),
        messagesPerConv: parseInt(document.getElementById('messagesPerConv').value),
        inputWords: parseInt(document.getElementById('inputWords').value),
        outputWords: parseInt(document.getElementById('outputWords').value),
        usdRate: parseFloat(document.getElementById('usdRate').value),
        daysPerYear: parseInt(document.getElementById('daysPerYear').value)
    };
}

function calculateTokens(params) {
    const inputTokensPerMessage = params.inputWords * WORD_TO_TOKEN_RATIO;
    const outputTokensPerMessage = params.outputWords * WORD_TO_TOKEN_RATIO;
    
    const inputTokensPerConv = inputTokensPerMessage * params.messagesPerConv;
    const outputTokensPerConv = outputTokensPerMessage * params.messagesPerConv;
    
    const dailyInputTokens = inputTokensPerConv * params.dailyConversations;
    const dailyOutputTokens = outputTokensPerConv * params.dailyConversations;
    
    return {
        inputTokensPerMessage,
        outputTokensPerMessage,
        dailyInputTokens,
        dailyOutputTokens,
        totalDailyTokens: dailyInputTokens + dailyOutputTokens,
        totalDailyMessages: params.dailyConversations * params.messagesPerConv
    };
}

function calculateModelCost(modelName, pricing, tokens, params) {
    const dailyInputCost = tokens.dailyInputTokens * pricing.input;
    const dailyOutputCost = tokens.dailyOutputTokens * pricing.output;
    const dailyTotal = dailyInputCost + dailyOutputCost;
    const yearlyTotal = dailyTotal * params.daysPerYear;
    
    return {
        model: modelName,
        dailyInput: dailyInputCost,
        dailyOutput: dailyOutputCost,
        dailyTotal: dailyTotal,
        monthlyTotal: dailyTotal * 30,
        yearlyTotal: yearlyTotal,
        perConversation: dailyTotal / params.dailyConversations,
        perMessage: dailyTotal / (params.dailyConversations * params.messagesPerConv),
        inputPrice: pricing.input * 1_000_000,
        outputPrice: pricing.output * 1_000_000
    };
}

function calculateAndDisplay() {
    const params = getParameters();
    const tokens = calculateTokens(params);
    
    // Update summary statistics
    updateSummaryStats(tokens);
    
    // Calculate costs for all models
    const results = [];
    for (const [modelName, pricing] of Object.entries(models)) {
        const result = calculateModelCost(modelName, pricing, tokens, params);
        results.push(result);
    }
    
    // Sort by yearly cost (cheapest first)
    results.sort((a, b) => a.yearlyTotal - b.yearlyTotal);
    
    // Update displays
    updateCostTable(results, params.usdRate);
    updateAnalysis(results, params.usdRate);
    
    if (currentView === 'chart') {
        updateChart(results, params.usdRate);
    }
}

function updateSummaryStats(tokens) {
    document.getElementById('totalMessages').textContent = formatNumber(tokens.totalDailyMessages);
    document.getElementById('inputTokens').textContent = formatTokens(tokens.dailyInputTokens);
    document.getElementById('outputTokens').textContent = formatTokens(tokens.dailyOutputTokens);
    document.getElementById('totalTokens').textContent = formatTokens(tokens.totalDailyTokens);
}

function updateCostTable(results, usdRate) {
    const tbody = document.getElementById('costTableBody');
    tbody.innerHTML = '';
    
    results.forEach((result, index) => {
        const row = document.createElement('tr');
        if (index === 0) row.classList.add('best-option');
        if (index === results.length - 1) row.classList.add('worst-option');
        
        const multiplier = currentCurrency === 'TL' ? usdRate : 1;
        const symbol = currentCurrency === 'TL' ? '₺' : '$';
        
        row.innerHTML = `
            <td class="model-name">
                <div class="model-info">
                    <span class="model-title">${result.model}</span>
                    <div class="model-badges">
                        ${index === 0 ? '<span class="badge best">EN UCUZ</span>' : ''}
                        ${index === results.length - 1 ? '<span class="badge worst">EN PAHALI</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${symbol}${formatCurrency(result.dailyTotal * multiplier)}</td>
            <td>${symbol}${formatCurrency(result.monthlyTotal * multiplier)}</td>
            <td>${symbol}${formatCurrency(result.yearlyTotal * multiplier)}</td>
            <td>${symbol}${formatCurrency(result.perConversation * multiplier, 4)}</td>
            <td>${symbol}${formatCurrency(result.perMessage * multiplier, 5)}</td>
            <td class="pricing-info">
                <div class="pricing-details">
                    <div>Girdi: $${result.inputPrice.toFixed(3)}/1M</div>
                    <div>Çıktı: $${result.outputPrice.toFixed(3)}/1M</div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateAnalysis(results, usdRate) {
    const best = results[0];
    const worst = results[results.length - 1];
    const savings = worst.yearlyTotal - best.yearlyTotal;
    const savingsPercent = (savings / worst.yearlyTotal) * 100;
    
    const multiplier = currentCurrency === 'TL' ? usdRate : 1;
    const symbol = currentCurrency === 'TL' ? '₺' : '$';
    
    // Best model
    document.getElementById('bestModel').innerHTML = `
        <div class="model-highlight">${best.model}</div>
        <div class="cost-details">
            <div class="cost-item">
                <span class="cost-label">Yıllık Maliyet:</span>
                <span class="cost-value">${symbol}${formatCurrency(best.yearlyTotal * multiplier)}</span>
            </div>
            <div class="cost-item">
                <span class="cost-label">Konuşma Başına:</span>
                <span class="cost-value">${symbol}${formatCurrency(best.perConversation * multiplier, 4)}</span>
            </div>
            <div class="cost-item">
                <span class="cost-label">Mesaj Başına:</span>
                <span class="cost-value">${symbol}${formatCurrency(best.perMessage * multiplier, 5)}</span>
            </div>
        </div>
    `;
    
    // Worst model
    document.getElementById('worstModel').innerHTML = `
        <div class="model-highlight">${worst.model}</div>
        <div class="cost-details">
            <div class="cost-item">
                <span class="cost-label">Yıllık Maliyet:</span>
                <span class="cost-value">${symbol}${formatCurrency(worst.yearlyTotal * multiplier)}</span>
            </div>
            <div class="cost-item">
                <span class="cost-label">Konuşma Başına:</span>
                <span class="cost-value">${symbol}${formatCurrency(worst.perConversation * multiplier, 4)}</span>
            </div>
            <div class="cost-item">
                <span class="cost-label">Mesaj Başına:</span>
                <span class="cost-value">${symbol}${formatCurrency(worst.perMessage * multiplier, 5)}</span>
            </div>
        </div>
    `;
    
    // Savings analysis
    document.getElementById('savingsAnalysis').innerHTML = `
        <div class="savings-highlight">
            <div class="savings-amount">${symbol}${formatCurrency(savings * multiplier)}</div>
            <div class="savings-percent">${savingsPercent.toFixed(1)}% tasarruf</div>
        </div>
        <div class="savings-description">
            En ucuz model seçerek yıllık bu kadar tasarruf edebilirsiniz
        </div>
    `;
}

function updateChart(results, usdRate) {
    const ctx = document.getElementById('costChart').getContext('2d');
    
    if (costChart) {
        costChart.destroy();
    }
    
    const multiplier = currentCurrency === 'TL' ? usdRate : 1;
    const symbol = currentCurrency === 'TL' ? '₺' : '$';
    
    const labels = results.map(r => r.model.length > 15 ? r.model.substring(0, 15) + '...' : r.model);
    const data = results.map(r => r.yearlyTotal * multiplier);
    
    costChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Yıllık Maliyet (${symbol})`,
                data: data,
                backgroundColor: data.map((_, index) => {
                    if (index === 0) return '#10b981'; // En ucuz - yeşil
                    if (index === data.length - 1) return '#ef4444'; // En pahalı - kırmızı
                    return '#6366f1'; // Diğerleri - mavi
                }),
                borderColor: data.map((_, index) => {
                    if (index === 0) return '#059669';
                    if (index === data.length - 1) return '#dc2626';
                    return '#4f46e5';
                }),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            family: 'Segoe UI, system-ui, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const result = results[context.dataIndex];
                            return [
                                `Yıllık: ${symbol}${formatCurrency(context.parsed.y)}`,
                                `Aylık: ${symbol}${formatCurrency(result.monthlyTotal * multiplier)}`,
                                `Günlük: ${symbol}${formatCurrency(result.dailyTotal * multiplier)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return symbol + formatCurrency(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function toggleCurrency() {
    currentCurrency = currentCurrency === 'TL' ? 'USD' : 'TL';
    const button = document.getElementById('currencyToggle');
    const symbol = document.getElementById('currencySymbol');
    
    if (currentCurrency === 'TL') {
        symbol.textContent = '₺';
        button.innerHTML = '<span id="currencySymbol">₺</span> TL';
    } else {
        symbol.textContent = '$';
        button.innerHTML = '<span id="currencySymbol">$</span> USD';
    }
    
    calculateAndDisplay();
}

function switchView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.view-btn').classList.add('active');
    
    // Show/hide views
    if (view === 'table') {
        document.getElementById('tableView').style.display = 'block';
        document.getElementById('chartView').style.display = 'none';
    } else {
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('chartView').style.display = 'block';
        calculateAndDisplay(); // Refresh chart
    }
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const button = event.target.closest('.collapse-btn');
    const icon = button.querySelector('i');
    
    if (section.style.display === 'none') {
        section.style.display = 'grid';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        section.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('tr-TR').format(num);
}

function formatTokens(tokens) {
    if (tokens >= 1_000_000) {
        return (tokens / 1_000_000).toFixed(1) + 'M';
    } else if (tokens >= 1_000) {
        return (tokens / 1_000).toFixed(1) + 'K';
    }
    return Math.round(tokens).toString();
}

function formatCurrency(amount, decimals = 2) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount);
}
