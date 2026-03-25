/* Prayer Tracker PWA — themes.js */
window.App = window.App || {};
window.App.Themes = (function() {

    function toggleThemeMenu() {
        var el = document.getElementById('themeOptions');
        if (el) el.classList.toggle('show');
    }

    // Close theme menu on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.theme-options') && !e.target.closest('.shell-btn') && !e.target.closest('.theme-toggle-btn')) {
            var el = document.getElementById('themeOptions');
            if (el) el.classList.remove('show');
        }
    });

    function setTheme(theme) {
        // Always set data-theme (even for green) so dark overrides are fully removed
        document.documentElement.setAttribute('data-theme', theme);

        // Update active state
        document.querySelectorAll('.theme-option').forEach(function(opt) {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });

        // Save preference
        localStorage.setItem('salah_tracker_theme', theme);

        // Close menu
        var el = document.getElementById('themeOptions');
        if (el) el.classList.remove('show');

        // Rebuild charts if dashboard is visible
        try {
            var section = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';
            var dashView = document.getElementById(section + 'DashboardView');
            if (dashView && dashView.classList.contains('active')) {
                if (typeof window.updateCharts === 'function') window.updateCharts(section);
            }
        } catch(e) {}
    }

    function loadTheme() {
        var saved = localStorage.getItem('salah_tracker_theme') || 'green';
        setTheme(saved);
    }

    return {
        toggleThemeMenu: toggleThemeMenu,
        setTheme: setTheme,
        loadTheme: loadTheme
    };
})();

// Backward compat for inline onclick handlers
window.toggleThemeMenu = window.App.Themes.toggleThemeMenu;
window.setTheme = window.App.Themes.setTheme;
