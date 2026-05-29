import React from 'react';
import './App.css';
import { createRoot } from 'react-dom/client';
import './setup/vex';
import App from './App';
import * as vexImport from 'vex-js/dist/js/vex.combined.js'
import 'vex-js/dist/css/vex.css'
import 'vex-js/dist/css/vex-theme-default.css'
import versions from '../versions';
import { searchEMMEPython } from './search_emme_pythonpath';

const vex = (vexImport as any).default ?? vexImport
vex.defaultOptions.className = 'vex-theme-default'
export default vex

const root = createRoot(document.getElementById('root')!);

root.render(
  <App
    VLEMVersion={versions.emme_system}
    versions={versions}
    searchEMMEPython={searchEMMEPython}
  />
);
