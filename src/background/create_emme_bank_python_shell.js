const ps = require('python-shell');
const {ipcRenderer} = require('electron');

module.exports = {
  createEmmeBankPythonShell: function (worker, runParameters, onEndCallback) {

    // Make sure project folder is given
    if (!runParameters.project_folder) {
      alert("Project folder is not set."); // Should never occur
      return;
    }

    // Make sure worker isn't overridden (and if so, abort the run)
    if (worker) {
      alert("Worker already in progress."); // Should never occur
      return;
    }
    const createEmmeScript = runParameters.valma_scripts_path + "\\create_emmebank.py"
    // Start create_emmebank.py
    worker = new ps.PythonShell(
      createEmmeScript,
      {
        mode: 'json',
        pythonPath: runParameters.emme_python_path,
        pythonOptions: ['-u'], // unbuffered
        args: [
          "--log-level", runParameters.log_level || 'DEBUG',
          "--log-format", "JSON",
          "--emme-path", runParameters.project_folder || '',
          "--submodel", runParameters.submodel || '',
          "--number-of-emme-scenarios", runParameters.number_of_emme_scenarios || '',
          "--project-name", runParameters.project_name || ''
        ].concat(runParameters.separate_emme_scenarios ? ["--separate-emme-scenarios"] : [])
      });
    worker.on('message', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('stderr', (event) => ipcRenderer.send('loggable-event-from-worker', {...event, time: new Date()}));
    worker.on('error', (error) => ipcRenderer.send('process-error-from-worker', error));

    // Attach end handler
    worker.end((err, code, signal) => {
      worker = null;
      if (err) {
        ipcRenderer.send("process-error-from-worker", err.message);
      }
      onEndCallback(err? err.message : '');
    });

    // Return worker, because the original reference isn't in use when assigning local worker var to new PythonShell().
    return worker;
  }
};
