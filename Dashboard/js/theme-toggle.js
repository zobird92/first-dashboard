/* theme-toggle.js */
(function() {
  const btn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const LS_KEY = 'nea-theme';

  /**
   * Updates the visual state of the application and persists preference
   * @param {boolean} isDark 
   */
  function setState(isDark) {
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update Chart.js instances to match new theme
    updateChartsForTheme(isDark);

    if (btn) {
      btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      btn.setAttribute('aria-pressed', String(isDark));
    }

    try {
      localStorage.setItem(LS_KEY, isDark ? 'dark' : 'light');
    } catch (e) {
      console.warn("LocalStorage access denied.");
    }
  }

  /**
   * Loops through all Chart.js instances to update text and grid colors
   * @param {boolean} isDark 
   */
  function updateChartsForTheme(isDark) {
    // Colors matched to theme-main.css variables
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    if (typeof Chart === 'undefined') return;

    Object.values(Chart.instances).forEach(chart => {
      // 1. Update Global Legend Text
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      // 2. Update Axes (Ticks, Grids, and Titles)
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(axisKey => {
          const axis = chart.options.scales[axisKey];
          if (axis.ticks) axis.ticks.color = textColor;
          if (axis.grid) axis.grid.color = gridColor;
          if (axis.title) axis.title.color = textColor;
        });
      }

      // 3. Update Dataset Borders (Doughnut/Bar borders)
      if (chart.data.datasets && chart.data.datasets[0]) {
        chart.data.datasets[0].borderColor = borderColor;
      }

      // 'none' mode prevents the chart from re-animating during the theme swap
      chart.update('none');
    });
  }

  /**
   * Entry point: determine initial state and attach listeners
   */
  function init() {
    if (!btn && typeof document === 'undefined') return;

    // Determine initial theme: LocalStorage -> System Preference -> Default (Light)
    const saved = (function() {
      try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
    })();

    if (saved === 'dark' || saved === 'light') {
      setState(saved === 'dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setState(prefersDark);
    }

    // Toggle button event listener
    if (btn) {
      btn.addEventListener('click', function() {
        const isCurrentlyDark = root.classList.contains('dark');
        setState(!isCurrentlyDark);
      });
    }
  }

  init();
})();