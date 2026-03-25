/* Prayer Tracker PWA — onboarding.js (8-step spotlight tutorial) */
window.App = window.App || {};
window.App.Onboarding = (function() {

    var STORAGE_KEY = 'salah_onboarding_done';
    var currentStep = 0;
    var overlay = null;
    var spotlight = null;
    var tooltip = null;

    function getLang() {
        return (window.App.I18n && window.App.I18n.getCurrentLang)
            ? window.App.I18n.getCurrentLang() : 'ar';
    }

    // Steps ordered to match DOM order (top → bottom) for natural scrolling
    var steps = [
        {
            target: '#shellBar',
            titleAr: 'شريط التطبيق',
            titleEn: 'App Bar',
            bodyAr: 'هنا تجد اسم التطبيق والتاريخ الهجري والميلادي، مع أزرار المظهر واللغة والملف الشخصي.',
            bodyEn: 'The app bar shows the Hijri & Gregorian date, with theme, language, and profile buttons.'
        },
        {
            target: '#tabBar',
            titleAr: 'شريط التنقل',
            titleEn: 'Navigation Bar',
            bodyAr: 'تنقل بين الأقسام الأربعة: الفرائض، السنن، الصيام، والأذكار.',
            bodyEn: 'Switch between four sections: Fard, Sunnah, Fasting, and Azkar.'
        },
        {
            target: '#fardSubTabs',
            titleAr: 'علامات التبويب الفرعية',
            titleEn: 'Sub-tabs',
            bodyAr: 'كل قسم يحتوي على التتبع الشهري، نظرة سنوية، والإحصائيات.',
            bodyEn: 'Each section has a monthly tracker, yearly view, and statistics dashboard.'
        },
        {
            target: '#fardTrackerView .month-nav-compact',
            titleAr: 'التنقل بين الأشهر',
            titleEn: 'Month Navigation',
            bodyAr: 'تنقل بين الأشهر بالأسهم. اضغط على اسم الشهر لفتح تقويم الشهور والسنوات.',
            bodyEn: 'Navigate months with arrows. Tap the month name for a year/month picker calendar.'
        },
        {
            target: '#prayerTimesBar',
            titleAr: 'مواقيت الصلاة',
            titleEn: 'Prayer Times',
            bodyAr: 'تظهر هنا مواقيت الصلاة حسب موقعك الجغرافي مع عداد تنازلي للصلاة القادمة.',
            bodyEn: 'Live prayer times based on your location with a countdown to the next prayer.'
        },
        {
            target: '#fardTrackerPrayersContainer',
            titleAr: 'شبكة الصلوات',
            titleEn: 'Prayer Grid',
            bodyAr: 'اضغط على المربع لتسجيل الصلاة:\n• ضغطة = صليت منفرداً (أخضر)\n• ضغطتين = جماعة (ذهبي)\n• ثلاث = قضاء (أحمر)',
            bodyEn: 'Tap a box to log:\n• 1 tap = prayed alone (green)\n• 2 taps = congregation (gold)\n• 3 taps = qada/missed (red)'
        },
        {
            target: '#fardTrackerMonthLabel',
            titleAr: 'تقويم الشهور',
            titleEn: 'Month Picker',
            bodyAr: 'اضغط على اسم الشهر لفتح تقويم يتيح اختيار أي شهر وسنة هجرية لتسجيل صلوات القضاء.',
            bodyEn: 'Tap the month name to open a calendar picker for any Hijri month and year.'
        },
        {
            target: '#shellProfileBtn',
            titleAr: 'الإعدادات',
            titleEn: 'Settings',
            bodyAr: 'اضغط هنا لفتح الإعدادات: تعديل الملف الشخصي، التنبيهات، التصدير والاستيراد.',
            bodyEn: 'Open settings: edit profile, notifications, export/import data.'
        }
    ];

    function start() {
        console.log('[ONBOARD] Starting onboarding tutorial...');

        // Verify main UI is actually visible
        var prayersContainer = document.getElementById('fardTrackerPrayersContainer');
        if (!prayersContainer || prayersContainer.offsetParent === null) {
            console.log('[ONBOARD] Main UI not visible yet, aborting');
            return;
        }

        // Debug: log all step targets
        for (var i = 0; i < steps.length; i++) {
            var el = document.querySelector(steps[i].target);
            if (el) {
                var r = el.getBoundingClientRect();
                console.log('[ONBOARD] Step ' + i + ' (' + steps[i].target + '): found, rect=' +
                    Math.round(r.top) + ',' + Math.round(r.left) + ' ' +
                    Math.round(r.width) + 'x' + Math.round(r.height));
            } else {
                console.log('[ONBOARD] Step ' + i + ' (' + steps[i].target + '): NOT FOUND');
            }
        }

        currentStep = 0;
        createOverlay();
        showStep(0);
    }

    function createOverlay() {
        var existing = document.getElementById('onboardOverlay');
        if (existing) existing.remove();

        overlay = document.createElement('div');
        overlay.id = 'onboardOverlay';
        overlay.className = 'onboard-overlay active';

        spotlight = document.createElement('div');
        spotlight.className = 'onboard-spotlight';
        overlay.appendChild(spotlight);

        tooltip = document.createElement('div');
        tooltip.className = 'onboard-tooltip';
        overlay.appendChild(tooltip);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) end();
        });

        document.body.appendChild(overlay);
    }

    function showStep(idx) {
        if (idx >= steps.length) { end(); return; }
        currentStep = idx;
        var step = steps[idx];
        var isAr = getLang() === 'ar';

        var targetEl = document.querySelector(step.target);
        if (!targetEl) {
            console.log('[ONBOARD] Step ' + idx + ' target not found: ' + step.target + ', skipping');
            showStep(idx + 1);
            return;
        }

        // Hide tooltip while repositioning
        tooltip.classList.remove('show');

        // Scroll target into view
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait for scroll to settle, then position
        setTimeout(function() {
            // Re-query after scroll — element reference is still valid but rect changes
            var freshRect = targetEl.getBoundingClientRect();
            console.log('[ONBOARD] Step ' + idx + ' after scroll: top=' +
                Math.round(freshRect.top) + ', left=' + Math.round(freshRect.left) +
                ', size=' + Math.round(freshRect.width) + 'x' + Math.round(freshRect.height));
            positionSpotlightAndTooltip(targetEl, step, idx, isAr);
        }, 450);
    }

    function positionSpotlightAndTooltip(targetEl, step, idx, isAr) {
        var rect = targetEl.getBoundingClientRect();
        var pad = 8;
        var viewW = window.innerWidth;
        var viewH = window.innerHeight;

        // Skip if element is zero-size (hidden/collapsed)
        if (rect.width === 0 && rect.height === 0) {
            console.log('[ONBOARD] Step ' + idx + ' has zero size, skipping');
            showStep(idx + 1);
            return;
        }

        // Position spotlight (fixed positioning — uses viewport coords)
        spotlight.style.top = (rect.top - pad) + 'px';
        spotlight.style.left = (rect.left - pad) + 'px';
        spotlight.style.width = (rect.width + pad * 2) + 'px';
        spotlight.style.height = (rect.height + pad * 2) + 'px';

        // Build tooltip HTML
        var title = isAr ? step.titleAr : step.titleEn;
        var body = isAr ? step.bodyAr : step.bodyEn;

        var dotsHtml = '<div class="onboard-step-dots">';
        for (var i = 0; i < steps.length; i++) {
            dotsHtml += '<div class="dot' + (i === idx ? ' active' : '') + '"></div>';
        }
        dotsHtml += '</div>';

        var nextLabel = idx === steps.length - 1
            ? (isAr ? 'إنهاء' : 'Finish')
            : (isAr ? 'التالي' : 'Next');
        var skipLabel = isAr ? 'تخطي' : 'Skip';

        tooltip.innerHTML =
            '<div class="onboard-tooltip-title">' + title + '</div>' +
            '<div class="onboard-tooltip-body">' + body.replace(/\n/g, '<br>') + '</div>' +
            '<div class="onboard-tooltip-actions">' +
                dotsHtml +
                '<div style="display:flex;gap:6px;align-items:center;">' +
                    '<button class="onboard-btn-skip" id="_obSkip">' + skipLabel + '</button>' +
                    '<button class="onboard-btn-next" id="_obNext">' + nextLabel + '</button>' +
                '</div>' +
            '</div>';

        tooltip.style.direction = isAr ? 'rtl' : 'ltr';

        // Measure tooltip dimensions
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        tooltip.classList.add('show');
        var tooltipW = Math.min(280, viewW - 32);
        tooltip.style.width = tooltipW + 'px';
        var tooltipH = tooltip.offsetHeight || 160;
        tooltip.classList.remove('show');
        tooltip.style.visibility = '';

        // Decide placement: below or above the target
        var spaceBelow = viewH - rect.bottom - pad;
        var spaceAbove = rect.top - pad;
        var tipTop;

        if (spaceBelow >= tooltipH + 16) {
            tipTop = rect.bottom + pad + 8;
        } else if (spaceAbove >= tooltipH + 16) {
            tipTop = rect.top - pad - tooltipH - 8;
        } else {
            // Fallback: center vertically in viewport
            tipTop = Math.max(20, (viewH - tooltipH) / 2);
        }

        // Horizontal: center on target, clamp to viewport edges
        var tipLeft = rect.left + (rect.width / 2) - (tooltipW / 2);
        if (tipLeft + tooltipW > viewW - 16) {
            tipLeft = viewW - tooltipW - 16;
        }
        if (tipLeft < 16) {
            tipLeft = 16;
        }

        // Final vertical clamp
        if (tipTop < 20) tipTop = 20;
        if (tipTop + tooltipH > viewH - 20) {
            tipTop = viewH - tooltipH - 20;
        }

        tooltip.style.left = tipLeft + 'px';
        tooltip.style.top = tipTop + 'px';
        tooltip.style.width = tooltipW + 'px';

        // Animate in
        setTimeout(function() {
            tooltip.classList.add('show');
        }, 50);

        // Attach button events
        var nextBtn = document.getElementById('_obNext');
        var skipBtn = document.getElementById('_obSkip');
        if (nextBtn) nextBtn.onclick = function(e) {
            e.stopPropagation();
            if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
            showStep(idx + 1);
        };
        if (skipBtn) skipBtn.onclick = function(e) {
            e.stopPropagation();
            end();
        };
    }

    function end() {
        localStorage.setItem(STORAGE_KEY, '1');
        if (overlay) {
            tooltip.classList.remove('show');
            overlay.classList.remove('active');
            setTimeout(function() {
                if (overlay && overlay.parentNode) overlay.remove();
                overlay = null;
                spotlight = null;
                tooltip = null;
            }, 300);
        }
    }

    function shouldShow() {
        return !localStorage.getItem(STORAGE_KEY);
    }

    return {
        start: start,
        end: end,
        shouldShow: shouldShow
    };
})();
