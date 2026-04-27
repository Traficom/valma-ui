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

declare const vex: any;

const homedir = (window as any).system.homedir();

const emptySetting: any = {
  id: "",
  project_name: "",
  project_folder: "",
  valma_scripts_path: "",
  emme_python_path: "",
  base_data_folder: "",
  mode_dest_calibration_file: "",
  municipality_calibration_file: "",
};

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

  // -------------------- helpers (mechanical translation) --------------------

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
      globalSettingsStore.current.set('settings', JSON.stringify(next));
      globalSettingsStore.current.set('selected_settings_id', newId);
      return next;
    });
  }

  function saveSettingChanges(setting: any) {
    setProjectSettings(prev => {
      const idx = prev.map(s => s.id).indexOf(setting.id);
      const next = [...prev];
      next[idx] = { ...setting };
      globalSettingsStore.current.set('settings', JSON.stringify(next));
      globalSettingsStore.current.set('selected_settings_id', setting.id);
      return next;
    });
  }

  function saveSetting() {
    if (settingInHandling.id === "") saveNewSetting({ ...settingInHandling });
    else saveSettingChanges({ ...settingInHandling });

    (window as any).ipc.send('message-from-ui-to-create-project', {
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

  function deleteSetting() {
    const rest = projectSettings.filter(s => s.id !== selectedSettingsId);
    const next = rest[0];
    setProjectSettings(rest);
    setSelectedSettingsId(next.id);
    setSettingInHandling(next);
    globalSettingsStore.current.set('settings', JSON.stringify(rest));
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

  // -------------------- effects (behavior preserved) --------------------

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
      const arr = JSON.parse(existingSettings);
      setProjectSettings(arr);
      setSelectedSettingsId(existingId);
      setSettingInHandling(findSetting(arr, existingId));
    }
  }, []);

  // -------------------- render (unchanged structure) --------------------

  return (
    <div className={"App" + (isProjectRunning ? " App--busy" : "")}>
      {isSettingsOpen && (
        <div className="App__settings">
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
            saveSetting={saveSetting}
            selectBaseSettings={(id: any) => setSettingInHandling(findSetting(projectSettings, id))}
            setModeDestCalibrationFile={(v: string) => setSettingInHandling({ ...settingInHandling, mode_dest_calibration_file: v })}
            setMunicipalityCalibrationFile={(v: string) => setSettingInHandling({ ...settingInHandling, municipality_calibration_file: v })}
            promptModelSystemDownload={() => (window as any).ipc.send('message-from-ui-to-download-model-scripts')}
          />
        </div>
      )}

      {errorShown && <LemError info={errorInfo} close={closeError} />}

      {isLoading && (
        <div className="App__loading">
          <Loading heading={loadingHeading} info={loadingInfo} close={() => setLoading(false)} />
        </div>
      )}

      <div className="App__CreateEmmeBank" style={{ display: isCreateEmmeBankModalOpen ? "block" : "none" }}>
        <CreateEmmeBank
          createProject={(...args: any[]) => (window as any).ipc.send('message-from-ui-to-create-emme-bank', args)}
          handleCancel={() => setCreateEmmeBankModalOpen(false)}
        />
      </div>

      <div className="App__header">
        <span className="App__header-title">VALMA</span>
        <a onClick={() => (window as any).electron.openExternal("https://github.com/Traficom/valma-docs")} />
      </div>

      <div className="App__body">
        <VlemProject
          projectName={settingInHandling?.project_name || ''}
          projectFolder={settingInHandling?.project_folder || homedir}
          emmePythonPath={settingInHandling?.emme_python_path || ''}
          valmaScriptsPath={settingInHandling?.valma_scripts_path || ''}
          baseDataFolder={settingInHandling?.base_data_folder || ''}
          signalProjectRunning={setProjectRunning}
          settingsId={settingInHandling?.id || ''}
          modeDestCalibrationFile={settingInHandling?.mode_dest_calibration_file || ''}
          municipalityCalibrationFile={settingInHandling?.municipality_calibration_file || ''}
          openCreateEmmeBank={() => setCreateEmmeBankModalOpen(true)}
          addNewSetting={addNewSetting}
        />
      </div>

      <div className="App__settings-menu">
        <ul>
          <li>
            <select
              value={selectedSettingsId}
              disabled={isSettingsOpen || isProjectRunning}
              onChange={e => selectSetting((e.target as HTMLSelectElement).value)}
            >
              {projectSettings.map(s => (
                <option key={s.id} value={s.id}>{s.project_name}</option>
              ))}
            </select>
          </li>
          <li>
            <div
              className={!selectedSettingsId ? "settings_disabled App__open-settings" : "App__open-settings"}
              onClick={handleEditSetting}
            />
          </li>
          <li>
            <div
              className={!selectedSettingsId ? "settings_disabled App__delete_setting" : "App__delete_setting"}
              onClick={handleDeleteSetting}
            />
          </li>
        </ul>
      </div>

      <div className="footer">
        <span className="App__header-version">Versio {`${VLEMVersion}`}</span>
      </div>
    </div>
  );
};

export default App;