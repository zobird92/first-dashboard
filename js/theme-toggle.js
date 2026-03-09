/* theme-toggle.js
   Moves the inline theme toggle logic into a separate file.
   Loaded with `defer` so DOM is parsed before this runs.
*/

(function(){
  const btn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const LS_KEY = 'nea-theme';

  function setState(isDark){
    if(isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    if(btn){
      btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      btn.setAttribute('aria-pressed', String(isDark));
    }
    try{ localStorage.setItem(LS_KEY, isDark ? 'dark' : 'light'); }catch(e){}
  }
function updateChartsForTheme(isDark) {
    const textColor = isDark ? '#f8fafc' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)';

    // Chart.js keeps a global list of all charts on the page
    Object.values(Chart.instances).forEach(chart => {
        // 1. Update Global Text
        chart.options.plugins.legend.labels.color = textColor;
        
        // 2. Update Scales (for the Bar Chart)
        if (chart.options.scales) {
            ['x', 'y'].forEach(axis => {
                if (chart.options.scales[axis]) {
                    chart.options.scales[axis].ticks.color = textColor;
                    chart.options.scales[axis].grid.color = gridColor;
                    if (chart.options.scales[axis].title) {
                        chart.options.scales[axis].title.color = textColor;
                    }
                }
            });
        }

        // 3. Update Doughnut Borders (if applicable)
        if (chart.data.datasets[0].borderColor) {
            chart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
        }

        chart.update(); // The "magic" command to repaint the canvas
    });
}
  // Initialize
  (function(){
    if(!btn && typeof document === 'undefined') return;
    const saved = (function(){ try{return localStorage.getItem(LS_KEY);}catch(e){return null;} })();
    if(saved === 'dark' || saved === 'light'){
      setState(saved === 'dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setState(prefersDark);
    }

    if(btn){
      btn.addEventListener('click', function(){
        setState(!root.classList.contains('dark'));
      });
    }
  })();

})();
