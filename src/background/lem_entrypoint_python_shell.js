const ps = require('python-shell');
const {ipcRenderer} = require('electron');
const { getLongDistDemandForecast } = require('./getLongDistDemandForecast.js');

module.exports = {

  runInputValidationPythonShell: function (worker, allRunParameters, onEndCallback) {

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }

    // Start model-system's lem_validate_inputfiles.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${allRunParameters[0].helmet_scripts_path}/validate_inputfiles.py`,
      {
        mode: 'json',
        pythonPath: allRunParameters[0].emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", allRunParameters[0].log_level,
          "--log-format", "JSON",
          "--baseline-data-path", allRunParameters[0].base_data_folder_path,
          "--results-path", allRunParameters[0].results_data_folder_path,
        ].concat(["--scenario-name"]).concat(allRunParameters.map(p => p.name))
          .concat(allRunParameters[0].end_assignment_only ? ["--end-assignment-only"] : [])
          .concat(["--emme-paths"]).concat(allRunParameters.map(p => p.emme_project_path))
          .concat(["--long-dist-demand-forecast"]).concat(allRunParameters.map(p => getLongDistDemandForecast(p.scenarioType, p.long_dist_demand_forecast,  p.long_dist_demand_forecast_path)))
          .concat(["--cost-data-paths"]).concat(allRunParameters.map(p => p.costDataPath))
          .concat(["--first-scenario-ids"]).concat(allRunParameters.map(p => p.first_scenario_id))
          .concat(["--forecast-data-paths"]).concat(allRunParameters.map(p => p.forecast_data_path))
          .concat(allRunParameters.map(p => p.separate_emme_scenarios).every(Boolean) ? ["--separate-emme-scenarios"] : [])
          .concat(["--freight-matrix-paths"]).concat(allRunParameters.map(p => p.freight_matrix_path ? p.freight_matrix_path: 'none'))
          .concat(["--submodel"]).concat(allRunParameters.map(p => p.submodel))
          .concat(["--model-types"]).concat(allRunParameters.map(p => p.scenarioType))
      });

    // Attach runtime handlers (stdout/stderr, process errors)
    worker.on('message', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('stderr', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('error', (error) => ipcRenderer.send('process-error-from-worker', error));

    // Attach end handler
    worker.end((err, code, signal) => {
      worker = null;
      if (err) {
        ipcRenderer.send('process-error-from-worker', err.message);
      }
      onEndCallback(err);
    });

    // Return worker, because the original reference isn't in use when assigning local worker var to new PythonShell().
    return worker;
  },

  runLemEntrypointPythonShell: function (worker, runParameters, onEndCallback) {

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }

    let longDistDemandForecast = getLongDistDemandForecast(runParameters.scenarioType, runParameters.long_dist_demand_forecast,  runParameters.long_dist_demand_forecast_path);
    // Start lem-model-system's valma_travel.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${runParameters.helmet_scripts_path}/valma_travel.py`,
      {
        mode: 'json',
        pythonPath: runParameters.emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", runParameters.log_level,
          "--log-format", "JSON",
          "--scenario-name", runParameters.name,
          "--results-path", runParameters.results_data_folder_path,
          "--emme-path", runParameters.emme_project_path,
          "--first-scenario-id", runParameters.first_scenario_id,
          "--baseline-data-path", runParameters.base_data_folder_path,
          "--cost-data-path", runParameters.costDataPath,
          "--forecast-data-path", runParameters.forecast_data_path,
          "--first-matrix-id", (runParameters.first_matrix_id == null ? "100" : runParameters.first_matrix_id),
          "--iterations", runParameters.iterations,
          "--long-dist-demand-forecast", longDistDemandForecast
        ]
          .concat(runParameters.end_assignment_only ? ["--end-assignment-only"] : [])
          .concat(runParameters.delete_strategy_files == true | runParameters.delete_strategy_files == null ? ["--del-strat-files"] : [])
          .concat(runParameters.separate_emme_scenarios ? ["--separate-emme-scenarios"] : [])
          .concat(runParameters.save_matrices_in_emme ? ["--save-emme-matrices"] : [])
          .concat(runParameters.stored_speed_assignment ? ["--stored-speed-assignment"]: [])
          .concat(runParameters.submodel ? ["--submodel", runParameters.submodel] : [])
          .concat(runParameters.freight_matrix_path && runParameters.freight_matrix_path != "" ? ["--freight-matrix-path", runParameters.freight_matrix_path] : [])
          .concat(runParameters.mode_dest_calibration_path ? ["--mode-dest-calibration-path", runParameters.mode_dest_calibration_path] : [])
          .concat(runParameters.municipality_calibration_path ? ["--municipality-calibration-path", runParameters.municipality_calibration_path] : [])
      });

    // Attach runtime handlers (stdout/stderr, process errors)
    worker.on('message', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('stderr', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('error', (error) => ipcRenderer.send('process-error-from-worker', error));

    // Attach end handler
    worker.end((err, code, signal) => {
      worker = null;
      if (err) {
        ipcRenderer.send('process-error-from-worker', err.message);
      }
      onEndCallback();
    });

    // Return worker, because the original reference isn't in use when assigning local worker var to new PythonShell().
    return worker;
  },

  runFreightLemEntrypointPythonShell: function (worker, runParameters, onEndCallback) {

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }

    // Start lem-model-system's valma_freight.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${runParameters.helmet_scripts_path}/valma_freight.py`,
      {
        mode: 'json',
        pythonPath: runParameters.emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", runParameters.log_level,
          "--log-format", "JSON",
          "--scenario-name", runParameters.name,
          "--results-path", runParameters.results_data_folder_path,
          "--emme-path", runParameters.emme_project_path,
          "--first-scenario-id", runParameters.first_scenario_id,
          "--cost-data-path", runParameters.costDataPath,
          "--forecast-data-path", runParameters.forecast_data_path,
          "--trade-demand-data-path", runParameters.tradeDemandDataPath,
          "--first-matrix-id", (runParameters.first_matrix_id == null ? "100" : runParameters.first_matrix_id),
        ]
          .concat(runParameters.delete_strategy_files == true | runParameters.delete_strategy_files == null ? ["--del-strat-files"] : [])
      });

    // Attach runtime handlers (stdout/stderr, process errors)
    worker.on('message', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('stderr', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('error', (error) => ipcRenderer.send('process-error-from-worker', error));

    // Attach end handler
    worker.end((err, code, signal) => {
      worker = null;
      if (err) {
        ipcRenderer.send('process-error-from-worker', err.message);
      }
      onEndCallback();
    });

    // Return worker, because the original reference isn't in use when assigning local worker var to new PythonShell().
    return worker;
  }
};
