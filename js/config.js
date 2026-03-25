/**
 * config.js - Prayer Tracker PWA Configuration & Constants
 *
 * Contains all static configuration data: prayer definitions, month names,
 * API mappings, reminder times, and the bilingual translation dictionary.
 */

window.App = window.App || {};

window.App.Config = {

    // ==================== PRAYER DEFINITIONS ====================

    fardPrayers: [
        { id: 'fajr', name: '\u0627\u0644\u0641\u062c\u0631', icon: 'wb_twilight', materialIcon: 'wb_twilight', class: 'fajr', color: '#D4A0A7' },
        { id: 'dhuhr', name: '\u0627\u0644\u0638\u0647\u0631', icon: 'wb_sunny', materialIcon: 'wb_sunny', class: 'dhuhr', color: '#E8B84A' },
        { id: 'asr', name: '\u0627\u0644\u0639\u0635\u0631', icon: 'partly_cloudy_day', materialIcon: 'partly_cloudy_day', class: 'asr', color: '#D4943A' },
        { id: 'maghrib', name: '\u0627\u0644\u0645\u063a\u0631\u0628', icon: 'wb_twilight', materialIcon: 'wb_twilight', class: 'maghrib', color: '#B0664A' },
        { id: 'isha', name: '\u0627\u0644\u0639\u0634\u0627\u0621', icon: 'dark_mode', materialIcon: 'dark_mode', class: 'isha', color: '#4A5A7A' }
    ],

    sunnahPrayers: [
        { id: 'tahajjud', name: '\u0627\u0644\u062a\u0647\u062c\u062f', icon: 'dark_mode', materialIcon: 'dark_mode', class: 'tahajjud', color: '#1e3a8a' },
        { id: 'sunnah-fajr', name: '\u0633\u0646\u0629 \u0627\u0644\u0641\u062c\u0631', icon: 'wb_twilight', materialIcon: 'wb_twilight', class: 'sunnah-fajr', color: '#D4A0A7' },
        { id: 'duha', name: '\u0627\u0644\u0636\u062d\u0649', icon: 'wb_sunny', materialIcon: 'wb_sunny', class: 'duha', color: '#f59e0b' },
        { id: 'sunnah-dhuhr', name: '\u0633\u0646\u0629 \u0627\u0644\u0638\u0647\u0631', icon: 'wb_sunny', materialIcon: 'wb_sunny', class: 'sunnah-dhuhr', color: '#E8B84A' },
        { id: 'sunnah-asr', name: '\u0633\u0646\u0629 \u0627\u0644\u0639\u0635\u0631', icon: 'partly_cloudy_day', materialIcon: 'partly_cloudy_day', class: 'sunnah-asr', color: '#D4943A' },
        { id: 'sunnah-maghrib', name: '\u0633\u0646\u0629 \u0627\u0644\u0645\u063a\u0631\u0628', icon: 'wb_twilight', materialIcon: 'wb_twilight', class: 'sunnah-maghrib', color: '#B0664A' },
        { id: 'sunnah-isha', name: '\u0633\u0646\u0629 \u0627\u0644\u0639\u0634\u0627\u0621', icon: 'dark_mode', materialIcon: 'dark_mode', class: 'sunnah-isha', color: '#4A5A7A' },
        { id: 'witr', name: '\u0627\u0644\u0648\u062a\u0631', icon: 'auto_awesome', materialIcon: 'auto_awesome', class: 'witr', color: '#8b4789' }
    ],

    // ==================== MONTH NAMES ====================

    monthNames: [
        '\u0645\u062d\u0631\u0645', '\u0635\u0641\u0631', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631', '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649', '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629',
        '\u0631\u062c\u0628', '\u0634\u0639\u0628\u0627\u0646', '\u0631\u0645\u0636\u0627\u0646', '\u0634\u0648\u0627\u0644', '\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629', '\u0630\u0648 \u0627\u0644\u062d\u062c\u0629'
    ],

    hijriMonthNamesAr: [
        '\u0645\u062d\u0631\u0645', '\u0635\u0641\u0631', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631',
        '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649', '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629', '\u0631\u062c\u0628', '\u0634\u0639\u0628\u0627\u0646',
        '\u0631\u0645\u0636\u0627\u0646', '\u0634\u0648\u0627\u0644', '\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629', '\u0630\u0648 \u0627\u0644\u062d\u062c\u0629'
    ],

    hijriMonthNamesEn: [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah'
    ],

    // ==================== GREGORIAN MONTH NAMES ====================

    gregorianMonthNamesAr: [
        '\u064A\u0646\u0627\u064A\u0631', '\u0641\u0628\u0631\u0627\u064A\u0631', '\u0645\u0627\u0631\u0633', '\u0623\u0628\u0631\u064A\u0644', '\u0645\u0627\u064A\u0648', '\u064A\u0648\u0646\u064A\u0648',
        '\u064A\u0648\u0644\u064A\u0648', '\u0623\u063A\u0633\u0637\u0633', '\u0633\u0628\u062A\u0645\u0628\u0631', '\u0623\u0643\u062A\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062F\u064A\u0633\u0645\u0628\u0631'
    ],

    gregorianMonthNamesEn: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    // ==================== API MAPPING ====================

    PRAYER_API_MAP: {
        'Fajr': 'fajr',
        'Dhuhr': 'dhuhr',
        'Asr': 'asr',
        'Maghrib': 'maghrib',
        'Isha': 'isha'
    },

    // ==================== PRAYER REMINDER TIMES ====================

    PRAYER_REMINDER_TIMES: {
        'fajr':    { start: 4, end: 7, name_key: 'prayer_fajr' },
        'dhuhr':   { start: 12, end: 14, name_key: 'prayer_dhuhr' },
        'asr':     { start: 15, end: 17, name_key: 'prayer_asr' },
        'maghrib': { start: 18, end: 20, name_key: 'prayer_maghrib' },
        'isha':    { start: 21, end: 23, name_key: 'prayer_isha' }
    },

    // ==================== TRANSLATIONS ====================

    T: {
        // Header
        'app_title': { ar: '\u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0635\u0644\u0627\u0629', en: 'Prayer Tracker' },
        'quran_verse': { ar: '\u0625\u0650\u0646\u0651\u064e \u0671\u0644\u0635\u0651\u064e\u0644\u064e\u0648\u0670\u0629\u064e \u0643\u064e\u0627\u0646\u064e\u062a\u0652 \u0639\u064e\u0644\u064e\u0649 \u0671\u0644\u0652\u0645\u064f\u0624\u0652\u0645\u0650\u0646\u0650\u064a\u0646\u064e \u0643\u0650\u062a\u064e\u0640\u0670\u0628\u064b\u0627\u06ed \u0645\u0651\u064e\u0648\u0652\u0642\u064f\u0648\u062a\u064b\u0627\u06ed', en: 'Indeed, prayer has been decreed upon the believers at specified times' },
        'verse_ref': { ar: '[\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0633\u0627\u0621: 103]', en: '[An-Nisa: 103]' },

        // Profile
        'choose_profile': { ar: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0623\u0648 \u0623\u0646\u0634\u0626 \u0648\u0627\u062d\u062f\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b', en: 'Choose a profile or create a new one' },
        'add_profile': { ar: '\u27A5 \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0641 \u0634\u062e\u0635\u064a \u062c\u062f\u064a\u062f', en: '\u27A5 Add New Profile' },
        'name': { ar: '\u0627\u0644\u0627\u0633\u0645', en: 'Name' },
        'age': { ar: '\u0627\u0644\u0639\u0645\u0631', en: 'Age' },
        'gender': { ar: '\u0627\u0644\u062c\u0646\u0633', en: 'Gender' },
        'male': { ar: '\u0630\u0643\u0631', en: 'Male' },
        'female': { ar: '\u0623\u0646\u062b\u0649', en: 'Female' },
        'child_m': { ar: '\u0637\u0641\u0644', en: 'Boy' },
        'child_f': { ar: '\u0637\u0641\u0644\u0629', en: 'Girl' },
        'save': { ar: '\u062d\u0641\u0638', en: 'Save' },
        'cancel': { ar: '\u0625\u0644\u063a\u0627\u0621', en: 'Cancel' },
        'switch_profile': { ar: '\u21C4 \u062a\u0628\u062f\u064a\u0644', en: '\u21C4 Switch' },
        'enter_name': { ar: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0627\u0633\u0645...', en: 'Enter name...' },
        'old_data_warning': { ar: '\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0628\u064a\u0627\u0646\u0627\u062a \u0642\u062f\u064a\u0645\u0629 \u2014 \u0635\u062f\u0651\u0631\u0647\u0627 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 \u0634\u062e\u0635\u064a', en: 'Old data detected \u2014 export it before creating a profile' },
        'export_old': { ar: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0642\u062f\u064a\u0645\u0629', en: 'Export Old Data' },
        'import_file': { ar: '\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0646 \u0645\u0644\u0641', en: 'Import Data from File' },
        'years_old': { ar: '\u0633\u0646\u0629', en: 'yrs' },

        // Main sections
        'fard_prayers': { ar: '\u0627\u0644\u0641\u0631\u0627\u0626\u0636', en: 'Obligatory' },
        'sunnah_prayers': { ar: '\u0627\u0644\u0633\u0646\u0646 \u0648\u0627\u0644\u0631\u0648\u0627\u062a\u0628', en: 'Sunnah' },
        'fasting_section': { ar: '\u0627\u0644\u0635\u064a\u0627\u0645', en: 'Fasting' },

        // Views
        'monthly_tracker': { ar: '\u0627\u0644\u062a\u062a\u0628\u0639', en: 'Tracker' },
        'yearly_view': { ar: '\u0627\u0644\u0633\u0646\u0629', en: 'Yearly' },
        'dashboard': { ar: '\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a', en: 'Stats' },

        // Fasting views
        'voluntary_fasting': { ar: '\u0635\u064a\u0627\u0645 \u0627\u0644\u062a\u0637\u0648\u0639', en: 'Voluntary Fasting' },
        'ramadan_fasting': { ar: '\u0635\u064a\u0627\u0645 \u0631\u0645\u0636\u0627\u0646', en: 'Ramadan Fasting' },

        // Controls
        'month': { ar: '\u0627\u0644\u0634\u0647\u0631:', en: 'Month:' },
        'year': { ar: '\u0627\u0644\u0633\u0646\u0629:', en: 'Year:' },
        'prev_month': { ar: '\u25C4 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0633\u0627\u0628\u0642', en: '\u25C4 Previous' },
        'next_month': { ar: '\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062a\u0627\u0644\u064a \u25BA', en: 'Next \u25BA' },

        // Stats
        'total_completed': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0645\u0642\u0636\u064a\u0629', en: 'Total Prayers Completed' },
        'total_remaining': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629', en: 'Total Remaining' },
        'completion_rate': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632', en: 'Completion Rate' },
        'sunnah_completed': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0646\u0646 \u0627\u0644\u0645\u0624\u062f\u0627\u0629', en: 'Total Sunnah Completed' },
        'sunnah_remaining': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0646\u0646 \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629', en: 'Total Remaining' },

        // Dashboard
        'yearly_rate': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0633\u0646\u0648\u064a\u0629', en: 'Yearly Completion' },
        'best_month': { ar: '\u0623\u0641\u0636\u0644 \u0634\u0647\u0631', en: 'Best Month' },
        'best_prayer': { ar: '\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0623\u0643\u062b\u0631 \u0627\u0646\u062a\u0638\u0627\u0645\u0627\u064b', en: 'Most Consistent Prayer' },
        'commitment_rate': { ar: '\u0645\u0639\u062f\u0644 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645', en: 'Commitment Rate' },
        'of_total': { ar: '\u0645\u0646 \u0623\u0635\u0644', en: 'out of' },
        'prayers_word': { ar: '\u0635\u0644\u0627\u0629', en: 'prayers' },
        'monthly_progress': { ar: '\u0627\u0644\u062a\u0642\u062f\u0645 \u0627\u0644\u0634\u0647\u0631\u064a', en: 'Monthly Progress' },
        'by_type': { ar: '\u0627\u0644\u0633\u0646\u0646 \u062d\u0633\u0628 \u0627\u0644\u0646\u0648\u0639', en: 'Sunnah by Type' },
        'fard_by_type': { ar: '\u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u062d\u0633\u0628 \u0627\u0644\u0646\u0648\u0639', en: 'Congregation by Prayer Type' },
        'completion_pie': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632', en: 'Completion Rate' },
        'comparison': { ar: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0635\u0644\u0648\u0627\u062a', en: 'Prayer Comparison' },

        // Streaks
        'fard_streaks': { ar: '\u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0645\u0648\u0627\u0638\u0628\u0629 \u0639\u0644\u0649 \u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation Prayer Streaks' },
        'sunnah_streaks': { ar: '\u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0645\u0648\u0627\u0638\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0646\u0646', en: 'Sunnah Prayer Streaks' },
        'consecutive_days': { ar: '\u064a\u0648\u0645 \u0645\u062a\u062a\u0627\u0644\u064a', en: 'consecutive days' },
        'best_streak': { ar: '\u0623\u0641\u0636\u0644 \u0633\u0644\u0633\u0644\u0629:', en: 'Best streak:' },
        'days_word': { ar: '\u064a\u0648\u0645', en: 'days' },

        // Actions
        'clear_month': { ar: '\u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0647\u0631', en: 'Clear Month Data' },
        'print': { ar: '\u0637\u0628\u0627\u0639\u0629', en: 'Print' },
        'export_data': { ar: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', en: 'Export Data' },
        'import_data': { ar: '\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', en: 'Import Data' },
        'back_to_year': { ar: '\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0633\u0646\u0629', en: '\u2190 Back to Year' },

        // Female features
        'exempt_mode': { ar: '\u0648\u0636\u0639 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0625\u0639\u0641\u0627\u0621 (\u062d\u064a\u0636/\u0646\u0641\u0627\u0633) \u2014 \u0644\u0643\u0644 \u0635\u0644\u0627\u0629 \u0639\u0644\u0649 \u062d\u062f\u0629', en: 'Exemption mode (menstruation) \u2014 per prayer' },
        'period_history': { ar: '\u0633\u062c\u0644 \u0627\u0644\u062f\u0648\u0631\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', en: 'Period History' },
        'exempt_prayers': { ar: '\u0635\u0644\u0648\u0627\u062a \u0645\u0639\u0641\u0627\u0629:', en: 'Exempt prayers:' },
        'affected_days': { ar: '\u0623\u064a\u0627\u0645 \u0645\u062a\u0623\u062b\u0631\u0629:', en: 'Affected days:' },

        // Fasting
        'fasted': { ar: '\u0635\u0627\u0645\u062a \u2713', en: 'Fasted \u2713' },
        'period_mark': { ar: '\u062d\u064a\u0636 ', en: 'Period ' },
        'broke_fast': { ar: '\u0623\u0641\u0637\u0631\u062a \u2717', en: 'Missed \u2717' },
        'not_set': { ar: '\u0644\u0645 \u064a\u064f\u062d\u062f\u062f', en: 'Not set' },
        'fasting_days': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0635\u064a\u0627\u0645', en: 'Fasting Days' },
        'period_days': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u062d\u064a\u0636', en: 'Period Days' },
        'missed_days': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0625\u0641\u0637\u0627\u0631', en: 'Missed Days' },
        'owed_days': { ar: '\u0623\u064a\u0627\u0645 \u0644\u0644\u0642\u0636\u0627\u0621', en: 'Days Owed' },
        'ramadan_days': { ar: '\u0623\u064a\u0627\u0645 \u0631\u0645\u0636\u0627\u0646', en: 'Ramadan Days' },
        'vol_fasting_title': { ar: '\u0635\u064a\u0627\u0645 \u0627\u0644\u062a\u0637\u0648\u0639', en: 'Voluntary Fasting' },
        'fasting_exempt_mode': { ar: '\u0648\u0636\u0639 \u062a\u062d\u062f\u064a\u062f \u0623\u064a\u0627\u0645 \u0627\u0644\u062d\u064a\u0636', en: 'Period marking mode' },
        'exempt_days': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0625\u0639\u0641\u0627\u0621', en: 'Exempt Days' },
        'fasting_rate': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0635\u064a\u0627\u0645', en: 'Fasting Rate' },
        'clear_fasting': { ar: '\u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0635\u064a\u0627\u0645', en: 'Clear Fasting Data' },

        // Fasting dashboard
        'vol_total': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0623\u064a\u0627\u0645 \u0635\u064a\u0627\u0645 \u0627\u0644\u062a\u0637\u0648\u0639', en: 'Total Voluntary Fasting Days' },
        'best_fasting_month': { ar: '\u0623\u0641\u0636\u0644 \u0634\u0647\u0631 \u0635\u064a\u0627\u0645', en: 'Best Fasting Month' },
        'ramadan_stats': { ar: '\u0635\u064a\u0627\u0645 \u0631\u0645\u0636\u0627\u0646', en: 'Ramadan Fasting' },
        'monthly_avg': { ar: '\u0645\u0639\u062f\u0644 \u0627\u0644\u0635\u064a\u0627\u0645 \u0627\u0644\u0634\u0647\u0631\u064a', en: 'Monthly Average' },
        'day_per_month': { ar: '\u064a\u0648\u0645/\u0634\u0647\u0631', en: 'days/month' },
        'during_year': { ar: '\u062e\u0644\u0627\u0644 \u0627\u0644\u0633\u0646\u0629', en: 'During the year' },
        'vol_monthly_chart': { ar: '\u0635\u064a\u0627\u0645 \u0627\u0644\u062a\u0637\u0648\u0639 \u0627\u0644\u0634\u0647\u0631\u064a', en: 'Monthly Voluntary Fasting' },

        // Themes
        'green_gold': { ar: '\u0623\u062e\u0636\u0631 \u0648\u0630\u0647\u0628\u064a', en: 'Green & Gold' },
        'navy_silver': { ar: '\u0643\u062d\u0644\u064a \u0648\u0641\u0636\u064a', en: 'Navy & Silver' },
        'purple_gold': { ar: '\u0628\u0646\u0641\u0633\u062c\u064a \u0648\u0630\u0647\u0628\u064a', en: 'Purple & Gold' },
        'pink': { ar: '\u0648\u0631\u062f\u064a ', en: 'Pink ' },
        'sky_blue': { ar: '\u0623\u0632\u0631\u0642 \u0633\u0645\u0627\u0648\u064a', en: 'Sky Blue' },
        'dark_mode': { ar: '\u062f\u0627\u0631\u0643 \u0645\u0648\u062f', en: 'Dark Mode' },
        'olive_cream': { ar: '\u0632\u064a\u062a\u0648\u0646\u064a', en: 'Olive' },

        // Months (Hijri)
        'months': {
            ar: ['\u0645\u062d\u0631\u0645','\u0635\u0641\u0631','\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644','\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631','\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649','\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629','\u0631\u062c\u0628','\u0634\u0639\u0628\u0627\u0646','\u0631\u0645\u0636\u0627\u0646','\u0634\u0648\u0627\u0644','\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629','\u0630\u0648 \u0627\u0644\u062d\u062c\u0629'],
            en: ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Ula','Jumada al-Thani','Rajab','Sha\'ban','Ramadan','Shawwal','Dhul Qi\'dah','Dhul Hijjah']
        },
        'hijri_year': { ar: '\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0647\u062c\u0631\u064a\u0629:', en: 'Hijri Year:' },
        'hijri_month': { ar: '\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0647\u062c\u0631\u064a:', en: 'Hijri Month:' },
        'hijri_override': { ar: '\u062a\u0639\u062f\u064a\u0644 \u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0634\u0647\u0631', en: 'Adjust month start' },
        'prayer_times': { ar: '\u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629', en: 'Prayer Times' },
        'notif_enabled': { ar: '\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0645\u0641\u0639\u0651\u0644\u0629', en: 'Notifications enabled' },
        'notif_disabled': { ar: '\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0645\u062a\u0648\u0642\u0641\u0629', en: 'Notifications disabled' },
        'qada_report': { ar: '\u062a\u0642\u0631\u064a\u0631 \u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0642\u0636\u0627\u0621', en: 'Qada Prayers Report' },
        'total_qada': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0642\u0636\u0627\u0621', en: 'Total Qada Prayers' },
        'most_qada_prayer': { ar: '\u0623\u0643\u062b\u0631 \u0635\u0644\u0627\u0629 \u0642\u0636\u0627\u0621\u064b', en: 'Most Qada Prayer' },
        'worst_month': { ar: '\u0623\u0633\u0648\u0623 \u0634\u0647\u0631', en: 'Worst Month' },

        // Prayer names
        'prayer_fajr': { ar: '\u0627\u0644\u0641\u062c\u0631', en: 'Fajr' },
        'prayer_dhuhr': { ar: '\u0627\u0644\u0638\u0647\u0631', en: 'Dhuhr' },
        'prayer_asr': { ar: '\u0627\u0644\u0639\u0635\u0631', en: 'Asr' },
        'prayer_maghrib': { ar: '\u0627\u0644\u0645\u063a\u0631\u0628', en: 'Maghrib' },
        'prayer_isha': { ar: '\u0627\u0644\u0639\u0634\u0627\u0621', en: 'Isha' },
        'prayer_tahajjud': { ar: '\u0627\u0644\u062a\u0647\u062c\u062f', en: 'Tahajjud' },
        'prayer_sunnah_fajr': { ar: '\u0633\u0646\u0629 \u0627\u0644\u0641\u062c\u0631', en: 'Fajr Sunnah' },
        'prayer_duha': { ar: '\u0627\u0644\u0636\u062d\u0649', en: 'Duha' },
        'prayer_sunnah_dhuhr': { ar: '\u0633\u0646\u0629 \u0627\u0644\u0638\u0647\u0631', en: 'Dhuhr Sunnah' },
        'prayer_sunnah_asr': { ar: '\u0633\u0646\u0629 \u0627\u0644\u0639\u0635\u0631', en: 'Asr Sunnah' },
        'prayer_sunnah_maghrib': { ar: '\u0633\u0646\u0629 \u0627\u0644\u0645\u063a\u0631\u0628', en: 'Maghrib Sunnah' },
        'prayer_sunnah_isha': { ar: '\u0633\u0646\u0629 \u0627\u0644\u0639\u0634\u0627\u0621', en: 'Isha Sunnah' },
        'prayer_witr': { ar: '\u0627\u0644\u0648\u062a\u0631', en: 'Witr' },

        'day_names': {
            ar: ['\u0627\u0644\u0623\u062d\u062f', '\u0627\u0644\u0627\u062b\u0646\u064a\u0646', '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621', '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621', '\u0627\u0644\u062e\u0645\u064a\u0633', '\u0627\u0644\u062c\u0645\u0639\u0629', '\u0627\u0644\u0633\u0628\u062a'],
            en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        },

        // Misc
        'completed_word': { ar: '\u0645\u0642\u0636\u064a\u0629', en: 'Completed' },
        'remaining_word': { ar: '\u0645\u062a\u0628\u0642\u064a\u0629', en: 'Remaining' },
        'performed': { ar: '\u0645\u0624\u062f\u0627\u0629', en: 'Performed' },
        'confirm_clear': { ar: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0645\u0633\u062d \u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631\u061f', en: 'Are you sure you want to clear all data for this month?' },
        'confirm_delete_profile': { ar: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0648\u062c\u0645\u064a\u0639 \u0628\u064a\u0627\u0646\u0627\u062a\u0647\u061f', en: 'Are you sure you want to delete this profile and all its data?' },
        'enter_valid_name': { ar: '\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645', en: 'Please enter a name' },
        'enter_valid_age': { ar: '\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u0639\u0645\u0631 \u0635\u062d\u064a\u062d', en: 'Please enter a valid age' },
        'select_gender': { ar: '\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u062c\u0646\u0633', en: 'Please select a gender' },
        'no_data': { ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631', en: 'No data to export' },
        'import_success': { ar: '\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u062c\u0627\u062d!', en: 'Data imported successfully!' },
        'import_replace': { ar: '\u0633\u064a\u062a\u0645 \u0627\u0633\u062a\u0628\u062f\u0627\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062d\u0627\u0644\u064a. \u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u061f', en: 'Current user data will be replaced. Continue?' },
        'congregation_mode': { ar: '\u0648\u0636\u0639 \u062a\u062d\u062f\u064a\u062f \u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation mode' },
        'congregation': { ar: '\u062c\u0645\u0627\u0639\u0629', en: 'Congregation' },
        'individual': { ar: '\u0645\u0646\u0641\u0631\u062f', en: 'Individual' },
        'cong_rate': { ar: '\u0646\u0633\u0628\u0629 \u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation Rate' },
        'weekly_pattern': { ar: '\u0646\u0645\u0637 \u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064a', en: 'Weekly Congregation Pattern' },
        'prayer_heatmap': { ar: '\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0628\u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation Commitment Heatmap' },
        'cong_chart_title': { ar: '\u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', en: 'Monthly Congregation Rate' },

        'select_profile_first': { ar: '\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641 \u0634\u062e\u0635\u064a \u0623\u0648\u0644\u0627\u064b', en: 'Please select a profile first' },
        'export_success': { ar: '\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u062c\u0627\u062d!', en: 'Data exported successfully!' },
        'pending_import_saved': { ar: '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a. \u0623\u0646\u0634\u0626 \u0645\u0644\u0641\u0627\u064b \u0634\u062e\u0635\u064a\u0627\u064b \u0644\u0631\u0628\u0637\u0647\u0627.', en: 'Data saved. Create a profile to link it.' },
        'file_error': { ar: '\u062e\u0637\u0623 \u0641\u064a \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641', en: 'Error reading file' },
        'confirm_clear_fasting': { ar: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0635\u064a\u0627\u0645\u061f', en: 'Are you sure you want to clear fasting data?' },
        'not_logged_yet': { ar: '\u0644\u0645 \u062a\u064f\u0633\u062c\u0651\u0644 \u0628\u0639\u062f:', en: 'Not yet logged:' },
        'app_title_short': { ar: '\u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0635\u0644\u0627\u0629', en: 'Prayer Tracker' },
        'fard_short': { ar: '\u0627\u0644\u0641\u0631\u0627\u0626\u0636', en: 'Fard' },
        'sunnah_short': { ar: '\u0627\u0644\u0633\u0646\u0646', en: 'Sunnah' },
        'fasting_short': { ar: '\u0627\u0644\u0635\u064a\u0627\u0645', en: 'Fasting' },
        'azkar_short': { ar: '\u0627\u0644\u0623\u0630\u0643\u0627\u0631', en: 'Azkar' },
        'azkar_section': { ar: '\u0627\u0644\u0623\u0630\u0643\u0627\u0631', en: 'Azkar' },
        'azkar_morning': { ar: '\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0635\u0628\u0627\u062d', en: 'Morning Azkar' },
        'azkar_evening': { ar: '\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0621', en: 'Evening Azkar' },
        'azkar_tracker': { ar: '\u0627\u0644\u062a\u062a\u0628\u0639', en: 'Tracker' },
        'azkar_yearly': { ar: '\u0627\u0644\u0633\u0646\u0629', en: 'Yearly' },
        'azkar_dashboard': { ar: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', en: 'Dashboard' },
        'azkar_mark_all': { ar: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644', en: 'Mark All' },
        'dashboard_short': { ar: '\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a', en: 'Stats' },
        'fiori_theme': { ar: '\u0643\u0648\u0627\u0631\u062a\u0632', en: 'Quartz' },
        'skip_to_content': { ar: '\u062a\u062e\u0637\u064a \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u062a\u0648\u0649', en: 'Skip to content' },
        'offline_msg': { ar: '\u26A1 \u0623\u0646\u062a \u063a\u064a\u0631 \u0645\u062a\u0635\u0644 \u2014 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u064a\u0639\u0645\u0644 \u0628\u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644', en: '\u26A1 You are offline \u2014 app works without connection' },
        'swipe_hint': { ar: '\u27F5 \u0627\u0633\u062d\u0628 \u0644\u0644\u062a\u0646\u0642\u0644 \u0628\u064a\u0646 \u0627\u0644\u0623\u0634\u0647\u0631 \u27F6', en: '\u27F5 Swipe to navigate months \u27F6' },
        'ready_to_track': { ar: '\u062c\u0627\u0647\u0632 \u0644\u062a\u062a\u0628\u0639 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631!', en: 'Ready to track this month!' },
        'select_all_day': { ar: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u064a\u0648\u0645', en: 'Select Day' },
        'mark_all': { ar: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644', en: 'Mark All' },
        'yes': { ar: '\u0646\u0639\u0645', en: 'Yes' },
        'no_word': { ar: '\u0644\u0627', en: 'No' },
        'duplicate_name': { ar: '\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644', en: 'This name is already taken' },
        'profile_limit': { ar: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0661\u0660 \u0645\u0644\u0641\u0627\u062a \u0634\u062e\u0635\u064a\u0629', en: 'Maximum 10 profiles allowed' },
        'storage_full': { ar: '\u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0645\u0645\u062a\u0644\u0626\u0629! \u0635\u062f\u0651\u0631 \u0628\u064a\u0627\u0646\u0627\u062a\u0643.', en: 'Storage full! Export your data.' },
        'qada_prayer': { ar: '\u0642\u0636\u0627\u0621', en: 'Qada' },
        'prayed_alone': { ar: '\u0645\u0646\u0641\u0631\u062f', en: 'Alone' },
        'click_hint': { ar: '\u0636\u063a\u0637\u0629=\u0645\u0646\u0641\u0631\u062f \u060c \u0636\u063a\u0637\u062a\u064a\u0646=\u062c\u0645\u0627\u0639\u0629 \u060c \u0663=\u0642\u0636\u0627\u0621', en: 'Tap=alone, 2=congregation, 3=qada' },
        'annual_consistency': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0627\u0644\u0633\u0646\u0648\u064a\u0629', en: 'Annual Consistency' },
        'total_prayers_word': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0644\u0648\u0627\u062a', en: 'Total Prayers' },
        'future_date_short': { ar: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0639\u0644\u064a\u0645 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644', en: 'Cannot mark future dates' },
        'exempt_linked_prayer': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0625\u0639\u0641\u0627\u0621 \u0645\u0631\u0628\u0648\u0637\u0629 \u0628\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0635\u0644\u0627\u0629', en: 'Exempt days linked to prayer data' },
        'click_remove_exempt': { ar: '\u0627\u0636\u063a\u0637 \u0644\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0625\u0639\u0641\u0627\u0621', en: 'Click to remove exemption' },
        'click_mark_exempt': { ar: '\u0627\u0636\u063a\u0637 \u0644\u062a\u062d\u062f\u064a\u062f \u0643\u0625\u0639\u0641\u0627\u0621', en: 'Click to mark as exempt' },
        'future_date': { ar: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0639\u0644\u064a\u0645 \u0635\u0644\u0627\u0629 \u0641\u064a \u062a\u0627\u0631\u064a\u062e \u0645\u0633\u062a\u0642\u0628\u0644\u064a!\n\u064a\u0645\u0643\u0646\u0643 \u0641\u0642\u0637 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0635\u0644\u0648\u0627\u062a \u062d\u062a\u0649 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u064a\u0648\u0645.', en: 'Cannot mark a prayer on a future date!\nYou can only mark prayers up to today.' },
        'chart_percentage': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632 %', en: 'Completion %' },
        'chart_prayers_count': { ar: '\u0639\u062f\u062f \u0627\u0644\u0635\u0644\u0648\u0627\u062a', en: 'Prayer Count' },
        'chart_sunnah_count': { ar: '\u0639\u062f\u062f \u0627\u0644\u0633\u0646\u0646', en: 'Sunnah Count' },
        'chart_completed_label': { ar: '\u0645\u0642\u0636\u064a\u0629', en: 'Completed' },
        'chart_remaining_label': { ar: '\u0645\u062a\u0628\u0642\u064a\u0629', en: 'Remaining' },
        'chart_sunnah_performed': { ar: '\u0645\u0624\u062f\u0627\u0629', en: 'Performed' },
        'fasting_days_chart': { ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0635\u064a\u0627\u0645', en: 'Fasting Days' },
        'no_period_data': { ar: '\u062d\u062f\u062f\u064a \u0623\u064a\u0627\u0645 \u0627\u0644\u0625\u0639\u0641\u0627\u0621 \u0645\u0646 \u0627\u0644\u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0634\u0647\u0631\u064a \u0644\u062a\u0638\u0647\u0631 \u0647\u0646\u0627', en: 'Mark exempt days in the monthly tracker to see them here' },

        // Chart/dashboard titles
        'congregation_streak': { ar: '\u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0645\u0648\u0627\u0638\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation Streaks' },
        'weekly_congregation_pattern': { ar: '\u0646\u0645\u0637 \u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064a', en: 'Weekly Congregation Pattern' },
        'qada_report_title': { ar: '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0642\u0636\u0627\u0621', en: 'Qada Report' },
        'next_prayer': { ar: '\u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629', en: 'Next Prayer' },
        'completion': { ar: '\u0627\u0644\u0625\u0646\u062c\u0627\u0632', en: 'Completion' },
        'overall_completion': { ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0643\u0644\u064a', en: 'Overall Completion' },
        'best_month_label': { ar: '\u0623\u0641\u0636\u0644 \u0634\u0647\u0631', en: 'Best Month' },

        // Stats card labels
        'most_consistent': { ar: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0627\u0646\u062a\u0638\u0627\u0645\u0627\u064b', en: 'Most Consistent' },
        'congregation_rate': { ar: '\u0646\u0633\u0628\u0629 \u0635\u0644\u0627\u0629 \u0627\u0644\u062c\u0645\u0627\u0639\u0629', en: 'Congregation Rate' },
        'qada_word': { ar: '\u0642\u0636\u0627\u0621', en: 'Qada' },

        // Azkar translations
        'select_all': { ar: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644', en: 'Select All' },
        'clear_word': { ar: '\u0645\u0633\u062d', en: 'Clear' },
        'azkar_both_days': { ar: '\u0623\u064a\u0627\u0645 \u0645\u0643\u062a\u0645\u0644\u0629 (\u0635\u0628\u0627\u062d+\u0645\u0633\u0627\u0621)', en: 'Complete Days (morning+evening)' },
        'azkar_streak': { ar: '\u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u062a\u062a\u0627\u0644\u064a\u0629', en: 'Consecutive Streak' },
        'azkar_heatmap': { ar: '\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645', en: 'Commitment Map' },
        'azkar_best_month': { ar: '\u0623\u0641\u0636\u0644 \u0634\u0647\u0631', en: 'Best Month' },

        // Streak labels
        'current_word': { ar: '\u0627\u0644\u062d\u0627\u0644\u064a\u0629', en: 'Current' },
        'best_word': { ar: '\u0627\u0644\u0623\u0641\u0636\u0644', en: 'Best' },
        'record_word': { ar: '\u0631\u0642\u0645 \u0642\u064a\u0627\u0633\u064a', en: 'Personal Best' },

        // Misc labels
        'total_word': { ar: '\u0627\u0644\u0643\u0644', en: 'Total' },
        'rate': { ar: '\u0627\u0644\u0646\u0633\u0628\u0629', en: 'Rate' },
        'settings': { ar: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', en: 'Settings' },
        'edit_profile': { ar: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0644\u0641', en: 'Edit Profile' },
        'delete_profile': { ar: '\u062d\u0630\u0641', en: 'Delete' },
        'theme_label': { ar: '\u0627\u0644\u0645\u0638\u0647\u0631', en: 'Theme' },
        'language_label': { ar: '\u0627\u0644\u0644\u063a\u0629', en: 'Language' },
        'year_overview': { ar: '\u0646\u0638\u0631\u0629 \u0633\u0646\u0648\u064a\u0629', en: 'Year Overview' },

        // Profile settings
        'edit_data': { ar: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', en: 'Edit Data' },
        'edit_data_subtitle': { ar: '\u0627\u0644\u0627\u0633\u0645\u060c \u0627\u0644\u0639\u0645\u0631\u060c \u0627\u0644\u062c\u0646\u0633', en: 'Name, Age, Gender' },
        'switch_profile_menu': { ar: '\u062a\u0628\u062f\u064a\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a', en: 'Switch Profile' },
        'add_new_profile': { ar: '\u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0641 \u062c\u062f\u064a\u062f', en: 'Add New Profile' },
        'export_backup_subtitle': { ar: '\u062d\u0641\u0638 \u0646\u0633\u062e\u0629 \u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629 JSON', en: 'Save JSON backup' },
        'import_restore_subtitle': { ar: '\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0645\u0646 \u0646\u0633\u062e\u0629 \u0633\u0627\u0628\u0642\u0629', en: 'Restore from backup' },
        'colors_theme': { ar: '\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0648\u0627\u0644\u062b\u064a\u0645', en: 'Colors & Theme' },
        'notifications_label': { ar: '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a', en: 'Notifications' },
        'notif_subtitle': { ar: '\u062a\u0630\u0643\u064a\u0631 \u0627\u0644\u0635\u0644\u0627\u0629 \u0642\u0628\u0644 \u0648\u0628\u0639\u062f \u0627\u0644\u0648\u0642\u062a', en: 'Prayer reminder before & after time' },
        'clear_fard_month': { ar: '\u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0647\u0631 (\u0627\u0644\u0641\u0631\u0627\u0626\u0636)', en: 'Clear Month Data (Fard)' },
        'clear_fard_subtitle': { ar: '\u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a', en: 'Clear current month data' },
        'clear_sunnah_month': { ar: '\u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0647\u0631 (\u0627\u0644\u0633\u0646\u0646)', en: 'Clear Month Data (Sunnah)' },
        'delete_profile_full': { ar: '\u062d\u0630\u0641 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a', en: 'Delete Profile' },
        'delete_profile_subtitle': { ar: '\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0646\u0647\u0627\u0626\u064a\u0627\u064b', en: 'All data will be permanently deleted' },
        'app_version': { ar: '\u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0635\u0644\u0627\u0629 \u2014 \u0627\u0644\u0625\u0635\u062f\u0627\u0631 \u0662.\u0661', en: 'Prayer Tracker \u2014 Version 2.1' },

        // Fasting sub-tabs
        'voluntary_short': { ar: '\u062a\u0637\u0648\u0639', en: 'Voluntary' },
        'ramadan_short': { ar: '\u0631\u0645\u0636\u0627\u0646', en: 'Ramadan' },

        // Fasting dashboard labels
        'vol_fasting_total': { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0623\u064a\u0627\u0645 \u0635\u064a\u0627\u0645 \u0627\u0644\u062a\u0637\u0648\u0639', en: 'Total Voluntary Fasting Days' },
        'during_year_label': { ar: '\u062e\u0644\u0627\u0644 \u0627\u0644\u0633\u0646\u0629', en: 'During the year' },
        'best_fasting_month_label': { ar: '\u0623\u0641\u0636\u0644 \u0634\u0647\u0631 \u0635\u064a\u0627\u0645', en: 'Best Fasting Month' },
        'ramadan_fasting_label': { ar: '\u0635\u064a\u0627\u0645 \u0631\u0645\u0636\u0627\u0646', en: 'Ramadan Fasting' },
        'monthly_fasting_avg': { ar: '\u0645\u0639\u062f\u0644 \u0627\u0644\u0635\u064a\u0627\u0645 \u0627\u0644\u0634\u0647\u0631\u064a', en: 'Monthly Fasting Average' },
        'ramadan_days_label': { ar: '\u0623\u064a\u0627\u0645 \u0631\u0645\u0636\u0627\u0646', en: 'Ramadan Days' },
        'fasting_exempt_label': { ar: '\u0648\u0636\u0639 \u062a\u062d\u062f\u064a\u062f \u0623\u064a\u0627\u0645 \u0627\u0644\u062d\u064a\u0636', en: 'Period marking mode' },

        // Period history
        'period_history_title': { ar: '\u0633\u062c\u0644 \u0627\u0644\u062f\u0648\u0631\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', en: 'Period History' },

        // Confirmation dialogs (Feature 5)
        'confirm_batch_mark': { ar: '\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0639\u0644\u064a\u0645 \u062c\u0645\u064a\u0639 \u0623\u064a\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u0635\u0644\u0627\u0629\u061f', en: 'Mark all days for this prayer?' },
        'confirm_batch_unmark': { ar: '\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0644\u063a\u0627\u0621 \u062a\u0639\u0644\u064a\u0645 \u062c\u0645\u064a\u0639 \u0623\u064a\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u0635\u0644\u0627\u0629\u061f', en: 'Unmark all days for this prayer?' },
        'confirm_batch_azkar_mark': { ar: '\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0639\u0644\u064a\u0645 \u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u064a\u0627\u0645\u061f', en: 'Mark all days?' },
        'confirm_batch_azkar_unmark': { ar: '\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0644\u063a\u0627\u0621 \u062a\u0639\u0644\u064a\u0645 \u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u064a\u0627\u0645\u061f', en: 'Unmark all days?' },
        'confirm_delete_profile': { ar: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a\u061f\n\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0646\u0647\u0627\u0626\u064a\u0627\u064b.', en: 'Are you sure you want to delete this profile?\nAll data will be permanently deleted.' },

        // Accessibility (Feature 1)
        'aria_theme_menu': { ar: '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0638\u0647\u0631', en: 'Theme menu' },
        'aria_profile_settings': { ar: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a', en: 'Profile settings' },
        'aria_prev_month': { ar: '\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0633\u0627\u0628\u0642', en: 'Previous month' },
        'aria_next_month': { ar: '\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062a\u0627\u0644\u064a', en: 'Next month' },
        'aria_close': { ar: '\u0625\u063a\u0644\u0627\u0642', en: 'Close' },

        // Offline fallback (Feature 3)
        'offline_title': { ar: '\u0623\u0646\u062a \u063a\u064a\u0631 \u0645\u062a\u0635\u0644', en: 'You are offline' },
        'offline_body': { ar: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0648\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0628\u0639\u062f.\n\u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0639\u0646\u062f \u0627\u0644\u0627\u062a\u0635\u0627\u0644.', en: 'No internet connection and the app has not been cached yet.\nPlease try again when connected.' },
        'offline_retry': { ar: '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629', en: 'Retry' },

        // Notification onboarding (Feature 4)
        'notif_onboard_title': { ar: '\u062a\u0630\u0643\u064a\u0631 \u0627\u0644\u0635\u0644\u0627\u0629', en: 'Prayer Reminders' },
        'notif_onboard_body': { ar: '\u0641\u0639\u0651\u0644 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0644\u062a\u0630\u0643\u064a\u0631\u0643 \u0642\u0628\u0644 \u0648\u0628\u0639\u062f \u0643\u0644 \u0635\u0644\u0627\u0629', en: 'Enable notifications to get reminded before and after each prayer' },
        'notif_onboard_enable': { ar: '\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a', en: 'Enable Notifications' },
        'notif_onboard_later': { ar: '\u0644\u0627\u062d\u0642\u0627\u064b', en: 'Maybe Later' },
        'notif_test_body': { ar: 'سيتم تذكيرك قبل كل صلاة بـ ٢٠ دقيقة', en: 'You will be reminded 20 min before each prayer' },
        'notif_before_title': { ar: 'قرب وقت الصلاة', en: 'Prayer time approaching' },
        'notif_after_title': { ar: 'هل صليت؟', en: 'Did you pray?' },

        // Fasting notification settings (Part 3)
        'salah_notif_label': { ar: 'إشعارات الصلاة', en: 'Prayer Notifications' },
        'fasting_notif_label': { ar: 'إشعارات الصيام', en: 'Fasting Notifications' },
        'fasting_notif_subtitle': { ar: 'تذكير بأيام الصيام المسنونة', en: 'Sunnah fasting day reminders' },
        'fasting_notif_enabled': { ar: 'تم تفعيل إشعارات الصيام', en: 'Fasting notifications enabled' },
        'fasting_notif_disabled': { ar: 'تم إيقاف إشعارات الصيام', en: 'Fasting notifications disabled' },

        // Fasting notification messages
        'fasting_notif_mon_thu_title': { ar: 'تذكير بصيام التطوع', en: 'Voluntary Fasting Reminder' },
        'fasting_notif_mon_body': { ar: 'غداً يوم الاثنين — من أراد الصيام فليبيّت النية', en: 'Tomorrow is Monday — a Sunnah day to fast' },
        'fasting_notif_thu_body': { ar: 'غداً يوم الخميس — من أراد الصيام فليبيّت النية', en: 'Tomorrow is Thursday — a Sunnah day to fast' },
        'fasting_notif_white_title': { ar: 'الأيام البيض', en: 'The White Days' },
        'fasting_notif_white_body': { ar: 'غداً أول الأيام البيض (١٣، ١٤، ١٥) — صيام ثلاثة أيام من كل شهر', en: 'Tomorrow begins the White Days (13, 14, 15) — fasting 3 days each month' },
        'fasting_notif_shawwal_title': { ar: 'صيام ٦ من شوال', en: '6 Days of Shawwal' },
        'fasting_notif_shawwal_body': { ar: 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر', en: 'Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the entire year' },
        'fasting_notif_dhul_hijjah_title': { ar: 'عشر ذي الحجة', en: 'First 10 of Dhul Hijjah' },
        'fasting_notif_dhul_hijjah_body': { ar: 'غداً من أيام العشر — ما من أيام العمل الصالح فيهن أحب إلى الله', en: 'Tomorrow is one of the blessed 10 days — no days are more beloved to Allah for good deeds' },
        'fasting_notif_ashura_title': { ar: 'تاسوعاء وعاشوراء', en: "Tasu'a and Ashura" },
        'fasting_notif_ashura_body': { ar: 'يوم ٩ و١٠ محرم — صيام يوم عاشوراء يكفّر السنة التي قبله', en: "Days 9 & 10 of Muharram — fasting Ashura expiates the previous year's sins" },

        // Shawwal banner (Part 2)
        'shawwal_title': { ar: 'صيام ٦ أيام من شوال', en: 'Fasting 6 Days of Shawwal' },
        'shawwal_hadith': { ar: 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر', en: 'Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the entire year' },
        'shawwal_complete': { ar: 'أكملت صيام ٦ من شوال — بارك الله فيك', en: 'You completed 6 days of Shawwal — may Allah bless you' },

        // Sunnah fasting badge tooltips (Part 1)
        'sunnah_monday_thursday': { ar: 'يوم الاثنين أو الخميس', en: 'Monday or Thursday' },
        'sunnah_white_days': { ar: 'الأيام البيض', en: 'White Days' },
        'sunnah_dhul_hijjah': { ar: 'أيام العشر من ذي الحجة', en: 'First 10 of Dhul Hijjah' },
        'sunnah_ashura': { ar: 'تاسوعاء / عاشوراء', en: "Tasu'a / Ashura" }
    }

};
