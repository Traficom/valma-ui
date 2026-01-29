import React, { useState } from 'react';
import path from "path";
import { searchEMMEPython } from './search_emme_pythonpath';
import versions from '../versions';

const Settings = ({
  settings,
  settingsList,
  setProjectFolder,
  setEMMEPythonPath,
  setValmaScriptsPath,
  dlValmaScriptsVersion,
  isDownloadingValmaScripts,
  setBaseDataFolder,
  setProjectName,
  cancel,
  promptModelSystemDownload,
  saveSetting,
  selectBaseSettings,
  setModeDestCalibrationFile,
  setMunicipalityCalibrationFile,
}) => {
  const [selectedBaseSettings, setSelectedBaseSettings] = useState('');

  const handleSelectBaseSettings = (settingsId) => {
    setSelectedBaseSettings(settingsId);
    if (settingsId !== "") {
      selectBaseSettings(settingsId);
    }
  }

  const handleCancel = () => {
    setSelectedBaseSettings("")
    cancel();
  }

  const handleSave = () => {
    setSelectedBaseSettings("")
    saveSetting();
  }

  return (
    <div className="Settings">

      <div className="Settings__overlay" onClick={(e) => handleCancel()}>{/* Dark background overlay */}</div>

      <div className="Settings__dialog">

        <div className="Settings__dialog-controls" onClick={(e) => handleCancel()}></div>

        <div className="Settings__dialog-heading">Projektin asetukset</div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Projektin nimi</span>
          <div className="Settings_select">
            <input id="project_name"
              className="Settings__name_input"
              value={settings.project_name}
              type='text'
              disabled={false}
              autoFocus={true}
              onChange={(e) => {
                setProjectName(e.target.value);
              }}
            /></div>
        </div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Valitse toinen projekti pohjaksi</span>
          <div className="Settings_select">
            <select value={selectedBaseSettings} onChange={e => handleSelectBaseSettings(e.target.value)}>
              <option key={"setting_select"} value={""}>--- valitse ---</option>
              {settingsList && settingsList.map((setting) =>
                <option key={setting.id} value={setting.id}>{setting.project_name}</option>)
              }
            </select>
          </div>
        </div>
        {/* File path to EMME project reference-file (generally same in all scenarios of a given VLEM project) */}
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Projektikansio</span>
          <label className="Settings__pseudo-file-select bg_plus" htmlFor="hidden-input-project-folder" title={settings.project_folder}>
            {settings.project_folder ? path.basename(settings.project_folder) : "Valitse.."}
          </label>
          <input className="Settings__hidden-input"
            id="hidden-input-project-folder"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.project_folder ? settings.project_folder : "",
                properties: ['openDirectory']
              }).then((e) => {
                if (!e.canceled) {
                  setProjectFolder(e.filePaths[0]);
                }
              })
            }}
          />
        </div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Emme Python v311</span>
          <label className="Settings__pseudo-file-select" htmlFor="hidden-input-emme-python-path" title={settings.emme_python_path}>
            {settings.emme_python_path ? path.basename(settings.emme_python_path) : "Valitse.."}
          </label>
          <input className="Settings__hidden-input"
            id="hidden-input-emme-python-path"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.emme_python_path ? settings.emme_python_path : path.resolve('/'),
                filters: [
                  { name: 'Executable', extensions: ['exe'] },
                  { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
              }).then((e) => {
                if (!e.canceled) {
                  setEMMEPythonPath(e.filePaths[0]);
                }
              })
            }}
          />
          <button className="Settings__input-btn"
            onClick={(e) => {
              const [found, pythonPath] = searchEMMEPython();
              if (found) {
                if (confirm(`Python ${versions.emme_python} löytyi sijainnista:\n\n${pythonPath}\n\nHaluatko käyttää tätä sijaintia?`)) {
                  setEMMEPythonPath(pythonPath);
                }
              } else {
                alert(`Emme ${versions.emme_system} ja Python ${versions.emme_python} eivät löytyneet oletetusta sijainnista.\n\nSyötä Pythonin polku manuaalisesti.`);
              }
            }}
          >
            Hae Python automaattisesti
          </button>
        </div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">valma model system</span>
          {isDownloadingValmaScripts ?
            <span className="Settings__pseudo-file-select bg_plus">
              Downloading model-system {dlValmaScriptsVersion === 'main' ? 'latest' : dlValmaScriptsVersion}. . .
            </span>
            :
            <label className="Settings__pseudo-file-select bg_plus" htmlFor="hidden-input-valma-scripts-path" title={settings.valma_scripts_path}>
              {settings.valma_scripts_path ? path.basename(settings.valma_scripts_path) : "Valitse.."}
            </label>
          }
          <input className="Settings__hidden-input"
            id="hidden-input-valma-scripts-path"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.valma_scripts_path ? settings.valma_scripts_path : settings.project_folder,
                properties: ['openDirectory']
              }).then((e) => {
                if (!e.canceled) {
                  setValmaScriptsPath(e.filePaths[0]);
                }
              })
            }}
          />
          <button className="Settings__input-btn"
            onClick={(e) => { promptModelSystemDownload() }}
          >
            Lataa eri versio internetist&auml;
          </button>
        </div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">L&auml;ht&ouml;datan sis&auml;lt&auml;v&auml; kansio</span>
          <label className="Settings__pseudo-file-select bg_plus" htmlFor="hidden-input-basedata-path" title={settings.base_data_folder}>
            {settings.base_data_folder ? path.basename(settings.base_data_folder) : "Valitse.."}
          </label>
          <input className="Settings__hidden-input"
            id="hidden-input-basedata-path"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.base_data_folder ? settings.base_data_folder : settings.project_folder,
                properties: ['openDirectory']
              }).then((e) => {
                if (!e.canceled) {
                  setBaseDataFolder(e.filePaths[0]);
                }
              })
            }}
          />
        </div>
          <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Kulkutapa- ja matkakohdevalinnan kalibrointitiedosto (.json)</span>
          <span>
          <label className= {"Settings__pseudo-file-select bg_plus" + (settings.mode_dest_calibration_file ? " shorter" : "")} htmlFor="hidden-input-mode-dest-calibration-path" title={settings.mode_dest_calibration_file}>
            {settings.mode_dest_calibration_file ? path.basename(settings.mode_dest_calibration_file) : "Valitse.."}
          </label>
           {settings.mode_dest_calibration_file &&
            <label className="bg_minus Settings__pseudo-file-select_minus" htmlFor="hidden-input-mode-dest-calibration-path" onClick={(e) => {
                     setModeDestCalibrationFile("");
              }}>
            </label>
           }
           </span>
          <input className="Settings__hidden-input"
            id="hidden-input-mode-dest-calibration-path"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.mode_dest_calibration_file ? settings.mode_dest_calibration_file : (settings.base_data_folder ? settings.base_data_folder : settings.project_folder),
                filters: [
                  { name: 'Executable', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
              }).then((e) => {
                if (!e.canceled) {
                  setModeDestCalibrationFile(e.filePaths[0]);
                }
              })
            }}
          />
        </div>
        <div className="Settings__dialog-input-group">
          <span className="Settings__pseudo-label semi_bold">Kunta-kunta-kalibroinnin tiedosto (.txt)</span>
            <span>
          <label className= {"Settings__pseudo-file-select bg_plus" + (settings.municipality_calibration_file ? " shorter" : "")} htmlFor="hidden-input-municipality-calibration-file" title={settings.municipality_calibration_file}>
            {settings.municipality_calibration_file ? path.basename(settings.municipality_calibration_file) : "Valitse.."}
          </label>
           {settings.municipality_calibration_file &&
            <label className="bg_minus Settings__pseudo-file-select_minus" htmlFor="hidden-input-municipality-calibration-file" onClick={(e) => {
                     setMunicipalityCalibrationFile("");
              }}>
            </label>
           }
           </span>
          <input className="Settings__hidden-input"
            id="hidden-input-municipality-calibration-file"
            type="text"
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: settings.municipality_calibration_file ? settings.municipality_calibration_file : (settings.base_data_folder ? settings.base_data_folder : settings.project_folder),
                filters: [
                  { name: 'Executable', extensions: ['txt'] },
                  { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
              }).then((e) => {
                if (!e.canceled) {
                  setMunicipalityCalibrationFile(e.filePaths[0]);
                }
              })
            }}
          />
        </div>
        <div className="Settings__scenarios-footer">
          <button
            className="Settings_btn"
            disabled={!settings.project_name || settings.project_name == ""}
            onClick={e => handleSave()}
          >
            <span>Tallenna</span>
          </button>
          <button
            className="Settings_btn"
            onClick={(e) => handleCancel()}
          >
            <span>Peruuta</span>
          </button>
        </div>
      </div>
    </div>
  )
};
