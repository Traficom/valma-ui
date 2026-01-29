import React, { useState, useEffect, useRef } from 'react';
import Store from 'electron-store';
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip } from 'react-tooltip'
import { renderToStaticMarkup } from 'react-dom/server';


const homedir = require('os').homedir();
const { ipcRenderer, shell } = require('electron');
const { exec } = require('child_process');
const path = require('path');

const emptySetting = {
  id: "",
  project_name: "",
  project_folder: "",
  valma_scripts_path: "",
  emme_python_path: "",
  base_data_folder: "",
  mode_dest_calibration_file: "",
  municipality_calibration_file: "",
}

// vex-js imported globally in index.html, since we cannot access webpack config in electron-forge

const App = ({ VLEMVersion, versions, searchEMMEPython }) => {

  // Global settings
  const [isSettingsOpen, setSettingsOpen] = useState(false); // whether Settings -dialog is open
  const [isProjectRunning, setProjectRunning] = useState(false); // whether currently selected Project is running
  const [isDownloadingValmaScripts, setDownloadingValmaScripts] = useState(false); // whether downloading "/Scripts" is in progress
  const [dlValmaScriptsVersion, setDlValmaScriptsVersion] = useState(undefined); // which version is being downloaded
  const [settingInHandling, setSettingInHandling] = useState({ ...emptySetting });
  const [projectSettings, setProjectSettings] = useState([]); // Project settings
  const [selectedSettingsId, setSelectedSettingsId] = useState(undefined); // Selected settings id
  const [isLoading, setLoading] = useState(false); // whether Loading -dialog is open
  const [loadingHeading, setLoadingHeading] = useState(''); // Loading heading
  const [loadingInfo, setLoadingInfo] = useState(''); // Loading info
  const [errorShown, setErrorShown] = useState(false); // whether LemError -dialog is open
  const [errorInfo, setErrorInfo] = useState(''); // Error info
  const [isCreateEmmeBankModalOpen, setCreateEmmeBankModalOpen] = useState(false); // whether create Emme project -dialog is open

  // Global settings store contains selected_settings_id and settings
  const globalSettingsStore = useRef(new Store());

  function saveNewSetting(newSetting) {
    const newId = uuidv4(newId);
    setSelectedSettingsId(newId)
    setProjectSettings(prevState => {
      const newSettings = [
        ...prevState,
        {
          ...newSetting,
          id: newId
        }
      ]
      globalSettingsStore.current.set('settings', JSON.stringify(newSettings));
      globalSettingsStore.current.set('selected_settings_id', newId);
      return newSettings;
    });
  }

  function saveSettingChanges(setting) {
    setProjectSettings(prevState => constructAndSaveNewSettingsState(setting, prevState));
  }

  function openSettings(){
    setCreateEmmeBankModalOpen(false);
    setDownloadingValmaScripts(false);
    setSettingsOpen(true);
  }

  function saveSetting() {
    if (settingInHandling.id == "") {
      saveNewSetting({ ...settingInHandling });
    } else {
      saveSettingChanges({ ...settingInHandling });
    }
    _createProject();
    setSettingsOpen(false);
  }

  function constructAndSaveNewSettingsState(setting, prevState) {
    const index = prevState.map(s => s.id).indexOf(setting.id);
    const newSettings = [...prevState];
    newSettings[index].project_folder = setting.project_folder;
    newSettings[index].valma_scripts_path = setting.valma_scripts_path;
    newSettings[index].emme_python_path = setting.emme_python_path;
    newSettings[index].base_data_folder = setting.base_data_folder;
    newSettings[index].project_name = setting.project_name;
    newSettings[index].mode_dest_calibration_file = setting.mode_dest_calibration_file;
    newSettings[index].municipality_calibration_file = setting.municipality_calibration_file;
    globalSettingsStore.current.set('settings', JSON.stringify(newSettings));
    globalSettingsStore.current.set('selected_settings_id', setting.id);
    return newSettings;
  }

  function saveAutomaticallyFixedSetting(modifiedSetting, settingsArray) {
    const newSettings = constructAndSaveNewSettingsState(modifiedSetting, settingsArray);
    setProjectSettings(newSettings);
    setSettingInHandling(modifiedSetting);
    setSelectedSettingsId(modifiedSetting.id);
  }

  function cancel() {
    const existingSelectedSettingId = globalSettingsStore.current.get('selected_settings_id');
    setSelectedSettingsId(existingSelectedSettingId);
    setSettingInHandling(findSetting(projectSettings, existingSelectedSettingId));
    setSettingsOpen(false);
    closeError();
  }

  function selectSetting(newSettingId) {
    setSelectedSettingsId(newSettingId);
    setSettingInHandling(findSetting(projectSettings, newSettingId));
    globalSettingsStore.current.set('selected_settings_id', newSettingId);
  }

  function findSetting(settings, settingId) {
    if (settings && settingId) {
      return settings.find((setting) => setting.id == settingId);
    }
    return { ...emptySetting };
  }

  function addNewSetting() {
    setSettingInHandling({ ...emptySetting });
    setSelectedSettingsId(undefined);
    openSettings();
  }

  function selectBaseSettings(settingsId) {
    const selectedBaseSetting = findSetting(projectSettings, settingsId);
    setSettingInHandling({
      ...settingInHandling,
      project_folder: selectedBaseSetting.project_folder,
      valma_scripts_path: selectedBaseSetting.valma_scripts_path,
      emme_python_path: selectedBaseSetting.emme_python_path,
      base_data_folder: selectedBaseSetting.base_data_folder,
    });
  }

  const setModeDestCalibrationFile = (newPath) => {
    setSettingInHandling({ ...settingInHandling, mode_dest_calibration_file: cutUnvantedCharacters(newPath) });
  };

    const setMunicipalityCalibrationFile = (newPath) => {
    setSettingInHandling({ ...settingInHandling, municipality_calibration_file: cutUnvantedCharacters(newPath) });
  };

  function deleteSetting() {
    const settingIdForDelete = selectedSettingsId;
    const settingsAfterDelete = projectSettings.filter((s) => s.id !== settingIdForDelete);
    const newSelectedSetting = settingsAfterDelete[0];
    setSelectedSettingsId(newSelectedSetting.id);
    setSettingInHandling({ ...newSelectedSetting });
    setProjectSettings(settingsAfterDelete);
    globalSettingsStore.current.set('settings', JSON.stringify(settingsAfterDelete));
    globalSettingsStore.current.set('selected_settings_id', newSelectedSetting.id);
    setSettingsOpen(false);
  }

  const handleDeleteSetting = () => {
    if (selectedSettingsId && selectedSettingsId != '') {
      if (projectSettings.length == 1) {
        showError("Viimeistä määriteltyä asetusta ei voi poistaa.");
      } else {
        vex.dialog.confirm({
          message: 'Oletko varma että haluat poistaa asetukset?',
          callback: function (value) {
            if (value) {
              deleteSetting();
            }
          }
        })
      }
    }
  };

  const handleEditSetting = () => {
    if (selectedSettingsId && selectedSettingsId != '') {
      openSettings();
    }
  };

  const showError = (errorInfo) => {
    setErrorInfo(errorInfo);
    setErrorShown(true);
  };

  const closeError = () => {
    setErrorShown(false);
    setErrorInfo('');
  };

  const _setProjectName = (newProjectName) => {
    setSettingInHandling({ ...settingInHandling, project_name: cutUnvantedCharacters(newProjectName) });
  };

  const _setEMMEPythonPath = (newPath) => {
    setSettingInHandling({ ...settingInHandling, emme_python_path: cutUnvantedCharacters(newPath) });
  };

  const _setProjectFolder= (newPath) => {
    setSettingInHandling({ ...settingInHandling, project_folder: cutUnvantedCharacters(newPath) });
  };

  function resolvePipFilePath(pythonPath) {
    if (!pythonPath) {
      return '';
    }
    const pipFilePath = pythonPath + "\\" + "Scripts\\" + "pip.exe";
    if (fs.existsSync(pipFilePath)) {
      return pipFilePath;
    }

    const pipFilePathOldLocation = pythonPath + "\\" + "pip.exe";
    if (fs.existsSync(pipFilePathOldLocation)) {
      return pipFilePathOldLocation;
    }
    return '';
  }

  const executePipInstallCommand = (command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  };

  const runPipInstall = async (pipFilePath, pipRequirementsPath) => {

    try {
      const { stdout, stderr } = await executePipInstallCommand(`"${pipFilePath}" install --user -r "${pipRequirementsPath}"`);
      if (stderr) {
        setLoadingInfo('PIP-asennus onnistui, mutta kutsu palautti seuraavan viestin: ' + stderr);
      } else {
        setLoadingInfo('PIP-asennus onnistui');
      }
    } catch (error) {
      setLoadingInfo('Pip asennus epäonnistui. Sovellus saattaa toimia puutteellisesti. Virhe: ' + error.message);
    }
  };

  function setInstallingPipInProgress() {
    setLoading(true);
    setLoadingHeading('Tehdään PIP-asennusta');
    setLoadingInfo('asennus on kesken...');
  }

  function setCreatingEmmeBankInProgress() {
    setLoading(true);
    setLoadingHeading('Luodaan Emme-projektia');
    setLoadingInfo('projektin luominen on kesken...');
  }

  const _setValmaScriptsPath = (newPath) => {
    const pythonPath = settingInHandling.emme_python_path;
    const userGivenPath = cutUnvantedCharacters(newPath);

    const pipFilePath = resolvePipFilePath(path.dirname(pythonPath));
    if (pipFilePath == '') {
      const errorMessage  = pythonPath ? 'pip.exe-sovellusta ei löydy sijainnista: ' + pythonPath : 'Pythonin sijaintia ei ole annettu'
      showError(errorMessage + '. Tarkista Emme Python - asetus.');
      return;
    }

    const pipRequirementsPath = path.join(userGivenPath, "requirements.txt");
    if (!fs.existsSync(pipRequirementsPath)) {
      showError('Tarvittavaa requirements.txt-tiedostoa ei löydy sijainnista:' + pipRequirementsPath);
      return;
    }
    setSettingInHandling({ ...settingInHandling, valma_scripts_path: cutUnvantedCharacters(userGivenPath) });
    setInstallingPipInProgress();
    runPipInstall(pipFilePath, pipRequirementsPath);
  };

  const _setBaseDataFolder= (newPath) => {
    setSettingInHandling({ ...settingInHandling, base_data_folder: cutUnvantedCharacters(newPath) });
  };

  const _closeLoadingInfo = () => {
    setLoading(false);
    setLoadingInfo('');
    setLoadingHeading('');
  };


  const _closeCreateEmmeBank = () => {
    setCreateEmmeBankModalOpen(false);
    closeError();
  };

  const _openCreateEmmeBank = () => {
    setCreateEmmeBankModalOpen(true);
  };

  const _createEmmeBank = (submodel, numberOfEmmeScenarios, separateEmmeScenarios) => {
    if (!fs.existsSync(settingInHandling.project_folder)) {
      showError('Tarkista projektikansio ' + settingInHandling.project_folder);
      return;
    }
    // If create_emme_project.py doesn't exist, alert.
    const createEmmeScript = settingInHandling.valma_scripts_path + "\\create_emme_project.py"
    if (!fs.existsSync(createEmmeScript)) {
      showError('create_emme_project.py -scriptiä ei löydy polusta ' + createEmmeScript);
      return;
    }

    if (!fs.existsSync(settingInHandling.emme_python_path)) {
      showError('Pythonia ei löydy polusta ' + settingInHandling.emme_python_path);
      return;
    }
    setCreatingEmmeBankInProgress();

    ipcRenderer.send(
      'message-from-ui-to-create-emme-bank',
      {
        project_folder: settingInHandling.project_folder,
        emme_python_path: settingInHandling.emme_python_path,
        valma_scripts_path: settingInHandling.valma_scripts_path,
        submodel: submodel,
        number_of_emme_scenarios: numberOfEmmeScenarios,
        log_level: 'DEBUG',
        project_name: settingInHandling.project_name,
        separate_emme_scenarios: separateEmmeScenarios
      }
    );

    setCreateEmmeBankModalOpen(false);
  };

  const _createProject = () => {
    ipcRenderer.send(
      'message-from-ui-to-create-project',
      {
        project_folder: settingInHandling.project_folder,
        emme_python_path: settingInHandling.emme_python_path,
        valma_scripts_path: settingInHandling.valma_scripts_path,
        project_name: settingInHandling.project_name,
      }
    );
  }

  const _promptModelSystemDownload = () => {
    fetch('https://api.github.com/repos/Traficom/lem-model-system/tags')
      .then((response) => {
        return response.json();
      })
      .then((tags) => {
        vex.dialog.open({
          message: "Valitse model-system versio:",
          input: [
            '<div className="vex-custom-field-wrapper">',
            '<select name="version">',
            tags.map((tag) => `<option value="${tag.name}">${tag.name}</option>`).join(''),
            '</select>',
            '</div>'
          ].join(''),
          callback: (data) => {
            if (!data) {
              // Cancelled
              return;
            }
            const now = new Date();
            setDlValmaScriptsVersion(data.version);
            setDownloadingValmaScripts(true);
            ipcRenderer.send(
              'message-from-ui-to-download-model-scripts',
              {
                version: data.version,
                destinationDir: homedir,
                postfix: `${('00' + now.getDate()).slice(-2)}-${('00' + now.getMonth()).slice(-2)}-${Date.now()}`, // DD-MM-epoch
              }
            );
          }
        });
      });
  };

  // Electron IPC event listeners
  const onDownloadReady = (event, savePath) => {
    const existingSettings = globalSettingsStore.current.get('settings');
    const existingSelectedSettingId = globalSettingsStore.current.get('selected_settings_id');
    const settingsAreDefined = existingSettings && existingSettings.length > 0 && existingSelectedSettingId;
    const newPathFromDownload = cutUnvantedCharacters(savePath);

    if (settingsAreDefined) {
      const settingsArray = JSON.parse(existingSettings);
      let settingInHandlingFromStore = findSetting(settingsArray, existingSelectedSettingId);

      setProjectSettings(settingsArray);
      setSelectedSettingsId(existingSelectedSettingId);
      setSettingInHandling(settingInHandlingFromStore);
      const pythonPath = settingInHandlingFromStore.emme_python_path;

      setSettingInHandling({ ...settingInHandlingFromStore, valma_scripts_path: newPathFromDownload });

      const pipFilePath = resolvePipFilePath(path.dirname(pythonPath));
      if (pipFilePath == '') {
        const errorMessage  = pythonPath ? 'pip.exe-sovellusta ei löydy sijainnista: ' + pythonPath : 'Pythonin sijaintia ei ole annettu'
        showError(errorMessage + '. Tarkista Emme Python - asetus.');
        setDownloadingValmaScripts(false);
        return;
      }

      const pipRequirementsPath = path.join(newPathFromDownload, "requirements.txt");
      if (!fs.existsSync(pipRequirementsPath)) {
        showError('Tarvittavaa requirements.txt-tiedostoa ei löydy sijainnista: ' + pipRequirementsPath);
        setDownloadingValmaScripts(false);
        return;
      }

      setInstallingPipInProgress();
      runPipInstall(pipFilePath, pipRequirementsPath);
    } else {
      setSettingInHandling({ ...emptySetting, valma_scripts_path: newPathFromDownload });
      openSettings();
    };
    setDownloadingValmaScripts(false);
  };

  const onCreatingEmmeBankReady = (event, error) => {
    if (error && error.length > 0) {
      setLoadingInfo("VIRHE ajettaessa python scriptiä create_emme_project.py\n" + error);
    } else {
      setLoadingInfo("Emme projektin luonti onnistui");
    }
  };

  const getPropertyForDisplayString = (settingProperty) => {
    const [key, value] = settingProperty;

    if (typeof value === 'string') {
      const trimmedStringValue = value.length > 30 ? "..." + value.substring(value.length - 30) : value;
      return `${key} : ${trimmedStringValue}`
    }

    return `${key} : ${value}`;
  };

  const settingsTooltipContent = (settingInHandling) => {
    return <div key="settings_tooltip_body">
      <h3>Projektin asetukset:</h3>
      {settingInHandling != undefined && settingInHandling.id != "" ? (
        <div>{
          Object.entries(settingInHandling).map(settingProperty => {
            return (
              <p key={settingProperty}>
                {getPropertyForDisplayString(settingProperty)}
              </p>);
          })}</div>
      ) : <p></p>}
    </div>
  };

  useEffect(() => {
    // Copy existing global store values to state. Remember: state updates async so refer to existing.
    const existingSettings = globalSettingsStore.current.get('settings');
    const existingSelectedSettingId = globalSettingsStore.current.get('selected_settings_id');
    const settingsAreDefined = existingSettings && existingSettings.length > 0 && existingSelectedSettingId;
    // Attach Electron IPC event listeners (to worker => UI events)
    ipcRenderer.on('download-ready', onDownloadReady);
    ipcRenderer.on('creating-emme-bank-completed', onCreatingEmmeBankReady);

    // Search for EMME's Python if not set in global store (default win path is %APPDATA%, should remain there [hidden from user])
    if (!settingsAreDefined) {
      const [found, pythonPath] = searchEMMEPython();
      if (found) {
        vex.dialog.confirm({
          message: `Python ${versions.emme_python} löytyi sijainnista:\n\n${pythonPath}\n\nHaluatko käyttää tätä sijaintia?`,
          callback: function (value) {
            if (value) {
              _setEMMEPythonPath(pythonPath);
            }
          }
        })
      }
    }

    if (settingsAreDefined) {
      const settingsArray = JSON.parse(existingSettings);
      let settingInHandlingFromStore = findSetting(settingsArray, existingSelectedSettingId);

      // If project path does not exist on set path, set it to homedir. Remember: state updates async so refer to existing.
      if (!fs.existsSync(settingInHandlingFromStore.project_folder)) {
        showError(`Projektikansiota ei löydy polusta '${settingInHandlingFromStore.project_folder}'.\nProjektikansioksi asetetaan kotikansio '${homedir}'.`);
        // Recovering from not finding valid project path
        settingInHandlingFromStore.project_folder = homedir;
        saveAutomaticallyFixedSetting(settingInHandlingFromStore, settingsArray);
      } else {
        setProjectSettings(settingsArray);
        setSelectedSettingsId(existingSelectedSettingId);
        setSettingInHandling(settingInHandlingFromStore);
      }
    }

    // If Scripts is the initial (un-set), download latest version and use that. Remember: state updates async so refer to existing.
    if (!existingSelectedSettingId) {
      vex.dialog.confirm({
        message: 'Ladataanko model-system automaattisesti? (Vaatii internet-yhteyden)',
        callback: function (value) {
          if (value) {
            _promptModelSystemDownload();
            // Else if required paths are un-set, open settings anyway
          } else if (!existingSettings || existingSettings.length == 0) {
            setProjectSettings([]);
            addNewSetting();
            showError(`Emme ${versions.emme_system} ja Python ${versions.emme_python} eivät löytyneet oletetusta sijainnista.\n\nMääritä Pythonin sijainti Projektin asetukset-dialogissa.`);
          }
        }
      })
    }
    return () => {
      // Detach Electron IPC event listeners
      ipcRenderer.removeListener('download-ready', onDownloadReady);
    }
  }, []);

  return (
    <div className={"App" + (isProjectRunning ? " App--busy" : "")}>
      {/* Pop-up global settings dialog with overlay behind it */}
      { isSettingsOpen && <div className="App__settings">
        <Settings
          settings={settingInHandling}
          settingsList={projectSettings}
          dlValmaScriptsVersion={dlValmaScriptsVersion}
          isDownloadingValmaScripts={isDownloadingValmaScripts}
          cancel={cancel}
          setProjectName={_setProjectName}
          setProjectFolder={_setProjectFolder}
          setEMMEPythonPath={_setEMMEPythonPath}
          setValmaScriptsPath={_setValmaScriptsPath}
          setBaseDataFolder={_setBaseDataFolder}
          promptModelSystemDownload={_promptModelSystemDownload}
          saveSetting={saveSetting}
          selectBaseSettings={selectBaseSettings}
          setModeDestCalibrationFile={setModeDestCalibrationFile}
          setMunicipalityCalibrationFile={setMunicipalityCalibrationFile}
        />
      </div> }
      {/* Pop-up used instead of Alert, which messes with window focus and block */}
      {errorShown && <LemError
        info={errorInfo}
        close={closeError}
      />}
      {/* Pop-up global loading dialog */}
      {isLoading &&
        <div className="App__loading">
          <Loading
            heading={loadingHeading}
            info={loadingInfo}
            close={_closeLoadingInfo}
          />
        </div>
      }

      <div className="App__CreateEmmeBank" style={{ display: isCreateEmmeBankModalOpen ? "block" : "none" }}>
        <CreateEmmeBank
          createProject={_createEmmeBank}
          handleCancel={_closeCreateEmmeBank}
        />
      </div>

      {/* UI title bar, app-version, etc. */}
      <div className="App__header">
        <span className="App__header-title">VALMA</span>
        &nbsp;
        <a className="header-documentation-link" target="_blank" onClick={() => shell.openExternal("https://github.com/Traficom/valma-docs")}></a>
      </div>
      {/* VLEM Project -specific content, including runtime- & per-scenario-settings */}
      <div className="App__body">
        <VlemProject
          projectName={settingInHandling.project_name}
          projectFolder={settingInHandling.project_folder ? settingInHandling.project_folder : homedir}
          emmePythonPath={settingInHandling.emme_python_path}
          valmaScriptsPath={settingInHandling.valma_scripts_path}
          baseDataFolder={settingInHandling.base_data_folder}
          signalProjectRunning={setProjectRunning}
          settingsId={settingInHandling.id}
          modeDestCalibrationFile={settingInHandling.mode_dest_calibration_file}
          municipalityCalibrationFile={settingInHandling.municipality_calibration_file}
          openCreateEmmeBank={_openCreateEmmeBank}
          addNewSetting={addNewSetting}
        />
      </div>

      <div className="App__settings-menu">
        <ul>
          <li>
            <div className="App__settings_select">
              <select value={selectedSettingsId} disabled={isSettingsOpen | isProjectRunning} onChange={e => selectSetting(e.target.value)}>
                {projectSettings && projectSettings.map((setting) =>
                  <option key={setting.id} value={setting.id}>{setting.project_name}</option>)
                }
              </select>
            </div>
          </li>
          <li>
            <div className="App__settings_modify">
              <div
                className={!selectedSettingsId || selectedSettingsId == '' ? "settings_disabled App__open-settings" : "App__open-settings"}
                id="settings-tooltip-anchor"
                data-tooltip-id="settings-tooltip"
                data-tooltip-html={renderToStaticMarkup(settingsTooltipContent(settingInHandling))}
                data-tooltip-delay-show={150}
                style={{ display: isSettingsOpen | isProjectRunning ? "none" : "block" }}
                onClick={(e) => handleEditSetting()}
              ><Tooltip anchorSelect="#settings-tooltip-anchor" key={"tooltip_" + settingInHandling.id} place={"bottom"} id="settings-tooltip"
                style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000" }} />
              </div>
            </div>
          </li>
          <li>
            <div className="App__settings_modify">
              <div
                className={!selectedSettingsId || selectedSettingsId == '' ? "settings_disabled App__delete_setting" : "App__delete_setting"}
                onClick={e =>
                  handleDeleteSetting(selectedSettingsId)
                }
              ></div>
            </div>
          </li>
        </ul>



      </div>
      <div className="footer"><span className="App__header-version">Versio {`${VLEMVersion}`}</span></div>
    </div>
  )
};
