/**
 * charts.js - Handles the heavy configuration of Chart.js
 */
export const ChartHelpers = {
  getThemeColors() {
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
    return {
      // Using #1e293b for Light Mode text to ensure high contrast
      text: isDark ? '#f8fafc' : '#1e293b', 
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
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
              font: { size: 11 },
              color: colors.text
            }
          },
          tooltip: {
            mode: 'nearest',
            intersect: true,
            callbacks: {
              label: (context) => {
                const locationName = context.dataset.label;
                const categoryName = context.label;
                const value = context.raw;
                const categoryTotal = context.chart.data.datasets.reduce((sum, ds) => {
                  return sum + ds.data[context.dataIndex];
                }, 0);
                const percent = categoryTotal > 0 ? ((value / categoryTotal) * 100).toFixed(1) : 0;
                return ` ${locationName}: ${value} (${percent}% of ${categoryName})`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { 
              stepSize: 1,
              color: colors.text 
            },
            grid: {
              color: colors.grid 
            },
            title: { 
              display: true, 
              text: 'Number of Risks', 
              font: { size: 11, weight: '600' },
              color: colors.text 
            }
          },
          y: {
            stacked: true,
            ticks: {
              color: colors.text
            },
            grid: {
              color: colors.grid // Moved inside the 'y' object
            }
          }
        }
      }
    });
  }
};