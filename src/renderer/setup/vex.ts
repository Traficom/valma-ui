import vex from 'vex-js';
import 'vex-js/dist/css/vex.css';
import 'vex-js/dist/css/vex-theme-default.css';

vex.defaultOptions.className = 'vex-theme-default';

// Expose to window for legacy usage (important)
declare global {
  interface Window {
    vex: typeof vex;
  }
}

window.vex = vex;

export default vex;