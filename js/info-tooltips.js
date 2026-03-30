/**
 * info-tooltips.js — Reusable info ℹ️ buttons with tooltip popups
 * Adds contextual help to every chart/report card in the app.
 * Uses FIXED colors only — works on all themes including dark.
 */
window.App = window.App || {};
window.App.InfoTooltips = (function() {

    // Currently open tooltip reference
    var activeTooltip = null;
    var activeBtn = null;
    var _scrollDismiss = null;

    // Report descriptions keyed by ID
    var descriptions = {
        1:  { ar: 'الحلقة الخارجية تمثل نسبة إنجاز الصلوات الكلية، والحلقة الداخلية تمثل نسبة صلاة الجماعة',
              en: 'Outer ring shows overall prayer completion rate, inner ring shows congregation rate' },
        2:  { ar: 'يعرض أفضل شهر حققت فيه أعلى نسبة إنجاز، وأكثر صلاة حافظت عليها خلال السنة، ونسبة صلاة الجماعة الإجمالية',
              en: 'Shows your best performing month, most consistent prayer, and overall congregation rate for the year' },
        '3m': { ar: 'كل هلال يمثل عدد الأيام المتتالية التي صليت فيها كل صلاة بدون انقطاع. الهلال يكبر كلما زادت السلسلة. الحالية = السلسلة الجارية، الأفضل = أطول سلسلة حققتها',
              en: 'Each crescent shows consecutive days you prayed each prayer without missing. Larger crescent = longer streak. Current = ongoing streak, Best = longest ever' },
        3:  { ar: 'كل عداد يوضح أطول فترة صليت فيها صلاة معينة جماعة بشكل متواصل. الحالية = السلسلة الجارية دلوقتي، الأفضل = أطول سلسلة حققتها من قبل',
              en: 'Each counter shows the longest consecutive period you prayed each prayer in congregation. Current = ongoing streak, Best = longest streak ever achieved' },
        '3c': { ar: 'عدد الأيام المتتالية التي حافظت فيها على كل سنة بدون انقطاع. الرقم الكبير = السلسلة الحالية، الأفضل = أطول سلسلة حققتها',
              en: 'Consecutive days you maintained each sunnah prayer. Big number = current streak, Best = longest streak ever' },
        4:  { ar: 'يعرض نسبة الإنجاز الشهرية على مدار السنة الهجرية. الخط الأخضر للإنجاز الكلي، والخط المتقطع لنسبة الجماعة',
              en: 'Monthly completion rate throughout the Hijri year. Green line = overall completion, dashed line = congregation rate' },
        '4s': { ar: 'نسبة إنجاز السنن الشهرية على مدار السنة الهجرية',
              en: 'Monthly sunnah completion rate throughout the Hijri year' },
        5:  { ar: 'مقارنة بين الصلوات الخمس من حيث نسبة الإنجاز ونسبة الجماعة خلال السنة',
              en: 'Comparison of the five prayers by completion rate and congregation rate during the year' },
        6:  { ar: 'يوضح أي أيام الأسبوع تصلي فيها جماعة أكثر',
              en: 'Shows which days of the week you attend congregation most' },
        7:  { ar: 'بيوضح عدد الصلوات اللي صليتها قضاء (في غير وقتها). الشريط الملون بيبين توزيع القضاء على الصلوات الخمس. لو الرقم صفر = أحسنت!',
              en: 'Shows prayers performed as Qada (after their time). Color bar shows distribution across 5 prayers. Zero means excellent!' },
        8:  { ar: 'نسبة إنجاز السنن والرواتب خلال السنة الهجرية',
              en: 'Sunnah prayer completion rate for the Hijri year' },
        9:  { ar: 'أفضل شهر = أعلى نسبة سنن. الأكثر انتظاماً = صلاة السنة اللي بتحافظ عليها أكتر. نسبة الإنجاز = إجمالي السنن اللي صليتها.',
              en: 'Best month = highest sunnah rate. Most consistent = sunnah prayer you maintain most. Completion rate = total sunnah prayers performed.' },
        10: { ar: 'بيقارن أداء كل صلاة سنة. الشريط بيوضح نسبة المحافظة على كل صلاة. تقدر تعرف أنهي سنة محتاج تزودها.',
              en: 'Compares each sunnah prayer. The bar shows your consistency rate. See which sunnah prayers need more attention.' },
        11: { ar: 'عدد صلوات السنن اللي فاتتك. السنن مش واجبة لكن المحافظة عليها من أحب الأعمال.',
              en: 'Missed sunnah prayers count. Sunnah prayers are not obligatory but maintaining them is highly rewarded.' },
        12: { ar: 'بيوضح عدد أيام الصيام في رمضان. الأيام الملونة = صمت. الأيام المميزة = فاتت. أيام الإعفاء = للنساء. المتبقي = أيام لسه ما جاتش.',
              en: 'Shows Ramadan fasting days. Filled days = fasted. Marked days = missed. Exemption days = females. Remaining = upcoming days.' },
        13: { ar: 'بيوضح أيام صيام التطوع. الأيقونات الصغيرة بتوضح الأيام المسنونة: الاثنين والخميس، الأيام البيض (١٣-١٥)، عشر ذي الحجة، عاشوراء.',
              en: 'Shows voluntary fasting days. Small icons indicate sunnah days: Monday/Thursday, White Days (13-15), Dhul Hijjah, Ashura.' },
        14: { ar: 'عداد صيام ٦ أيام من شوال. من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر.',
              en: 'Counter for 6 days of Shawwal fasting. Fasting Ramadan then 6 days of Shawwal is like fasting the whole year.' },
        15: { ar: 'كل بطاقة = شهر هجري. النسبة = إنجازك في الشهر. اللون الأغمق = ممتاز، المتوسط = جيد، الأفتح = ضعيف. اضغط على أي شهر للتفاصيل.',
              en: 'Each card = one Hijri month. Percentage = your monthly performance. Darkest shade = excellent, medium = good, lightest = weak. Tap any month for details.' },
        16: { ar: 'بيوضح أيام الإعفاء (الحيض أو النفاس). أيام الإعفاء مش بتتحسب في نسبة الإنجاز — يعني مش بتأثر على إحصائياتك.',
              en: 'Shows exemption days (menstruation or postpartum). Exemption days are excluded from completion calculations — they don\'t affect your stats.' },
        17: { ar: 'سجل تاريخي لفترات الإعفاء. بيساعدك تتابعي مدة وانتظام الدورة. البيانات خاصة ومش بتتشارك.',
              en: 'Historical record of exemption periods. Helps track duration and regularity. Data is private and not shared.' },
        18: { ar: 'شريط التقدم يوضح نسبة الصلوات المقضية من الإجمالي. كل ما الشريط يمتلئ يبقى اقتربت من إنهاء القضاء.',
              en: 'The progress bar shows the percentage of qada prayers completed out of the total. As the bar fills up, you are closer to finishing your qada.' },
        19: { ar: 'كل شريط يوضح تقدمك في قضاء صلاة معينة. ركّز على الصلاة اللي نسبتها أقل.',
              en: 'Each bar shows your progress in making up a specific prayer. Focus on the prayer with the lowest percentage.' },
        20: { ar: 'أفضل شهر = أكتر شهر سجلت فيه قضاء. المعدل اليومي = متوسطك الفعلي. تاريخ الانتهاء محسوب على أدائك الفعلي مش الهدف.',
              en: 'Best month = month with most qada logged. Daily average = your actual average. Expected completion is calculated from your actual performance, not the target.' },
        21: { ar: 'مقارنة بين الهدف اللي حددته والأداء الفعلي. لو متأخر حاول تزود عدد الصلوات اليومي.',
              en: 'Comparison between your set target and actual performance. If behind, try increasing your daily prayer count.' },
        22: { ar: 'الخط التنازلي بيوضح كم صلاة باقية آخر كل شهر. كل ما ينزل أسرع يبقى أداؤك أحسن.',
              en: 'The descending line shows remaining prayers at the end of each month. The steeper the drop, the better your performance.' }
    };

    function getDescription(reportId) {
        var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        var desc = descriptions[reportId];
        if (!desc) return '';
        return desc[lang] || desc['ar'];
    }

    function closeActiveTooltip() {
        if (_scrollDismiss) {
            window.removeEventListener('scroll', _scrollDismiss, true);
            _scrollDismiss = null;
        }
        if (activeTooltip && activeTooltip.parentNode) {
            activeTooltip.parentNode.removeChild(activeTooltip);
        }
        if (activeBtn) {
            activeBtn.style.background = 'rgba(128,128,128,0.1)';
            activeBtn.style.border = '1px solid rgba(128,128,128,0.15)';
            var icon = activeBtn.querySelector('.material-symbols-rounded');
            if (icon) {
                icon.textContent = 'info';
                icon.style.color = 'var(--text-muted)';
                icon.style.fontVariationSettings = "'FILL' 0";
            }
        }
        activeTooltip = null;
        activeBtn = null;
    }

    function _positionTooltip(tooltip, arrow, wrapper) {
        requestAnimationFrame(function() {
            var rect = tooltip.getBoundingClientRect();
            var wrapRect = wrapper.getBoundingClientRect();
            if (rect.left < 8 || rect.right > window.innerWidth - 8) {
                tooltip.style.position = 'fixed';
                tooltip.style.top = (wrapRect.bottom + 4) + 'px';
                var tw = rect.width;
                var cx = wrapRect.left + wrapRect.width / 2;
                var idealLeft = cx - tw / 2;
                idealLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - tw - 8));
                tooltip.style.left = idealLeft + 'px';
                tooltip.style.right = 'auto';
                var arrowLeft = cx - idealLeft - 6;
                arrowLeft = Math.max(8, Math.min(arrowLeft, tw - 20));
                arrow.style.left = arrowLeft + 'px';
                arrow.style.right = 'auto';
            }
        });
    }

    function createInfoButton(reportId, container) {
        if (!container) return null;

        // Find or create the header element
        var header = container.querySelector('h3, .chart-card > div:first-child, [style*="font-weight:700"]');
        if (!header) {
            // For dynamically-created cards, look for the first child div that acts as header
            var children = container.children;
            for (var i = 0; i < children.length; i++) {
                if (children[i].style && children[i].style.fontWeight === '700') {
                    header = children[i];
                    break;
                }
            }
        }
        if (!header) return null;

        // Ensure header parent has relative positioning for tooltip
        var headerParent = header.parentNode;
        if (headerParent) {
            var pos = window.getComputedStyle(headerParent).position;
            if (pos === 'static') headerParent.style.position = 'relative';
        }

        // Create button wrapper (positioned relative for tooltip)
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-inline-start:6px;vertical-align:middle;';
        wrapper.className = 'info-btn-wrapper';

        // Create the button
        var btn = document.createElement('button');
        btn.className = 'info-tooltip-btn';
        btn.setAttribute('aria-label', 'Info');
        btn.setAttribute('data-report-id', reportId);
        btn.style.cssText = 'width:22px;height:22px;border-radius:50%;background:rgba(128,128,128,0.1);border:1px solid rgba(128,128,128,0.15);' +
            'display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;outline:none;' +
            'transition:all 0.2s ease;flex-shrink:0;-webkit-tap-highlight-color:transparent;';

        var icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.style.cssText = "font-size:13px;color:var(--text-muted);line-height:1;font-variation-settings:'FILL' 0;";
        icon.textContent = 'info';
        btn.appendChild(icon);

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            // If this button's tooltip is already open, close it
            if (activeBtn === btn) {
                closeActiveTooltip();
                return;
            }

            // Close any other open tooltip
            closeActiveTooltip();

            // Activate button
            btn.style.background = 'var(--primary)';
            btn.style.border = '1px solid var(--primary)';
            icon.textContent = 'close';
            icon.style.color = '#fff';
            icon.style.fontVariationSettings = "'FILL' 1";

            // Create tooltip — appended to body with fixed positioning to avoid overflow clipping
            var tooltip = document.createElement('div');
            tooltip.className = 'info-tooltip-popup';

            var wrapRect = wrapper.getBoundingClientRect();
            var tooltipTop = wrapRect.bottom + 4;
            var idealLeft = wrapRect.left + wrapRect.width / 2 - 130;
            idealLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - 268));

            tooltip.style.cssText = 'position:fixed;top:' + tooltipTop + 'px;left:' + idealLeft + 'px;width:260px;padding:14px 16px;' +
                'background:var(--popup-bg, #fff);border-radius:16px;border:1px solid var(--border, rgba(0,0,0,0.08));' +
                'box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);' +
                'z-index:10001;animation:tooltipIn 0.2s ease;max-width:calc(100vw - 16px);box-sizing:border-box;';

            // Arrow positioned to point at the button
            var arrow = document.createElement('div');
            var arrowLeft = wrapRect.left + wrapRect.width / 2 - idealLeft - 6;
            arrowLeft = Math.max(8, Math.min(arrowLeft, 248));
            arrow.style.cssText = 'position:absolute;top:-6px;left:' + arrowLeft + 'px;width:12px;height:12px;background:var(--popup-bg, #fff);' +
                'border-top:1px solid var(--border, rgba(0,0,0,0.08));border-left:1px solid var(--border, rgba(0,0,0,0.08));' +
                'transform:rotate(45deg);';
            tooltip.appendChild(arrow);

            // Text
            var text = document.createElement('div');
            text.style.cssText = 'font-size:12px;font-weight:500;color:var(--text-primary);line-height:1.7;position:relative;z-index:1;' +
                'font-family:"Noto Kufi Arabic",sans-serif;-webkit-user-select:text;user-select:text;';
            text.textContent = getDescription(reportId);
            tooltip.appendChild(text);

            document.body.appendChild(tooltip);
            activeTooltip = tooltip;
            activeBtn = btn;
            _scrollDismiss = function() { closeActiveTooltip(); };
            window.addEventListener('scroll', _scrollDismiss, true);
        });

        wrapper.appendChild(btn);

        // Insert button next to header text
        if (header.tagName === 'H3') {
            header.appendChild(wrapper);
        } else if (header.querySelector && header.querySelector('span[style*="font-weight:700"], span[style*="font-size:14px"]')) {
            var titleSpan = header.querySelector('span[style*="font-weight:700"], span[style*="font-size:14px"]');
            if (titleSpan && titleSpan.parentNode) {
                titleSpan.parentNode.insertBefore(wrapper, titleSpan.nextSibling);
            }
        } else {
            header.appendChild(wrapper);
        }

        return btn;
    }

    // Attach to a dynamically-created card header div
    function attachToHeader(reportId, headerElement) {
        if (!headerElement) return null;

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-inline-start:6px;vertical-align:middle;';
        wrapper.className = 'info-btn-wrapper';

        var btn = document.createElement('button');
        btn.className = 'info-tooltip-btn';
        btn.setAttribute('aria-label', 'Info');
        btn.setAttribute('data-report-id', reportId);
        btn.style.cssText = 'width:22px;height:22px;border-radius:50%;background:rgba(128,128,128,0.1);border:1px solid rgba(128,128,128,0.15);' +
            'display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;outline:none;' +
            'transition:all 0.2s ease;flex-shrink:0;-webkit-tap-highlight-color:transparent;';

        var icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.style.cssText = "font-size:13px;color:var(--text-muted);line-height:1;font-variation-settings:'FILL' 0;";
        icon.textContent = 'info';
        btn.appendChild(icon);

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            if (activeBtn === btn) {
                closeActiveTooltip();
                return;
            }

            closeActiveTooltip();

            btn.style.background = 'var(--primary)';
            btn.style.border = '1px solid var(--primary)';
            icon.textContent = 'close';
            icon.style.color = '#fff';
            icon.style.fontVariationSettings = "'FILL' 1";

            // Create tooltip — appended to body with fixed positioning to avoid overflow clipping
            var tooltip = document.createElement('div');
            tooltip.className = 'info-tooltip-popup';

            var wrapRect = wrapper.getBoundingClientRect();
            var tooltipTop = wrapRect.bottom + 4;
            var idealLeft = wrapRect.left + wrapRect.width / 2 - 130;
            idealLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - 268));

            tooltip.style.cssText = 'position:fixed;top:' + tooltipTop + 'px;left:' + idealLeft + 'px;width:260px;padding:14px 16px;' +
                'background:var(--popup-bg, #fff);border-radius:16px;border:1px solid var(--border, rgba(0,0,0,0.08));' +
                'box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);' +
                'z-index:10001;animation:tooltipIn 0.2s ease;max-width:calc(100vw - 16px);box-sizing:border-box;';

            var arrow = document.createElement('div');
            var arrowLeft = wrapRect.left + wrapRect.width / 2 - idealLeft - 6;
            arrowLeft = Math.max(8, Math.min(arrowLeft, 248));
            arrow.style.cssText = 'position:absolute;top:-6px;left:' + arrowLeft + 'px;width:12px;height:12px;background:var(--popup-bg, #fff);' +
                'border-top:1px solid var(--border, rgba(0,0,0,0.08));border-left:1px solid var(--border, rgba(0,0,0,0.08));' +
                'transform:rotate(45deg);';
            tooltip.appendChild(arrow);

            var text = document.createElement('div');
            text.style.cssText = 'font-size:12px;font-weight:500;color:var(--text-primary);line-height:1.7;position:relative;z-index:1;' +
                'font-family:"Noto Kufi Arabic",sans-serif;-webkit-user-select:text;user-select:text;';
            text.textContent = getDescription(reportId);
            tooltip.appendChild(text);

            document.body.appendChild(tooltip);
            activeTooltip = tooltip;
            activeBtn = btn;
            _scrollDismiss = function() { closeActiveTooltip(); };
            window.addEventListener('scroll', _scrollDismiss, true);
        });

        wrapper.appendChild(btn);

        // Ensure parent has relative positioning
        var pos = window.getComputedStyle(headerElement).position;
        if (pos === 'static') headerElement.style.position = 'relative';

        headerElement.appendChild(wrapper);
        return btn;
    }

    // Close on any outside click
    document.addEventListener('click', function() {
        closeActiveTooltip();
    });

    // Helper: add info button to an h3 inside a chart-card found by child element ID
    function addToChartCard(childId, reportId) {
        var el = document.getElementById(childId);
        if (!el) return;
        var card = el.closest ? el.closest('.chart-card') : null;
        if (!card) return;
        var h3 = card.querySelector('h3');
        if (h3 && !h3.querySelector('.info-btn-wrapper')) {
            h3.style.position = 'relative';
            attachToHeader(reportId, h3);
        }
    }

    // Helper: add info button to a wrapper card found by descendant ID
    function addToStatsCard(childId, reportId) {
        var el = document.getElementById(childId);
        if (!el) return;
        // Walk up to find the styled card wrapper
        var node = el.parentElement;
        while (node && node.tagName !== 'BODY') {
            if (node.style && node.style.borderRadius && node.style.borderRadius.indexOf('20px') !== -1 && node.style.padding) {
                break;
            }
            node = node.parentElement;
        }
        if (!node || node.tagName === 'BODY') return;
        // Add an inline info header above the card content
        if (node.querySelector('.info-btn-wrapper')) return;
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;position:relative;';
        var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        hdr.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;color:var(--text-muted);">info</span>' +
            '<span style="font-size:11px;font-weight:600;color:var(--text-muted);">' +
            (lang === 'ar' ? 'ملخص الأداء' : 'Performance Summary') + '</span>';
        attachToHeader(reportId, hdr);
        node.insertBefore(hdr, node.firstChild);
    }

    // Inject info buttons into static HTML chart cards
    function initStaticButtons() {
        // === FARD DASHBOARD ===
        // 1. Orbital Progress
        addToChartCard('fardOrbitalProgress', 1);
        // 2. Stats card (best month / best prayer / congregation)
        addToStatsCard('fardBestMonth', 2);
        // 3m. Prayer Consistency Streaks (Moons)
        addToChartCard('fardPrayerMoons', '3m');
        // 3. Congregation Streak Lanterns
        addToChartCard('fardStreakFlame', 3);
        // 4. Mountain Chart (monthly progress)
        addToChartCard('fardMountainChart', 4);
        // 5 & 6 & 7: prayerDualBars, weeklyRhythm, qadaReport — handled dynamically

        // 17. Period history (females)
        addToChartCard('fardPeriodHistoryContainer', 17);

        // === SUNNAH DASHBOARD ===
        // 8. Sunnah Orbital Progress
        addToChartCard('sunnahOrbitalProgress', 8);
        // 9. Sunnah stats card
        addToStatsCard('sunnahBestMonth', 9);
        // 3c. Sunnah Prayer Streaks (Chips)
        addToChartCard('sunnahPrayerStreaks', '3c');
        // 4s. Sunnah Mountain Chart (sunnah-specific: no congregation line)
        addToChartCard('sunnahMountainChart', '4s');
        // 10: sunnahDualBars — handled dynamically

        // === FASTING DASHBOARD ===
        // 13. Fasting monthly chart
        addToChartCard('fastingMonthlyChart', 13);

        // === FASTING VIEWS (Ramadan & Voluntary) ===
        // 12. Ramadan stats area
        var ramadanView = document.getElementById('fastingRamadanView');
        if (ramadanView) {
            var ramadanStats = ramadanView.querySelector('.stats');
            if (ramadanStats && !ramadanStats.querySelector('.info-btn-wrapper')) {
                var rHdr = document.createElement('div');
                rHdr.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;position:relative;';
                var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
                rHdr.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;color:#059669;">nights_stay</span>' +
                    '<span style="font-size:12px;font-weight:700;color:var(--text-primary);">' +
                    (lang === 'ar' ? 'إحصائيات رمضان' : 'Ramadan Stats') + '</span>';
                attachToHeader(12, rHdr);
                ramadanStats.parentNode.insertBefore(rHdr, ramadanStats);
            }
        }

        // 13. Voluntary fasting grid
        var volView = document.getElementById('fastingVoluntaryView');
        if (volView) {
            var volStats = volView.querySelector('.stats');
            if (volStats && !volStats.querySelector('.info-btn-wrapper')) {
                var vHdr = document.createElement('div');
                vHdr.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;position:relative;';
                var lang2 = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
                vHdr.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;color:#059669;">restaurant</span>' +
                    '<span style="font-size:12px;font-weight:700;color:var(--text-primary);">' +
                    (lang2 === 'ar' ? 'صيام التطوع' : 'Voluntary Fasting') + '</span>';
                attachToHeader(13, vHdr);
                volStats.parentNode.insertBefore(vHdr, volStats);
            }
        }

        // === FASTING DASHBOARD STAT CARDS ===
        var fastDashView = document.getElementById('fastingDashboardView');
        if (fastDashView) {
            var dashGrid = fastDashView.querySelector('.dashboard-grid');
            if (dashGrid && !dashGrid.querySelector('.info-btn-wrapper')) {
                var fHdr = document.createElement('div');
                fHdr.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;position:relative;';
                var lang3 = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
                fHdr.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;color:#059669;">analytics</span>' +
                    '<span style="font-size:12px;font-weight:700;color:var(--text-primary);">' +
                    (lang3 === 'ar' ? 'ملخص الصيام' : 'Fasting Summary') + '</span>';
                attachToHeader(13, fHdr);
                dashGrid.parentNode.insertBefore(fHdr, dashGrid);
            }
        }
    }

    return {
        createInfoButton: createInfoButton,
        attachToHeader: attachToHeader,
        closeActiveTooltip: closeActiveTooltip,
        initStaticButtons: initStaticButtons,
        descriptions: descriptions
    };

})();
