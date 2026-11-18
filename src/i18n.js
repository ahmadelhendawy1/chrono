/* English + Arabic strings for every widget and the settings window. */
(function () {
  const S = {
    en: {
      weather: 'Weather', analog: 'Analog clock', digital: 'Digital clock', calendar: 'Calendar', world: 'World time', notes: 'Sticky notes', calc: 'Calculator', prayer: 'Prayer times',
      hide: 'Hide widget', settings: 'Settings', refresh: 'Refresh', updated: 'Updated', offline: 'Offline – showing last forecast', noData: 'No weather yet', loading: 'Loading…',
      feels: 'Feels like', humidity: 'Humidity', wind: 'Wind', kmh: 'km/h', high: 'H', low: 'L', today: 'Today',
      cond: { clear_day: 'Sunny', clear_night: 'Clear', mostly_clear_day: 'Mostly sunny', mostly_clear_night: 'Mostly clear', partly_cloudy_day: 'Partly cloudy', partly_cloudy_night: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain', heavy_rain: 'Heavy rain', showers_day: 'Showers', showers_night: 'Showers', sleet: 'Sleet', snow: 'Snow', thunderstorm: 'Thunderstorm', wind: 'Windy' },
      prev: 'Previous', next: 'Next', yesterday: 'Yesterday', tomorrow: 'Tomorrow', sameDay: 'Today',
      newNote: 'New note', delNote: 'Delete note', popOut: 'Pop out as floating note', notePh: 'Type your note…', close: 'Close',
      angle: 'Angle', deg: 'DEG', rad: 'RAD', sci: 'Scientific', err: 'Error',
      nextPrayer: 'Next prayer', inTime: 'in', qibla: 'Qibla', fromNorth: 'from North',
      pray: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
      // settings
      sGeneral: 'General', sWidgets: 'Widgets', sLocation: 'Location', sWeather: 'Weather', sClock: 'Clocks', sCalendar: 'Calendar', sWorld: 'World time', sPrayer: 'Prayer times', sAbout: 'About',
      language: 'Language', theme: 'Theme', themeGlass: 'Glass (navy)', themeDark: 'Dark', themeLight: 'Light',
      layout: 'Layout', layoutBar: 'Sidebar (Windows 7 style)', layoutFree: 'Free-floating', pinned: 'Pinned – always show', pinnedHelp: 'Turn off to let Chrono hide by itself and slide back out when the mouse touches the screen edge. Same as the pin button at the top of the sidebar.', pinTip: 'Pin – always show', unpinTip: 'Unpin – hide and show at the screen edge', edgeSide: 'Screen edge', widgetsMenu: 'Widgets', noWidgets: 'All widgets are off – click to turn some on', barSide: 'Sidebar edge', right: 'Right', left: 'Left',
      alwaysTop: 'Keep widgets above other windows', lock: 'Lock widget positions', autostart: 'Start Chrono with Windows', opacity: 'Widget background opacity', scale: 'Widget size', hour12: '12-hour time (AM/PM)',
      reset: 'Reset all settings', resetConfirm: 'Reset every Chrono setting to its default?',
      widgetsHelp: 'Turn widgets on or off. In sidebar mode the order below is the order on the bar.', moveUp: 'Move up', moveDown: 'Move down',
      desc: { analog: '10 HD dials, all with numbers', weather: '5 or 8 day forecast, HD icons', prayer: 'Offline times, countdown, Qibla', calendar: 'Gregorian + Hijri month', digital: '6 digital styles', world: 'Time in cities around the world', notes: 'Notes that can float on the desktop', calc: 'Standard and scientific' },
      searchCity: 'Search a city…', search: 'Search', current: 'Current location', setLoc: 'Use this location', noResults: 'No results', searchFailed: 'Search failed – check your internet connection',
      units: 'Temperature unit', celsius: 'Celsius (°C)', fahrenheit: 'Fahrenheit (°F)', forecastDays: 'Forecast length', days5: '5 days', days8: '8 days', wLayout: 'Widget layout', wFull: 'Full (today + days)', wStrip: 'Thin row of days only', refreshNow: 'Refresh now', dataBy: 'Weather data by Open-Meteo.com (free, no account)',
      face: 'Clock face', showSeconds: 'Show second hand / seconds', sweep: 'Smooth sweeping second hand', showDate: 'Show date', digStyle: 'Digital style', showAmPm: 'Show AM/PM', showHijri: 'Show Hijri date',
      weekStart: 'Week starts on', sat: 'Saturday', sun: 'Sunday', mon: 'Monday', showHijriCal: 'Show Hijri dates', hijriOffset: 'Hijri date correction (days)', hijriNote: 'Hijri dates use the Umm al-Qura calendar. Adjust by ±2 days to match your local moon-sighting announcement.',
      yourCities: 'Your cities', addCity: 'Add a city', remove: 'Remove', worldSeconds: 'Show seconds',
      method: 'Calculation method', asr: 'Asr calculation', asrStd: 'Standard (Shafi, Maliki, Hanbali)', asrHanafi: 'Hanafi', adjust: 'Fine-tune (minutes)', notify: 'Desktop notification at prayer time', remind: 'Reminder before prayer', off: 'Off', minutes: 'minutes', showSunrise: 'Show sunrise', showQibla: 'Show Qibla direction', widgetLang: 'Language for each widget', widgetLangHelp: 'Switch the language of a single widget – or press the ع / EN button that appears when you hover over it.', auto: 'Auto', pLayout: 'Widget layout', pFull: 'All prayers', pNext: 'Next prayer only', barFit: 'Auto-fit the sidebar to the screen height', widgetSizes: 'Individual widget sizes', widgetSizesHelp: 'Tip: hold Ctrl and scroll the mouse wheel over any widget to resize just that widget. In the sidebar, widgets can shrink but not grow beyond the column – switch to free-floating to enlarge them.', reset100: 'Reset',
      prayerNote: 'Times are calculated on your PC from the location set in the Location tab – no internet needed. Always compare with your local mosque or official timetable and use the fine-tune boxes to match it.',
      aboutText: 'Chrono – desktop widget bar. Weather, clocks, calendar, calculator, world time, sticky notes and prayer times in one tray app.', tray: 'Chrono lives in the system tray (near the clock). Left-click it to show or hide all widgets, right-click for the menu.'
    },
    ar: {
      weather: 'الطقس', analog: 'ساعة عقارب', digital: 'ساعة رقمية', calendar: 'التقويم', world: 'التوقيت العالمي', notes: 'ملاحظات لاصقة', calc: 'آلة حاسبة', prayer: 'مواقيت الصلاة',
      hide: 'إخفاء الودجت', settings: 'الإعدادات', refresh: 'تحديث', updated: 'آخر تحديث', offline: 'لا يوجد إنترنت – آخر توقعات محفوظة', noData: 'لا توجد بيانات طقس بعد', loading: 'جاري التحميل…',
      feels: 'الإحساس', humidity: 'الرطوبة', wind: 'الرياح', kmh: 'كم/س', high: 'عظمى', low: 'صغرى', today: 'اليوم',
      cond: { clear_day: 'مشمس', clear_night: 'صافي', mostly_clear_day: 'مشمس غالباً', mostly_clear_night: 'صافي غالباً', partly_cloudy_day: 'غائم جزئياً', partly_cloudy_night: 'غائم جزئياً', cloudy: 'غائم', fog: 'ضباب', drizzle: 'رذاذ', rain: 'مطر', heavy_rain: 'أمطار غزيرة', showers_day: 'زخات مطر', showers_night: 'زخات مطر', sleet: 'مطر متجمد', snow: 'ثلج', thunderstorm: 'عاصفة رعدية', wind: 'رياح' },
      prev: 'السابق', next: 'التالي', yesterday: 'أمس', tomorrow: 'غداً', sameDay: 'اليوم',
      newNote: 'ملاحظة جديدة', delNote: 'حذف الملاحظة', popOut: 'افصلها كملاحظة عائمة', notePh: 'اكتب ملاحظتك…', close: 'إغلاق',
      angle: 'زاوية', deg: 'درجة', rad: 'راديان', sci: 'علمية', err: 'خطأ',
      nextPrayer: 'الصلاة القادمة', inTime: 'بعد', qibla: 'القبلة', fromNorth: 'من الشمال',
      pray: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
      sGeneral: 'عام', sWidgets: 'الودجات', sLocation: 'الموقع', sWeather: 'الطقس', sClock: 'الساعات', sCalendar: 'التقويم', sWorld: 'التوقيت العالمي', sPrayer: 'مواقيت الصلاة', sAbout: 'عن البرنامج',
      language: 'اللغة', theme: 'المظهر', themeGlass: 'زجاجي (كحلي)', themeDark: 'داكن', themeLight: 'فاتح',
      layout: 'طريقة العرض', layoutBar: 'شريط جانبي (زي ويندوز 7)', layoutFree: 'ودجات حرة', pinned: 'مثبّت – ظاهر على طول', pinnedHelp: 'اقفلها عشان كرونو يستخبى لوحده ويطلع تاني لما الماوس يلمس طرف الشاشة. نفس زرار الدبوس اللي فوق الشريط.', pinTip: 'تثبيت – ظاهر على طول', unpinTip: 'فك التثبيت – يستخبى ويطلع من طرف الشاشة', edgeSide: 'طرف الشاشة', widgetsMenu: 'الودجات', noWidgets: 'كل الودجات مقفولة – اضغط هنا عشان تشغّلها', barSide: 'جهة الشريط', right: 'يمين', left: 'يسار',
      alwaysTop: 'خلّي الودجات فوق باقي النوافذ', lock: 'تثبيت مواضع الودجات', autostart: 'شغّل Chrono مع ويندوز', opacity: 'شفافية خلفية الودجات', scale: 'حجم الودجات', hour12: 'نظام 12 ساعة (ص/م)',
      reset: 'استرجاع كل الإعدادات الافتراضية', resetConfirm: 'هترجّع كل إعدادات Chrono للوضع الافتراضي، متأكد؟',
      widgetsHelp: 'شغّل أو أوقف أي ودجت. في وضع الشريط الجانبي، الترتيب هنا هو ترتيبها على الشريط.', moveUp: 'لأعلى', moveDown: 'لأسفل',
      desc: { analog: '10 وجوه HD كلها بأرقام', weather: 'توقعات 5 أو 8 أيام بأيقونات HD', prayer: 'مواقيت بدون إنترنت، عدّاد، القبلة', calendar: 'شهر ميلادي + هجري', digital: '6 أشكال رقمية', world: 'الوقت في مدن العالم', notes: 'ملاحظات تعوم على سطح المكتب', calc: 'عادية وعلمية' },
      searchCity: 'ابحث عن مدينة…', search: 'بحث', current: 'الموقع الحالي', setLoc: 'استخدم هذا الموقع', noResults: 'مفيش نتائج', searchFailed: 'فشل البحث – اتأكد من الإنترنت',
      units: 'وحدة الحرارة', celsius: 'مئوي (°م)', fahrenheit: 'فهرنهايت (°ف)', forecastDays: 'مدة التوقعات', days5: '5 أيام', days8: '8 أيام', wLayout: 'شكل الودجت', wFull: 'كامل (اليوم + الأيام)', wStrip: 'صف رفيع للأيام فقط', refreshNow: 'حدّث دلوقتي', dataBy: 'بيانات الطقس من Open-Meteo.com (مجانية وبدون حساب)',
      face: 'وجه الساعة', showSeconds: 'إظهار عقرب الثواني', sweep: 'عقرب ثواني انسيابي', showDate: 'إظهار التاريخ', digStyle: 'الشكل الرقمي', showAmPm: 'إظهار ص/م', showHijri: 'إظهار التاريخ الهجري',
      weekStart: 'بداية الأسبوع', sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', showHijriCal: 'إظهار التواريخ الهجرية', hijriOffset: 'تعديل التاريخ الهجري (أيام)', hijriNote: 'التاريخ الهجري على تقويم أم القرى. عدّله بيوم أو يومين زيادة أو نقصان ليطابق إعلان رؤية الهلال عندك.',
      yourCities: 'مدنك', addCity: 'إضافة مدينة', remove: 'حذف', worldSeconds: 'إظهار الثواني',
      method: 'طريقة الحساب', asr: 'حساب العصر', asrStd: 'قياسي (شافعي، مالكي، حنبلي)', asrHanafi: 'حنفي', adjust: 'ضبط دقيق (بالدقائق)', notify: 'إشعار على سطح المكتب وقت الصلاة', remind: 'تنبيه قبل الصلاة', off: 'إيقاف', minutes: 'دقيقة', showSunrise: 'إظهار الشروق', showQibla: 'إظهار اتجاه القبلة', widgetLang: 'لغة كل ودجت', widgetLangHelp: 'غيّر لغة ودجت واحدة بس – أو اضغط زرار ع / EN اللي بيظهر لما تقف عليها بالماوس.', auto: 'تلقائي', pLayout: 'شكل الودجت', pFull: 'كل الصلوات', pNext: 'الصلاة القادمة بس', barFit: 'ضبط الشريط تلقائياً على ارتفاع الشاشة', widgetSizes: 'حجم كل ودجت لوحده', widgetSizesHelp: 'نصيحة: اضغط Ctrl ولف عجلة الماوس فوق أي ودجت عشان تغيّر حجمها لوحدها. في الشريط الجانبي تقدر تصغّرها لكن مش تكبّرها أكتر من عرض الشريط – استخدم الودجات الحرة للتكبير.', reset100: 'استرجاع',
      prayerNote: 'المواقيت بتتحسب على جهازك من الموقع المحدد في تبويب الموقع – من غير إنترنت. قارنها دايماً بمسجد منطقتك أو الإمساكية الرسمية واستخدم خانات الضبط الدقيق لتطابقها.',
      aboutText: 'Chrono – شريط ودجات لسطح المكتب. طقس وساعات وتقويم وآلة حاسبة وتوقيت عالمي وملاحظات لاصقة ومواقيت صلاة في برنامج واحد.', tray: 'Chrono بيشتغل من صينية النظام (جنب الساعة). كليك شمال لإظهار أو إخفاء كل الودجات، وكليك يمين للقائمة.'
    }
  };
  window.makeT = function (lang) {
    const L = S[lang === 'ar' ? 'ar' : 'en'];
    return function t(key) {
      const parts = key.split('.');
      let v = L;
      for (const p of parts) { v = v && v[p]; }
      if (v === undefined) { v = S.en; for (const p of parts) { v = v && v[p]; } }
      return v === undefined ? key : v;
    };
  };
})();
