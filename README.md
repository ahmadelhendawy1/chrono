# Chrono 1.2

Desktop widget bar for Windows: weather, analog and digital clocks, calendar, calculator, world time, sticky notes and prayer times. English / Arabic per widget.

## Use
- Chrono lives in the system tray. Left-click shows/hides all widgets; right-click opens the menu (widgets, layout, lock, always-on-top, start with Windows, settings).
- Ctrl + mouse wheel over a widget resizes it. Settings > Widgets has a size slider per widget.
- Each widget has its own ع / EN switch (hover the widget), or Settings > General > "Language for each widget".
- Settings and notes are saved in `%APPDATA%\Chrono`.

## Build
```
npm install
npm test
npm run package:win
npm run installer:win
```
