import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip } from 'react-tooltip';
import { renderToStaticMarkup } from 'react-dom/server';
import { exec } from 'child_process';

import VlemProject from './components/Project/VlemProject';
import Settings from './components/Settings/Settings';
import LemError from './components/LemError';
import Loading from './components/Loading';
import CreateEmmeBank from './components/CreateEmmeBank/CreateEmmeBank';
import { cutUnvantedCharacters } from './components/cutUnvantedCharacters';
import { ProjectSetting } from './components/Project/types/ProjectSetting';

declare const vex: any;

const homedir = (window as any).system.homedir();
const path = (window as any).path;
const fs = (window as any).fs;
const pipInstall = (window as any).env.pipInstall;

const emptySetting: ProjectSetting = {
  id: "",
  project_name: "",
  project_folder: "",
  valma_scripts_path: "",
  emme_python_path: "",
  base_data_folder: "",
  mode_dest_calibration_file: "",
  municipality_calibration_file: "",
}

const App = ({ VLEMVersion, versions, searchEMMEPython }: any) => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isProjectRunning, setProjectRunning] = useState(false);
  const [isDownloadingValmaScripts, setDownloadingValmaScripts] = useState(false);
  const [dlValmaScriptsVersion, setDlValmaScriptsVersion] = useState<any>(undefined);
  const [settingInHandling, setSettingInHandling] = useState<typeof emptySetting>(emptySetting);
  const [projectSettings, setProjectSettings] = useState<any[]>([]);
  const [selectedSettingsId, setSelectedSettingsId] = useState<any>(undefined);
  const [isLoading, setLoading] = useState(false);
  const [loadingHeading, setLoadingHeading] = useState('');
  const [loadingInfo, setLoadingInfo] = useState('');
  const [errorShown, setErrorShown] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [isCreateEmmeBankModalOpen, setCreateEmmeBankModalOpen] = useState(false);

  const globalSettingsStore = useRef<any>((window as any).store);
  const ipc = (window as any).ipc;


  function resolvePipFilePath(pythonDir: string): string {
    const candidates = [
      path.join(pythonDir, 'Scripts', 'pip.exe'),
      path.join(pythonDir, 'pip.exe'),
    ];
    return candidates.find(fs.existsSync) ?? '';
  }



  async function runPipInstall(
    pipFilePath: string,
    pipRequirementsPath: string
  ) {
    try {
      setLoading(true);
      setLoadingHeading('Tehdään PIP-asennusta');
      setLoadingInfo('Asennus käynnissä…');

      const { stdout, stderr } = await pipInstall(
        pipFilePath,
        pipRequirementsPath
      );

      if (stderr && stderr.length > 0) {
        setLoadingInfo(
          'PIP-asennus onnistui, mutta palautti viestin:\n' + stderr
        );
      } else {
        setLoadingInfo('PIP-asennus onnistui');
      }
    } catch (err: any) {
      setLoadingInfo(
        'PIP-asennus epäonnistui. Sovellus saattaa toimia puutteellisesti.\n\n' +
        err
      );
    }
  }


  function constructAndSaveNewSettingsState(
    setting: ProjectSetting,
    prev: ProjectSetting[]
  ): ProjectSetting[] {
    const idx = prev.findIndex(s => s.id === setting.id);
    const next = [...prev];
    next[idx] = setting;

    globalSettingsStore.current.set('settings', next);
    globalSettingsStore.current.set('selected_settings_id', setting.id);

    return next;
  }


  function saveAutomaticallyFixedSetting(
    fixed: ProjectSetting,
    all: ProjectSetting[]
  ) {
    const updated = constructAndSaveNewSettingsState(fixed, all);
    setProjectSettings(updated);
    setSettingInHandling(fixed);
    setSelectedSettingsId(fixed.id);
  }


  function setInstallingPipInProgress() {
    setLoading(true);
    setLoadingHeading('Tehdään PIP-asennusta');
    setLoadingInfo('Asennus käynnissä…');
  }

  function setCreatingEmmeBankInProgress() {
    setLoading(true);
    setLoadingHeading('Luodaan Emme-projektia');
    setLoadingInfo('Projektin luominen käynnissä…');
  }

  function findSetting(settings: any[], id: any) {
    if (settings && id) return settings.find(s => s.id === id);
    return { ...emptySetting };
  }

  function openSettings() {
    setCreateEmmeBankModalOpen(false);
    setDownloadingValmaScripts(false);
    setSettingsOpen(true);
  }

  function saveNewSetting(newSetting: any) {
    const newId = uuidv4();
    setSelectedSettingsId(newId);
    setProjectSettings(prev => {
      const next = [...prev, { ...newSetting, id: newId }];
      globalSettingsStore.current.set('settings', next);
      globalSettingsStore.current.set('selected_settings_id', newId);
      return next;
    });
  }

  function saveSettingChanges(setting: any) {
    setProjectSettings(prev => {
      const idx = prev.map(s => s.id).indexOf(setting.id);
      const next = [...prev];
      next[idx] = { ...setting };
      globalSettingsStore.current.set('settings', next);
      globalSettingsStore.current.set('selected_settings_id', setting.id);
      return next;
    });
  }

  function saveSetting() {
    if (settingInHandling.id === "") saveNewSetting({ ...settingInHandling });
    else saveSettingChanges({ ...settingInHandling });

    ipc.send('message-from-ui-to-create-project', {
      project_folder: settingInHandling.project_folder,
      emme_python_path: settingInHandling.emme_python_path,
      valma_scripts_path: settingInHandling.valma_scripts_path,
      project_name: settingInHandling.project_name,
    });

    setSettingsOpen(false);
  }

  function cancel() {
    const id = globalSettingsStore.current.get('selected_settings_id');
    setSelectedSettingsId(id);
    setSettingInHandling(findSetting(projectSettings, id));
    setSettingsOpen(false);
    closeError();
  }

  function selectSetting(id: any) {
    setSelectedSettingsId(id);
    setSettingInHandling(findSetting(projectSettings, id));
    globalSettingsStore.current.set('selected_settings_id', id);
  }

  function addNewSetting() {
    setSettingInHandling({ ...emptySetting });
    setSelectedSettingsId(undefined);
    openSettings();
  }

  const handleEditSetting = () => {
    if (selectedSettingsId) openSettings();
  };

  const closeLoadingInfo = () => {
    setLoading(false);
    setLoadingInfo('');
    setLoadingHeading('');
  };

  function deleteSetting() {
    const rest = projectSettings.filter(s => s.id !== selectedSettingsId);
    const next = rest[0];
    setProjectSettings(rest);
    setSelectedSettingsId(next.id);
    setSettingInHandling(next);
    globalSettingsStore.current.set('settings', rest);
    globalSettingsStore.current.set('selected_settings_id', next.id);
    setSettingsOpen(false);
  }

  const handleDeleteSetting = () => {
    if (!selectedSettingsId) return;
    if (projectSettings.length === 1) {
      showError("Viimeistä määriteltyä asetusta ei voi poistaa.");
      return;
    }
    vex.dialog.confirm({
      message: 'Oletko varma että haluat poistaa asetukset?',
      callback: (value: boolean) => value && deleteSetting()
    });
  };

  const showError = (msg: string) => {
    setErrorInfo(msg);
    setErrorShown(true);
  };

  const closeError = () => {
    setErrorShown(false);
    setErrorInfo('');
  };

  function onCreatingEmmeBankReady(_: any, error: string) {
    setLoadingInfo(
      error?.length
        ? `VIRHE:\n${error}`
        : 'Emme-projekti luotu onnistuneesti'
    );
  }


  function promptModelSystemDownload() {
    fetch('https://api.github.com/repos/Traficom/lem-model-system/tags')
      .then(r => r.json())
      .then(tags => {
        vex.dialog.open({
          message: 'Valitse model-system versio:',
          input: `
          <select name="version">
            ${tags.map((t: any) =>
            `<option value="${t.name}">${t.name}</option>`
          ).join('')}
          </select>
        `,
          callback: (data: any) => {
            if (!data) return;

            const now = Date.now();
            setDlValmaScriptsVersion(data.version);
            setDownloadingValmaScripts(true);

            ipc.send(
              'message-from-ui-to-download-model-scripts',
              {
                version: data.version,
                destinationDir: homedir,
                postfix: `dl-${now}`
              }
            );
          }
        });
      });
  }

  const getPropertyForDisplayString = (settingProperty) => {
    const [key, value] = settingProperty;

    if (typeof value === 'string') {
      const trimmedStringValue = value.length > 30 ? "..." + value.substring(value.length - 30) : value;
      return `${key} : ${trimmedStringValue}`
    }

    return `${key} : ${value}`;
  };

  const settingsTooltipContent = (settingInHandling) => {
    return settingInHandling ? ( <div key="settings_tooltip_body">
      <h3>Projektin asetukset:</h3>
      {settingInHandling != undefined && settingInHandling.id != "" ? (
        <div>{
          Object.entries(settingInHandling).map(settingProperty => {
            return (
              <p key={"prop_" + settingProperty}>
                { getPropertyForDisplayString(settingProperty) }
              </p>);
          })}</div>
      ) : <p></p>}
    </div>):(<p></p>);
  };

 const closeCreateEmmeBank = () => {
    setCreateEmmeBankModalOpen(false);
    closeError();
  };

  const createEmmeBank = (submodel, numberOfEmmeScenarios, separateEmmeScenarios) => {
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

    ipc.send(
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

  const onDownloadReady = (event, savePath) => {
    const existingSettings = globalSettingsStore.current.get('settings');
    const existingSelectedSettingId = globalSettingsStore.current.get('selected_settings_id');
    const settingsAreDefined = existingSettings && existingSettings.length > 0 && existingSelectedSettingId;
    const newPathFromDownload = cutUnvantedCharacters(savePath);

    if (settingsAreDefined) {
      const settingsArray = existingSettings;
      let settingInHandlingFromStore = findSetting(settingsArray, existingSelectedSettingId);

      setProjectSettings(settingsArray);
      setSelectedSettingsId(existingSelectedSettingId);
      setSettingInHandling(settingInHandlingFromStore);
      const pythonPath = settingInHandlingFromStore.emme_python_path;

      setSettingInHandling({ ...settingInHandlingFromStore, valma_scripts_path: newPathFromDownload });

      const pipFilePath = resolvePipFilePath(path.dirname(pythonPath));
      if (pipFilePath == '') {
        const errorMessage = pythonPath ? 'pip.exe-sovellusta ei löydy sijainnista: ' + pythonPath : 'Pythonin sijaintia ei ole annettu'
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

  useEffect(() => {
    const loadConfig = async () => {
      const store = (window as any).store;
      const config = await store.get("config");
      const settings = config?.settings;
      const selectedSettingsId = config?.selected_settings_id;

      if (selectedSettingsId && settings) {
        setSettingInHandling(findSetting(projectSettings, selectedSettingsId));
        setSelectedSettingsId(selectedSettingsId);
        setProjectSettings(settings)
      }
    };

    loadConfig();
  }, []);


  useEffect(() => {
    const ipc = (window as any).ipc;

    ipc.on('creating-emme-bank-completed', onCreatingEmmeBankReady);
    ipc.on('download-ready', onDownloadReady);

    return () => {
      ipc.removeListener('creating-emme-bank-completed', onCreatingEmmeBankReady);
      ipc.removeListener('download-ready', onDownloadReady);
    };
  }, []);

  useEffect(() => {
    const existingSettings = globalSettingsStore.current.get('settings');
    const existingId = globalSettingsStore.current.get('selected_settings_id');
    const defined = existingSettings && existingSettings.length > 0 && existingId;

    (window as any).ipc.on('download-ready', (_: any, savePath: string) => {
      setSettingInHandling((prev: any) => ({ ...prev, valma_scripts_path: savePath }));
      setDownloadingValmaScripts(false);
    });

    if (!defined) {
      const [found, pythonPath] = searchEMMEPython();
      if (found) {
        vex.dialog.confirm({
          message: `Python ${versions.emme_python} löytyi sijainnista:\n\n${pythonPath}\n\nHaluatko käyttää tätä sijaintia?`,
          callback: (val: boolean) => val && setSettingInHandling((p: any) => ({ ...p, emme_python_path: pythonPath }))
        });
      }
    } else {
      const arr = existingSettings;
      setProjectSettings(arr);
      setSelectedSettingsId(existingId);
      setSettingInHandling(findSetting(arr, existingId));
    }
  }, []);


  // -------------------- render (unchanged structure) --------------------

  return (
    <div className={"App" + (isProjectRunning ? " App--busy" : "")}>
      {/* Pop-up global settings dialog with overlay behind it */}
      {isSettingsOpen && <div className="App__settings">
        <Settings
          settings={settingInHandling}
          settingsList={projectSettings}
          dlValmaScriptsVersion={dlValmaScriptsVersion}
          isDownloadingValmaScripts={isDownloadingValmaScripts}
          cancel={cancel}
          setProjectName={(v: string) => setSettingInHandling({ ...settingInHandling, project_name: v })}
          setProjectFolder={(v: string) => setSettingInHandling({ ...settingInHandling, project_folder: v })}
          setEMMEPythonPath={(v: string) => setSettingInHandling({ ...settingInHandling, emme_python_path: v })}
          setValmaScriptsPath={(v: string) => setSettingInHandling({ ...settingInHandling, valma_scripts_path: v })}
          setBaseDataFolder={(v: string) => setSettingInHandling({ ...settingInHandling, base_data_folder: v })}
          promptModelSystemDownload={promptModelSystemDownload}
          saveSetting={saveSetting}
          selectBaseSettings={(id: any) => setSettingInHandling(findSetting(projectSettings, id))}
          setModeDestCalibrationFile={(v: string) => setSettingInHandling({ ...settingInHandling, mode_dest_calibration_file: v })}
          setMunicipalityCalibrationFile={(v: string) => setSettingInHandling({ ...settingInHandling, municipality_calibration_file: v })}
        />
      </div>}
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
            close={closeLoadingInfo}
          />
        </div>
      }

      <div className="App__CreateEmmeBank" style={{ display: isCreateEmmeBankModalOpen ? "block" : "none" }}>
        <CreateEmmeBank
          createProject={createEmmeBank}
          handleCancel={closeCreateEmmeBank}
        />
      </div>

      {/* UI title bar, app-version, etc. */}
      <div className="App__header">
        <span className="App__header-title">VALMA</span>
        &nbsp;
        <a onClick={() => (window as any).electron.openExternal("https://github.com/Traficom/valma-docs")} />
      </div>
      {/* VLEM Project -specific content, including runtime- & per-scenario-settings */}
      <div className="App__body">
        <VlemProject
          selectedSetting={settingInHandling}
          openCreateEmmeBank={() => setCreateEmmeBankModalOpen(true)}
          signalProjectRunning={setProjectRunning}
          addNewSetting={addNewSetting}
        />
      </div>

      <div className="App__settings-menu">
        <ul>
          <li>
            <div className="App__settings_select">
              <select value={selectedSettingsId} disabled={isSettingsOpen || isProjectRunning} onChange={e => selectSetting(e.target.value)}>
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
                style={{ display: isSettingsOpen || isProjectRunning ? "none" : "block" }}
                onClick={(e) => handleEditSetting()}
              > 
              {settingInHandling && settingInHandling.id && (<Tooltip anchorSelect="#settings-tooltip-anchor" key={"tooltip_" + settingInHandling.id} place={"bottom"} id="settings-tooltip"
                style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000" }} />)
              }
              </div>
            </div>
          </li>
          <li>
            <div className="App__settings_modify">
              <div
                className={!selectedSettingsId || selectedSettingsId == '' ? "settings_disabled App__delete_setting" : "App__delete_setting"}
                onClick={e =>
                  handleDeleteSetting()
                }
              ></div>
            </div>
          </li>
        </ul>



      </div>
      <div className="footer"><span className="App__header-version">Versio {`${VLEMVersion}`}</span></div>
    </div>
  );
};

export default App;