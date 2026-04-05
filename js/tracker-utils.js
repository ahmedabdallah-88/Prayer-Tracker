/**
 * tracker-utils.js — Shared utilities for tracker modules
 * Extracted from fard-tracker, fasting-tracker, azkar-tracker
 * to eliminate code duplication.
 */
window.App = window.App || {};
window.App.TrackerUtils = (function() {

    /**
     * Step month forward/backward, wrapping at 12 → 1 and 1 → 12.
     * Returns { month: N, year: N }.
     */
    function stepMonth(month, year, delta) {
        month += delta;
        if (month > 12) { month = 1; year++; }
        else if (month < 1) { month = 12; year--; }
        return { month: month, year: year };
    }

    /**
     * Update the compact month nav label and days pill.
     * labelId  — element ID for the month name label
     * pillId   — element ID for the days-in-month pill (optional)
     * month    — 1-based Hijri month
     * year     — Hijri year
     * daysInMonth — number of days
     */
    function updateMonthLabel(labelId, pillId, month, year, daysInMonth) {
        var Hijri = window.App.Hijri;
        var label = document.getElementById(labelId);
        if (label && Hijri) {
            label.textContent = Hijri.getHijriMonthName(month - 1) + ' ' + year;
        }
        if (pillId) {
            var pill = document.getElementById(pillId);
            if (pill) pill.textContent = daysInMonth;
        }
    }

    /**
     * Animate month label slide on month change.
     * labelId — element ID for the label
     * delta   — +1 or -1
     */
    function animateMonthLabel(labelId, delta) {
        var label = document.getElementById(labelId);
        if (!label) return;
        label.classList.remove('slide-from-left', 'slide-from-right');
        void label.offsetWidth;
        var isRTL = document.documentElement.dir === 'rtl';
        var slideDir = (delta > 0) === isRTL ? 'slide-from-left' : 'slide-from-right';
        label.classList.add(slideDir);
        setTimeout(function() { label.classList.remove('slide-from-left', 'slide-from-right'); }, 250);
    }

    /**
     * Apply staggered fade-in animation to day boxes inside a grid.
     * Respects prefers-reduced-motion. Cleans up classes after animation.
     * grid     — container element
     * selector — CSS selector for day boxes (e.g. '.day-box')
     * callback — optional function to call after stagger completes
     */
    function staggerFadeIn(grid, selector, callback) {
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
            if (callback) callback();
            return;
        }
        var boxes = grid.querySelectorAll(selector);
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].classList.add('day-entering');
            boxes[i].style.animationDelay = (i * 15) + 'ms';
        }
        var staggerMs = boxes.length * 15 + 300;
        setTimeout(function() {
            for (var j = 0; j < boxes.length; j++) {
                boxes[j].classList.remove('day-entering');
                boxes[j].style.animationDelay = '';
            }
            if (callback) callback();
        }, staggerMs);
    }

    /**
     * Trigger tap-bounce animation on a day box element.
     */
    function tapBounce(el) {
        el.classList.remove('tap-bounce');
        void el.offsetWidth;
        el.classList.add('tap-bounce');
        setTimeout(function() { el.classList.remove('tap-bounce'); }, 350);
    }

    /**
     * Build the day-names header row HTML (7 pills: Sat, Sun, Mon, Tue, Wed, Thu, Fri).
     * Friday (last column) gets the .friday class for golden highlight.
     * Returns an HTML string.
     */
    function buildDayNamesRow() {
        var I18n = window.App && window.App.I18n;
        var lang = (I18n && I18n.getCurrentLang) ? I18n.getCurrentLang() : 'ar';
        var names = (lang === 'ar')
            ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع']
            : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        var html = '<div class="day-names-row">';
        for (var i = 0; i < names.length; i++) {
            var cls = 'day-name-pill' + (i === 6 ? ' friday' : '');
            html += '<div class="' + cls + '">' + names[i] + '</div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Return the number of empty leading cells needed so that day 1 of the
     * given Hijri month lines up under its real day-of-week column.
     * Grid column order: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri.
     */
    function getFirstDayOffset(hYear, hMonth) {
        var Hijri = window.App && window.App.Hijri;
        if (!Hijri || !Hijri.hijriToGregorian) return 0;
        var gDate = Hijri.hijriToGregorian(hYear, hMonth, 1);
        if (!gDate || typeof gDate.getDay !== 'function') return 0;
        // JS getDay: 0=Sun..6=Sat. Our grid: 0=Sat..6=Fri.
        return (gDate.getDay() + 1) % 7;
    }

    /**
     * Append `count` invisible .day-empty placeholder cells to a grid.
     * Used to offset day 1 to its real day-of-week column.
     */
    function appendEmptyCells(gridEl, count) {
        if (!gridEl || count <= 0) return;
        for (var i = 0; i < count; i++) {
            var cell = document.createElement('div');
            cell.className = 'day-empty';
            cell.setAttribute('aria-hidden', 'true');
            gridEl.appendChild(cell);
        }
    }

    /**
     * Ensure a .day-names-row sits directly before the given grid element.
     * Rebuilds on each call so language switches are reflected immediately.
     */
    function ensureDayNamesRow(gridEl) {
        if (!gridEl || !gridEl.parentNode) return;
        var existing = gridEl.previousElementSibling;
        if (existing && existing.classList && existing.classList.contains('day-names-row')) {
            gridEl.parentNode.removeChild(existing);
        }
        var tmp = document.createElement('div');
        tmp.innerHTML = buildDayNamesRow();
        gridEl.parentNode.insertBefore(tmp.firstChild, gridEl);
    }

    return {
        stepMonth: stepMonth,
        updateMonthLabel: updateMonthLabel,
        animateMonthLabel: animateMonthLabel,
        staggerFadeIn: staggerFadeIn,
        tapBounce: tapBounce,
        buildDayNamesRow: buildDayNamesRow,
        ensureDayNamesRow: ensureDayNamesRow,
        getFirstDayOffset: getFirstDayOffset,
        appendEmptyCells: appendEmptyCells
    };
})();
