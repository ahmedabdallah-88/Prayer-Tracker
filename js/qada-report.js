/* Prayer Tracker PWA — qada-report.js */
window.App = window.App || {};
window.App.QadaReport = (function() {

    function renderQadaReport() {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;
        var I18n = window.App.I18n;

        var container = document.getElementById('fardQadaReport');
        if (!container) return;

        var currentLang = I18n.getCurrentLang();
        var year = Hijri.getCurrentHijriYear();
        var prayers = Storage.getPrayersArray('fard');

        // Collect qada data for all months
        var qadaByPrayer = {};
        var totalQada = 0;

        prayers.forEach(function(p) { qadaByPrayer[p.id] = 0; });

        for (var month = 1; month <= 12; month++) {
            var qadaData = Storage.getQadaData(year, month);
            prayers.forEach(function(p) {
                if (qadaData[p.id]) {
                    var count = Object.values(qadaData[p.id]).filter(function(v) { return v; }).length;
                    qadaByPrayer[p.id] += count;
                    totalQada += count;
                }
            });
        }

        container.innerHTML = '';

        // --- Header: icon + title + total badge ---
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';

        var titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;position:relative;';
        titleDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;color:var(--danger);font-variation-settings:\'FILL\' 0,\'wght\' 500;">assignment_late</span>' +
            (currentLang === 'ar' ? '\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0642\u0636\u0627\u0621' : 'Qada Report');
        header.appendChild(titleDiv);
        // Info button: report 7
        if (window.App.InfoTooltips) {
            window.App.InfoTooltips.attachToHeader(7, titleDiv);
        }

        var badge = document.createElement('div');
        badge.style.cssText = 'padding:4px 10px;border-radius:8px;background:rgba(var(--danger-rgb),0.08);font-size:13px;font-weight:800;color:var(--danger);font-family:Rubik,sans-serif;';
        badge.textContent = totalQada;
        header.appendChild(badge);
        container.appendChild(header);

        // --- Zero state ---
        if (totalQada === 0) {
            var zeroDiv = document.createElement('div');
            zeroDiv.style.cssText = 'text-align:center;padding:20px;';
            zeroDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:32px;color:var(--primary-mid);font-variation-settings:\'FILL\' 1;">check_circle</span>' +
                '<div style="font-size:13px;font-weight:600;color:var(--primary-mid);margin-top:6px;">' +
                (currentLang === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0635\u0644\u0648\u0627\u062A \u0642\u0636\u0627\u0621 \u2014 \u0623\u062D\u0633\u0646\u062A' : 'No qada prayers \u2014 great job!') + '</div>';
            container.appendChild(zeroDiv);
            return;
        }

        // --- Proportional color blocks (stacked bar) ---
        var blocksRow = document.createElement('div');
        blocksRow.style.cssText = 'display:flex;gap:3px;margin-bottom:14px;height:32px;border-radius:10px;overflow:hidden;';

        prayers.forEach(function(p, i) {
            var count = qadaByPrayer[p.id];
            if (count > 0) {
                var block = document.createElement('div');
                block.style.cssText = 'flex:' + count + ';background:' + p.color + ';display:flex;align-items:center;justify-content:center;min-width:24px;transition:flex 0.6s ease;transition-delay:' + (i * 60) + 'ms;';
                block.innerHTML = '<span style="font-size:10px;font-weight:700;color:#fff;font-family:Rubik,sans-serif;">' + count + '</span>';
                blocksRow.appendChild(block);
            }
        });
        container.appendChild(blocksRow);

        // --- Per-prayer breakdown rows ---
        var maxCount = Math.max.apply(null, prayers.map(function(p) { return qadaByPrayer[p.id]; })) || 1;

        prayers.forEach(function(p, i) {
            var count = qadaByPrayer[p.id];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 4px;' +
                (i < prayers.length - 1 ? 'border-bottom:1px solid rgba(0,0,0,0.03);' : '');

            // Color dot
            var dot = document.createElement('div');
            dot.style.cssText = 'width:8px;height:8px;min-width:8px;border-radius:3px;background:' + p.color + ';box-shadow:0 2px 4px ' + p.color + '40;';
            row.appendChild(dot);

            // Prayer name
            var name = document.createElement('span');
            name.style.cssText = 'flex:1;font-size:13px;font-weight:600;color:var(--text-primary);font-family:"Noto Kufi Arabic",sans-serif;';
            name.textContent = I18n.getPrayerName(p.id);
            row.appendChild(name);

            // Mini progress bar
            var barWrap = document.createElement('div');
            barWrap.style.cssText = 'width:80px;height:4px;border-radius:2px;background:rgba(0,0,0,0.04);overflow:hidden;';
            var barFill = document.createElement('div');
            barFill.style.cssText = 'width:' + ((count / maxCount) * 100) + '%;height:100%;border-radius:2px;background:' + p.color + ';transition:width 0.6s ease;';
            barWrap.appendChild(barFill);
            row.appendChild(barWrap);

            // Count number
            var countSpan = document.createElement('span');
            countSpan.style.cssText = 'font-size:14px;font-weight:800;color:var(--danger);font-family:Rubik,sans-serif;width:24px;text-align:left;';
            countSpan.textContent = count;
            row.appendChild(countSpan);

            container.appendChild(row);
        });
    }

    return {
        renderQadaReport: renderQadaReport
    };
})();

// Backward compat
window.renderQadaReport = window.App.QadaReport.renderQadaReport;
