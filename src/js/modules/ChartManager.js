import { Chart, registerables } from 'chart.js'
import { formatCurrency } from '../utils/formatters.js'

Chart.register(...registerables)

export class ChartManager {
  constructor() {
    this.chart = null
  }

  updateChart(results, usdRate, currency) {
    const ctx = document.getElementById('costChart')
    if (!ctx) return

    if (this.chart) {
      this.chart.destroy()
    }
    
    const multiplier = currency === 'TL' ? usdRate : 1
    const symbol = currency === 'TL' ? '₺' : '$'
    
    const labels = results.map(r => r.model.length > 15 ? r.model.substring(0, 15) + '...' : r.model)
    const data = results.map(r => r.yearlyTotal * multiplier)
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: `Yıllık Maliyet (${symbol})`,
          data: data,
          backgroundColor: data.map((_, index) => {
            if (index === 0) return '#10b981' // En ucuz - yeşil
            if (index === data.length - 1) return '#ef4444' // En pahalı - kırmızı
            return '#6366f1' // Diğerleri - mavi
          }),
          borderColor: data.map((_, index) => {
            if (index === 0) return '#059669'
            if (index === data.length - 1) return '#dc2626'
            return '#4f46e5'
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
              label: (context) => {
                const result = results[context.dataIndex]
                return [
                  `Yıllık: ${symbol}${formatCurrency(context.parsed.y)}`,
                  `Aylık: ${symbol}${formatCurrency(result.monthlyTotal * multiplier)}`,
                  `Günlük: ${symbol}${formatCurrency(result.dailyTotal * multiplier)}`
                ]
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => symbol + formatCurrency(value)
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
    })
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}
