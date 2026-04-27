import React from 'react';
import './App.css';
import { createRoot } from 'react-dom/client';
import './setup/vex';
import App from './App';


import versions from '../versions';
import { searchEMMEPython } from './search_emme_pythonpath';


const root = createRoot(document.getElementById('root')!);

root.render(
  <App
    VLEMVersion={versions.emme_system}
    versions={versions}
    searchEMMEPython={searchEMMEPython}
  />
);
