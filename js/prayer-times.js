// prayer-times.js — Prayer Times API module (Aladhan)
window.App = window.App || {};
window.App.PrayerTimes = (function() {
    'use strict';

    // ==================== STATE ====================
    var prayerTimesData = null;
    var prayerTimesDate = '';
    var userLocation = null;
    var notifSentToday = {};
    var prayerTimesCheckInterval = null;

    // Cross-module refs (resolved at call time)
    function t(key) { return window.App.I18n.t(key); }
    function getCurrentLang() { return window.App.I18n.getCurrentLang(); }
    function showToast(msg, type) { return window.App.UI.showToast(msg, type); }
    function getPrayerApiMap() { return window.App.Config.PRAYER_API_MAP; }

    // ==================== STORAGE ====================

    function getPrayerTimesFromStorage() {
        try {
            var stored = localStorage.getItem('salah_prayer_times');
            if (stored) {
                var data = JSON.parse(stored);
                var todayStr = new Date().toISOString().split('T')[0];
                if (data.date === todayStr) {
                    return data;
                }
            }
        } catch(e) {}
        return null;
    }

    function savePrayerTimesToStorage(data) {
        try {
            localStorage.setItem('salah_prayer_times', JSON.stringify(data));
        } catch(e) {}
    }

    // ==================== GEOLOCATION ====================

    function getUserLocation() {
        return new Promise(function(resolve, reject) {
            // Check cached location
            try {
                var cached = localStorage.getItem('salah_user_location');
                if (cached) {
                    var loc = JSON.parse(cached);
                    // Use cached for up to 7 days
                    if (loc.timestamp && (Date.now() - loc.timestamp) < 7 * 86400000) {
                        resolve(loc);
                        return;
                    }
                }
            } catch(e) {}

            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    var loc = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('salah_user_location', JSON.stringify(loc));
                    resolve(loc);
                },
                function(err) {
                    reject(err.message);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 }
            );
        });
    }

    // Reverse geocode coordinates to city name + country code
    function reverseGeocode(lat, lng) {
        return fetch(
            'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=' + getCurrentLang(),
            { headers: { 'User-Agent': 'PrayerTrackerPWA/1.0' } }
        ).then(function(response) {
            return response.json();
        }).then(function(json) {
            var cityName = '';
            var countryName = '';
            var countryCode = '';
            if (json && json.address) {
                cityName = json.address.city || json.address.town || json.address.village || json.address.state || '';
                countryName = json.address.country || '';
                countryCode = (json.address.country_code || '').toUpperCase();
            }
            // Combined display string (backward compat)
            var city = cityName;
            if (cityName && countryName) {
                city = cityName + '\u060C ' + countryName;
            } else if (!cityName && countryName) {
                city = countryName;
            }

            if (city) {
                localStorage.setItem('salah_city_name', JSON.stringify({ lat: lat, lng: lng, city: city, cityName: cityName, countryName: countryName, countryCode: countryCode }));
            }
            return { city: city, cityName: cityName, countryName: countryName, countryCode: countryCode };
        }).catch(function(e) {
            console.error('Reverse geocode error:', e);

            // Check cache as fallback
            try {
                var cached = localStorage.getItem('salah_city_name');
                if (cached) {
                    var data = JSON.parse(cached);
                    if (Math.abs(data.lat - lat) < 0.05 && Math.abs(data.lng - lng) < 0.05) {
                        return { city: data.city, cityName: data.cityName || '', countryName: data.countryName || '', countryCode: data.countryCode || '' };
                    }
                }
            } catch(e2) {}

            return { city: '', cityName: '', countryName: '', countryCode: '' };
        });
    }

    // ==================== CALCULATION METHOD ====================

    // Auto-detect prayer calculation method based on country
    // https://aladhan.com/calculation-methods
    function getPrayerMethod(countryCode) {
        var cc = (countryCode || '').toUpperCase();

        // Egypt -> Egyptian General Authority of Survey (Fajr 19.5, Isha 17.5)
        if (cc === 'EG') return 5;

        // Saudi Arabia, Bahrain -> Umm al-Qura (Fajr 18.5, Isha 90min)
        if (cc === 'SA' || cc === 'BH') return 4;

        // Kuwait -> Kuwait method
        if (cc === 'KW') return 9;

        // Qatar -> Qatar method
        if (cc === 'QA') return 10;

        // UAE, Oman, Yemen -> Gulf Region
        if (cc === 'AE' || cc === 'OM' || cc === 'YE') return 8;

        // Turkey -> Diyanet
        if (cc === 'TR') return 13;

        // Jordan, Palestine, Syria, Iraq, Libya, Sudan, Algeria, Morocco, Tunisia, Lebanon
        // -> Muslim World League (Fajr 18, Isha 17)
        if (['JO','PS','SY','IQ','LY','SD','DZ','MA','TN','LB'].indexOf(cc) >= 0) return 3;

        // Pakistan, Afghanistan, Bangladesh -> Karachi
        if (cc === 'PK' || cc === 'AF' || cc === 'BD') return 1;

        // Singapore, Malaysia, Indonesia -> Singapore
        if (cc === 'SG' || cc === 'MY' || cc === 'ID') return 11;

        // France -> UOIF
        if (cc === 'FR') return 12;

        // Russia -> Spiritual Admin of Muslims of Russia
        if (cc === 'RU') return 14;

        // North America -> ISNA
        if (cc === 'US' || cc === 'CA') return 2;

        // Default -> Muslim World League
        return 3;
    }

    // ==================== VALIDATION ====================

    function _validatePrayerTimesResponse(json) {
        if (!json || !json.data || !json.data.timings) {
            console.warn('Invalid prayer times response: missing data.timings');
            return false;
        }
        var timings = json.data.timings;
        var required = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        for (var i = 0; i < required.length; i++) {
            var time = timings[required[i]];
            if (!time || typeof time !== 'string') {
                console.warn('Invalid prayer time for ' + required[i]);
                return false;
            }
            var cleanTime = time.split(' ')[0];
            if (!/^\d{1,2}:\d{2}$/.test(cleanTime)) {
                console.warn('Invalid time format for ' + required[i] + ': ' + time);
                return false;
            }
        }
        return true;
    }

    // ==================== RATE LIMITING ====================

    var _lastFetchTime = 0;
    var _lastFetchPromise = null;
    var MIN_FETCH_INTERVAL = 60 * 1000; // 60 seconds

    // ==================== FETCH ====================

    function fetchPrayerTimes(forceRefresh) {
        // Check cache first
        if (!forceRefresh) {
            var cached = getPrayerTimesFromStorage();
            if (cached) {
                prayerTimesData = cached;
                renderPrayerTimes();
                return Promise.resolve();
            }
        }

        // Rate limit: return last promise if called too soon
        var now = Date.now();
        if (_lastFetchPromise && (now - _lastFetchTime) < MIN_FETCH_INTERVAL) {
            return _lastFetchPromise;
        }
        _lastFetchTime = now;

        _lastFetchPromise = getUserLocation().then(function(loc) {
            userLocation = loc;

            // Get city name and country code first
            return reverseGeocode(loc.lat, loc.lng).then(function(geoResult) {
                var countryCode = geoResult.countryCode || '';
                var cityName = geoResult.city || '';

                // Auto-detect calculation method based on country
                var method = getPrayerMethod(countryCode);

                var today = new Date();
                var dateStr = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + today.getFullYear();

                // Aladhan API with auto-detected method
                var url = 'https://api.aladhan.com/v1/timings/' + dateStr + '?latitude=' + loc.lat + '&longitude=' + loc.lng + '&method=' + method;

                return fetch(url).then(function(response) {
                    return response.json();
                }).then(function(json) {
                    if (json.code === 200 && _validatePrayerTimesResponse(json)) {
                        var timings = json.data.timings;

                        var methodName = json.data.meta && json.data.meta.method ? json.data.meta.method.name : '';

                        prayerTimesData = {
                            date: today.toISOString().split('T')[0],
                            timings: {
                                fajr: timings.Fajr,
                                sunrise: timings.Sunrise,
                                dhuhr: timings.Dhuhr,
                                asr: timings.Asr,
                                maghrib: timings.Maghrib,
                                isha: timings.Isha
                            },
                            location: cityName || (json.data.meta ? json.data.meta.timezone : ''),
                            cityName: geoResult.cityName || '',
                            countryName: geoResult.countryName || '',
                            method: method,
                            methodName: methodName,
                            countryCode: countryCode,
                            lat: loc.lat,
                            lng: loc.lng
                        };
                        savePrayerTimesToStorage(prayerTimesData);
                        renderPrayerTimes();
                    }
                });
            });
        }).catch(function(e) {
            console.error('Prayer times fetch error:', e);
            // Try to show cached data even if expired
            var cached = getPrayerTimesFromStorage();
            if (cached) {
                prayerTimesData = cached;
                renderPrayerTimes();
            } else {
                // Show error in the bar
                var currentLang = getCurrentLang();
                var nextInfo = document.getElementById('nextPrayerInfo');
                if (nextInfo) {
                    nextInfo.textContent = currentLang === 'ar'
                        ? '\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A \u2014 \u0627\u0636\u063A\u0637 \u0623\u0648 \u0641\u0639\u0651\u0644 \u0627\u0644\u0645\u0648\u0642\u0639'
                        : 'Could not load times \u2014 tap refresh or enable location';
                    nextInfo.style.color = 'var(--danger)';
                }
            }
        });

        return _lastFetchPromise;
    }

    // ==================== TIME HELPERS ====================

    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        // Handle "(EET)" or other timezone suffixes
        var clean = timeStr.replace(/\s*\(.*\)/, '').trim();
        var parts = clean.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    function formatTime12h(timeStr) {
        if (!timeStr) return '--:--';
        var clean = timeStr.replace(/\s*\(.*\)/, '').trim();
        var parts = clean.split(':');
        var h = parseInt(parts[0]);
        var m = parts[1];
        var currentLang = getCurrentLang();
        var ampm = h >= 12 ? (currentLang === 'ar' ? '\u0645' : 'PM') : (currentLang === 'ar' ? '\u0635' : 'AM');
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        return h + ':' + m + ' ' + ampm;
    }

    // ==================== PRAYER STATE ====================

    function getCurrentPrayerState() {
        if (!prayerTimesData || !prayerTimesData.timings) return null;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var timings = prayerTimesData.timings;

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        var active = null;
        var next = null;

        for (var i = 0; i < prayers.length; i++) {
            var nextIdx = (i + 1) < prayers.length ? i + 1 : null;
            var endTime = nextIdx !== null ? prayers[nextIdx].time : 1440;

            if (nowMin >= prayers[i].time && nowMin < endTime) {
                active = prayers[i].id;
                if (nextIdx !== null) next = prayers[nextIdx];
                break;
            }
        }

        // Before Fajr
        if (nowMin < prayers[0].time) {
            next = prayers[0];
        }

        return { active: active, next: next, prayers: prayers, nowMin: nowMin };
    }

    // ==================== LOCATION BAR ====================

    function countryCodeToFlag(cc) {
        if (!cc || cc.length !== 2) return '';
        var first = 0x1F1E6 + cc.charCodeAt(0) - 65;
        var second = 0x1F1E6 + cc.charCodeAt(1) - 65;
        // Use surrogate pairs for code points above 0xFFFF
        function toSurrogate(cp) {
            if (cp <= 0xFFFF) return String.fromCharCode(cp);
            cp -= 0x10000;
            return String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        }
        return toSurrogate(first) + toSurrogate(second);
    }

    function updateLocationBar() {
        var bar = document.getElementById('locationBar');
        var text = document.getElementById('locationBarText');
        if (!bar || !text) return;

        if (!prayerTimesData) {
            bar.style.display = 'none';
            return;
        }

        var city = prayerTimesData.cityName || '';
        var country = prayerTimesData.countryName || '';
        var cc = prayerTimesData.countryCode || '';
        var flag = countryCodeToFlag(cc);

        // Build display: "City, Country 🇪🇬" or just "Country 🇪🇬"
        var display = '';
        if (city && country) {
            display = city + '\u060C ' + country;
        } else if (city) {
            display = city;
        } else if (country) {
            display = country;
        } else if (prayerTimesData.location) {
            display = prayerTimesData.location;
        }

        if (!display) {
            bar.style.display = 'none';
            return;
        }

        if (flag) {
            display = '<span class="location-bar-flag">' + flag + '</span> ' + display;
        }
        text.innerHTML = display;
        bar.style.display = '';
    }

    function refreshLocation() {
        var btn = document.getElementById('locationBarRefresh');
        if (btn) btn.classList.add('refreshing');
        refreshPrayerTimes();
        // Remove spin after 2s
        setTimeout(function() {
            if (btn) btn.classList.remove('refreshing');
        }, 2000);
    }

    // ==================== RENDER ====================

    function getPrayerName(id) {
        var map = {
            'fajr': 'prayer_fajr', 'dhuhr': 'prayer_dhuhr', 'asr': 'prayer_asr',
            'maghrib': 'prayer_maghrib', 'isha': 'prayer_isha',
            'tahajjud': 'prayer_tahajjud', 'sunnah-fajr': 'prayer_sunnah_fajr',
            'duha': 'prayer_duha', 'sunnah-dhuhr': 'prayer_sunnah_dhuhr',
            'sunnah-asr': 'prayer_sunnah_asr', 'sunnah-maghrib': 'prayer_sunnah_maghrib',
            'sunnah-isha': 'prayer_sunnah_isha', 'witr': 'prayer_witr'
        };
        return map[id] ? t(map[id]) : id;
    }

    function renderPrayerTimes() {
        var bar = document.getElementById('prayerTimesBar');
        var grid = document.getElementById('prayerTimesGrid');
        if (!bar || !grid || !prayerTimesData || !prayerTimesData.timings) return;

        grid.innerHTML = '';

        var state = getCurrentPrayerState();
        var timings = prayerTimesData.timings;
        var currentLang = getCurrentLang();

        var prayersList = [
            { id: 'fajr', name: getPrayerName('fajr'), time: timings.fajr, matIcon: 'wb_twilight' },
            { id: 'dhuhr', name: getPrayerName('dhuhr'), time: timings.dhuhr, matIcon: 'wb_sunny' },
            { id: 'asr', name: getPrayerName('asr'), time: timings.asr, matIcon: 'partly_cloudy_day' },
            { id: 'maghrib', name: getPrayerName('maghrib'), time: timings.maghrib, matIcon: 'wb_twilight' },
            { id: 'isha', name: getPrayerName('isha'), time: timings.isha, matIcon: 'dark_mode' }
        ];

        prayersList.forEach(function(p) {
            var item = document.createElement('div');
            item.className = 'pt-item';

            if (state) {
                if (p.id === state.active) {
                    item.classList.add('active-prayer');
                } else {
                    var pMin = parseTimeToMinutes(p.time);
                    if (pMin < state.nowMin && p.id !== state.active) {
                        item.classList.add('passed-prayer');
                    }
                }
            }

            var formatted = formatTime12h(p.time);
            var timeParts = formatted.split(' ');
            var timeNum = timeParts[0] || formatted;
            var period = timeParts[1] || '';

            item.innerHTML =
                '<div class="pt-icon"><span class="material-symbols-rounded">' + p.matIcon + '</span></div>' +
                '<div class="pt-name">' + p.name + '</div>' +
                '<div class="pt-time">' + timeNum + (period ? ' <span class="pt-period">' + period + '</span>' : '') + '</div>';
            grid.appendChild(item);
        });

        // Next prayer countdown
        var nextInfo = document.getElementById('nextPrayerInfo');
        if (nextInfo && state && state.next) {
            var diff = state.next.time - state.nowMin;
            if (diff < 0) diff += 1440;
            var hrs = Math.floor(diff / 60);
            var mins = diff % 60;
            var nextName = getPrayerName(state.next.id);
            if (hrs > 0) {
                nextInfo.textContent = '\u23F3 ' + (currentLang === 'ar' ? '\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629: ' : 'Next: ') + nextName + ' ' + (currentLang === 'ar' ? '\u0628\u0639\u062F ' : 'in ') + hrs + (currentLang === 'ar' ? ' \u0633\u0627\u0639\u0629 \u0648 ' : 'h ') + mins + (currentLang === 'ar' ? ' \u062F\u0642\u064A\u0642\u0629' : 'm');
            } else {
                nextInfo.textContent = '\u23F3 ' + (currentLang === 'ar' ? '\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629: ' : 'Next: ') + nextName + ' ' + (currentLang === 'ar' ? '\u0628\u0639\u062F ' : 'in ') + mins + (currentLang === 'ar' ? ' \u062F\u0642\u064A\u0642\u0629' : ' min');
            }
        } else if (nextInfo) {
            nextInfo.textContent = '';
        }

        // Location display
        var locEl = document.getElementById('prayerTimesLocation');
        if (locEl && prayerTimesData.location) {
            locEl.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">location_on</span> ' + prayerTimesData.location;
        }

        // Update location bar
        updateLocationBar();

        // Update next prayer countdown card
        renderNextPrayerCountdown();
    }

    // ==================== NEXT PRAYER COUNTDOWN BAR ====================

    var countdownInterval = null;

    function renderNextPrayerCountdown() {
        var bar = document.getElementById('prayerCountdownBar');
        if (!bar) return;

        var state = getCurrentPrayerState();
        if (!state || !state.prayers || state.prayers.length === 0) {
            bar.classList.add('countdown-hidden');
            if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
            return;
        }

        // Determine next prayer — after Isha, wrap to Fajr
        var next = state.next;
        if (!next) {
            next = state.prayers[0]; // Fajr (next day)
        }
        if (!next) {
            bar.classList.add('countdown-hidden');
            if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
            return;
        }

        var nameEl = document.getElementById('countdownPrayerName');
        var timeEl = document.getElementById('countdownTimeDisplay');
        var arcEl = document.getElementById('countdownArcFill');
        var labelEl = bar.querySelector('.countdown-label');
        if (!nameEl || !timeEl || !arcEl) return;

        // Prayer name + label (i18n)
        nameEl.textContent = getPrayerName(next.id);
        if (labelEl) {
            var currentLang = getCurrentLang();
            labelEl.textContent = currentLang === 'ar' ? '\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629' : 'Next Prayer';
        }

        // Show bar
        bar.classList.remove('countdown-hidden');

        // Compute total prayer window (seconds) for arc progress
        var nextMin = next.time;
        var totalWindowSec;
        if (!state.active) {
            // Before Fajr: window = Isha yesterday -> Fajr
            var ishaMin = state.prayers[4].time;
            var fajrMin = state.prayers[0].time;
            totalWindowSec = ((1440 - ishaMin) + fajrMin) * 60;
        } else {
            // Find active prayer start time
            var activeMin = 0;
            for (var pi = 0; pi < state.prayers.length; pi++) {
                if (state.prayers[pi].id === state.active) {
                    activeMin = state.prayers[pi].time;
                    break;
                }
            }
            var windowMin = nextMin - activeMin;
            if (windowMin <= 0) windowMin += 1440;
            totalWindowSec = windowMin * 60;
        }

        // Clear previous interval
        if (countdownInterval) clearInterval(countdownInterval);

        var CIRC = 131.95; // 2 * PI * 21

        function updateCountdown() {
            var now = new Date();
            var nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            var targetSec = next.time * 60;
            var diff = targetSec - nowSec;
            if (diff < 0) diff += 86400;

            // Format H:MM:SS
            var h = Math.floor(diff / 3600);
            var m = Math.floor((diff % 3600) / 60);
            var s = diff % 60;
            timeEl.textContent = h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

            // Update arc progress
            var progress = totalWindowSec > 0 ? (diff / totalWindowSec) : 0;
            if (progress > 1) progress = 1;
            if (progress < 0) progress = 0;
            arcEl.style.strokeDashoffset = (CIRC * (1 - progress)).toFixed(2);

            // Urgency classes
            var totalMin = Math.floor(diff / 60);
            bar.classList.remove('countdown-warning', 'countdown-urgent');
            if (totalMin < 10) {
                bar.classList.add('countdown-urgent');
            } else if (totalMin < 30) {
                bar.classList.add('countdown-warning');
            }

            // When countdown reaches zero, re-fetch state
            if (diff <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                setTimeout(function() { renderNextPrayerCountdown(); }, 1000);
                setTimeout(function() {
                    if (window.App.MissedPrayerNotif && window.App.MissedPrayerNotif.checkAndShow) {
                        window.App.MissedPrayerNotif.checkAndShow();
                    }
                }, 5000);
            }
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    }

    // ==================== REFRESH ====================

    function refreshPrayerTimes() {
        localStorage.removeItem('salah_city_name');
        localStorage.removeItem('salah_user_location');
        localStorage.removeItem('salah_prayer_times');
        prayerTimesData = null;
        fetchPrayerTimes(true);
        var currentLang = getCurrentLang();
        showToast(currentLang === 'ar' ? '\u062C\u0627\u0631\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0627\u0642\u064A\u062A \u0648\u0627\u0644\u0645\u0648\u0642\u0639...' : 'Refreshing times & location...', 'info');
    }

    // ==================== MONITOR ====================

    function startPrayerTimesMonitor() {
        // Fetch prayer times
        fetchPrayerTimes(false);

        // Render display every 30 seconds (notifications are handled by notifications.js monitor)
        if (prayerTimesCheckInterval) clearInterval(prayerTimesCheckInterval);
        prayerTimesCheckInterval = setInterval(function() {
            renderPrayerTimes();

            // At midnight, reset and refetch
            var now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 1) {
                notifSentToday = {};
                fetchPrayerTimes(true);
            }
        }, 30000);
    }

    // ==================== PUBLIC API ====================

    return {
        // State accessors
        getData: function() { return prayerTimesData; },
        setData: function(d) { prayerTimesData = d; },
        getLocation: function() { return userLocation; },
        getNotifSentToday: function() { return notifSentToday; },
        resetNotifSentToday: function() { notifSentToday = {}; },

        // Core functions
        getPrayerTimesFromStorage: getPrayerTimesFromStorage,
        savePrayerTimesToStorage: savePrayerTimesToStorage,
        getUserLocation: getUserLocation,
        reverseGeocode: reverseGeocode,
        getPrayerMethod: getPrayerMethod,
        fetchPrayerTimes: fetchPrayerTimes,
        parseTimeToMinutes: parseTimeToMinutes,
        formatTime12h: formatTime12h,
        getCurrentPrayerState: getCurrentPrayerState,
        getPrayerName: getPrayerName,
        renderPrayerTimes: renderPrayerTimes,
        renderNextPrayerCountdown: renderNextPrayerCountdown,
        refreshPrayerTimes: refreshPrayerTimes,
        startPrayerTimesMonitor: startPrayerTimesMonitor,
        updateLocationBar: updateLocationBar,
        refreshLocation: refreshLocation,
        countryCodeToFlag: countryCodeToFlag
    };
})();

// ==================== BACKWARD COMPAT ====================
window.refreshPrayerTimes = window.App.PrayerTimes.refreshPrayerTimes;
window.fetchPrayerTimes = window.App.PrayerTimes.fetchPrayerTimes;
window.renderPrayerTimes = window.App.PrayerTimes.renderPrayerTimes;
window.startPrayerTimesMonitor = window.App.PrayerTimes.startPrayerTimesMonitor;
window.getCurrentPrayerState = window.App.PrayerTimes.getCurrentPrayerState;
window.parseTimeToMinutes = window.App.PrayerTimes.parseTimeToMinutes;
window.formatTime12h = window.App.PrayerTimes.formatTime12h;
window.getPrayerName = window.App.PrayerTimes.getPrayerName;
window.getUserLocation = window.App.PrayerTimes.getUserLocation;
window.reverseGeocode = window.App.PrayerTimes.reverseGeocode;
window.getPrayerMethod = window.App.PrayerTimes.getPrayerMethod;
window.refreshLocation = window.App.PrayerTimes.refreshLocation;
