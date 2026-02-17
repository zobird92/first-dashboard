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

  // removed debug UI/logs

})();
