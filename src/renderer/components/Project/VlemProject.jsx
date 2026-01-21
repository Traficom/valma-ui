import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Store from "electron-store";
import fs from "fs";
import path from "path";
import dayjs from 'dayjs';

const { ipcRenderer } = require('electron');

// vex-js imported globally in index.html, since we cannot access webpack config in electron-forge

const VlemProject = ({
  projectName, projectFolder, emmePythonPath, helmetScriptsPath, baseDataFolder,
  signalProjectRunning, settingsId, modeDestCalibrationFile, municipalityCalibrationFile, openCreateEmmeBank, addNewSetting
}) => {
  // VLEM Project -specific settings
  const [scenarios, setScenarios] = useState([]); // Scenarios under currently selected Project
  const [openScenarioID, setOpenScenarioID] = useState(null); // currently open Scenario configuration
  const [subScenarioEdit, setSubScenarioEdit] = useState(null); // currently open SubScenario configuration

  // Runtime controls & -logging
  const [scenarioIDsToRun, setScenarioIDsToRun] = useState([]); // selected active scenarios ready to run sequentially
  const [runningScenarioID, setRunningScenarioID] = useState(null); // currently running Scenario, indicates if running
  const [runningScenarioIDsQueued, setRunningScenarioIDsQueued] = useState([]); // queued ("remaining") Scenarios
  const [logContents, setLogContents] = useState([]); // project runtime log-contents
  const [isLogOpened, setLogOpened] = useState(false); // whether runtime log is open
  const [logArgs, setLogArgs] = useState({});
  const [finishedScenarioInfo, setFinishedScenarioInfo] = useState(undefined);
  const [scenarioNames, setScenarioNames] = useState([]); // all scenario and subScenario names

  // Cost-Benefit Analysis (CBA) controls
  const [cbaOptions, setCbaOptions] = useState({});

  // Scenario-specific settings under currently selected Project
  const configStores = useRef({});

  ipcRenderer.setMaxListeners(20);

  const _handleClickScenarioToActive = (scenario) => {
    if (scenarioIDsToRun.includes(scenario.id)) {
      // If scenario exists in scenarios to run, remove it
      let newScenarioIds = scenarioIDsToRun.filter((id) => id !== scenario.id);
      if (scenario.subScenarios && (!scenario.run_success || scenario.run_success == false || scenario.last_run == "")) {
        scenario.subScenarios.forEach(subScenario => newScenarioIds = newScenarioIds.filter((id) => id !== subScenario.id));
      }
      setScenarioIDsToRun(newScenarioIds);
    } else {
      // Else add it
      setScenarioIDsToRun(scenarioIDsToRun.concat(scenario.id));
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
    promptCreation();
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

  const _loadProjectScenarios = (projectFilepath) => {
    // Load all .json files from project dir, and check if their keys match scenarios' keys. Match? -> add to scenarios.
    const configPath = projectFilepath;
    const foundScenarios = [];
    fs.readdirSync(configPath).forEach((fileName) => {
      if (fileName.endsWith(".json")) {
        const obj = JSON.parse(fs.readFileSync(path.join(configPath, fileName), 'utf8'));
        if ("id" in obj
          && "name" in obj
          && "iterations" in obj
        ) {
          configStores.current[obj.id] = new Store({ cwd: configPath, name: fileName.slice(0, -5) });
          foundScenarios.push(obj);
        }
      }
    });
    //If scenarios don't have runstatus properties (ie. are older scenarios), adding them here to prevent wonky behaviour
    const decoratedFoundScenarios = foundScenarios.map(scenario => {
      if (scenario.runStatus === undefined) {
        return addRunStatusProperties(scenario);
      }
      return scenario;
    })

    setScenarios(decoratedFoundScenarios);
    // Reset state of project related properties
    setOpenScenarioID(null);
    setSubScenarioEdit(null);
    setScenarioIDsToRun([]);
    setRunningScenarioID(null);
    setRunningScenarioIDsQueued([]);
    setLogContents([]);
    setLogOpened(false);
    resolveScenarioNames(decoratedFoundScenarios);
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
    const isLongDistanceScenario = scenarioType ==  SCENARIO_TYPES.LONG_DISTANCE;
    const newScenario = {
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
      iterations: isLongDistanceScenario? 1 : 15,
      last_run: null,
      subScenarios: [],
      overriddenProjectSettings: {
        projectFolder: null,
        emmePythonPath: null,
        helmetScriptsPath: null,
        baseDataFolder: null,
      },
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
    };
    // Create the new scenario in "scenarios" array first
    const tempScenarios = scenarios.concat(newScenario);
    setScenarios(tempScenarios);
    configStores.current[newId] = new Store({ cwd: projectFolder, name: newScenarioName });
    configStores.current[newId].set(newScenario);
    // Then set scenario as open by id (Why id? Having open_scenario as reference causes sub-elements to be bugged because of different object reference)
    setOpenScenarioID(newId);
    resolveScenarioNames(tempScenarios);
  };

  const _updateScenario = (newValues) => {
    // Update newValues to matching .id in this.state.scenarios
    setScenarios(scenarios.map((s) => (s.id === newValues.id ? { ...s, ...newValues } : s)));
    // If name changed, rename file and change reference
    if (configStores.current[newValues.id].get('name') !== newValues.name) {
      // If name was set empty - use ID instead
      const newName = newValues.name ? newValues.name : newValues.id;
      fs.renameSync(
        configStores.current[newValues.id].path,
        path.join(projectFolder, `${newName}.json`)
      );
      configStores.current[newValues.id] = new Store({
        cwd: projectFolder,
        name: newName
      });
    }
    // And persist all changes in file
    configStores.current[newValues.id].set(newValues);
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
          fs.unlinkSync(path.join(projectFolder, `${scenario.name}.json`));
          window.location.reload();  // Vex-js dialog input gets stuck otherwise
          resolveScenarioNames(scenarios);
        }
      }
    })
  };

  const duplicateScenario = (scenario) => {
    var duplicatedScenario = structuredClone(scenario);
    //Change ID and rename the scenario to avoid conflicts.
    duplicatedScenario.id = uuidv4();
    duplicatedScenario.name += `(${duplicatedScenario.id.split('-')[0]})`;
    duplicatedScenario.subScenarios = [];
    const tempScenarios = scenarios.concat(duplicatedScenario);
    setScenarios(tempScenarios);
    resolveScenarioNames(tempScenarios);
    configStores.current[duplicatedScenario.id] = new Store({ cwd: projectFolder, name: duplicatedScenario.name });
    configStores.current[duplicatedScenario.id].set(duplicatedScenario);
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

  const duplicateSubScenario = (subScenario) => {
    var parentScenario = scenarios.find((s) => s.id === subScenario.parentScenarioId);
    if (!parentScenario) {
      // Should not occur
      alert('Virhe, aliskenaarion pääskenaariota ei löydy.');
      return;
    }

    const newId = uuidv4();
    const newSubScenario = {
      id: newId,
      parentScenarioId: `${subScenario.parentScenarioId}`,
      name: `${subScenario.name + "_2"}`,
      emmeScenarioNumber: `${subScenario.emmeScenarioNumber}`,
      cost_data_file: `${subScenario.cost_data_file}`,
      lastRun: "",
      runSuccess: false,
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

  function resolveRunnableScenarios(scenarioIDsToRun, scenarios) {
    if (!scenarioIDsToRun || scenarioIDsToRun.length == 0 || !scenarios || scenarios.length == 0) {
      return [];
    }

    let runnableScenarios = [];
    scenarios.forEach(scenario => {

      if (scenarioIDsToRun.includes(scenario.id) && !runnableScenarios.find(s => s.id == scenario.id)) {
        const scenarioRunIndex = scenarioIDsToRun.indexOf(scenario.id) + 1;
        runnableScenarios.push({...scenario, runIndex: scenarioRunIndex + 0.001});

        if (scenario.storedSpeedAssignmentInputs && scenario.storedSpeedAssignmentInputs.length > 0) {
          const validStoredSpeedAssignmentInputs = scenario.storedSpeedAssignmentInputs.filter(Boolean);
          if(validStoredSpeedAssignmentInputs.length > 0 ) {
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
            runnableScenarios.push({ ...subSenario, runIndex: scenarioRunIndexForSubScenario + ((scenarioIDsToRun.indexOf(subSenario.id) + 1) / 100) });
          }
        })
      }
    });

    const sortedRunnableScenarios = runnableScenarios.sort((a, b) => a.runIndex - b.runIndex);
    return sortedRunnableScenarios;
  }

  function createRunnableStoredSpeedAssignment(scenario, storedSpeedAssignmentInput, scenarioIndex, ssaIndex){
    return { ...scenario, 
      id: STORED_SPEED_ASSIGNMENT_PREFIX + ssaIndex +"_" + scenario.id,
      runIndex: scenarioIndex + ((1 + ssaIndex) / 10000),
      first_scenario_id: storedSpeedAssignmentInput.firstScenarioId, 
      submodel: storedSpeedAssignmentInput.submodel,
      stored_speed_assignment: false}
  }

  const scenariosToRun = resolveRunnableScenarios(scenarioIDsToRun, scenarios);

  function resolveScenarioId(scenario){
    if(scenario.parentScenarioId){
      return scenario.parentScenarioId; 
    }
    if(scenario.id.includes(STORED_SPEED_ASSIGNMENT_PREFIX)){
      return scenario.id.split("_").pop();
    }
    return scenario.id;
  }

  const _runAllActiveScenarios = (activeScenarioIDs) => {
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
    if (!helmetScriptsPath) {
      alert("VLEM Scripts -kansiota ei ole asetettu, tarkista Asetukset.");
      return;
    }
    if (!baseDataFolder) {
      alert("L\u00E4ht\u00F6datan kansiota ei ole asetettu, tarkista Asetukset.");
      return;
    }

    // For each active scenario, check required scenario-specific parameters are set
    for (let scenario of scenariosToRun) {
      const scenarioId = resolveScenarioId(scenario);
      const store = configStores.current[scenarioId];
      const iterations = store.get('iterations');
      if (!store.get('zone_data_file')) {
        alert(`Syöttötietoja (zone_data_file) ei ole valittu skenaariossa "${scenario.name}"`);
        return;
      }
      if (iterations < 1 || iterations > 99) {
        alert(`Aseta iteraatiot väliltä 1 - 99 skenaariossa "${scenario.name}"`);
        return;
      }
      if (!store.get('cost_data_file') && !scenario.cost_data_file) {
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
          helmet_scripts_path: determinePath(scenario.overriddenProjectSettings, scenario.overriddenProjectSettings.helmetScriptsPath, helmetScriptsPath),
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

  const _runCbaScript = () => {
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
    if (!helmetScriptsPath) {
      alert("VLEM Scripts -kansiota ei ole asetettu, tarkista Asetukset.");
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
        helmet_scripts_path: helmetScriptsPath,
        result_data_folder: projectFolder,
      });
  };

  // Electron IPC event listeners
  const onLoggableEvent = (event, args) => {
    setLogContents(previousLog => [...previousLog, args]);
    setLogArgs(args);
  };

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
    // Attach Electron IPC event listeners (to worker => UI events)
    ipcRenderer.on('loggable-event', onLoggableEvent);
    ipcRenderer.on('scenario-complete', onScenarioComplete);
    ipcRenderer.on('all-scenarios-complete', onAllScenariosComplete);
    _loadProjectScenarios(projectFolder);

    return () => {
      // Detach Electron IPC event listeners
      ipcRenderer.removeListener('loggable-event', onLoggableEvent);
      ipcRenderer.removeListener('scenario-complete', onScenarioComplete);
      ipcRenderer.removeListener('all-scenarios-complete', onAllScenariosComplete);
    }
  }, [settingsId]);

  useEffect(() => {
    if (finishedScenarioInfo && finishedScenarioInfo.id.length > 0) {
      let mainScenarioId = "";

      scenarios.forEach(scen => {
        if (scen.id == finishedScenarioInfo.id) {
          mainScenarioId = scen.id;
        } else if (scen.subScenarios) {
          scen.subScenarios.forEach(sub => {
            if (sub.id == finishedScenarioInfo.id) {
              mainScenarioId = scen.id;
            }
          })
        }
      })

      const lastRunScenarioFromStore = configStores.current[mainScenarioId].get();
      let updatedScenario = undefined;
      if (mainScenarioId == finishedScenarioInfo.id) {
        updatedScenario = {
          ...lastRunScenarioFromStore,
          last_run: dayjs().format('HH:mm:ss ⁯DD.MM.YYYY'),
          run_success: finishedScenarioInfo.error == true ? false : true
        }
      } else {
        const index = lastRunScenarioFromStore.subScenarios.map(s => s.id).indexOf(finishedScenarioInfo.id);
        const newSubScenarios = [...lastRunScenarioFromStore.subScenarios];
        newSubScenarios[index].lastRun = dayjs().format('HH:mm:ss ⁯DD.MM.YYYY');
        newSubScenarios[index].runSuccess = finishedScenarioInfo.error == true ? false : true;
        updatedScenario = {
          ...lastRunScenarioFromStore,
          subScenarios: [...newSubScenarios]
        }
      }
      configStores.current[mainScenarioId].set(updatedScenario);
      const mainScenarioIndexInScenarios = scenarios.map(s => s.id).indexOf(mainScenarioId);
      setScenarios(oldState => {
        const newScenarios = [...oldState];
        newScenarios[mainScenarioIndexInScenarios] = { ...updatedScenario };
        return newScenarios;
      })
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
          reloadScenarios={() => _loadProjectScenarios(projectFolder)}
          scenarios={scenarios}
          scenarioIDsToRun={[...scenarioIDsToRun]}
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
          cbaOptions={cbaOptions}
          setCbaOptions={setCbaOptions}
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
                  helmetScriptsPath,
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