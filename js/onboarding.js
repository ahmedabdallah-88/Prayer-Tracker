/* Prayer Tracker PWA — onboarding.js (8-step spotlight tutorial) */
window.App = window.App || {};
window.App.Onboarding = (function() {

    var STORAGE_KEY = 'salah_onboarding_done';
    var currentStep = 0;
    var overlay = null;
    var spotlight = null;
    var tooltip = null;

    function t(key) {
        return window.App.I18n && window.App.I18n.t ? window.App.I18n.t(key) : key;
    }

    function getLang() {
        return (window.App.I18n && window.App.I18n.getCurrentLang)
            ? window.App.I18n.getCurrentLang() : 'ar';
    }

    var steps = [
        {
            target: '#shellBar',
            titleAr: 'شريط التطبيق',
            titleEn: 'App Bar',
            bodyAr: 'هنا تجد اسم التطبيق والتاريخ الهجري والميلادي، مع أزرار المظهر واللغة والملف الشخصي.',
            bodyEn: 'The app bar shows the Hijri & Gregorian date, with theme, language, and profile buttons.',
            position: 'bottom'
        },
        {
            target: '#tabBar',
            titleAr: 'شريط التنقل',
            titleEn: 'Navigation Bar',
            bodyAr: 'تنقل بين الأقسام الأربعة: الفرائض، السنن، الصيام، والأذكار.',
            bodyEn: 'Switch between four sections: Fard, Sunnah, Fasting, and Azkar.',
            position: 'top'
        },
        {
            target: '#fardSubTabs',
            titleAr: 'علامات التبويب الفرعية',
            titleEn: 'Sub-tabs',
            bodyAr: 'كل قسم يحتوي على التتبع الشهري، نظرة سنوية، والإحصائيات.',
            bodyEn: 'Each section has a monthly tracker, yearly view, and statistics dashboard.',
            position: 'bottom'
        },
        {
            target: '.month-nav-compact',
            titleAr: 'التنقل بين الأشهر',
            titleEn: 'Month Navigation',
            bodyAr: 'تنقل بين الأشهر بالأسهم. اضغط على اسم الشهر لفتح تقويم الشهور والسنوات.',
            bodyEn: 'Navigate months with arrows. Tap the month name for a year/month picker calendar.',
            position: 'bottom'
        },
        {
            target: '#fardTrackerPrayersContainer',
            titleAr: 'شبكة الصلوات',
            titleEn: 'Prayer Grid',
            bodyAr: 'اضغط على المربع لتسجيل الصلاة:\n• ضغطة = صليت منفرداً (أخضر)\n• ضغطتين = جماعة (ذهبي)\n• ثلاث = قضاء (أحمر)',
            bodyEn: 'Tap a box to log:\n• 1 tap = prayed alone (green)\n• 2 taps = congregation (gold)\n• 3 taps = qada/missed (red)',
            position: 'top'
        },
        {
            target: '#prayerTimesBar',
            titleAr: 'مواقيت الصلاة',
            titleEn: 'Prayer Times',
            bodyAr: 'تظهر هنا مواقيت الصلاة حسب موقعك الجغرافي مع عداد تنازلي للصلاة القادمة.',
            bodyEn: 'Live prayer times based on your location with a countdown to the next prayer.',
            position: 'bottom'
        },
        {
            target: '.month-nav-label',
            titleAr: 'تقويم الشهور',
            titleEn: 'Month Picker',
            bodyAr: 'اضغط على اسم الشهر لفتح تقويم يتيح اختيار أي شهر وسنة هجرية لتسجيل صلوات القضاء.',
            bodyEn: 'Tap the month name to open a calendar picker for any Hijri month and year.',
            position: 'bottom'
        },
        {
            target: '#shellProfileBtn',
            titleAr: 'الإعدادات',
            titleEn: 'Settings',
            bodyAr: 'اضغط هنا لفتح الإعدادات: تعديل الملف الشخصي، التنبيهات، التصدير والاستيراد.',
            bodyEn: 'Open settings: edit profile, notifications, export/import data.',
            position: 'bottom'
        }
    ];

    function start() {
        currentStep = 0;
        createOverlay();
        showStep(0);
    }

    function createOverlay() {
        // Remove old
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

        // Click on dark area to skip
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) end();
        });

        document.body.appendChild(overlay);
    }

    function showStep(idx) {
        if (idx >= steps.length) { end(); return; }
        currentStep = idx;
        var step = steps[idx];
        var lang = getLang();
        var isAr = lang === 'ar';

        var targetEl = document.querySelector(step.target);
        if (!targetEl) {
            // Skip missing targets
            showStep(idx + 1);
            return;
        }

        // Scroll target into view
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        setTimeout(function() {
            var rect = targetEl.getBoundingClientRect();
            var pad = 8;

            // Position spotlight
            spotlight.style.top = (rect.top - pad) + 'px';
            spotlight.style.left = (rect.left - pad) + 'px';
            spotlight.style.width = (rect.width + pad * 2) + 'px';
            spotlight.style.height = (rect.height + pad * 2) + 'px';

            // Build tooltip content
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

            // Position tooltip
            tooltip.classList.remove('show');
            tooltip.style.direction = isAr ? 'rtl' : 'ltr';

            var tooltipW = 280;
            var viewW = window.innerWidth;
            var viewH = window.innerHeight;

            var tipLeft, tipTop;

            if (step.position === 'bottom') {
                tipTop = rect.bottom + pad + 12;
                tipLeft = Math.max(10, Math.min(rect.left, viewW - tooltipW - 10));
            } else {
                tipTop = rect.top - pad - 12;
                tipLeft = Math.max(10, Math.min(rect.left, viewW - tooltipW - 10));
            }

            // If tooltip goes below viewport, put it above
            if (tipTop + 180 > viewH) {
                tipTop = rect.top - pad - 180;
            }
            // If tooltip goes above viewport, put it below
            if (tipTop < 10) {
                tipTop = rect.bottom + pad + 12;
            }

            tooltip.style.left = tipLeft + 'px';
            tooltip.style.top = tipTop + 'px';
            tooltip.style.width = tooltipW + 'px';

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
        }, 150);
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
