/* Prayer Tracker PWA — sunnah-tracker.js */
/* Thin module: Sunnah uses fard-tracker functions with type='sunnah'.
   The 3-state cycle (empty → performed → qada → empty) is handled
   inside fard-tracker.js handleDayClick which skips congregation for sunnah. */
window.App = window.App || {};
window.App.SunnahTracker = (function() {

    // All sunnah operations delegate to App.Tracker with type='sunnah'

    function renderSunnahMonth() {
        window.App.Tracker.renderTrackerMonth('sunnah');
    }

    function updateSunnahStats() {
        window.App.Tracker.updateTrackerStats('sunnah');
    }

    function changeSunnahMonth(delta) {
        window.App.Tracker.changeTrackerMonth('sunnah', delta);
    }

    function resetSunnahMonth() {
        window.App.Tracker.resetTrackerMonth('sunnah');
    }

    function updateSunnahView() {
        window.App.Tracker.updateTrackerView('sunnah');
    }

    return {
        renderSunnahMonth: renderSunnahMonth,
        updateSunnahStats: updateSunnahStats,
        changeSunnahMonth: changeSunnahMonth,
        resetSunnahMonth: resetSunnahMonth,
        updateSunnahView: updateSunnahView
    };
})();
