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

    return {
        stepMonth: stepMonth,
        updateMonthLabel: updateMonthLabel,
        animateMonthLabel: animateMonthLabel,
        staggerFadeIn: staggerFadeIn,
        tapBounce: tapBounce
    };
})();
