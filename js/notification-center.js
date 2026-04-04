/* Prayer Tracker PWA — notification-center.js (Notification Center UI) */
window.App = window.App || {};
window.App.NotificationCenter = (function() {
    'use strict';

    var STORAGE_KEY = 'salah_notification_settings';

    var DEFAULT_SETTINGS = {
        masterEnabled: true,
        prePrayer: { enabled: true, minutes: 10 },
        missedPrayer: { enabled: true, delayMinutes: 30 },
        athan: {
            enabled: false,
            prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }
        },
        fasting: {
            enabled: false,
            monThur: true,
            ayyamBeed: true,
            ashura: true,
            dhulHijjah: false
        },
        dailyInsight: { enabled: false, time: 'after_isha' },
        weeklyInsight: { enabled: false, day: 'friday' }
    };

    var _settings = null;

    // ==================== HELPERS ====================

    function _lang() {
        return (window.App.I18n && window.App.I18n.getCurrentLang)
            ? window.App.I18n.getCurrentLang()
            : (localStorage.getItem('salah_lang') || 'ar');
    }

    function _isAr() { return _lang() === 'ar'; }

    function _escapeHTML(str) {
        if (typeof str !== 'string') return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ==================== STORAGE ====================

    function _mergeDefaults(saved, defaults) {
        var result = JSON.parse(JSON.stringify(defaults));
        for (var key in saved) {
            if (saved.hasOwnProperty(key)) {
                if (typeof saved[key] === 'object' && saved[key] !== null && !Array.isArray(saved[key])
                    && typeof defaults[key] === 'object' && defaults[key] !== null) {
                    result[key] = _mergeDefaults(saved[key], defaults[key]);
                } else {
                    result[key] = saved[key];
                }
            }
        }
        return result;
    }

    function _migrateFromLegacy() {
        var s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        // Pre-prayer (before athan)
        if (localStorage.getItem('salah_notif_before_enabled') === 'true') s.prePrayer.enabled = true;
        else if (localStorage.getItem('salah_notif_before_enabled') === 'false') s.prePrayer.enabled = false;
        var bm = parseInt(localStorage.getItem('salah_notif_before_minutes'));
        if (bm) s.prePrayer.minutes = bm;
        // Missed prayer (after athan)
        if (localStorage.getItem('salah_notif_after_enabled') === 'true') s.missedPrayer.enabled = true;
        else if (localStorage.getItem('salah_notif_after_enabled') === 'false') s.missedPrayer.enabled = false;
        var am = parseInt(localStorage.getItem('salah_notif_after_minutes'));
        if (am) s.missedPrayer.delayMinutes = am;
        // Athan
        if (localStorage.getItem('salah_athan_sound_enabled') === 'true') s.athan.enabled = true;
        var ap = null;
        try { ap = JSON.parse(localStorage.getItem('salah_athan_prayers')); } catch(e) {}
        if (ap && Array.isArray(ap)) {
            var prayers = { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
            for (var i = 0; i < ap.length; i++) { if (prayers.hasOwnProperty(ap[i])) prayers[ap[i]] = true; }
            s.athan.prayers = prayers;
        }
        // Fasting
        if (localStorage.getItem('salah_fasting_notif') === 'true') s.fasting.enabled = true;
        // Daily insight
        if (localStorage.getItem('salah_insight_enabled') === 'true') s.dailyInsight.enabled = true;
        return s;
    }

    function _loadSettings() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                _settings = _mergeDefaults(JSON.parse(raw), DEFAULT_SETTINGS);
            } else {
                // First time: migrate from legacy individual keys
                _settings = _migrateFromLegacy();
                _saveSettings();
            }
        } catch(e) {
            _settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
        return _settings;
    }

    function _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
        } catch(e) {
            // localStorage full
        }
        if (window.App.Notifications && window.App.Notifications.onSettingsChanged) {
            window.App.Notifications.onSettingsChanged(_settings);
        }
    }

    // ==================== CARD DEFINITIONS ====================

    function _getCardDefs() {
        var ar = _isAr();
        return [
            {
                id: 'prePrayer',
                icon: 'notifications',
                iconClass: 'nc-icon-blue',
                title: ar ? 'تنبيه قبل الصلاة' : 'Pre-Prayer Reminder',
                desc: ar ? 'تذكير قبل دخول وقت الصلاة' : 'Reminder before prayer time',
                subType: 'chips',
                subLabel: ar ? 'التنبيه قبل الأذان بـ' : 'Remind before Athan by',
                subOptions: [
                    { value: 5, label: ar ? '5 د' : '5m' },
                    { value: 10, label: ar ? '10 د' : '10m' },
                    { value: 15, label: ar ? '15 د' : '15m' },
                    { value: 30, label: ar ? '30 د' : '30m' }
                ],
                getEnabled: function() { return _settings.prePrayer.enabled; },
                setEnabled: function(v) { _settings.prePrayer.enabled = v; },
                getSubValue: function() { return _settings.prePrayer.minutes; },
                setSubValue: function(v) { _settings.prePrayer.minutes = v; },
                getStatusText: function() {
                    if (!_settings.prePrayer.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    return (ar ? 'قبل ' : 'Before ') + _settings.prePrayer.minutes + (ar ? ' دقيقة' : ' min');
                }
            },
            {
                id: 'missedPrayer',
                icon: 'notification_important',
                iconClass: 'nc-icon-red',
                title: ar ? 'صلاة لم تُسجّل' : 'Missed Prayer',
                desc: ar ? 'تنبيه عند عدم تسجيل صلاة بعد انتهاء وقتها' : 'Alert when a prayer is not logged after its time',
                subType: 'chips',
                subLabel: ar ? 'التنبيه بعد انتهاء الوقت بـ' : 'Alert after prayer time by',
                subOptions: [
                    { value: 30, label: ar ? '30 د' : '30m' },
                    { value: 60, label: ar ? '60 د' : '60m' }
                ],
                getEnabled: function() { return _settings.missedPrayer.enabled; },
                setEnabled: function(v) { _settings.missedPrayer.enabled = v; },
                getSubValue: function() { return _settings.missedPrayer.delayMinutes; },
                setSubValue: function(v) { _settings.missedPrayer.delayMinutes = v; },
                getStatusText: function() {
                    if (!_settings.missedPrayer.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    return (ar ? 'بعد ' : 'After ') + _settings.missedPrayer.delayMinutes + (ar ? ' دقيقة' : ' min');
                }
            },
            {
                id: 'athan',
                icon: 'volume_up',
                iconClass: 'nc-icon-purple',
                title: ar ? 'الأذان' : 'Athan',
                desc: ar ? 'تشغيل صوت الأذان عند دخول وقت الصلاة' : 'Play Athan sound at prayer time',
                subType: 'checkboxes',
                subLabel: ar ? 'تفعيل الأذان لـ' : 'Enable Athan for',
                subOptions: [
                    { key: 'fajr', label: ar ? 'الفجر' : 'Fajr' },
                    { key: 'dhuhr', label: ar ? 'الظهر' : 'Dhuhr' },
                    { key: 'asr', label: ar ? 'العصر' : 'Asr' },
                    { key: 'maghrib', label: ar ? 'المغرب' : 'Maghrib' },
                    { key: 'isha', label: ar ? 'العشاء' : 'Isha' }
                ],
                getEnabled: function() { return _settings.athan.enabled; },
                setEnabled: function(v) { _settings.athan.enabled = v; },
                getCheckValue: function(key) { return _settings.athan.prayers[key]; },
                setCheckValue: function(key, v) { _settings.athan.prayers[key] = v; },
                getStatusText: function() {
                    if (!_settings.athan.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    var count = 0;
                    var p = _settings.athan.prayers;
                    for (var k in p) { if (p[k]) count++; }
                    return count + (ar ? ' صلوات' : ' prayers');
                }
            },
            {
                id: 'fasting',
                icon: 'restaurant',
                iconClass: 'nc-icon-orange',
                title: ar ? 'تذكير الصيام' : 'Fasting Reminder',
                desc: ar ? 'تذكير بأيام الصيام المسنونة قبلها بيوم' : 'Remind about Sunnah fasting days',
                subType: 'checkboxes',
                subLabel: ar ? 'تذكيري بصيام' : 'Remind me about',
                subOptions: [
                    { key: 'monThur', label: ar ? 'الاثنين والخميس' : 'Monday & Thursday' },
                    { key: 'ayyamBeed', label: ar ? 'الأيام البيض (13/14/15)' : 'White Days (13/14/15)' },
                    { key: 'ashura', label: ar ? 'عاشوراء (9 و 10 محرم)' : 'Ashura (9 & 10 Muharram)' },
                    { key: 'dhulHijjah', label: ar ? 'أول 9 أيام ذو الحجة' : 'First 9 of Dhul Hijjah' }
                ],
                getEnabled: function() { return _settings.fasting.enabled; },
                setEnabled: function(v) { _settings.fasting.enabled = v; },
                getCheckValue: function(key) { return _settings.fasting[key]; },
                setCheckValue: function(key, v) { _settings.fasting[key] = v; },
                getStatusText: function() {
                    if (!_settings.fasting.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    var count = 0, f = _settings.fasting;
                    if (f.monThur) count++;
                    if (f.ayyamBeed) count++;
                    if (f.ashura) count++;
                    if (f.dhulHijjah) count++;
                    return count + (ar ? ' أنواع' : ' types');
                }
            },
            {
                id: 'dailyInsight',
                icon: 'insights',
                iconClass: 'nc-icon-green',
                title: ar ? 'إحصائية يومية' : 'Daily Insight',
                desc: ar ? 'ملخص يومك — كم صلاة سجلت وكم جماعة' : 'Daily summary of your prayers',
                subType: 'chips',
                subLabel: ar ? 'وقت الإرسال' : 'Send time',
                subOptions: [
                    { value: 'after_isha', label: ar ? 'بعد العشاء بساعة' : '1h after Isha' },
                    { value: 'before_sleep', label: ar ? 'قبل النوم (11 م)' : 'Before sleep (11 PM)' }
                ],
                getEnabled: function() { return _settings.dailyInsight.enabled; },
                setEnabled: function(v) { _settings.dailyInsight.enabled = v; },
                getSubValue: function() { return _settings.dailyInsight.time; },
                setSubValue: function(v) { _settings.dailyInsight.time = v; },
                getStatusText: function() {
                    if (!_settings.dailyInsight.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    var label = _settings.dailyInsight.time === 'after_isha'
                        ? (ar ? 'بعد العشاء' : 'After Isha')
                        : (ar ? '11 م' : '11 PM');
                    return label;
                }
            },
            {
                id: 'weeklyInsight',
                icon: 'calendar_view_month',
                iconClass: 'nc-icon-gold',
                title: ar ? 'إحصائية أسبوعية' : 'Weekly Insight',
                desc: ar ? 'تقرير أسبوعي بنسبة الالتزام والمقارنة' : 'Weekly report comparing with last week',
                subType: 'chips',
                subLabel: ar ? 'يوم الإرسال' : 'Send day',
                subOptions: [
                    { value: 'friday', label: ar ? 'الجمعة' : 'Friday' },
                    { value: 'saturday', label: ar ? 'السبت' : 'Saturday' }
                ],
                getEnabled: function() { return _settings.weeklyInsight.enabled; },
                setEnabled: function(v) { _settings.weeklyInsight.enabled = v; },
                getSubValue: function() { return _settings.weeklyInsight.day; },
                setSubValue: function(v) { _settings.weeklyInsight.day = v; },
                getStatusText: function() {
                    if (!_settings.weeklyInsight.enabled) return ar ? 'غير مفعّل' : 'Disabled';
                    return _settings.weeklyInsight.day === 'friday'
                        ? (ar ? 'الجمعة' : 'Friday')
                        : (ar ? 'السبت' : 'Saturday');
                }
            }
        ];
    }

    // ==================== RENDERING ====================

    function _renderCards() {
        var container = document.getElementById('ncCardsContainer');
        if (!container) return;

        var defs = _getCardDefs();
        var html = '';
        for (var i = 0; i < defs.length; i++) {
            html += _buildCardHTML(defs[i]);
        }
        container.innerHTML = html;
        _updateMasterCount();
        _updateMasterToggle();
        _updateCardDisabledState();
    }

    function _buildCardHTML(def) {
        var enabled = def.getEnabled();
        var statusText = def.getStatusText();
        var statusClass = enabled ? 'active' : 'inactive';

        var h = '<div class="nc-card" id="ncCard_' + def.id + '">';
        h += '<div class="nc-card-header">';
        h += '<div class="nc-card-icon ' + def.iconClass + '"><span class="material-symbols-rounded">' + def.icon + '</span></div>';
        h += '<div class="nc-card-info">';
        h += '<div class="nc-card-title">' + _escapeHTML(def.title) + '</div>';
        h += '<div class="nc-card-desc">' + _escapeHTML(def.desc) + '</div>';
        h += '<div class="nc-status ' + statusClass + '" id="ncStatus_' + def.id + '">';
        h += '<span class="nc-status-dot"></span> ' + _escapeHTML(statusText) + '</div>';
        h += '</div>';
        h += '<div class="nc-toggle' + (enabled ? ' on' : '') + '" onclick="window.App.NotificationCenter.toggleCard(\'' + def.id + '\')" role="switch" tabindex="0">';
        h += '<div class="nc-toggle-dot"></div></div>';
        h += '</div>';

        // Sub-settings
        h += '<div class="nc-sub' + (enabled ? '' : ' hidden') + '" id="ncSub_' + def.id + '">';
        h += '<div class="nc-sub-label">' + _escapeHTML(def.subLabel) + '</div>';

        if (def.subType === 'chips') {
            h += '<div class="nc-chips">';
            for (var j = 0; j < def.subOptions.length; j++) {
                var opt = def.subOptions[j];
                var sel = (def.getSubValue() === opt.value) ? ' selected' : '';
                h += '<div class="nc-chip' + sel + '" onclick="window.App.NotificationCenter.selectChip(\'' + def.id + '\',' + JSON.stringify(opt.value) + ')">';
                h += _escapeHTML(opt.label) + '</div>';
            }
            h += '</div>';
        } else if (def.subType === 'checkboxes') {
            for (var k = 0; k < def.subOptions.length; k++) {
                var chk = def.subOptions[k];
                var checked = def.getCheckValue(chk.key) ? ' checked' : '';
                h += '<div class="nc-check-row" onclick="window.App.NotificationCenter.toggleCheck(\'' + def.id + '\',\'' + chk.key + '\')">';
                h += '<div class="nc-checkbox' + checked + '"><span class="material-symbols-rounded">check</span></div>';
                h += '<span class="nc-check-label">' + _escapeHTML(chk.label) + '</span>';
                h += '</div>';
            }
        }

        h += '</div></div>';
        return h;
    }

    // ==================== INTERACTIONS ====================

    function _findDef(cardId) {
        var defs = _getCardDefs();
        for (var i = 0; i < defs.length; i++) {
            if (defs[i].id === cardId) return defs[i];
        }
        return null;
    }

    function toggleCard(cardId) {
        var def = _findDef(cardId);
        if (!def) return;
        def.setEnabled(!def.getEnabled());
        _saveSettings();
        _renderCards();
    }

    function selectChip(cardId, value) {
        var def = _findDef(cardId);
        if (!def || !def.setSubValue) return;
        def.setSubValue(value);
        _saveSettings();
        _renderCards();
    }

    function toggleCheck(cardId, key) {
        var def = _findDef(cardId);
        if (!def || !def.setCheckValue) return;
        def.setCheckValue(key, !def.getCheckValue(key));
        _saveSettings();
        _renderCards();
    }

    function toggleMaster() {
        _settings.masterEnabled = !_settings.masterEnabled;
        _saveSettings();
        _updateMasterToggle();
        _updateMasterCount();
        _updateCardDisabledState();
    }

    function _updateMasterToggle() {
        var el = document.getElementById('ncMasterToggle');
        if (!el) return;
        if (_settings.masterEnabled) {
            el.classList.add('on');
        } else {
            el.classList.remove('on');
        }
    }

    function _updateMasterCount() {
        var el = document.getElementById('ncMasterCount');
        if (!el) return;
        var ar = _isAr();
        var enabled = 0;
        if (_settings.prePrayer.enabled) enabled++;
        if (_settings.missedPrayer.enabled) enabled++;
        if (_settings.athan.enabled) enabled++;
        if (_settings.fasting.enabled) enabled++;
        if (_settings.dailyInsight.enabled) enabled++;
        if (_settings.weeklyInsight.enabled) enabled++;
        el.textContent = ar
            ? enabled + ' من 6 إشعارات مفعّلة'
            : enabled + ' of 6 notifications enabled';
    }

    function _updateCardDisabledState() {
        var cards = document.querySelectorAll('.nc-card');
        for (var i = 0; i < cards.length; i++) {
            if (_settings.masterEnabled) {
                cards[i].classList.remove('disabled');
            } else {
                cards[i].classList.add('disabled');
            }
        }
    }

    // ==================== OPEN / CLOSE ====================

    function open() {
        _loadSettings();
        var screen = document.getElementById('notificationCenter');
        if (!screen) return;
        screen.style.display = 'block';
        _renderCards();
        document.body.style.overflow = 'hidden';
    }

    function close() {
        var screen = document.getElementById('notificationCenter');
        if (screen) screen.style.display = 'none';
        document.body.style.overflow = '';
    }

    // ==================== PUBLIC API ====================

    function getSettings() {
        if (!_settings) _loadSettings();
        return _settings;
    }

    return {
        open: open,
        close: close,
        toggleCard: toggleCard,
        toggleMaster: toggleMaster,
        selectChip: selectChip,
        toggleCheck: toggleCheck,
        getSettings: getSettings
    };
})();

// Backward compat
window.openNotificationCenter = function() { window.App.NotificationCenter.open(); };
