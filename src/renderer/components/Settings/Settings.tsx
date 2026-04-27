import React, { useState } from 'react';
import { FileFilter } from 'electron';
import './Settings.css';
import { searchEMMEPython } from './../../search_emme_pythonpath';
import versions from '../../../versions';
/* ----------------------------- Types ----------------------------- */

interface ProjectSetting {
  id: string;
  project_name: string;
  project_folder: string;
  valma_scripts_path: string;
  emme_python_path: string;
  base_data_folder: string;
  mode_dest_calibration_file: string;
  municipality_calibration_file: string;
}

interface SettingsProps {
  settings: ProjectSetting;
  settingsList: ProjectSetting[];

  setProjectFolder: (path: string) => void;
  setEMMEPythonPath: (path: string) => void;
  setValmaScriptsPath: (path: string) => void;
  setBaseDataFolder: (path: string) => void;
  setProjectName: (name: string) => void;

  setModeDestCalibrationFile: (path: string) => void;
  setMunicipalityCalibrationFile: (path: string) => void;

  selectBaseSettings: (id: string) => void;
  promptModelSystemDownload: () => void;
  saveSetting: () => void;
  cancel: () => void;

  dlValmaScriptsVersion?: string;
  isDownloadingValmaScripts: boolean;
}

/* ----------------------------- Component ----------------------------- */

const Settings: React.FC<SettingsProps> = ({
  settings,
  settingsList,
  setProjectFolder,
  setEMMEPythonPath,
  setValmaScriptsPath,
  setBaseDataFolder,
  setProjectName,
  cancel,
  promptModelSystemDownload,
  saveSetting,
  selectBaseSettings,
  setModeDestCalibrationFile,
  setMunicipalityCalibrationFile,
  dlValmaScriptsVersion,
  isDownloadingValmaScripts,
}) => {
  const [selectedBaseSettings, setSelectedBaseSettings] = useState<string>('');
  const fsHelpers = window.fsHelpers;

  const handleSelectBaseSettings = (settingsId: string) => {
    setSelectedBaseSettings(settingsId);
    if (settingsId !== '') {
      selectBaseSettings(settingsId);
    }
  };

  const handleCancel = () => {
    setSelectedBaseSettings('');
    cancel();
  };

  const handleSave = () => {
    setSelectedBaseSettings('');
    saveSetting();
  };

const path = window.api.path;
const windowFileDialog = window.api.openFileDialog;

const openFolderDialog = async (inputPath?: string) => {
  const defaultPath =
    inputPath && path.extname(inputPath)
      ? path.dirname(inputPath)
      : inputPath;

  const result = await windowFileDialog({
    defaultPath,
    properties: ['openDirectory'],
  });

  return result.canceled ? null : result.filePaths[0];
};



const openFileDialog = async (path: string, filters: FileFilter[]) => {
  const result = await windowFileDialog({ defaultPath: path, properties: ['openFile'], filters: filters});
  return result.canceled ? null : result.filePaths[0];
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
            {settings.project_folder ? settings.project_folder : "Valitse.."}
          </label>
          <input className="Settings__hidden-input"
            id="hidden-input-project-folder"
            type="text"
            onClick={async () => {
                const folder = await openFolderDialog(
                  settings.project_folder || ''
                );
                if (folder) {
                  setProjectFolder(path.dirname(folder));
                }
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
            onClick={async () => {
              const file = await openFileDialog(
                settings.emme_python_path || path.resolve('/'),
                 [
                  { name: 'Executable', extensions: ['exe'] },
                  { name: 'All Files', extensions: ['*'] },
                 ],
              );

              if (file) {
                setEMMEPythonPath(file);
              }
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
            onClick={async () => {
              const folder = await openFolderDialog(
                settings.valma_scripts_path || settings.project_folder,
              );

              if (folder) {
                setValmaScriptsPath(folder);
              }
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
              openFolderDialog(
              settings.base_data_folder ? settings.base_data_folder : settings.project_folder
              ).then((e) => {
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
            onClick={async () => {
              const file = await openFileDialog(
                  settings.mode_dest_calibration_file ||
                  settings.base_data_folder ||
                  settings.project_folder,
                [
                  { name: 'Executable', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] },
                ]
              );

              if (file) {
                setModeDestCalibrationFile(file);
              }
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
            onClick={async () => {
              const file = await openFileDialog(
                settings.municipality_calibration_file ? settings.municipality_calibration_file : (settings.base_data_folder ? settings.base_data_folder : settings.project_folder),
                [
                  { name: 'Executable', extensions: ['txt'] },
                  { name: 'All Files', extensions: ['*'] }
                ],
              );

              if (file) {
                setMunicipalityCalibrationFile(file);
              }
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
  );
};

export default Settings;