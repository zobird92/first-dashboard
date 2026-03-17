/**
 * charts.js - Handles the heavy configuration of Chart.js
 */
export const ChartHelpers = {
  getThemeColors() {
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
    return {
      // Use the deep navy from your CSS variables for maximum contrast
      text: isDark ? '#f8fafc' : '#0f172a', 
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
      border: isDark ? '#1e293b' : '#ffffff'
    };
  },

  initSeverityChart(ctx, counts, COLORS, onChartClick) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const colors = this.getThemeColors();
    
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [counts.critical, counts.high, counts.medium, counts.low],
          backgroundColor: [COLORS.critical, COLORS.high, COLORS.medium, COLORS.low],
          hoverOffset: 15,
          borderWidth: 2,
          borderColor: colors.border
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        onClick: onChartClick,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              color: colors.text,
              padding: 20,
              font: { size: 12, weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${value} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  },

  initCategoryChart(ctx, categories, datasets, onChartClick) {
    const colors = this.getThemeColors();

    return new Chart(ctx, {
      type: 'bar',
      data: { labels: categories, datasets: datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: onChartClick,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { 
              boxWidth: 12, 
              padding: 15, 
              font: { size: 11, weight: '500' },
              color: colors.text // Uses the dark navy
            }
          },
          // ... (tooltip stays the same) ...
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: colors.text },
            grid: { color: colors.grid },
            title: { 
              display: true, 
              text: 'Number of Risks', 
              font: { size: 11, weight: '700' },
              color: colors.text 
            }
          },
          y: {
            stacked: true,
            ticks: { color: colors.text },
            grid: { color: colors.grid } // FIX: Now correctly inside the 'y' object
          }
        }
      }
    });
  }
};