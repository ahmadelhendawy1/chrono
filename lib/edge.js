'use strict';
// Screen-edge reveal helpers (pure, no Electron) - used by main.js and the tests.

// True when the cursor touches the left/right edge of the display, inside its work area (not the taskbar).
function atScreenEdge(p, display, side) {
  const b = display.bounds; const wa = display.workArea;
  const onX = side === 'left' ? p.x <= b.x + 1 : p.x >= b.x + b.width - 2;
  return onX && p.y >= wa.y && p.y < wa.y + wa.height;
}

// True when point p is inside rectangle r grown by margin m on every side.
function insideRect(p, r, m) {
  return p.x >= r.x - m && p.x < r.x + r.width + m && p.y >= r.y - m && p.y < r.y + r.height + m;
}

module.exports = { atScreenEdge, insideRect };
