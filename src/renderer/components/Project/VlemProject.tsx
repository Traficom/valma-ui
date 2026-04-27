import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import Runtime from './Runtime/Runtime';

// Globals (kept intentionally loose)
declare const vex: any;
declare const SCENARIO_TYPES: any;
declare const STORED_SPEED_ASSIGNMENT_PREFIX: string;

const VlemProject = ({
  projectName,
  projectFolder,
  emmePythonPath,
  valmaScriptsPath,
  baseDataFolder,
  signalProjectRunning,
  settingsId,
  modeDestCalibrationFile,
  municipalityCalibrationFile,
  openCreateEmmeBank,
  addNewSetting
}: any) => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [openScenarioID, setOpenScenarioID] = useState<any>(null);
  const [subScenarioEdit, setSubScenarioEdit] = useState<any>(null);

  const [scenarioIDsToRun, setScenarioIDsToRun] = useState<any[]>([]);
  const [runningScenarioID, setRunningScenarioID] = useState<any>(null);
  const [runningScenarioIDsQueued, setRunningScenarioIDsQueued] = useState<any[]>([]);
  const [logContents, setLogContents] = useState<any[]>([]);
  const [isLogOpened, setLogOpened] = useState(false);
  const [logArgs, setLogArgs] = useState<any>({});
  const [finishedScenarioInfo, setFinishedScenarioInfo] = useState<any>(undefined);
  const [scenarioNames, setScenarioNames] = useState<any[]>([]);

  const [cbaOptions, setCbaOptions] = useState<any>({});

  // Scenario persistence (1:1 replacement for electron-store)
  const configStores = useRef<any>({});

const fsHelpers = window.fsHelpers;

  // ---------------- scenario loading ----------------

  const addRunStatusProperties = (scenario: any) => ({
    ...scenario,
    runStatus: {
      statusIterationsTotal: null,
      statusIterationsCurrent: 0,
      statusIterationsCompleted: 0,
      statusIterationsFailed: 0,
      statusState: null,
      statusLogfilePath: null,
      statusReadyScenariosLogfiles: [],
      statusRunStartTime: null,
      statusRunFinishTime: null,
      demandConvergenceArray: []
    }
  });

  const resolveScenarioNames = (scens: any[]) => {
    const temp: any[] = [];
    scens.forEach(s => {
      temp.push({ id: s.id, name: s.name });
      s.subScenarios?.forEach((sub: any) => temp.push({ id: sub.id, name: sub.name }));
    });
    setScenarioNames(temp);
  };

  const _loadProjectScenarios = (folder: string) => {
    if (!folder) return;

    const found: any[] = [];
    fsHelpers.readdirSync(folder).forEach((file: string) => {
      if (file.endsWith('.json')) {
        const obj = JSON.parse(fsHelpers.readFileSync(fsHelpers.join(folder, file), 'utf8'));
        if (obj.id && obj.name && obj.iterations !== undefined) {
          configStores.current[obj.id] = (window as any).configStore(folder, file.slice(0, -5));
          found.push(obj.runStatus ? obj : addRunStatusProperties(obj));
        }
      }
    });

    setScenarios(found);
    setOpenScenarioID(null);
    setSubScenarioEdit(null);
    setScenarioIDsToRun([]);
    setRunningScenarioID(null);
    setRunningScenarioIDsQueued([]);
    setLogContents([]);
    setLogOpened(false);
    resolveScenarioNames(found);
  };

  // ---------------- scenario CRUD ----------------

  const _createScenario = (name: string, type: any) => {
    const id = uuidv4();
    const scenario = {
      id,
      scenarioType: type,
      name,
      iterations: type === SCENARIO_TYPES.LONG_DISTANCE ? 1 : 15,
      first_scenario_id: 1,
      zone_data_file: null,
      cost_data_file: null,
      delete_strategy_files: true,
      separate_emme_scenarios: false,
      save_matrices_in_emme: false,
      first_matrix_id: 100,
      long_dist_demand_forecast: "base",
      end_assignment_only: false,
      last_run: null,
      subScenarios: [],
      overriddenProjectSettings: {
        projectFolder: null,
        emmePythonPath: null,
        valmaScriptsPath: null,
        baseDataFolder: null
      },
      runStatus: addRunStatusProperties({})
    };

    const next = [...scenarios, scenario];
    setScenarios(next);
    configStores.current[id] = (window as any).configStore(projectFolder, name);
    configStores.current[id].set(scenario);
    setOpenScenarioID(id);
    resolveScenarioNames(next);
  };

  const duplicateScenario = (scenario: any) => {
    const dup = structuredClone(scenario);
    dup.id = uuidv4();
    dup.name = `${scenario.name}(${dup.id.split('-')[0]})`;
    dup.subScenarios = [];
    const next = [...scenarios, dup];
    setScenarios(next);
    configStores.current[dup.id] = (window as any).configStore(projectFolder, dup.name);
    configStores.current[dup.id].set(dup);
    resolveScenarioNames(next);
  };

  const _deleteScenario = (scenario: any) => {
    vex.dialog.confirm({
      message: `Oletko varma skenaarion ${scenario.name} poistosta?`,
      callback: (val: boolean) => {
        if (val) {
          setScenarios(prev => prev.filter(s => s.id !== scenario.id));
          fsHelpers.unlinkSync(fsHelpers.join(projectFolder, `${scenario.name}.json`));
          window.location.reload();
        }
      }
    });
  };

  // ---------------- runtime ----------------

  const _handleClickScenarioToActive = (scenario: any) => {
    if (scenarioIDsToRun.includes(scenario.id)) {
      setScenarioIDsToRun(scenarioIDsToRun.filter(id => id !== scenario.id));
    } else {
      setScenarioIDsToRun([...scenarioIDsToRun, scenario.id]);
    }
  };

  const _handleClickStartStop = () => {
    runningScenarioID === null
      ? _runAllActiveScenarios(scenarioIDsToRun)
      : _cancelRunning();
  };

  const _runAllActiveScenarios = (ids: any[]) => {
    setOpenScenarioID(null);
    setLogOpened(true);
    setRunningScenarioID(ids[0]);
    setRunningScenarioIDsQueued(ids.slice(1));
    signalProjectRunning(true);

    (window as any).ipc.send('message-from-ui-to-run-scenarios', ids);
  };

  const _cancelRunning = () => {
    setRunningScenarioIDsQueued([]);
    (window as any).ipc.send('message-from-ui-to-cancel-scenarios');
  };

  // ---------------- IPC ----------------

  useEffect(() => {
    (window as any).ipc.on('loggable-event', (_: any, args: any) => {
      setLogContents(prev => [...prev, args]);
      setLogArgs(args);
    });
    (window as any).ipc.on('scenario-complete', (_: any, args: any) => {
      setFinishedScenarioInfo(args.completed);
      setRunningScenarioID(args.next?.id);
    });
    (window as any).ipc.on('all-scenarios-complete', () => {
      setRunningScenarioID(null);
      setRunningScenarioIDsQueued([]);
      signalProjectRunning(false);
    });

    _loadProjectScenarios(projectFolder);
  }, [settingsId]);

  // ---------------- render ----------------

  return (
    <div className="Project">
      <div className="Project__runtime">
        <Runtime
          projectFolder={projectFolder}
          reloadScenarios={() => _loadProjectScenarios(projectFolder)}
          scenarios={scenarios}
          scenarioIDsToRun={scenarioIDsToRun}
          runningScenarioID={runningScenarioID}
          openScenarioID={openScenarioID}
          setOpenScenarioID={setOpenScenarioID}
          deleteScenario={_deleteScenario}
          handleClickScenarioToActive={_handleClickScenarioToActive}
          handleClickNewScenario={(type: any) => _createScenario(`Uusi`, type)}
          handleClickStartStop={_handleClickStartStop}
          logArgs={logArgs}
          duplicateScenario={duplicateScenario}
          handleClickCreateSubScenario={() => {}}
          openCreateEmmeBank={openCreateEmmeBank}
          addNewSetting={addNewSetting}
          duplicateSubScenario={() => {}}
          deleteSubScenario={() => {}}
          modifySubScenario={() => {}}
          activeScenarios={scenarios}
        />
      </div>
    </div>
  );
};

export default VlemProject;