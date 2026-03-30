/**
 * svg-charts.js — Custom SVG Chart Library for Prayer Tracker
 * Replaces Chart.js with lightweight, themed SVG visualizations.
 */
window.App = window.App || {};
window.App.SVGCharts = (function() {

    var NS = 'http://www.w3.org/2000/svg';

    function el(tag, attrs, children) {
        var e = document.createElementNS(NS, tag);
        if (attrs) Object.keys(attrs).forEach(function(k) { e.setAttribute(k, attrs[k]); });
        if (children) {
            if (typeof children === 'string') e.textContent = children;
            else if (Array.isArray(children)) children.forEach(function(c) { if (c) e.appendChild(c); });
        }
        return e;
    }

    function svg(w, h, vb, children) {
        var s = el('svg', { width: '100%', height: h, viewBox: vb || ('0 0 ' + w + ' ' + h), preserveAspectRatio: 'xMidYMid meet' });
        s.style.overflow = 'visible';
        if (children) children.forEach(function(c) { if (c) s.appendChild(c); });
        return s;
    }

    function isRTL() { return document.dir === 'rtl' || document.documentElement.dir === 'rtl'; }

    // Theme variable reader — resolves CSS custom properties for SVG attributes
    function tv(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

    // ==================== 1. ORBITAL PROGRESS (Ring chart) ====================

    function orbitalProgress(container, data) {
        container.innerHTML = '';
        var size = 180, cx = 90, cy = 90;
        var completionPct = data.completionPct || 0;
        var congPct = data.congPct || 0;
        var isAr = data.lang === 'ar';

        // --- Build SVG ---
        var children = [];

        // Outer track (الإنجاز)
        children.push(el('circle', { cx: cx, cy: cy, r: 72, fill: 'none', stroke: 'rgba(128,128,128,0.06)', 'stroke-width': 10 }));
        // Inner track (الجماعة)
        if (data.isFard) {
            children.push(el('circle', { cx: cx, cy: cy, r: 56, fill: 'none', stroke: 'rgba(128,128,128,0.06)', 'stroke-width': 8 }));
        }

        // Outer ring (الإنجاز): r=72, strokeWidth=10, green
        var outerCirc = 2 * Math.PI * 72;
        var outerOffset = outerCirc * (1 - completionPct / 100);
        var outerArc = el('circle', { cx: cx, cy: cy, r: 72, fill: 'none', stroke: tv('--primary-mid'), 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': outerCirc, 'stroke-dashoffset': outerCirc, transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });
        outerArc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        outerArc._targetOffset = outerOffset;
        children.push(outerArc);

        // Inner ring (الجماعة): r=56, strokeWidth=8, gold
        var innerArc = null;
        if (data.isFard) {
            var innerCirc = 2 * Math.PI * 56;
            var innerOffset = innerCirc * (1 - congPct / 100);
            innerArc = el('circle', { cx: cx, cy: cy, r: 56, fill: 'none', stroke: tv('--accent'), 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': innerCirc, 'stroke-dashoffset': innerCirc, transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });
            innerArc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            innerArc._targetOffset = innerOffset;
            children.push(innerArc);
        }

        // Center text — start at 0, animate later
        var centerNum = el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: tv('--text-primary'), 'font-size': '36', 'font-weight': '800', 'font-family': 'Rubik, sans-serif' }, '0');
        children.push(centerNum);
        children.push(el('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', fill: tv('--text-muted'), 'font-size': '12', 'font-weight': '600', 'font-family': 'Rubik, sans-serif' }, '%'));

        var s = svg(size, size, '0 0 ' + size + ' ' + size, children);
        s.style.flexShrink = '0';
        s.style.width = size + 'px';
        s.style.height = size + 'px';

        // --- Build layout: SVG left + legend right ---
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:20px;';

        wrapper.appendChild(s);

        // Right side legend
        var legend = document.createElement('div');
        legend.style.cssText = 'flex:1;';

        var title = isAr ? 'التقدم السنوي' : 'Yearly Progress';
        var completionLabel = isAr ? 'الإنجاز' : 'Completion';
        var congLabel = isAr ? 'الجماعة' : 'Congregation';
        var congSuffix = isAr ? ' صلاة' : ' prayers';

        legend.innerHTML =
            '<div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:\'Noto Kufi Arabic\',sans-serif;">' + title + '</div>' +
            // Item 1: الإنجاز
            '<div style="margin-bottom:12px;">' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' +
                    '<span style="width:10px;height:10px;border-radius:3px;background:var(--primary-mid);flex-shrink:0;"></span>' +
                    '<span style="font-size:12px;color:var(--text-muted);font-weight:600;">' + completionLabel + '</span>' +
                '</div>' +
                '<div style="font-size:11px;color:var(--text-muted);font-weight:500;margin-bottom:2px;margin-inline-start:16px;">' + data.completed + ' / ' + data.total + '</div>' +
                '<div style="font-size:16px;font-weight:800;color:var(--primary-mid);font-family:\'Rubik\',sans-serif;margin-inline-start:16px;">' + completionPct + '%</div>' +
            '</div>' +
            // Item 2: الجماعة (fard only)
            (data.isFard ?
            '<div>' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' +
                    '<span style="width:10px;height:10px;border-radius:3px;background:var(--accent);flex-shrink:0;"></span>' +
                    '<span style="font-size:12px;color:var(--text-muted);font-weight:600;">' + congLabel + '</span>' +
                '</div>' +
                '<div style="font-size:11px;color:var(--text-muted);font-weight:500;margin-bottom:2px;margin-inline-start:16px;">' + data.congCount + congSuffix + '</div>' +
                '<div style="font-size:16px;font-weight:800;color:var(--accent);font-family:\'Rubik\',sans-serif;margin-inline-start:16px;">' + congPct + '%</div>' +
            '</div>' : '');

        wrapper.appendChild(legend);
        container.appendChild(wrapper);

        // Feature #8: Animate rings + center text after DOM insertion
        requestAnimationFrame(function() {
            outerArc.setAttribute('stroke-dashoffset', outerArc._targetOffset);
            if (innerArc) {
                innerArc.setAttribute('stroke-dashoffset', innerArc._targetOffset);
            }
            // Animate center percentage
            if (window.App.UI && window.App.UI.animateCounter) {
                window.App.UI.animateCounter(centerNum, completionPct, 1000, '');
            } else {
                centerNum.textContent = completionPct + '';
            }
        });
    }

    // ==================== 2. MOSQUE LANTERNS (Jamaah Streaks) ====================

    function streakFlameBars(container, data) {
        container.innerHTML = '';
        var prayers = data.prayers || [];
        if (prayers.length === 0) return;

        var SVG_NS = 'http://www.w3.org/2000/svg';

        var gradients = {
            '#D4A0A7': 'linear-gradient(135deg, #E8B4B8, #D4A0A7)',
            '#E8B84A': 'linear-gradient(135deg, #F0C75E, #E8B84A)',
            '#D4943A': 'linear-gradient(135deg, #E8A849, #D4943A)',
            '#B0664A': 'linear-gradient(135deg, #C47A5A, #B0664A)',
            '#4A5A7A': 'linear-gradient(135deg, #5B6B8A, #4A5A7A)'
        };

        // Tier definitions based on current streak
        function getTier(current) {
            if (current >= 30) return 'large';
            if (current >= 10) return 'medium';
            if (current >= 1) return 'small';
            return 'dead';
        }

        var tierConfig = {
            dead:   { w: 32, h: 42, fillTop: '#CCCCCC', fillBot: '#CCCCCC', stroke: 'none', glowOpMin: 0, glowOpMax: 0, glowDur: 0, swayDur: 0, flame: false, flicker: false, flameBall: false, doubleGlow: false, numSize: 20, stringColor: '#A0966E' },
            small:  { w: 36, h: 48, fillTop: '#D4C090', fillBot: '#B09840', stroke: 'none', glowOpMin: 0.2, glowOpMax: 0.5, glowDur: 2, swayDur: 3.5, flame: true, flicker: false, flameBall: false, doubleGlow: false, numSize: 20, stringColor: '#A0966E' },
            medium: { w: 40, h: 52, fillTop: '#E0C878', fillBot: '#C0A040', stroke: 'none', glowOpMin: 0.3, glowOpMax: 0.6, glowDur: 1.8, swayDur: 3, flame: true, flicker: true, flameBall: false, doubleGlow: false, numSize: 20, stringColor: '#A0966E' },
            large:  { w: 48, h: 62, fillTop: '#F0D878', fillBot: '#C09020', stroke: '#D4A03C', glowOpMin: 0.4, glowOpMax: 0.8, glowDur: 1.5, swayDur: 2.5, flame: true, flicker: true, flameBall: true, doubleGlow: true, numSize: 24, stringColor: '#D4A03C' }
        };

        // Dark mode dead overrides applied via CSS class

        function buildLanternSVG(tier, cfg, uid) {
            var w = cfg.w, h = cfg.h;
            var svgEl = document.createElementNS(SVG_NS, 'svg');
            svgEl.setAttribute('width', w);
            svgEl.setAttribute('height', h);
            svgEl.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
            svgEl.style.overflow = 'visible';
            svgEl.style.display = 'block';

            // Gradient definition
            var defs = document.createElementNS(SVG_NS, 'defs');
            var grad = document.createElementNS(SVG_NS, 'linearGradient');
            grad.setAttribute('id', 'lanternGrad' + uid);
            grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
            grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
            var stop1 = document.createElementNS(SVG_NS, 'stop');
            stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', cfg.fillTop);
            var stop2 = document.createElementNS(SVG_NS, 'stop');
            stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', cfg.fillBot);
            grad.appendChild(stop1); grad.appendChild(stop2);
            defs.appendChild(grad);
            svgEl.appendChild(defs);

            // Lantern body path (scaled to viewBox)
            var sx = w / 40, sy = h / 52;
            var bodyPath = document.createElementNS(SVG_NS, 'path');
            // Cap + body shape
            var d = 'M' + (17 * sx) + ' ' + (2 * sy) + ' L' + (23 * sx) + ' ' + (2 * sy) +
                    ' L' + (23 * sx) + ' ' + (6 * sy) +
                    ' Q' + (28 * sx) + ' ' + (6 * sy) + ' ' + (30 * sx) + ' ' + (10 * sy) +
                    ' L' + (32 * sx) + ' ' + (38 * sy) +
                    ' Q' + (32 * sx) + ' ' + (48 * sy) + ' ' + (20 * sx) + ' ' + (50 * sy) +
                    ' Q' + (8 * sx) + ' ' + (48 * sy) + ' ' + (8 * sx) + ' ' + (38 * sy) +
                    ' L' + (10 * sx) + ' ' + (10 * sy) +
                    ' Q' + (12 * sx) + ' ' + (6 * sy) + ' ' + (17 * sx) + ' ' + (6 * sy) + ' Z';
            bodyPath.setAttribute('d', d);
            bodyPath.setAttribute('fill', 'url(#lanternGrad' + uid + ')');
            if (cfg.stroke !== 'none') {
                bodyPath.setAttribute('stroke', cfg.stroke);
                bodyPath.setAttribute('stroke-width', '1');
            }
            svgEl.appendChild(bodyPath);

            var cx = w / 2, cy = h * 0.55;

            // Inner glow ellipse(s)
            if (tier !== 'dead') {
                var glow = document.createElementNS(SVG_NS, 'ellipse');
                glow.setAttribute('cx', cx);
                glow.setAttribute('cy', cy);
                glow.setAttribute('rx', w * 0.22);
                glow.setAttribute('ry', h * 0.22);
                glow.setAttribute('fill', '#FFFDE0');
                glow.setAttribute('opacity', String(cfg.glowOpMin));
                glow.classList.add('lantern-glow');
                glow.style.animationDuration = cfg.glowDur + 's';
                svgEl.appendChild(glow);

                if (cfg.doubleGlow) {
                    var innerGlow = document.createElementNS(SVG_NS, 'ellipse');
                    innerGlow.setAttribute('cx', cx);
                    innerGlow.setAttribute('cy', cy);
                    innerGlow.setAttribute('rx', w * 0.12);
                    innerGlow.setAttribute('ry', h * 0.19);
                    innerGlow.setAttribute('fill', '#FFF8C0');
                    innerGlow.setAttribute('opacity', '0.6');
                    innerGlow.classList.add('lantern-glow-core');
                    svgEl.appendChild(innerGlow);
                }
            }

            // Flame line inside
            if (cfg.flame) {
                var flameLine = document.createElementNS(SVG_NS, 'line');
                flameLine.setAttribute('x1', cx); flameLine.setAttribute('y1', cy - h * 0.12);
                flameLine.setAttribute('x2', cx); flameLine.setAttribute('y2', cy + h * 0.05);
                flameLine.setAttribute('stroke', '#FFD700');
                flameLine.setAttribute('stroke-width', '1.5');
                flameLine.setAttribute('stroke-linecap', 'round');
                if (cfg.flicker) {
                    flameLine.classList.add('lantern-flame-flicker');
                }
                svgEl.appendChild(flameLine);
            }

            // Flame ball at top (large tier)
            if (cfg.flameBall) {
                var fb = document.createElementNS(SVG_NS, 'circle');
                fb.setAttribute('cx', cx);
                fb.setAttribute('cy', cy - h * 0.14);
                fb.setAttribute('r', '2');
                fb.setAttribute('fill', '#FFD700');
                fb.setAttribute('opacity', '0.7');
                fb.classList.add('lantern-flame-ball');
                svgEl.appendChild(fb);
            }

            return svgEl;
        }

        var SVG_ZONE_H = 80;

        function createLantern(p, index) {
            var tier = getTier(p.current);
            var cfg = tierConfig[tier];
            var uid = 'l' + index + '_' + Date.now();

            var cell = document.createElement('div');
            cell.className = 'lantern-item';

            // Zone 1: SVG zone (fixed 80px height, lantern at bottom, string fills gap above)
            var zoneSvg = document.createElement('div');
            zoneSvg.className = 'lantern-zone-svg';
            zoneSvg.style.position = 'relative';

            // String — fills gap from top of zone to top of lantern
            var stringH = SVG_ZONE_H - cfg.h;
            var string = document.createElement('div');
            string.className = 'lantern-string';
            string.style.cssText = 'position:absolute;top:0;left:50%;transform:translateX(-50%);width:1px;height:' + stringH + 'px;background:' + cfg.stringColor + ';';
            zoneSvg.appendChild(string);

            // Lantern body wrapper (for sway animation)
            var lanternWrap = document.createElement('div');
            lanternWrap.className = 'lantern-body-wrap';
            if (tier === 'dead') {
                lanternWrap.classList.add('lantern-dead');
            }
            if (tier !== 'dead') {
                lanternWrap.classList.add('lantern-sway');
                var swayDurations = [3.5, 3.0, 2.8, 3.2, 2.5];
                var swayDelays = [0, 0.5, 1.0, 0.3, 0.7];
                lanternWrap.style.animationDuration = (cfg.swayDur + (swayDurations[index % 5] - 3) * 0.2) + 's';
                lanternWrap.style.animationDelay = swayDelays[index % 5] + 's';
            }

            var svgEl = buildLanternSVG(tier, cfg, uid);
            lanternWrap.appendChild(svgEl);
            zoneSvg.appendChild(lanternWrap);
            cell.appendChild(zoneSvg);

            // Zone 2: Current streak number
            var zoneNum = document.createElement('div');
            zoneNum.className = 'lantern-zone-num';
            var numColor;
            if (tier === 'dead') {
                numColor = '#C1574E';
            } else if (tier === 'large') {
                numColor = '#D4A03C';
            } else {
                numColor = p.color;
            }
            zoneNum.innerHTML = '<span class="lantern-current-num" style="font-size:' + cfg.numSize + 'px;font-weight:800;font-family:Rubik,sans-serif;line-height:1;color:' + numColor + ';">' + p.current + '</span>';
            cell.appendChild(zoneNum);

            // Zone 3: Best streak
            var zoneBest = document.createElement('div');
            zoneBest.className = 'lantern-zone-best';
            var isRecord = p.current > 0 && p.current === p.best;
            var bestColor = isRecord ? '#D4A03C' : '#6B7280';
            var bestPrefix = isRecord ? '\uD83C\uDFC6 ' : '';
            var bestLabel = data.legendLabels ? data.legendLabels.best || '\u0627\u0644\u0623\u0641\u0636\u0644' : '\u0627\u0644\u0623\u0641\u0636\u0644';
            zoneBest.innerHTML = '<span class="lantern-best-num" style="font-size:11px;font-weight:700;color:' + bestColor + ';white-space:nowrap;">' + bestPrefix + bestLabel + ' ' + p.best + '</span>';
            cell.appendChild(zoneBest);

            // Zone 4: Prayer icon
            var zoneIcon = document.createElement('div');
            zoneIcon.className = 'lantern-zone-icon';
            var grad = gradients[p.color] || ('linear-gradient(135deg, ' + p.color + ', ' + p.color + ')');
            zoneIcon.innerHTML = '<div style="width:28px;height:28px;border-radius:8px;background:' + grad + ';display:flex;align-items:center;justify-content:center;">' +
                '<span class="material-symbols-rounded" style="font-size:14px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">' + p.icon + '</span></div>';
            cell.appendChild(zoneIcon);

            // Zone 5: Prayer name
            var zoneName = document.createElement('div');
            zoneName.className = 'lantern-zone-name';
            var nameColor = tier === 'large' ? 'var(--accent)' : 'var(--text-secondary)';
            zoneName.innerHTML = '<span class="lantern-prayer-name" style="font-size:11px;font-weight:700;color:' + nameColor + ';font-family:\'Noto Kufi Arabic\',sans-serif;">' + p.name + '</span>';
            cell.appendChild(zoneName);

            return cell;
        }

        // Single horizontal row of 5 lanterns
        var row = document.createElement('div');
        row.className = 'lanterns-row';
        for (var i = 0; i < prayers.length; i++) {
            row.appendChild(createLantern(prayers[i], i));
        }
        container.appendChild(row);

        // Legend
        if (data.legendLabels) {
            var leg = document.createElement('div');
            leg.style.cssText = 'display:flex;justify-content:center;gap:16px;margin-top:12px;';
            leg.innerHTML =
                '<div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:50%;background:#4CAF50;"></div><span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (data.legendLabels.current || '\u0627\u0644\u062D\u0627\u0644\u064A\u0629') + '</span></div>' +
                '<div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:3px;border-radius:2px;background:var(--text-muted);"></div><span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (data.legendLabels.best || '\u0627\u0644\u0623\u0641\u0636\u0644') + '</span></div>';
            container.appendChild(leg);
        }
    }

    // ==================== 3. MOUNTAIN LANDSCAPE (area chart) ====================

    function mountainChart(container, data) {
        container.innerHTML = '';
        var months = data.labels || [];
        var values = data.values || [];
        var values2 = data.values2 || null;
        var currentIdx = data.currentMonth !== undefined ? data.currentMonth - 1 : -1;
        var n = months.length;
        if (n === 0) return;

        // Resolve theme colors for SVG string building
        var _greenDeep = tv('--primary');
        var _greenMid = tv('--primary-mid');
        var _gold = tv('--accent');
        var _red = tv('--danger');
        var _textMuted = tv('--text-muted');

        var W = 360, H = 190;
        var padL = 8, padR = 8, padTop = 28, padBot = 24;
        var chartW = W - padL - padR;
        var chartH = H - padTop - padBot;
        var baseY = padTop + chartH;

        // Map values to points
        function toPoint(i, v) {
            var x = n === 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
            var y = baseY - (Math.min(v, 100) / 100) * chartH;
            return { x: x, y: y };
        }

        // Smooth bezier line path
        function smoothLine(pts) {
            if (pts.length === 0) return '';
            var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
            for (var i = 1; i < pts.length; i++) {
                var prev = pts[i - 1], cur = pts[i];
                var midX = (prev.x + cur.x) / 2;
                d += ' C ' + midX.toFixed(1) + ' ' + prev.y.toFixed(1) +
                     ' ' + midX.toFixed(1) + ' ' + cur.y.toFixed(1) +
                     ' ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1);
            }
            return d;
        }

        // Smooth bezier area path (closed to baseline)
        function smoothArea(pts) {
            if (pts.length === 0) return '';
            var d = 'M ' + pts[0].x.toFixed(1) + ' ' + baseY;
            d += ' L ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
            for (var i = 1; i < pts.length; i++) {
                var prev = pts[i - 1], cur = pts[i];
                var midX = (prev.x + cur.x) / 2;
                d += ' C ' + midX.toFixed(1) + ' ' + prev.y.toFixed(1) +
                     ' ' + midX.toFixed(1) + ' ' + cur.y.toFixed(1) +
                     ' ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1);
            }
            d += ' L ' + pts[pts.length - 1].x.toFixed(1) + ' ' + baseY + ' Z';
            return d;
        }

        // Build point arrays (only months with data or up to current)
        var greenPts = [], goldPts = [];
        for (var i = 0; i < n; i++) {
            var v = values[i] || 0;
            var v2 = values2 ? (values2[i] || 0) : 0;
            var isFuture = currentIdx >= 0 && i > currentIdx;
            if (isFuture && v === 0) continue;
            greenPts.push(toPoint(i, v));
            if (values2) goldPts.push(toPoint(i, v2));
        }

        var defs = '';
        // Glow filter for peak dots
        defs += '<filter id="glowF" x="-50%" y="-50%" width="200%" height="200%">';
        defs += '<feGaussianBlur stdDeviation="3" result="blur"/>';
        defs += '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs += '</filter>';
        // Green gradient fill
        defs += '<linearGradient id="greenWaveFill" x1="0" y1="0" x2="0" y2="1">';
        defs += '<stop offset="0%" stop-color="' + _greenMid + '" stop-opacity="0.25"/>';
        defs += '<stop offset="100%" stop-color="' + _greenMid + '" stop-opacity="0.02"/>';
        defs += '</linearGradient>';
        // Gold gradient fill
        defs += '<linearGradient id="goldWaveFill" x1="0" y1="0" x2="0" y2="1">';
        defs += '<stop offset="0%" stop-color="' + _gold + '" stop-opacity="0.15"/>';
        defs += '<stop offset="100%" stop-color="' + _gold + '" stop-opacity="0.01"/>';
        defs += '</linearGradient>';

        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">';
        svg += '<defs>' + defs + '</defs>';

        // Baseline
        svg += '<line x1="' + padL + '" y1="' + baseY + '" x2="' + (W - padR) + '" y2="' + baseY + '" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>';

        // Green area + line
        if (greenPts.length > 1) {
            svg += '<path d="' + smoothArea(greenPts) + '" fill="url(#greenWaveFill)"/>';
            svg += '<path d="' + smoothLine(greenPts) + '" fill="none" stroke="' + _greenMid + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        }

        // Gold area + dashed line
        if (goldPts.length > 1) {
            svg += '<path d="' + smoothArea(goldPts) + '" fill="url(#goldWaveFill)"/>';
            svg += '<path d="' + smoothLine(goldPts) + '" fill="none" stroke="' + _gold + '" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round"/>';
        }

        // Current month dashed vertical line
        if (currentIdx >= 0 && currentIdx < n) {
            var curPt = toPoint(currentIdx, values[currentIdx] || 0);
            svg += '<line x1="' + curPt.x.toFixed(1) + '" y1="' + curPt.y.toFixed(1) + '" x2="' + curPt.x.toFixed(1) + '" y2="' + baseY + '" stroke="' + _greenDeep + '" stroke-width="1" stroke-dasharray="3 2" opacity="0.4"/>';
        }

        // Dots and labels for each month
        var gIdx = 0;
        for (var j = 0; j < n; j++) {
            var val = values[j] || 0;
            var val2 = values2 ? (values2[j] || 0) : 0;
            var isFut = currentIdx >= 0 && j > currentIdx;
            var hasData = val > 0 || (isFut === false);
            var pt = toPoint(j, val);

            // Month labels along baseline
            var lblColor = (j === currentIdx) ? _greenDeep : (isFut ? '#C8C8C8' : _textMuted);
            var lblWeight = (j === currentIdx) ? '700' : '500';
            var lblX = pt.x;
            svg += '<text x="' + lblX.toFixed(1) + '" y="' + (baseY + 14) + '" text-anchor="middle" font-family="\'Noto Kufi Arabic\',sans-serif" font-size="7" font-weight="' + lblWeight + '" fill="' + lblColor + '">' + months[j] + '</text>';

            if (isFut && val === 0) continue;

            // Green dots
            var isPeak = val >= 95;
            var isLow = val > 0 && val < 30;
            var dotR = isPeak ? 5 : (isLow ? 4 : 3.5);
            var dotColor = isLow ? _red : _greenMid;

            if (isPeak) {
                svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + dotR + '" fill="' + dotColor + '" filter="url(#glowF)"/>';
            } else {
                svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + dotR + '" fill="' + dotColor + '"/>';
            }
            // White inner ring
            svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (dotR - 1.5) + '" fill="white"/>';
            svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (dotR - 2.5) + '" fill="' + dotColor + '"/>';

            // Percentage label above dot (all months with data)
            if (val > 0) {
                var lblY = pt.y - dotR - 4;
                var pctColor = isLow ? _red : (isPeak ? _greenDeep : '#6B7B8D');
                var pctWeight = isPeak ? '700' : '600';
                var pctSize = isPeak ? '9' : '7.5';
                svg += '<text x="' + pt.x.toFixed(1) + '" y="' + lblY.toFixed(1) + '" text-anchor="middle" font-family="Rubik,sans-serif" font-size="' + pctSize + '" font-weight="' + pctWeight + '" fill="' + pctColor + '">' + val + '%</text>';
            }

            // Gold congregation dot
            if (values2 && val2 > 0) {
                var gPt = toPoint(j, val2);
                svg += '<circle cx="' + gPt.x.toFixed(1) + '" cy="' + gPt.y.toFixed(1) + '" r="2" fill="' + _gold + '"/>';
                svg += '<circle cx="' + gPt.x.toFixed(1) + '" cy="' + gPt.y.toFixed(1) + '" r="0.8" fill="white"/>';
            }
        }

        svg += '</svg>';
        container.innerHTML = svg;

        // Legend
        if (data.legend) {
            var leg = document.createElement('div');
            leg.style.cssText = 'display:flex;justify-content:center;gap:16px;margin-top:8px;padding:4px 0;';
            var l1 = data.legend[0] ? data.legend[0].label : '';
            var l2 = data.legend[1] ? data.legend[1].label : '';
            leg.innerHTML =
                '<div style="display:flex;align-items:center;gap:5px;">' +
                '<svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="' + _greenMid + '" stroke-width="2.5" stroke-linecap="round"/></svg>' +
                '<span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + l1 + '</span></div>' +
                (l2 ? '<div style="display:flex;align-items:center;gap:5px;">' +
                '<svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="' + _gold + '" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/></svg>' +
                '<span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + l2 + '</span></div>' : '');
            container.appendChild(leg);
        }
    }

    // ==================== 4. PRAYER DUAL BARS ====================

    function prayerDualBars(container, data) {
        container.innerHTML = '';
        var prayers = data.prayers || [];
        var showCong = data.showCongregation !== false;

        var gradients = {
            '#D4A0A7': 'linear-gradient(135deg,#E8B4B8,#D4A0A7)',
            '#E8B84A': 'linear-gradient(135deg,#F0C75E,#E8B84A)',
            '#D4943A': 'linear-gradient(135deg,#E8A849,#D4943A)',
            '#B0664A': 'linear-gradient(135deg,#C47A5A,#B0664A)',
            '#4A5A7A': 'linear-gradient(135deg,#5B6B8A,#4A5A7A)'
        };

        // Card container
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--card-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:20px;border:1px solid var(--border, rgba(0,0,0,0.04));padding:16px 14px;';

        // Header
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:16px;position:relative;';
        hdr.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;color:var(--primary);">compare_arrows</span>' +
            '<span style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0635\u0644\u0648\u0627\u062a</span>';
        card.appendChild(hdr);
        // Info button: report 5 (fard) or 10 (sunnah)
        if (window.App.InfoTooltips) {
            var dualReportId = showCong ? 5 : 10;
            window.App.InfoTooltips.attachToHeader(dualReportId, hdr);
        }

        prayers.forEach(function(p, idx) {
            var block = document.createElement('div');
            block.style.cssText = idx < prayers.length - 1 ? 'margin-bottom:14px;' : '';

            // Row 1: prayer header
            var row1 = document.createElement('div');
            row1.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

            var iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width:28px;height:28px;min-width:28px;border-radius:8px;background:' + (gradients[p.color] || p.color) + ';display:flex;align-items:center;justify-content:center;';
            var iconSpan = document.createElement('span');
            iconSpan.className = 'material-symbols-rounded';
            iconSpan.style.cssText = 'font-size:14px;color:#fff;font-variation-settings:"FILL" 1;';
            iconSpan.textContent = p.icon;
            iconDiv.appendChild(iconSpan);
            row1.appendChild(iconDiv);

            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-primary);font-family:"Noto Kufi Arabic",sans-serif;flex:1;';
            nameSpan.textContent = p.name;
            row1.appendChild(nameSpan);

            var pctSpan = document.createElement('span');
            pctSpan.style.cssText = 'font-size:16px;font-weight:800;color:' + p.color + ';font-family:Rubik,sans-serif;';
            pctSpan.textContent = p.completion + '%';
            row1.appendChild(pctSpan);

            block.appendChild(row1);

            // Row 2: completion bar
            var row2 = document.createElement('div');
            row2.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';

            var lbl2 = document.createElement('span');
            lbl2.style.cssText = 'font-size:8px;color:var(--text-muted);width:32px;text-align:right;font-family:"Noto Kufi Arabic",sans-serif;';
            lbl2.textContent = '\u0627\u0644\u0625\u0646\u062c\u0627\u0632';
            row2.appendChild(lbl2);

            var track2 = document.createElement('div');
            track2.style.cssText = 'flex:1;height:8px;border-radius:4px;background:rgba(128,128,128,0.08);overflow:hidden;';
            var fill2 = document.createElement('div');
            fill2.style.cssText = 'width:' + (p.completion || 0) + '%;height:100%;border-radius:4px;background:linear-gradient(270deg,' + p.color + ',' + p.color + 'aa);';
            track2.appendChild(fill2);
            row2.appendChild(track2);

            block.appendChild(row2);

            // Row 3: congregation bar (fard only)
            if (showCong) {
                var row3 = document.createElement('div');
                row3.style.cssText = 'display:flex;align-items:center;gap:6px;';

                var lbl3 = document.createElement('span');
                lbl3.style.cssText = 'font-size:8px;color:var(--text-muted);width:32px;text-align:right;font-family:"Noto Kufi Arabic",sans-serif;';
                lbl3.textContent = '\u0627\u0644\u062c\u0645\u0627\u0639\u0629';
                row3.appendChild(lbl3);

                var track3 = document.createElement('div');
                track3.style.cssText = 'flex:1;height:6px;border-radius:3px;background:rgba(128,128,128,0.06);overflow:hidden;';
                var fill3 = document.createElement('div');
                fill3.style.cssText = 'width:' + (p.congregation || 0) + '%;height:100%;border-radius:3px;background:linear-gradient(270deg,var(--accent),var(--accent-light));';
                track3.appendChild(fill3);
                row3.appendChild(track3);

                var val3 = document.createElement('span');
                val3.style.cssText = 'font-size:10px;font-weight:700;color:var(--accent);width:30px;text-align:left;font-family:Rubik,sans-serif;';
                val3.textContent = (p.congregation || 0) + '%';
                row3.appendChild(val3);

                block.appendChild(row3);
            }

            card.appendChild(block);
        });

        container.appendChild(card);
    }

    // ==================== 6. WEEKLY RHYTHM (Sorted horizontal bars) ====================

    function weeklyRhythm(container, data) {
        container.innerHTML = '';
        var days = data.days || [];
        if (days.length !== 7) return;

        var sorted = days.slice().sort(function(a, b) { return b.value - a.value; });
        var avg = Math.round(days.reduce(function(s, d) { return s + d.value; }, 0) / 7);

        function getColor(v) {
            return v >= 90 ? tv('--primary') : v >= 75 ? tv('--primary-mid') : v >= 60 ? tv('--accent') : tv('--danger');
        }

        // Card
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--card-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:20px;border:1px solid var(--border, rgba(0,0,0,0.04));padding:16px 14px;';

        // Header
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;position:relative;';
        var hdrLeft = document.createElement('div');
        hdrLeft.style.cssText = 'display:flex;align-items:center;gap:6px;position:relative;';
        hdrLeft.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;color:var(--primary);">date_range</span>' +
            '<span style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">\u0646\u0645\u0637 \u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064a</span>';
        // Info button: report 6
        if (window.App.InfoTooltips) {
            window.App.InfoTooltips.attachToHeader(6, hdrLeft);
        }
        hdr.appendChild(hdrLeft);
        var badge = document.createElement('div');
        badge.style.cssText = 'padding:3px 10px;border-radius:8px;background:rgba(var(--primary-rgb),0.08);';
        badge.innerHTML = '<span style="font-size:12px;font-weight:800;color:var(--primary);font-family:Rubik,sans-serif;">' + avg + '%</span>';
        hdr.appendChild(badge);
        card.appendChild(hdr);

        // Bars
        sorted.forEach(function(d, i) {
            var isTop = i === 0;
            var color = getColor(d.value);

            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;' +
                (i < 6 ? 'margin-bottom:8px;' : '') +
                'padding:' + (isTop ? '6px 8px' : '2px 8px') + ';' +
                'border-radius:' + (isTop ? '10px' : '0') + ';' +
                'background:' + (isTop ? 'rgba(var(--primary-rgb),0.03)' : 'transparent') + ';';

            // Day name
            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'width:42px;font-size:11px;font-weight:' + (isTop ? '800' : '600') + ';color:' + (isTop ? 'var(--primary)' : 'var(--text-primary)') + ';text-align:right;flex-shrink:0;font-family:"Noto Kufi Arabic",sans-serif;';
            nameSpan.textContent = d.name;
            row.appendChild(nameSpan);

            // Bar track
            var track = document.createElement('div');
            track.style.cssText = 'flex:1;height:12px;border-radius:6px;background:rgba(128,128,128,0.06);overflow:hidden;';
            var fill = document.createElement('div');
            fill.style.cssText = 'width:' + d.value + '%;height:100%;border-radius:6px;background:linear-gradient(270deg,' + color + ',' + color + 'bb);';
            track.appendChild(fill);
            row.appendChild(track);

            // Percentage
            var pctSpan = document.createElement('span');
            pctSpan.style.cssText = 'width:32px;font-size:12px;font-weight:800;color:' + color + ';font-family:Rubik,sans-serif;text-align:left;flex-shrink:0;';
            pctSpan.textContent = d.value + '%';
            row.appendChild(pctSpan);

            card.appendChild(row);
        });

        container.appendChild(card);
    }

    // ==================== 7. SIMPLE BAR CHART (for Qada, Fasting, etc.) ====================

    function barChart(container, data) {
        container.innerHTML = '';
        var items = data.items || []; // [{label, value, color}]
        var maxVal = data.maxVal || Math.max.apply(null, items.map(function(i) { return i.value; })) || 1;

        var barW = 32, gap = 12, padL = 10, padR = 10, padT = 25, padB = 40;
        var W = padL + items.length * (barW + gap) - gap + padR;
        var H = 180;
        var plotH = H - padT - padB;
        var children = [];

        items.forEach(function(item, i) {
            var x = padL + i * (barW + gap);
            var h = (item.value / maxVal) * plotH;
            var y = padT + plotH - h;

            // Bar
            var gradId = 'barG' + i;
            var grad = el('linearGradient', { id: gradId, x1: '0', y1: '1', x2: '0', y2: '0' });
            grad.appendChild(el('stop', { offset: '0%', 'stop-color': item.color + 'aa' }));
            grad.appendChild(el('stop', { offset: '100%', 'stop-color': item.color }));
            children.push(el('defs', {}, [grad]));
            children.push(el('rect', { x: x, y: y, width: barW, height: h, rx: 6, fill: 'url(#' + gradId + ')' }));

            // Value above
            if (item.value > 0) {
                children.push(el('text', { x: x + barW / 2, y: y - 5, 'text-anchor': 'middle', fill: 'var(--text-primary)', 'font-size': '11', 'font-weight': '700', 'font-family': 'Rubik' }, '' + item.value));
            }

            // Label below
            children.push(el('text', { x: x + barW / 2, y: H - 10, 'text-anchor': 'middle', fill: 'var(--text-muted)', 'font-size': '9', 'font-family': 'Noto Kufi Arabic' }, item.label));
        });

        var s = svg(W, H, '0 0 ' + W + ' ' + H, children);
        container.appendChild(s);
    }

    // ==================== PUBLIC API ====================

    return {
        orbitalProgress: orbitalProgress,
        streakFlameBars: streakFlameBars,
        mountainChart: mountainChart,
        prayerDualBars: prayerDualBars,
        weeklyRhythm: weeklyRhythm,
        barChart: barChart
    };
})();
