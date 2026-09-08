import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip } from 'react-tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

import VlemProject from './components/Project/VlemProject';
import Settings from './components/Settings/Settings';
import LemError from './components/LemError';
import Loading from './components/Loading';
import CreateEmmeBank from './components/CreateEmmeBank/CreateEmmeBank';
import { cutUnvantedCharacters } from './components/cutUnvantedCharacters';
import { ProjectSetting } from './components/Project/types/ProjectSetting';
import vex from './main'
import logo_traficom from './icons/logo_traficom.svg';
import PlusLabel from './components/PageElements/PlusLabel';

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
  const settingRef = useRef(settingInHandling);
  const [projectSettings, setProjectSettings] = useState<any[]>([]);
  const [selectedSettingsId, setSelectedSettingsId] = useState<any>(undefined);
  const [isLoading, setLoading] = useState(false);
  const [loadingHeading, setLoadingHeading] = useState('');
  const [loadingInfo, setLoadingInfo] = useState('');
  const [errorShown, setErrorShown] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [isCreateEmmeBankModalOpen, setCreateEmmeBankModalOpen] = useState(false);

  const ipc = (window as any).ipc;

  const homedir = (window as any).system.homedir();
  const path = (window as any).path;
  const pipInstall = (window as any).env.pipInstall;
  const store = (window as any).store;
  const electron = (window as any).electron;
  const fsHelpers = window.fsHelpers;

  const updateSetting =
    (key: keyof typeof emptySetting) =>
      (value: string) => {
        setSettingInHandling(prev => ({
          ...prev,
          [key]: cutUnvantedCharacters(value),
        }));
      };


  function resolvePipFilePath(pythonDir: string): string {
    const candidates = [
      path.join(pythonDir, 'Scripts', 'pip.exe'),
      path.join(pythonDir, 'pip.exe'),
      path.join(pythonDir, 'Scripts', 'pip3.exe'),
      path.join(pythonDir, 'Scripts', 'pip3.11.exe'),
    ];
    let match = candidates.find(fsHelpers.existsSync) ?? '';
    return match;
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


  async function runPipInstall(
    pipFilePath: string,
    pipRequirementsPath: string
  ) {
    try {
      setInstallingPipInProgress();

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

  function findSetting(settings: ProjectSetting[], id: any) {
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
      saveSettingsToStore(next);
      saveSelectedSettingsIdToStore(newId)
      return next;
    });
  }

  function saveSettingChanges(setting: any) {
    setProjectSettings(prev => {
      const idx = prev.map(s => s.id).indexOf(setting.id);
      const next = [...prev];
      next[idx] = { ...setting };
      saveSettingsToStore(next);
      saveSelectedSettingsIdToStore(setting.id)
      return next;
    });
  }

  function saveSetting() {
    if(settingInHandling.project_folder == ""){
      showError("Projektikansiota ei ole asetettu. Tarkasta asetukset");
      return;
    }
    
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

  async function cancel() {
    if(settingInHandling.id == ""){
      setSettingInHandling(emptySetting);
    }
    const config = await store.get("config");
    const id = config?.selected_settings_id;
    setSelectedSettingsId(id);
    setSettingInHandling(findSetting(projectSettings, id));
    setSettingsOpen(false);
    closeError();
  }

  function selectSetting(id: any) {
    setSelectedSettingsId(id);
    setSettingInHandling(findSetting(projectSettings, id));
    saveSelectedSettingsIdToStore(id)
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
    saveSettingsToStore(rest);
    saveSelectedSettingsIdToStore(next.id)
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


  const saveSettingsToStore = async (settings: ProjectSetting[]) => {
    await store.set("settings", settings);
  };


  const saveSelectedSettingsIdToStore = async (selectedSettingsId: String) => {
    await store.set("selected_settings_id", selectedSettingsId);
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

  function  openProject() {
    if(settingInHandling.project_folder == ""){
      showError("Projektikansiota ei ole asetettu. Tarkasta asetukset");
      return;
    }

    ipc.send('message-from-ui-to-open-project', {
      project_folder: settingInHandling.project_folder,
      emme_python_path: settingInHandling.emme_python_path,
      valma_scripts_path: settingInHandling.valma_scripts_path,
      project_name: settingInHandling.project_name,
    });
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
    return settingInHandling ? (<div key="settings_tooltip_body">
      <h3>Projektin asetukset:</h3>
      {settingInHandling != undefined && settingInHandling.id != "" ? (
        <div>{
          Object.entries(settingInHandling).map(settingProperty => {
            return (
              <p key={"prop_" + settingProperty}>
                {getPropertyForDisplayString(settingProperty)}
              </p>);
          })}</div>
      ) : <p></p>}
    </div>) : (<p></p>);
  };

  const closeCreateEmmeBank = () => {
    setCreateEmmeBankModalOpen(false);
    closeError();
  };



  const createEmmeBank = (submodel, numberOfEmmeScenarios, separateEmmeScenarios) => {
    if (!fsHelpers.existsSync(settingInHandling.project_folder)) {
      showError('Tarkista projektikansio ' + settingInHandling.project_folder);
      return;
    }
    // If create_emme_project.py doesn't exist, alert.
    const createEmmeScript = settingInHandling.valma_scripts_path + "\\create_emme_project.py"
    if (!fsHelpers.existsSync(createEmmeScript)) {
      showError('create_emme_project.py -scriptiä ei löydy polusta ' + createEmmeScript);
      return;
    }

    if (!fsHelpers.existsSync(settingInHandling.emme_python_path)) {
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


  useEffect(() => {
    settingRef.current = settingInHandling;
  }, [settingInHandling]);

  const onDownloadReady = (savePath: string) => {
    setDownloadingValmaScripts(false);
    const newPathFromDownload = cutUnvantedCharacters(savePath);
    console.log('New path from download: ' + newPathFromDownload);
    setSettingInHandling({ ...settingRef.current, valma_scripts_path: newPathFromDownload });
    resolveAndRunPipInstall(newPathFromDownload);
  };

  useEffect(() => {
    const loadConfig = async () => {
      const config = await store.get("config");
      const settingsFromStore = config?.settings;
      let selectedSettingsIdFromStore = config?.selected_settings_id;

      if (settingsFromStore) {
        if (!selectedSettingsIdFromStore) {
          selectedSettingsIdFromStore = settingsFromStore[0];
        }
        setSettingInHandling(findSetting(settingsFromStore, selectedSettingsIdFromStore));
        setSelectedSettingsId(selectedSettingsIdFromStore);
        setProjectSettings(settingsFromStore);
      } else {
        const [found, pythonPath] = searchEMMEPython();
        if (found) {
          vex.dialog.confirm({
            message: `Python ${versions.emme_python} löytyi sijainnista:\n\n${pythonPath}\n\nHaluatko käyttää tätä sijaintia?`,
            callback: (val: boolean) => val && setSettingInHandling((p: any) => ({ ...p, emme_python_path: pythonPath }))
          });
        }
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    ipc.on('creating-emme-bank-completed', onCreatingEmmeBankReady);
    ipc.on('download-ready', onDownloadReady);

    return () => {
      ipc.removeListener('creating-emme-bank-completed', onCreatingEmmeBankReady);
      ipc.removeListener('download-ready', onDownloadReady);
    };
  }, []);

const resolveAndRunPipInstall = (newPath:string) => {
     const pythonPath = settingRef.current.emme_python_path;
     const pipFilePath = resolvePipFilePath(path.dirname(pythonPath));
      if (!fsHelpers.existsSync(pipFilePath)) {
        console.log('Error: no pip.exe found from path: ' + pipFilePath);
        const errorMessage = pythonPath ? 'pip.exe-sovellusta ei löydy sijainnista: ' + pythonPath : 'Pythonin sijaintia ei ole annettu'
        showError(errorMessage + '. Tarkista Emme Python - asetus.');
        setDownloadingValmaScripts(false);
        return;
      }

      const pipRequirementsPath = path.join(cutUnvantedCharacters(newPath), "requirements.txt");
      if (!fsHelpers.existsSync(pipRequirementsPath)) {
        console.log('Error: no requirements.txt file found from path: ' + pipRequirementsPath);
        showError('Tarvittavaa requirements.txt-tiedostoa ei löydy sijainnista: ' + pipRequirementsPath);
        setDownloadingValmaScripts(false);
        return;
      }
      runPipInstall(pipFilePath, pipRequirementsPath);

}

function setValmaScriptsPath(path: string){
  if(path.length > 0 && path != settingInHandling.valma_scripts_path){
    resolveAndRunPipInstall(path);
  }
  setSettingInHandling({ ...settingInHandling, valma_scripts_path: path });
}

  return (
    <div className={"App" + (isProjectRunning ? " App--busy" : "")}>
      {/* Pop-up global settings dialog with overlay behind it */}
      {isSettingsOpen &&
        <Settings
          settings={settingInHandling}
          settingsList={projectSettings}
          dlValmaScriptsVersion={dlValmaScriptsVersion}
          isDownloadingValmaScripts={isDownloadingValmaScripts}
          cancel={cancel}
          setProjectName={(v: string) =>  updateSetting('project_name')(v)}
          setProjectFolder={(v: string) => updateSetting('project_folder')(v)}
          setEMMEPythonPath={(v: string) => updateSetting('emme_python_path')(v)}
          setValmaScriptsPath={(v: string) => setValmaScriptsPath(cutUnvantedCharacters(v))}
          setBaseDataFolder={(v: string) => updateSetting('base_data_folder')(v)}
          promptModelSystemDownload={promptModelSystemDownload}
          saveSetting={saveSetting}
          selectBaseSettings={(id: any) => selectBaseSettings(id)}
          setModeDestCalibrationFile={(v: string) => updateSetting('mode_dest_calibration_file')(v)}
          setMunicipalityCalibrationFile={(v: string) => updateSetting('municipality_calibration_file')(v)}
        />}
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
       <img src={logo_traficom} alt="logo" width="250" height="70"/>
       <span className="App__header-title">VALMA</span>
        &nbsp;
        <a onClick={() => electron.openExternal("https://github.com/Traficom/valma-docs")} />
      </div>
      <div className="App__settings_container">
        <Tooltip
          id="settings-tooltip"
          style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000", zIndex: 19999, fontSize: "11px", lineHeight: "80%" }}
          place="bottom"
        />
        <div className="App__settings_heading">Projektin alustaminen</div>
        <div className="App__settings_menu">
          <ul>
            <li>
              <div className="App__settings_select" data-tooltip-id="settings-tooltip"
                data-tooltip-html={renderToStaticMarkup(settingsTooltipContent(settingInHandling))}
                data-tooltip-delay-show={150}
                data-tooltip-hidden={isSettingsOpen}>
                <select value={selectedSettingsId} disabled={isSettingsOpen || isProjectRunning} onChange={e => selectSetting(e.target.value)}>
                  {projectSettings && projectSettings.map((setting) =>
                    <option key={setting.id} value={setting.id}>{setting.project_name}</option>)
                  }
                </select>
              </div>
            </li>
            <li>
              <div className="App__settings_modify">
                <div className={!selectedSettingsId || selectedSettingsId == '' ? "settings_disabled App__open-settings" : "App__open-settings"} onClick={(e) => handleEditSetting()} />
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
             <li>
              <div className="App__settings_modify">
                <div
                  className={!selectedSettingsId || selectedSettingsId == '' ? "settings_disabled App__add_setting" : "App__add_setting"}
                  onClick={e =>
                    addNewSetting()
                  }
                ></div>
              </div>
              <button
                  className="Runtime__button"
                  onClick={e =>
                    addNewSetting()
                  }><PlusLabel label={'Luo uusi VALMA-projekti'} /></button>
            </li>
          </ul>
        </div>
      </div>
      {/* VLEM Project -specific content, including runtime- & per-scenario-settings */}
      <div className="App__body">
        <VlemProject
          selectedSetting={settingInHandling}
          openCreateEmmeBank={() => setCreateEmmeBankModalOpen(true)}
          signalProjectRunning={setProjectRunning}
          openProject={openProject}
        />
      </div>

      <div className="footer"><span className="App__header-version">Versio {`${VLEMVersion}`}</span></div>
    </div>
  );
};

export default App;