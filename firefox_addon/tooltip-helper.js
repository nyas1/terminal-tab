(function(){
    try{
        const tip = document.getElementById('tt-settings-tip');
        const btn = document.getElementById('tt-hide-tip');
        if(!tip || !btn) return;
        const hideTooltips = localStorage.getItem('tui-hide-tooltips') === 'true' || localStorage.getItem('tui-hide-settings-tip') === '1';
        if(hideTooltips) tip.style.display = 'none';
        btn.addEventListener('click', function(){
            tip.style.display = 'none';
            localStorage.setItem('tui-hide-tooltips', JSON.stringify(true));
            localStorage.setItem('tui-hide-settings-tip','1');
        });
    }catch(e){/* noop */}
})();
