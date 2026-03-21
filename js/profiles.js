// ==================== PROFILE MANAGEMENT MODULE ====================
import { state, fardPrayers, sunnahPrayers } from './state.js';
import { getTodayHijri } from './hijri-calendar.js';

// ==================== PROFILE STORAGE ====================

export function getProfiles() {
    return JSON.parse(localStorage.getItem('salah_profiles') || '[]');
}

export function saveProfiles(profiles) {
    localStorage.setItem('salah_profiles', JSON.stringify(profiles));
}

export function getActiveProfileId() {
    return localStorage.getItem('salah_active_profile');
}

export function setActiveProfileId(id) {
    localStorage.setItem('salah_active_profile', id);
}

export function generateProfileId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

export function getProfilePrefix() {
    return state.activeProfile ? state.activeProfile.id + '_' : '';
}

// Storage key with profile prefix + Hijri format
export function getStorageKey(type, month, year) {
    return `salah_tracker_${getProfilePrefix()}${type}_h${year}_${month}`;
}

// ==================== PROFILE UI ====================

export function showProfileScreen() {
    document.getElementById('profileOverlay').classList.remove('hidden');
    // Save scroll position before locking
    state._savedScrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    // Hide shell bar and tab bar behind overlay
    const shellBar = document.getElementById('shellBar');
    const tabBar = document.getElementById('tabBar');
    if (shellBar) shellBar.style.zIndex = '1';
    if (tabBar) tabBar.style.zIndex = '1';
    renderProfilesList();
    hideProfileForm();

    // Hide old data actions if profiles already exist
    const profiles = getProfiles();
    const oldDataSection = document.getElementById('oldDataActions');
    if (oldDataSection && profiles.length > 0) {
        oldDataSection.style.display = 'none';
    } else if (oldDataSection) {
        oldDataSection.style.display = '';
    }
}

export function hideProfileScreen() {
    document.getElementById('profileOverlay').classList.add('hidden');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    // Restore scroll position
    if (state._savedScrollY) {
        window.scrollTo(0, state._savedScrollY);
    }
    // Restore shell bar and tab bar
    const shellBar = document.getElementById('shellBar');
    const tabBar = document.getElementById('tabBar');
    if (shellBar) shellBar.style.zIndex = '10000';
    if (tabBar) tabBar.style.zIndex = '10000';
}

export function renderProfilesList() {
    const list = document.getElementById('profilesList');
    const profiles = getProfiles();
    list.innerHTML = '';

    profiles.forEach(p => {
        const isChild = p.age < 12;
        let avatarClass, avatarIcon, genderLabel;

        if (p.gender === 'female') {
            avatarClass = isChild ? 'child-female' : 'female';
            avatarIcon = isChild ? '👧' : '👩';
            genderLabel = isChild ? t('child_f') : t('female');
        } else {
            avatarClass = isChild ? 'child-male' : 'male';
            avatarIcon = isChild ? '👦' : '👨';
            genderLabel = isChild ? t('child_m') : t('male');
        }

        const card = document.createElement('div');
        card.className = 'profile-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="profile-avatar ${avatarClass}">${avatarIcon}</div>
            <div class="profile-info">
                <div class="name">${p.name}</div>
                <div class="details">${genderLabel} · ${p.age} ${t('years_old')}</div>
            </div>
            <div class="profile-actions">
                <button class="profile-action-btn edit" onclick="event.stopPropagation();editProfile('${p.id}')" title="تعديل">✏️</button>
                <button class="profile-action-btn delete" onclick="event.stopPropagation();deleteProfile('${p.id}')" title="حذف">🗑️</button>
            </div>
        `;
        card.onclick = () => selectProfile(p.id);
        list.appendChild(card);
    });
}

export function selectGender(gender) {
    state.selectedGender = gender;
    document.querySelectorAll('.gender-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.gender === gender);
    });
}

export function showProfileForm(editId) {
    const form = document.getElementById('profileForm');
    form.classList.add('show');
    document.getElementById('addProfileBtn').style.display = 'none';

    if (editId) {
        const profiles = getProfiles();
        const p = profiles.find(x => x.id === editId);
        if (p) {
            document.getElementById('editProfileId').value = p.id;
            document.getElementById('profileName').value = p.name;
            document.getElementById('profileAge').value = p.age;
            selectGender(p.gender);
        }
    } else {
        document.getElementById('editProfileId').value = '';
        document.getElementById('profileName').value = '';
        document.getElementById('profileAge').value = '';
        state.selectedGender = '';
        document.querySelectorAll('.gender-option').forEach(o => o.classList.remove('selected'));
    }
}

export function hideProfileForm() {
    document.getElementById('profileForm').classList.remove('show');
    document.getElementById('addProfileBtn').style.display = '';
}

export function saveProfile() {
    try {
        const name = document.getElementById('profileName').value.trim();
        const age = parseInt(document.getElementById('profileAge').value);
        const gender = state.selectedGender;
        const editId = document.getElementById('editProfileId').value;

        if (!name) { showToast(t('enter_valid_name'), 'warning'); return; }
        if (!age || age < 5) { showToast(t('enter_valid_age'), 'warning'); return; }
        if (!gender) { showToast(t('select_gender'), 'warning'); return; }

        let profiles = getProfiles();

        // Check duplicate name
        const existing = profiles.find(p => p.name === name && p.id !== editId);
        if (existing) { showToast(t('duplicate_name'), 'warning'); return; }

        // Profile limit
        if (!editId && profiles.length >= 10) { showToast(t('profile_limit'), 'warning'); return; }

        if (editId) {
            const idx = profiles.findIndex(p => p.id === editId);
            if (idx >= 0) {
                profiles[idx].name = name;
                profiles[idx].age = age;
                profiles[idx].gender = gender;
            }
        } else {
            const newId = generateProfileId();
            profiles.push({
                id: newId,
                name, age, gender
            });

            saveProfiles(profiles);
            hideProfileForm();

            // Auto-migrate old data (without profile prefix) to this new profile
            const keysToMigrate = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('salah_tracker_') && !key.includes('p_')) {
                    keysToMigrate.push(key);
                }
            }

            if (keysToMigrate.length > 0) {
                keysToMigrate.forEach(key => {
                    const newKey = key.replace('salah_tracker_', `salah_tracker_${newId}_`);
                    localStorage.setItem(newKey, localStorage.getItem(key));
                });
            }

            // Check for pending import
            const pendingImport = localStorage.getItem('_pending_import');
            if (pendingImport) {
                try {
                    const imported = JSON.parse(pendingImport);
                    importAndConvertToHijri(imported, newId);

                    if (imported['_theme']) {
                        localStorage.setItem('salah_tracker_theme', imported['_theme']);
                    }

                    localStorage.removeItem('_pending_import');
                } catch(e) {
                    console.log('Pending import error:', e);
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

export function editProfile(id) {
    showProfileForm(id);
}

export async function deleteProfile(id) {
    if (!await showConfirm(t('confirm_delete_profile'))) return;

    let profiles = getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    saveProfiles(profiles);

    // Delete all data for this profile
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(id)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));

    if (getActiveProfileId() === id) {
        localStorage.removeItem('salah_active_profile');
        state.activeProfile = null;
    }

    renderProfilesList();

    if (profiles.length === 0) {
        showProfileScreen();
    }
}

export function selectProfile(id) {
    const profiles = getProfiles();
    state.activeProfile = profiles.find(p => p.id === id);
    if (!state.activeProfile) return;

    setActiveProfileId(id);
    hideProfileScreen();
    applyProfileUI();

    // Reload all data for this profile with Hijri dates
    var todayH = getTodayHijri();
    state.currentHijriMonth = todayH.month;
    state.currentHijriYear = todayH.year;
    state.currentMonth = state.currentHijriMonth;
    state.currentYear = state.currentHijriYear;

    document.getElementById('fardTrackerMonthSelect').value = state.currentHijriMonth;
    document.getElementById('fardTrackerYearInput').value = state.currentHijriYear;
    document.getElementById('sunnahTrackerMonthSelect').value = state.currentHijriMonth;
    document.getElementById('sunnahTrackerYearInput').value = state.currentHijriYear;
    document.getElementById('fardDashboardYear').value = state.currentHijriYear;
    document.getElementById('fardYearlyYear').value = state.currentHijriYear;
    document.getElementById('sunnahDashboardYear').value = state.currentHijriYear;
    document.getElementById('sunnahYearlyYear').value = state.currentHijriYear;

    loadAllData('fard');
    loadAllData('sunnah');
    switchSection('fard');
    setTimeout(startPrayerTimesMonitor, 500);
}

export function applyProfileUI() {
    if (!state.activeProfile) return;

    const isChild = state.activeProfile.age < 12;
    let avatarClass, avatarIcon;

    if (state.activeProfile.gender === 'female' && state.activeProfile.age >= 12) {
        avatarClass = isChild ? 'child-female' : 'female';
        avatarIcon = isChild ? '👧' : '👩';
    } else {
        avatarClass = isChild ? 'child-male' : 'male';
        avatarIcon = isChild ? '👦' : '👨';
    }

    // Show profile badge in header
    const badge = document.getElementById('profileBadge');
    badge.style.display = 'flex';
    document.getElementById('badgeAvatar').className = 'badge-avatar ' + avatarClass;
    document.getElementById('badgeAvatar').textContent = avatarIcon;
    document.getElementById('badgeName').textContent = state.activeProfile.name;

    // Show/hide female features
    const isFemale = state.activeProfile.gender === 'female' && state.activeProfile.age >= 12;

    document.getElementById('fardExemptBar').style.display = isFemale ? 'flex' : 'none';
    document.getElementById('sunnahExemptBar').style.display = isFemale ? 'flex' : 'none';
    // Show Ramadan exempt features for females
    const ramadanBtn = document.getElementById('ramadanViewBtn');
    if (ramadanBtn) ramadanBtn.style.display = '';
    const fastExemptLegend = document.getElementById('fastingExemptLegend');
    if (fastExemptLegend) fastExemptLegend.style.display = isFemale ? '' : 'none';
    const fastExemptStat = document.getElementById('fastingExemptStat');
    if (fastExemptStat) fastExemptStat.style.display = isFemale ? '' : 'none';
    const fastingExemptBar = document.getElementById('fastingExemptBar');
    if (fastingExemptBar) fastingExemptBar.style.display = isFemale ? 'flex' : 'none';

    // Show period dashboard for females
    const fardPeriodDash = document.getElementById('fardPeriodDashboard');
    if (fardPeriodDash) fardPeriodDash.style.display = isFemale ? '' : 'none';

    // Reset exempt modes
    state.exemptMode = { fard: false, sunnah: false };
    const fardCheck = document.getElementById('fardExemptMode');
    const sunnahCheck = document.getElementById('sunnahExemptMode');
    if (fardCheck) fardCheck.checked = false;
    if (sunnahCheck) sunnahCheck.checked = false;

    updateExemptInfo('fard');
    updateExemptInfo('sunnah');
}

// ==================== WINDOW EXPORTS ====================
window.showProfileScreen = showProfileScreen;
window.hideProfileScreen = hideProfileScreen;
window.renderProfilesList = renderProfilesList;
window.selectGender = selectGender;
window.showProfileForm = showProfileForm;
window.hideProfileForm = hideProfileForm;
window.saveProfile = saveProfile;
window.editProfile = editProfile;
window.deleteProfile = deleteProfile;
window.selectProfile = selectProfile;
window.applyProfileUI = applyProfileUI;
window.getProfiles = getProfiles;
window.saveProfiles = saveProfiles;
window.getActiveProfileId = getActiveProfileId;
window.setActiveProfileId = setActiveProfileId;
window.generateProfileId = generateProfileId;
window.getProfilePrefix = getProfilePrefix;
window.getStorageKey = getStorageKey;
