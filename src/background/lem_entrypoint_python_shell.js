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

    // Start model-system's validate_inputfiles.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${allRunParameters[0].valma_scripts_path}/validate_inputfiles.py`,
      {
        mode: 'json',
        pythonPath: allRunParameters[0].emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", allRunParameters[0].log_level,
          "--log-format", "JSON",
          "--base-data-folder", allRunParameters[0].base_data_folder,
          "--result-data-folder", allRunParameters[0].result_data_folder,
        ].concat(["--scenario-name"]).concat(allRunParameters.map(p => p.name))
          .concat(allRunParameters[0].end_assignment_only ? ["--end-assignment-only"] : [])
          .concat(["--emme-project-files"]).concat(allRunParameters.map(p => p.emme_project_file))
          .concat(["--long-dist-demand-forecast"]).concat(allRunParameters.map(p => getLongDistDemandForecast(p.scenarioType, p.long_dist_demand_forecast,  p.long_dist_demand_forecast_path)))
          .concat(["--cost-data-file"]).concat(allRunParameters.map(p => p.cost_data_file))
          .concat(["--first-scenario-ids"]).concat(allRunParameters.map(p => p.first_scenario_id))
          .concat(["--zone-data-file"]).concat(allRunParameters.map(p => p.zone_data_file))
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

  runModelSystemEntrypointPythonShell: function (worker, runParameters, onEndCallback) {

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }

    let longDistDemandForecast = getLongDistDemandForecast(runParameters.scenarioType, runParameters.long_dist_demand_forecast,  runParameters.long_dist_demand_forecast_path);
    // Start valma-model-system's valma_travel.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${runParameters.valma_scripts_path}/valma_travel.py`,
      {
        mode: 'json',
        pythonPath: runParameters.emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", runParameters.log_level,
          "--log-format", "JSON",
          "--scenario-name", runParameters.name,
          "--result-data-folder", runParameters.result_data_folder,
          "--emme-project-file", runParameters.emme_project_file,
          "--first-scenario-id", runParameters.first_scenario_id,
          "--base-data-folder", runParameters.base_data_folder,
          "--cost-data-file", runParameters.cost_data_file,
          "--zone-data-file", runParameters.zone_data_file,
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
          .concat(runParameters.mode_dest_calibration_file ? ["--mode-dest-calibration-file", runParameters.mode_dest_calibration_file] : [])
          .concat(runParameters.municipality_calibration_file ? ["--municipality-calibration-file", runParameters.municipality_calibration_file] : [])
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

  runModelSystemFreightEntrypointPythonShell: function (worker, runParameters, onEndCallback) {

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }

    // Start lem-model-system's valma_freight.py in shell with EMME's python interpreter
    worker = new ps.PythonShell(
      `${runParameters.valma_scripts_path}/valma_freight.py`,
      {
        mode: 'json',
        pythonPath: runParameters.emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", runParameters.log_level,
          "--log-format", "JSON",
          "--scenario-name", runParameters.name,
          "--result-data-folder", runParameters.result_data_folder,
          "--emme-project-file", runParameters.emme_project_file,
          "--first-scenario-id", runParameters.first_scenario_id,
          "--cost-data-file", runParameters.cost_data_file,
          "--zone-data-file", runParameters.zone_data_file,
          "--trade-demand-data-path", runParameters.trade_demand_data_path,
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
