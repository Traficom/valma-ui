import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import Runtime from './Runtime/Runtime';
import Scenario from './Scenario/Scenario';
import { RunnableScenarioData, ScenarioData } from '../Project/types/ScenarioData'
import { ProjectSetting } from '../Project/types/ProjectSetting'
import CostBenefitAnalysis from '../CostBenefitAnalysis/CostBenefitAnalysis'
import { CbaOptions } from '../Project/types/CbaOptions'
import SubScenario from './SubScenario/SubScenario';
import RunLog from './RunLog/RunLog'
import { SubScenarioData } from './types/SubScenarioData';
import './VlemProject.css';
import { STORED_SPEED_ASSIGNMENT_PREFIX } from '../../../constants';
import { SCENARIO_TYPES } from '../../../enums';
import { LoggableEvent } from './types/RunLog';

// ---------------- globals ----------------
declare const vex: any;

interface VlemProjectProps {
  signalProjectRunning: (running: boolean) => void;
  selectedSetting?: ProjectSetting;
  openCreateEmmeBank: () => void;
  addNewSetting: () => void;
}

const VlemProject: React.FC<VlemProjectProps> = ({
  signalProjectRunning,
  selectedSetting,
  openCreateEmmeBank,
  addNewSetting
}) => {
  window.electron.setMaxListeners(20);
  const ipcRenderer = window.ipc;
  const fsHelpers = window.fsHelpers;

  // VLEM Project -specific settings
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]); // Scenarios under currently selected Project
  const [openScenarioID, setOpenScenarioID] = useState(null); // currently open Scenario configuration
  const [subScenarioEdit, setSubScenarioEdit] = useState(null); // currently open SubScenario configuration

  // Runtime controls & -logging
  const [scenarioIDsToRun, setScenarioIDsToRun] = useState([]); // selected active scenarios ready to run sequentially
  const [scenariosToRun, setScenariosToRun] = useState<RunnableScenarioData[]>([]);
  const [runningScenarioID, setRunningScenarioID] = useState(null); // currently running Scenario, indicates if running
  const [runningScenarioIDsQueued, setRunningScenarioIDsQueued] = useState([]); // queued ("remaining") Scenarios
  const [logContents, setLogContents] = useState([]); // project runtime log-contents
  const [isLogOpened, setLogOpened] = useState(false); // whether runtime log is open
  const [logArgs, setLogArgs] = useState({});
  const [finishedScenarioInfo, setFinishedScenarioInfo] = useState(undefined);
  const [scenarioNames, setScenarioNames] = useState([]); // all scenario and subScenario names

  // Cost-Benefit Analysis (CBA) controls

  const [projectFolder, setProjectFolder] = useState(selectedSetting?.project_folder);
  const [projectName, setProjectName] = useState(selectedSetting?.project_name);
  const [emmePythonPath, setEmmePythonPath] = useState(selectedSetting?.emme_python_path);
  const [modeDestCalibrationFile, setModeDestCalibrationFile] = useState(selectedSetting?.mode_dest_calibration_file);
  const [municipalityCalibrationFile, setMunicipalityCalibrationFile] = useState(selectedSetting?.municipality_calibration_file);
  const [valmaScriptsPath, setValmaScriptsPath] = useState(selectedSetting?.valma_scripts_path);
  const [baseDataFolder, setBaseDataFolder] = useState(selectedSetting?.base_data_folder);
  const ipcAttachedRef = useRef(false);


  const _handleClickScenarioToActive = (scenarioId: string) => {
    if (scenarioIDsToRun.includes(scenarioId)) {
      // If scenario exists in scenarios to run, remove it
      let newScenarioIds = scenarioIDsToRun.filter((id) => id != scenarioId);
      let scenario = scenarios.find(s => s.id == scenarioId);
      if (scenario && scenario.subScenarios && (!scenario.run_success || scenario.last_run == "")) {
        scenario.subScenarios.forEach(subScenario => newScenarioIds = newScenarioIds.filter((id) => id !== subScenario.id));
      }
      setScenarioIDsToRun(newScenarioIds);
    } else {
      // Else add it
      setScenarioIDsToRun(scenarioIDsToRun.concat(scenarioId));
    }
  }


  const _handleClickNewScenario = (scenarioType) => {
    const scenarioTypeText = scenarioType == SCENARIO_TYPES.PASSENGER_TRANSPORT ? "henkilöliikenteen" : "tavaraliikenteen";
    const promptCreation = (previousError) => {
      vex.dialog.prompt({
        message: (previousError ? previousError : "") + "Anna nimike uudelle " + scenarioTypeText + " skenaariolle:",
        placeholder: '',
        callback: (inputScenarioName) => {
          let error = "";
          // Check for cancel button press
          if (inputScenarioName === false) {
            return;
          }
          // Check input for initial errors
          if (inputScenarioName === "") {
            error = "Nimike on pakollinen, tallennettavaa tiedostonime\u00e4 varten. ";
          }
          if (scenarios.map((s) => s.name).includes(inputScenarioName)) {
            error = "Nimike on jo olemassa, valitse toinen nimi tai poista olemassa oleva ensin. ";
          }
          // Handle recursively any input errors (mandated by the async library since prompt isn't natively supported in Electron)
          if (error) {
            promptCreation(error);
          } else {
            _createScenario(inputScenarioName, scenarioType);
          }
        }
      });
    };
    promptCreation("");
  };

  const _handleClickStartStop = () => {
    runningScenarioID === null ?
      _runAllActiveScenarios(scenarioIDsToRun)
      :
      _cancelRunning();
  };

  function determinePath(overridenSettings, overriddenPath, defaultPath) {
    if (overridenSettings && overriddenPath && overriddenPath != null && overriddenPath != undefined && overriddenPath != defaultPath) {
      return overriddenPath;
    }
    return defaultPath;
  }

  const loadProjectScenarios = (projectFilepath: string) => {
    const foundScenarios: ScenarioData[] = [];
    if (projectFilepath) {
      window.fsHelpers.readdirSync(projectFilepath).forEach((fileName) => {
        if (!fileName.endsWith(".json")) return;

        const raw = window.fsHelpers.readFileSync(fsHelpers.join(projectFilepath, fileName));
        const obj = JSON.parse(raw);

        if ("id" in obj && "name" in obj && "iterations" in obj) {
          foundScenarios.push(
            obj.runStatus ? obj : addRunStatusProperties(obj)
          );
        }
      });
      setScenarios(foundScenarios);
      setOpenScenarioID(null);
      setSubScenarioEdit(null);
      setScenarioIDsToRun([]);
      setRunningScenarioID(null);
      setRunningScenarioIDsQueued([]);
      setLogContents([]);
      setLogOpened(false);
      resolveScenarioNames(foundScenarios);
      return foundScenarios;
    }
  };


  const addRunStatusProperties = (scenario) => {
    return {
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
    }
  }

  const _createScenario = (newScenarioName, scenarioType) => {
    // Generate new (unique) ID for new scenario
    const newId = uuidv4();
    const isLongDistanceScenario = scenarioType == SCENARIO_TYPES.LONG_DISTANCE;
    const newScenario: ScenarioData = {
      id: newId,
      scenarioType: scenarioType,
      name: newScenarioName,
      first_scenario_id: 1,
      zone_data_file: null,
      cost_data_file: null,
      delete_strategy_files: true,
      separate_emme_scenarios: false,
      save_matrices_in_emme: false,
      first_matrix_id: 100,
      long_dist_demand_forecast: "base",
      end_assignment_only: false,
      iterations: isLongDistanceScenario ? 1 : 15,
      last_run: null,
      subScenarios: [],
      overriddenProjectSettings: {
        projectFolder: null,
        emmePythonPath: null,
        valmaScriptsPath: null,
        baseDataFolder: null,
      },
      runStatus: {
        statusIterationsTotal: null,
        statusIterationsCurrent: 0,
        statusIterationsCompleted: 0,
        statusIterationsFailed: 0,
        statusLogfilePath: null,
        statusReadyScenariosLogfiles: null,
        statusRunStartTime: null,
        statusRunFinishTime: null,
        demandConvergenceArray: []
      },
      submodel: ''
    };
    // Create the new scenario in "scenarios" array first
    const tempScenarios = scenarios.concat(newScenario);
    setScenarios(tempScenarios);
    // Then set scenario as open by id (Why id? Having open_scenario as reference causes sub-elements to be bugged because of different object reference)
    setOpenScenarioID(newId);
    resolveScenarioNames(tempScenarios);
  };

  const _updateScenario = (newValues: ScenarioData) => {
    // Update newValues to matching .id in this.state.scenarios

    const beforeUpdate = scenarios.find(s => s.id === newValues.id);
    // If name was set empty - use ID instead
    const newName = newValues.name? newValues.name : newValues.id;
    // If name changed, rename file
    if (beforeUpdate && beforeUpdate.name !== newName) {
      fsHelpers.renameSync(
        fsHelpers.join(projectFolder, `${beforeUpdate.name}.json`),
        fsHelpers.join(projectFolder, `${newName}.json`)
      );
    }
    fsHelpers.writeFileSync(fsHelpers.join(projectFolder, `${newName}.json`), JSON.stringify(newValues))
    setScenarios(scenarios.map((s) => (s.id === newValues.id ? { ...s, ...newValues } : s)));
    // And persist all changes in file
    resolveScenarioNames(scenarios);
  };

  const _deleteScenario = (scenario) => {
    const subScenarioMessage = scenario.subScenarios && scenario.subScenarios.length > 0 ? ` HUOM! Skenaarion poisto poistaa myös ${scenario.subScenarios.length} kpl. aliskenaarioita.` : "";

    vex.dialog.confirm({
      message: `Oletko varma skenaarion ${scenario.name} poistosta?` + subScenarioMessage,
      callback: function (value) {
        if (value) {
          setOpenScenarioID(null);
          setScenarios(scenarios.filter((s) => s.id !== scenario.id));
          fsHelpers.unlinkSync(fsHelpers.join(projectFolder, `${scenario.name}.json`));
          window.location.reload();  // Vex-js dialog input gets stuck otherwise
          resolveScenarioNames(scenarios);
        }
      }
    })
  };

  const duplicateScenario = (scenario) => {
    var duplicatedScenario = structuredClone(scenario);
    var newName = duplicatedScenario.name + `(${duplicatedScenario.id.split('-')[0]})`;
    //Change ID and rename the scenario to avoid conflicts.
    duplicatedScenario.id = uuidv4();
    duplicatedScenario.name = newName;
    duplicatedScenario.subScenarios = [];
    const tempScenarios = scenarios.concat(duplicatedScenario);
    setScenarios(tempScenarios);
    fsHelpers.writeFileSync(fsHelpers.join(projectFolder, `${newName}.json`), duplicatedScenario)
    resolveScenarioNames(tempScenarios);
  }

  const handleClickCreateSubScenario = (parentScenarioId) => {
    var parentScenario = scenarios.find((s) => s.id === parentScenarioId);
    const newSubScenarioEdit = {
      id: null,
      parentScenarioId: parentScenarioId,
      name: "",
      emmeScenarioNumber: 1,
      parentScenarioName: parentScenario.name,
      cost_data_file: "",
      parentCostDataFile: parentScenario.cost_data_file,
      runStatus: {
        statusIterationsTotal: null,
        statusIterationsCurrent: 0,
        statusIterationsCompleted: 0,
        statusIterationsFailed: 0,
        statusState: null,
        statusLogfilePath: null,
        statusReadyScenariosLogfiles: null,
        statusRunStartTime: null,
        statusRunFinishTime: null,
        demandConvergenceArray: []
      }
    }
    setSubScenarioEdit(newSubScenarioEdit);
  }

  const handleClickModifySubScenario = (subScenario) => {
    var parentScenario = scenarios.find((s) => s.id === subScenario.parentScenarioId);
    if (!parentScenario) {
      // Should not occur
      alert('Virhe, aliskenaarion pääskenaariota ei löydy.');
      return;
    }

    const newSubScenarioEdit = {
      ...subScenario,
      parentScenarioName: parentScenario.name
    }
    setSubScenarioEdit(newSubScenarioEdit);
  }

  const deleteSubScenario = (subScenario) => {
    if (confirm(`Oletko varma aliskenaarion ${subScenario.name} poistosta?`)) {
      var parentScenario = scenarios.find((s) => s.id === subScenario.parentScenarioId);
      if (!parentScenario || !parentScenario.subScenarios) {
        // Should not occur
        alert('Virhe, aliskenaarion pääskenaariota ei löydy, tai sille ei ole asetettu aliskenaarioita.');
        return;
      }
      const filteredSubScenarios = parentScenario.subScenarios.filter(s => s.id != subScenario.id);
      parentScenario.subScenarios = [...filteredSubScenarios];
      _updateScenario(parentScenario);
    }
  };

  const duplicateSubScenario = (subScenario: SubScenarioData) => {
    var parentScenario = scenarios.find((s) => s.id === subScenario.parentScenarioId);
    if (!parentScenario) {
      // Should not occur
      alert('Virhe, aliskenaarion pääskenaariota ei löydy.');
      return;
    }

    const newId = uuidv4();
    const newSubScenario: SubScenarioData = {
      id: newId,
      parentScenarioId: subScenario.parentScenarioId,
      name: subScenario.name + "_2",
      emmeScenarioNumber: subScenario.emmeScenarioNumber,
      cost_data_file: subScenario.cost_data_file,
      last_run: "",
      runSuccess: false,
      runStatus: {
        statusIterationsTotal: null,
        statusIterationsCurrent: 0,
        statusIterationsCompleted: 0,
        statusIterationsFailed: 0,
        statusLogfilePath: null,
        statusReadyScenariosLogfiles: null,
        statusRunStartTime: null,
        statusRunFinishTime: null,
        demandConvergenceArray: []
      },
      parentCostDataFile: ''
    }
    parentScenario.subScenarios = [...parentScenario.subScenarios, newSubScenario]
    _updateScenario(parentScenario);
  };


  const saveSubScenario = () => {
    if (!subScenarioEdit) {
      alert('Virhe aliskenaarion lisäämisessä.');
      return;
    }

    var parentScenario = scenarios.find((s) => s.id === subScenarioEdit.parentScenarioId);
    if (!parentScenario) {
      alert('Virhe, aliskenaariota yritetään lisätä skenaariolle, jota ei löydy.');
      return;
    }
    if (!parentScenario.subScenarios) {
      parentScenario.subScenarios = [];
    }
    if (subScenarioEdit.id
      && parentScenario.subScenarios.length > 0
      && parentScenario.subScenarios.find((s) => s.id === subScenarioEdit.id)) {
      updateSubScenario(parentScenario);
    } else {
      saveNewSubScenario(parentScenario);
    }

    setSubScenarioEdit(null);
  }

  const cancelEditingSubScenario = () => {
    setSubScenarioEdit(null);
  }

  const handleChangeSubScenario = (subScenarioEdit) => {
    setSubScenarioEdit({ ...subScenarioEdit });
  }

  const resolveScenarioNames = (scenarios) => {
    const tempScenarioNames = [];
    scenarios.forEach(scenario => {
      tempScenarioNames.push({ name: scenario.name, id: scenario.id });

      if (scenario.subScenarios && scenario.subScenarios.length > 0) {
        scenario.subScenarios.forEach(subSenario => {
          tempScenarioNames.push({ name: subSenario.name, id: subSenario.id });
        })
      }
    });
    setScenarioNames(tempScenarioNames);
  }

  const updateSubScenario = (parentScenario) => {
    const index = parentScenario.subScenarios.map(s => s.id).indexOf(subScenarioEdit.id);
    const newSubScenarios = [...parentScenario.subScenarios];
    newSubScenarios[index].name = `${subScenarioEdit.name}`;
    newSubScenarios[index].emmeScenarioNumber = `${subScenarioEdit.emmeScenarioNumber}`;
    newSubScenarios[index].cost_data_file = `${subScenarioEdit.cost_data_file}`;
    parentScenario.subScenarios = [...newSubScenarios];
    _updateScenario(parentScenario);
  }


  const saveNewSubScenario = (parentScenario) => {
    const newId = uuidv4();
    const newSubScenario = {
      id: newId,
      parentScenarioId: `${subScenarioEdit.parentScenarioId}`,
      name: `${subScenarioEdit.name}`,
      emmeScenarioNumber: `${subScenarioEdit.emmeScenarioNumber}`,
      cost_data_file: `${subScenarioEdit.cost_data_file}`,
      lastRun: "",
      runSuccess: false,
      runStatus: subScenarioEdit.runStatus
    }
    parentScenario.subScenarios = [...parentScenario.subScenarios, newSubScenario]
    _updateScenario(parentScenario);
  }

  function resolveRunnableScenarios(scenarioIDsToRun: String[], scenarios: ScenarioData[]) {
    if (!scenarioIDsToRun || scenarioIDsToRun.length == 0 || !scenarios || scenarios.length == 0) {
      return [];
    }

    let runnableScenarios: RunnableScenarioData[] = [];
    scenarios.forEach(scenario => {

      if (scenarioIDsToRun.includes(scenario.id) && !runnableScenarios.find(s => s.id == scenario.id)) {
        const scenarioRunIndex = scenarioIDsToRun.indexOf(scenario.id) + 1;
        runnableScenarios.push({ ...scenario, runIndex: scenarioRunIndex + 0.001 });

        if (scenario.storedSpeedAssignmentInputs && scenario.storedSpeedAssignmentInputs.length > 0) {
          const validStoredSpeedAssignmentInputs = scenario.storedSpeedAssignmentInputs.filter(Boolean);
          if (validStoredSpeedAssignmentInputs.length > 0) {
            validStoredSpeedAssignmentInputs.map((storedSpeedAssignment, index) => {
              runnableScenarios.push(createRunnableStoredSpeedAssignment(scenario, storedSpeedAssignment, scenarioRunIndex, index));
            });
          }
        }
      }

      if (scenario.subScenarios && scenario.subScenarios.length > 0) {
        scenario.subScenarios.forEach(subSenario => {
          if (scenarioIDsToRun.includes(subSenario.id) && !runnableScenarios.find(s => s.id == subSenario.id)) {
            const scenarioRunIndexForSubScenario = scenarioIDsToRun.includes(scenario.id) ? scenarioIDsToRun.indexOf(scenario.id) + 1 : scenarioIDsToRun.indexOf(subSenario.id) + 1;
            runnableScenarios.push({ ...scenario, ...subSenario, parentScenarioId: scenario.id, runIndex: scenarioRunIndexForSubScenario + ((scenarioIDsToRun.indexOf(subSenario.id) + 1) / 100) });
          }
        })
      }
    });

    const sortedRunnableScenarios = runnableScenarios.sort((a, b) => a.runIndex - b.runIndex);
    return sortedRunnableScenarios;
  }

  function createRunnableStoredSpeedAssignment(scenario, storedSpeedAssignmentInput, scenarioIndex, ssaIndex) {
    return {
      ...scenario,
      id: STORED_SPEED_ASSIGNMENT_PREFIX + ssaIndex + "_" + scenario.id,
      runIndex: scenarioIndex + ((1 + ssaIndex) / 10000),
      first_scenario_id: storedSpeedAssignmentInput.firstScenarioId,
      submodel: storedSpeedAssignmentInput.submodel,
      stored_speed_assignment: false
    }
  }

  function resolveScenarioId(scenario) {
    if (scenario.parentScenarioId) {
      return scenario.parentScenarioId;
    }
    if (scenario.id.includes(STORED_SPEED_ASSIGNMENT_PREFIX)) {
      return scenario.id.split("_").pop();
    }
    return scenario.id;
  }

  const _runAllActiveScenarios = (activeScenarioIDs) => {
    const scenariosToRun = resolveRunnableScenarios(scenarioIDsToRun, scenarios);
    // Check required global parameters are set
    if (!projectName) {
      alert("Projektia ei ole valittu.");
      return;
    }
    if (!projectFolder) {
      alert("Projektikansiota ei ole asetettu!");
      return;
    }
    if (!emmePythonPath) {
      alert("Python -sijaintia ei ole asetettu!");
      return;
    }
    if (!valmaScriptsPath) {
      alert("VALMA Scripts -kansiota ei ole asetettu, tarkista Asetukset.");
      return;
    }
    if (!baseDataFolder) {
      alert("L\u00E4ht\u00F6datan kansiota ei ole asetettu, tarkista Asetukset.");
      return;
    }

    // For each active scenario, check required scenario-specific parameters are set
    for (let scenario of scenariosToRun) {
      const iterations = scenario.iterations;
      if (!scenario.zone_data_file) {
        alert(`Syöttötietoja (zone_data_file) ei ole valittu skenaariossa "${scenario.name}"`);
        return;
      }
      if (iterations < 1 || iterations > 99) {
        alert(`Aseta iteraatiot väliltä 1 - 99 skenaariossa "${scenario.name}"`);
        return;
      }
      if (!scenario.cost_data_file) {
        alert(`Liikenteen hintadata-tiedostoa ei ole valittu skenaariossa "${scenario.name}"`);
        return;
      }
    }

    // Perform UI changes to indicate "initializing run of active scenarios"
    setOpenScenarioID(null); // Close any open scenario configuration
    setLogContents([
      {
        level: "UI-event",
        message: `Initializing run of scenarios: ${scenariosToRun.filter(s => !s.id.includes(STORED_SPEED_ASSIGNMENT_PREFIX)).map(s => s.name).join(", ")}`
      }
    ]);
    setLogOpened(true); // Keep log open even after run finishes (or is cancelled)
    setRunningScenarioID(activeScenarioIDs[0]); // Disable controls
    setRunningScenarioIDsQueued(activeScenarioIDs.slice(1));
    signalProjectRunning(true); // Let App-component know too
    ipcRenderer.send(
      'message-from-ui-to-run-scenarios',
      scenariosToRun.map((s) => {
        const scenario = s.parentScenarioId ? scenarios.find(scen => scen.id == s.parentScenarioId) : s;
        // when running subScenario --scenario-name ja --first-scenario-id and scenario-id will be used from it
        const subScenario = s.parentScenarioId ? s : undefined;
        const name = subScenario ? subScenario.name : scenario.name;
        const id = subScenario ? subScenario.id : resolveScenarioId(scenario);
        const first_scenario_id = subScenario ? subScenario.emmeScenarioNumber : scenario.first_scenario_id;
        const end_assignment_only = subScenario ? true : scenario.end_assignment_only
        const cost_data_file = subScenario && subScenario.cost_data_file ? subScenario.cost_data_file : scenario.cost_data_file;

        const emme_project_path = determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.projectFolder, projectFolder);
        const emme_entry_point_file_path = emme_project_path + `\\${projectName}\\${projectName}.emp`
        const result_data_folder = determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.projectFolder, projectFolder);
        // when running subScenario, base data path is parents result path
        const base_data_folder = subScenario ? result_data_folder + `\\${scenario.name}\\` : determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.baseDataFolder, baseDataFolder);

        // Run parameters per each run (enrich with global settings' paths to EMME python & VLEM model system
        return {
          ...scenario,
          id: id,
          name: name,
          first_scenario_id: first_scenario_id,
          emme_project_file: emme_entry_point_file_path,
          emme_python_path: determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.emmePythonPath, emmePythonPath),
          valma_scripts_path: determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.valmaScriptsPath, valmaScriptsPath),
          base_data_folder: base_data_folder,
          result_data_folder: result_data_folder,
          log_level: 'DEBUG',
          end_assignment_only: end_assignment_only,
          cost_data_file: cost_data_file,
          mode_dest_calibration_file: modeDestCalibrationFile,
          municipality_calibration_file: municipalityCalibrationFile,
        }
      })
    );
  };

  const _cancelRunning = () => {
    setLogContents(previousLog => [...previousLog, { level: "UI-event", message: "Cancelling remaining scenarios." }]);
    setRunningScenarioIDsQueued([]);
    ipcRenderer.send('message-from-ui-to-cancel-scenarios');
  };

  const _runCbaScript = (cbaOptions: CbaOptions) => {
    // Check required global parameters are set
    if (!projectName) {
      alert("Projektia ei ole valittu.");
      return;
    }

    if (!projectFolder) {
      alert("Projektikansiota ei ole asetettu!");
      return;
    }

    if (!emmePythonPath) {
      alert("Python -sijaintia ei ole asetettu!");
      return;
    }

    if (!valmaScriptsPath) {
      alert("VALMA Scripts -kansiota ei ole asetettu, tarkista Asetukset.");
      return;
    }

    // Check required CBA parameters are set
    if (!cbaOptions.baseline_scenario_path) {
      alert(`Baseline skenaariota ei ole valittu`);
      return;
    }
    if (!cbaOptions.projected_scenario_path) {
      alert(`Projektoitua skenaariota ei ole valittu`);
      return;
    }

    // Perform UI changes to indicate "initializing run of script"
    setOpenScenarioID(null); // Close any open scenario configuration
    setLogContents([
      {
        level: "UI-event",
        message: `Initializing run CBA Script`
      }
    ]);
    setLogOpened(true); // Keep log open even after run finishes (or is cancelled)
    signalProjectRunning(true); // Let App-component know too
    ipcRenderer.send(
      'message-from-ui-to-run-cba-script',
      {
        ...cbaOptions,
        emme_project_path: projectFolder,
        emme_python_path: emmePythonPath,
        valma_scripts_path: valmaScriptsPath,
        result_data_folder: projectFolder,
      });
  };

  // Electron IPC event listeners
  const onLoggableEvent = (event: any) => {
    var loggableEvent: LoggableEvent = event && event.level ? event : { level: 'ERROR', message: charsToText(event) + " " + event.time }
    if (loggableEvent.message) {
      setLogContents(previousLog => [...previousLog, loggableEvent]);
    }
  };

  function charsToText(data) {
    return Object.keys(data)
      .filter((k) => !isNaN(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => data[k])
      .join("").trim();
  }

  const onScenarioComplete = (event, args) => {
    if (args.completed.id) {
      setFinishedScenarioInfo({ id: args.completed.id, error: false });
    }
    setRunningScenarioID(args.next.id);
    setRunningScenarioIDsQueued(runningScenarioIDsQueued.filter((id) => id !== args.completed.id));
    setLogContents(previousLog => [...previousLog, { level: 'NEWLINE', message: '' }]);
  };

  const onAllScenariosComplete = (event, args) => {
    if (args && args.completedScenarioId) {
      setFinishedScenarioInfo({ id: args.completedScenarioId, error: args.error == true });
    }
    setRunningScenarioID(null); // Re-enable controls
    setRunningScenarioIDsQueued([]);
    signalProjectRunning(false); // Let App-component know too
  };


  useEffect(() => {
    if (!selectedSetting?.project_folder) return;
    setProjectFolder(selectedSetting.project_folder);
    setProjectName(selectedSetting.project_name);
    setEmmePythonPath(selectedSetting.emme_python_path);
    setModeDestCalibrationFile(selectedSetting.mode_dest_calibration_file);
    setMunicipalityCalibrationFile(selectedSetting.municipality_calibration_file);
    setValmaScriptsPath(selectedSetting.valma_scripts_path);
    setBaseDataFolder(selectedSetting.base_data_folder);
    loadProjectScenarios(selectedSetting.project_folder)
  }, [selectedSetting?.project_folder]);

  useEffect(() => {
    setScenariosToRun(resolveRunnableScenarios(scenarioIDsToRun, scenarios));
  }, [scenarioIDsToRun]);

  useEffect(() => {
    if (ipcAttachedRef.current) return;
    ipcAttachedRef.current = true;
    // Attach Electron IPC event listeners (to worker => UI events)
    ipcRenderer.on('loggable-event', onLoggableEvent);
    ipcRenderer.on('scenario-complete', onScenarioComplete);
    ipcRenderer.on('all-scenarios-complete', onAllScenariosComplete);

    return () => {
      // Detach Electron IPC event listeners
      ipcRenderer.removeListener('loggable-event', onLoggableEvent);
      ipcRenderer.removeListener('scenario-complete', onScenarioComplete);
      ipcRenderer.removeListener('all-scenarios-complete', onAllScenariosComplete);
      ipcAttachedRef.current = false;
    }
  }, []);



  useEffect(() => {
    if (finishedScenarioInfo && finishedScenarioInfo.id.length > 0) {
      let mainScenarioId = "";
      let updatedScenario = undefined;

      scenarios.forEach(scen => {
        if (scen.id == finishedScenarioInfo.id) {
          mainScenarioId = scen.id;
          updatedScenario = {
            ...scen,
            last_run: dayjs().format('HH:mm:ss ⁯DD.MM.YYYY'),
            run_success: finishedScenarioInfo.error == true ? false : true
          }
        } else if (scen.subScenarios) {
          scen.subScenarios.forEach(sub => {
            if (sub.id == finishedScenarioInfo.id) {
              const index = scen.subScenarios.map(s => s.id).indexOf(sub.id);
              const newSubScenarios = [...scen.subScenarios];
              newSubScenarios[index].last_run = dayjs().format('HH:mm:ss ⁯DD.MM.YYYY');
              newSubScenarios[index].runSuccess = finishedScenarioInfo.error == true ? false : true;
              mainScenarioId = scen.id;
              updatedScenario = {
                ...scen,
                subScenarios: [...newSubScenarios]
              }
            }
          })
        }
      })
      _updateScenario(updatedScenario);
      setFinishedScenarioInfo(undefined);
    }
  }, [finishedScenarioInfo]);

  return (
    <div className="Project">

      {/* Panel for views and controls */}
      <div className="Project__runtime">
        {(!runningScenarioID && !isLogOpened && !openScenarioID && subScenarioEdit != null) &&
          <SubScenario
            subScenarioEdit={subScenarioEdit}
            handleChange={handleChangeSubScenario}
            handleSave={saveSubScenario}
            handleCancel={cancelEditingSubScenario}
            scenarioNames={scenarioNames}
          />
        }
        <Runtime
          projectFolder={projectFolder}
          reloadScenarios={() => loadProjectScenarios(projectFolder)}
          scenarios={scenarios}
          scenarioIDsToRun={scenarioIDsToRun}
          runningScenarioID={runningScenarioID}
          openScenarioID={openScenarioID}
          setOpenScenarioID={setOpenScenarioID}
          deleteScenario={(scenario) => { _deleteScenario(scenario) }}
          handleClickScenarioToActive={_handleClickScenarioToActive}
          handleClickNewScenario={_handleClickNewScenario}
          handleClickStartStop={_handleClickStartStop}
          logArgs={logArgs}
          duplicateScenario={duplicateScenario}
          handleClickCreateSubScenario={handleClickCreateSubScenario}
          openCreateEmmeBank={openCreateEmmeBank}
          addNewSetting={addNewSetting}
          duplicateSubScenario={duplicateSubScenario}
          deleteSubScenario={deleteSubScenario}
          modifySubScenario={handleClickModifySubScenario}
          activeScenarios={scenariosToRun}
        />
        <CostBenefitAnalysis
          projectFolder={projectFolder}
          runCbaScript={_runCbaScript}
        />
      </div>

      {/* Panel for view(s) and controls in right side layout*/}
      <div className="Project__selected-details">
        {/* show log if, either scenario is running, or log is manually opened (outside running) */
          (runningScenarioID || isLogOpened) ?
            <RunLog
              entries={logContents.map((entry, i) => { return { ...entry, id: i }; })}
              isScenarioRunning={runningScenarioID}
              closeRunLog={() => setLogOpened(false)}
            />
            :
            /* while no scenarios running, and log hidden (log has precedence), allow showing open scenario config */
            openScenarioID !== null ?
              <Scenario
                scenario={scenarios.find((s) => s.id === openScenarioID)}
                updateScenario={_updateScenario}
                closeScenario={() => setOpenScenarioID(null)}
                existingOtherNames={scenarioNames.filter(sn => sn.id !== openScenarioID).map(s => s.name)}
                inheritedGlobalProjectSettings={{
                  projectFolder,
                  emmePythonPath,
                  valmaScriptsPath,
                  baseDataFolder
                }}
              />
              :
              ""
        }
      </div>
    </div>
  )
};

export default VlemProject;