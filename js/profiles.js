/**
 * Profile System Module
 * Manages user profiles (create, edit, delete, switch)
 * and profile-dependent UI (gender features, header badge, shell bar).
 */
window.App = window.App || {};
window.App.Profiles = (function() {
    var activeProfile = null;
    var selectedGender = '';

    // --------------- helpers ---------------

    function t(key) {
        return window.App.I18n ? window.App.I18n.t(key) : key;
    }

    function showToast(msg, type) {
        if (window.App.UI && window.App.UI.showToast) {
            window.App.UI.showToast(msg, type);
        }
    }

    function showConfirm(msg) {
        if (window.App.UI && window.App.UI.showConfirm) {
            return window.App.UI.showConfirm(msg);
        }
        return Promise.resolve(confirm(msg));
    }

    // --------------- storage ---------------

    function getProfiles() {
        return JSON.parse(localStorage.getItem('salah_profiles') || '[]');
    }

    function saveProfiles(profiles) {
        localStorage.setItem('salah_profiles', JSON.stringify(profiles));
    }

    function getActiveProfileId() {
        return localStorage.getItem('salah_active_profile');
    }

    function setActiveProfileId(id) {
        localStorage.setItem('salah_active_profile', id);
    }

    function generateProfileId() {
        return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    function getProfilePrefix() {
        return activeProfile ? activeProfile.id + '_' : '';
    }

    // --------------- profile screen ---------------

    function showProfileScreen() {
        var overlay = document.getElementById('profileOverlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = '-' + window.scrollY + 'px';
        // Hide shell bar and tab bar behind overlay
        var shellBar = document.getElementById('shellBar');
        var tabBar = document.getElementById('tabBar');
        if (shellBar) shellBar.style.zIndex = '1';
        if (tabBar) tabBar.style.zIndex = '1';
        renderProfilesList();
        hideProfileForm();

        // Hide old data actions if profiles already exist
        var profiles = getProfiles();
        var oldDataSection = document.getElementById('oldDataActions');
        if (oldDataSection && profiles.length > 0) {
            oldDataSection.style.display = 'none';
        } else if (oldDataSection) {
            oldDataSection.style.display = '';
        }
    }

    function hideProfileScreen() {
        var overlay = document.getElementById('profileOverlay');
        if (overlay) overlay.classList.add('hidden');
        var scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        // Restore shell bar and tab bar
        var shellBar = document.getElementById('shellBar');
        var tabBar = document.getElementById('tabBar');
        if (shellBar) shellBar.style.zIndex = '10000';
        if (tabBar) tabBar.style.zIndex = '10000';
    }

    // --------------- render ---------------

    function renderProfilesList() {
        var list = document.getElementById('profilesList');
        if (!list) return;
        var profiles = getProfiles();
        list.innerHTML = '';

        profiles.forEach(function(p) {
            var isChild = p.age < 12;
            var avatarClass, avatarIcon, genderLabel;

            if (p.gender === 'female') {
                avatarClass = isChild ? 'child-female' : 'female';
                avatarIcon = isChild ? '<span class="material-symbols-rounded" style="font-size:22px;">face</span>' : '<span class="material-symbols-rounded" style="font-size:22px;">person</span>';
                genderLabel = isChild ? t('child_f') : t('female');
            } else {
                avatarClass = isChild ? 'child-male' : 'male';
                avatarIcon = isChild ? '<span class="material-symbols-rounded" style="font-size:22px;">face</span>' : '<span class="material-symbols-rounded" style="font-size:22px;">person</span>';
                genderLabel = isChild ? t('child_m') : t('male');
            }

            var card = document.createElement('div');
            card.className = 'profile-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.innerHTML =
                '<div class="profile-avatar ' + avatarClass + '">' + avatarIcon + '</div>' +
                '<div class="profile-info">' +
                    '<div class="name">' + p.name + '</div>' +
                    '<div class="details">' + genderLabel + ' \u00B7 ' + p.age + ' ' + t('years_old') + '</div>' +
                '</div>' +
                '<div class="profile-actions">' +
                    '<button class="profile-action-btn edit" onclick="event.stopPropagation();editProfile(\'' + p.id + '\')" title="\u062A\u0639\u062F\u064A\u0644"><span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>' +
                    '<button class="profile-action-btn delete" onclick="event.stopPropagation();deleteProfile(\'' + p.id + '\')" title="\u062D\u0630\u0641"><span class="material-symbols-rounded" style="font-size:16px;">delete_outline</span></button>' +
                '</div>';
            card.onclick = function() { selectProfile(p.id); };
            list.appendChild(card);
        });
    }

    // --------------- gender selection ---------------

    function selectGender(gender) {
        selectedGender = gender;
        document.querySelectorAll('.gender-option').forEach(function(opt) {
            opt.classList.toggle('selected', opt.dataset.gender === gender);
        });
    }

    // --------------- profile form ---------------

    function showProfileForm(editId) {
        var form = document.getElementById('profileForm');
        if (form) form.classList.add('show');
        var addBtn = document.getElementById('addProfileBtn');
        if (addBtn) addBtn.style.display = 'none';

        var editIdEl = document.getElementById('editProfileId');
        var nameEl = document.getElementById('profileName');
        var ageEl = document.getElementById('profileAge');

        if (editId) {
            var profiles = getProfiles();
            var p = profiles.find(function(x) { return x.id === editId; });
            if (p) {
                if (editIdEl) editIdEl.value = p.id;
                if (nameEl) nameEl.value = p.name;
                if (ageEl) ageEl.value = p.age;
                selectGender(p.gender);
            }
        } else {
            if (editIdEl) editIdEl.value = '';
            if (nameEl) nameEl.value = '';
            if (ageEl) ageEl.value = '';
            selectedGender = '';
            document.querySelectorAll('.gender-option').forEach(function(o) {
                o.classList.remove('selected');
            });
        }
    }

    function hideProfileForm() {
        var form = document.getElementById('profileForm');
        if (form) form.classList.remove('show');
        var addBtn = document.getElementById('addProfileBtn');
        if (addBtn) addBtn.style.display = '';
    }

    // --------------- save ---------------

    function saveProfile() {
        try {
            var name = document.getElementById('profileName').value.trim();
            var age = parseInt(document.getElementById('profileAge').value);
            var gender = selectedGender;
            var editId = document.getElementById('editProfileId').value;

            if (!name) { showToast(t('enter_valid_name'), 'warning'); return; }
            if (!age || age < 5) { showToast(t('enter_valid_age'), 'warning'); return; }
            if (!gender) { showToast(t('select_gender'), 'warning'); return; }

            var profiles = getProfiles();

            // Check duplicate name
            var existing = profiles.find(function(p) { return p.name === name && p.id !== editId; });
            if (existing) { showToast(t('duplicate_name'), 'warning'); return; }

            // Profile limit
            if (!editId && profiles.length >= 10) { showToast(t('profile_limit'), 'warning'); return; }

            if (editId) {
                var idx = profiles.findIndex(function(p) { return p.id === editId; });
                if (idx >= 0) {
                    profiles[idx].name = name;
                    profiles[idx].age = age;
                    profiles[idx].gender = gender;
                }
            } else {
                var newId = generateProfileId();
                profiles.push({
                    id: newId,
                    name: name,
                    age: age,
                    gender: gender
                });

                saveProfiles(profiles);
                hideProfileForm();

                // Auto-migrate old data (without profile prefix) to this new profile
                var keysToMigrate = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.startsWith('salah_tracker_') && !key.includes('p_')) {
                        keysToMigrate.push(key);
                    }
                }

                if (keysToMigrate.length > 0) {
                    keysToMigrate.forEach(function(key) {
                        var newKey = key.replace('salah_tracker_', 'salah_tracker_' + newId + '_');
                        localStorage.setItem(newKey, localStorage.getItem(key));
                    });
                }

                // Check for pending import
                var pendingImport = localStorage.getItem('_pending_import');
                if (pendingImport) {
                    try {
                        var imported = JSON.parse(pendingImport);
                        importAndConvertToHijri(imported, newId);

                        if (imported['_theme']) {
                            localStorage.setItem('salah_tracker_theme', imported['_theme']);
                        }

                        localStorage.removeItem('_pending_import');
                    } catch(e) {
                        console.error('Pending import error:', e);
                    }
                }

                // Auto-select this new profile
                renderProfilesList();
                selectProfile(newId);
                return;
            }

            saveProfiles(profiles);
            hideProfileForm();
            renderProfilesList();
        } catch(err) {
            console.error('saveProfile error:', err);
            showToast('Error: ' + err.message, 'error');
        }
    }

    // --------------- edit / delete ---------------

    function editProfile(id) {
        showProfileForm(id);
    }

    function deleteProfile(id) {
        return showConfirm(t('confirm_delete_profile')).then(function(confirmed) {
            if (!confirmed) return;

            var profiles = getProfiles();
            profiles = profiles.filter(function(p) { return p.id !== id; });
            saveProfiles(profiles);

            // Delete all data for this profile
            var keysToDelete = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.includes(id)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(function(k) { localStorage.removeItem(k); });

            if (getActiveProfileId() === id) {
                localStorage.removeItem('salah_active_profile');
                activeProfile = null;
            }

            renderProfilesList();

            if (profiles.length === 0) {
                showProfileScreen();
            }
        });
    }

    // --------------- select / switch ---------------

    function selectProfile(id) {
        var profiles = getProfiles();
        activeProfile = profiles.find(function(p) { return p.id === id; });
        if (!activeProfile) return;

        // Sync to Storage module so key generation uses correct profile prefix
        window.App.Storage.setActiveProfile(activeProfile);

        setActiveProfileId(id);
        hideProfileScreen();
        applyProfileUI();

        // Reload all data for this profile with Hijri dates
        var todayH = window.App.Hijri.getTodayHijri();
        var hMonth = todayH.month;
        var hYear = todayH.year;

        // Sync year/month to ALL modules that track it
        window.App.Storage.setCurrentMonth(hMonth);
        window.App.Storage.setCurrentYear(hYear);
        window.App.Hijri.setCurrentHijriMonth(hMonth);
        window.App.Hijri.setCurrentHijriYear(hYear);

        var el;
        el = document.getElementById('fardTrackerMonthSelect');  if (el) el.value = hMonth;
        el = document.getElementById('fardTrackerYearInput');     if (el) el.value = hYear;
        el = document.getElementById('sunnahTrackerMonthSelect'); if (el) el.value = hMonth;
        el = document.getElementById('sunnahTrackerYearInput');   if (el) el.value = hYear;
        el = document.getElementById('fardDashboardYear');        if (el) el.value = hYear;
        el = document.getElementById('fardYearlyYear');           if (el) el.value = hYear;
        el = document.getElementById('sunnahDashboardYear');      if (el) el.value = hYear;
        el = document.getElementById('sunnahYearlyYear');         if (el) el.value = hYear;

        // Detect active section + sub-view BEFORE modal close animation
        var _activeSection = 'fard';
        var _activeSectionEl = document.querySelector('.section.active');
        if (_activeSectionEl) {
            if (_activeSectionEl.id === 'sunnahSection') _activeSection = 'sunnah';
            else if (_activeSectionEl.id === 'fastingSection') _activeSection = 'fasting';
            else if (_activeSectionEl.id === 'azkarSection') _activeSection = 'azkar';
        }
        var _activeSubView = 'tracker';
        if (_activeSectionEl) {
            var _activeViewEl = _activeSectionEl.querySelector('.view.active');
            if (_activeViewEl && _activeViewEl.id) {
                var _vid = _activeViewEl.id;
                if (_vid.indexOf('Dashboard') !== -1) _activeSubView = 'dashboard';
                else if (_vid.indexOf('Yearly') !== -1) _activeSubView = 'yearly';
                else if (_vid.indexOf('Qada') !== -1) _activeSubView = 'qada';
                else if (_vid.indexOf('Ramadan') !== -1) _activeSubView = 'ramadan';
                else if (_vid.indexOf('Voluntary') !== -1) _activeSubView = 'voluntary';
            }
        }

        // Wait for profile modal close animation to finish, then re-render
        setTimeout(function() {
            window.App.Storage.loadAllData('fard');
            window.App.Storage.loadAllData('sunnah');

            if (_activeSection === 'fard' || _activeSection === 'sunnah') {
                if (window.updateTrackerView) window.updateTrackerView(_activeSection);
                if (_activeSubView === 'dashboard' && window.updateDashboard) {
                    window.updateDashboard(_activeSection);
                } else if (_activeSubView === 'yearly' && window.updateYearlyView) {
                    window.updateYearlyView(_activeSection);
                } else if (_activeSubView === 'qada' && window.App.QadaTracker) {
                    window.App.QadaTracker.render();
                }
            } else if (_activeSection === 'fasting') {
                if (_activeSubView === 'dashboard' && window.App.Fasting) {
                    window.App.Fasting.updateFastingDashboard();
                } else if (_activeSubView === 'ramadan' && window.updateFastingView) {
                    window.updateFastingView();
                } else if (window.updateVoluntaryFasting) {
                    window.updateVoluntaryFasting();
                }
            } else if (_activeSection === 'azkar') {
                if (_activeSubView === 'dashboard' && window.updateAzkarDashboard) {
                    window.updateAzkarDashboard();
                } else if (_activeSubView === 'yearly' && window.updateAzkarYearly) {
                    window.updateAzkarYearly();
                } else if (window.switchAzkarView) {
                    window.switchAzkarView('tracker');
                }
            }

            if (typeof window.updateShellBar === 'function') window.updateShellBar();
            if (window.App.QadaTracker) window.App.QadaTracker.injectTab();
            if (window.startPrayerTimesMonitor) window.startPrayerTimesMonitor();
        }, 300);

        // Trigger onboarding AFTER profile loaded and UI rendered
        setTimeout(function() {
            if (window.App.Onboarding && window.App.Onboarding.shouldShow()) {
                window.App.Onboarding.start();
            }
        }, 1200);
    }

    // --------------- MERGED applyProfileUI ---------------
    // Original logic + _origApplyProfileUI override that calls updateShellBar

    function applyProfileUI() {
        if (!activeProfile) return;

        var isChild = activeProfile.age < 12;
        var avatarClass, materialIcon;

        if (activeProfile.gender === 'female' && activeProfile.age >= 12) {
            avatarClass = isChild ? 'child-female' : 'female';
            materialIcon = isChild ? 'face' : 'person';
        } else {
            avatarClass = isChild ? 'child-male' : 'male';
            materialIcon = isChild ? 'face' : 'person';
        }

        // Show profile badge in header (may not exist in all layouts)
        var badge = document.getElementById('profileBadge');
        if (badge) {
            badge.style.display = 'flex';
            var avatarEl = document.getElementById('badgeAvatar');
            if (avatarEl) {
                avatarEl.className = 'badge-avatar ' + avatarClass;
                avatarEl.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">' + materialIcon + '</span>';
            }
            var nameEl = document.getElementById('badgeName');
            if (nameEl) nameEl.textContent = activeProfile.name;
        }

        // Show/hide female features
        var isFemale = activeProfile.gender === 'female' && activeProfile.age >= 12;

        var fardExBar = document.getElementById('fardExemptBar');
        var sunExBar = document.getElementById('sunnahExemptBar');
        if (fardExBar) fardExBar.style.display = isFemale ? 'flex' : 'none';
        if (sunExBar) sunExBar.style.display = isFemale ? 'flex' : 'none';
        // Show Ramadan exempt features for females
        var ramadanBtn = document.getElementById('ramadanViewBtn');
        if (ramadanBtn) ramadanBtn.style.display = '';
        var fastExemptLegend = document.getElementById('fastingExemptLegend');
        if (fastExemptLegend) fastExemptLegend.style.display = isFemale ? '' : 'none';
        var fastExemptStat = document.getElementById('fastingExemptStat');
        if (fastExemptStat) fastExemptStat.style.display = isFemale ? '' : 'none';
        var fastingExemptBar = document.getElementById('fastingExemptBar');
        if (fastingExemptBar) fastingExemptBar.style.display = isFemale ? 'flex' : 'none';

        // Show period dashboard for females
        var fardPeriodDash = document.getElementById('fardPeriodDashboard');
        if (fardPeriodDash) fardPeriodDash.style.display = isFemale ? '' : 'none';

        // Reset exempt modes
        if (window.App.Female && window.App.Female.getExemptMode) {
            var em = window.App.Female.getExemptMode();
            em.fard = false;
            em.sunnah = false;
        }
        var fardCheck = document.getElementById('fardExemptMode');
        var sunnahCheck = document.getElementById('sunnahExemptMode');
        if (fardCheck) fardCheck.checked = false;
        if (sunnahCheck) sunnahCheck.checked = false;

        if (window.App.Female && window.App.Female.updateExemptInfo) {
            window.App.Female.updateExemptInfo('fard');
            window.App.Female.updateExemptInfo('sunnah');
        }

        // From _origApplyProfileUI override: update shell bar
        if (typeof window.updateShellBar === 'function') {
            window.updateShellBar();
        }
    }

    // --------------- public API ---------------

    return {
        getActiveProfile: function() { return activeProfile; },
        setActiveProfile: function(p) { activeProfile = p; },
        getProfiles: getProfiles,
        saveProfiles: saveProfiles,
        getActiveProfileId: getActiveProfileId,
        setActiveProfileId: setActiveProfileId,
        generateProfileId: generateProfileId,
        getProfilePrefix: getProfilePrefix,
        showProfileScreen: showProfileScreen,
        hideProfileScreen: hideProfileScreen,
        renderProfilesList: renderProfilesList,
        selectGender: selectGender,
        showProfileForm: showProfileForm,
        hideProfileForm: hideProfileForm,
        saveProfile: saveProfile,
        editProfile: editProfile,
        deleteProfile: deleteProfile,
        selectProfile: selectProfile,
        applyProfileUI: applyProfileUI
    };
})();

// Backward compat for inline onclick handlers in HTML
window.showProfileScreen = window.App.Profiles.showProfileScreen;
window.selectProfile = window.App.Profiles.selectProfile;
window.editProfile = window.App.Profiles.editProfile;
window.deleteProfile = window.App.Profiles.deleteProfile;
window.saveProfile = window.App.Profiles.saveProfile;
window.hideProfileForm = window.App.Profiles.hideProfileForm;
window.showProfileForm = window.App.Profiles.showProfileForm;
window.selectGender = window.App.Profiles.selectGender;
