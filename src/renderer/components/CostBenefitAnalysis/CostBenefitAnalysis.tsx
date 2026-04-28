import React from 'react';
import path from "path";
import { CbaOptions } from '../Project/types/CbaOptions'
import { openFileDialog, openFolderDialog } from '../Project/Dialog'

interface CostBenefitAnalysisProps {
  projectFolder: string;
  runCbaScript: (cbaOptions: CbaOptions) => void;
}

const CostBenefitAnalysis: React.FC<CostBenefitAnalysisProps> = ({
  projectFolder,
  runCbaScript
}) => {

  let cbaOptions: CbaOptions = {
    baseline_scenario_path: "",
    projected_scenario_path: "",
    baseline_scenario_2_path: "",
    projected_scenario_2_path: ""
  };

  return (
    <div className="CBA">
      <div className="CBA__heading">Skenaariovertailu</div>
      <table className="CBA__choices">
        <tbody>
          <tr>
            {/* Baseline scenario results folder */}
            <td>
              <span className="CBA__pseudo-label">Vertailuvaihtoehto</span>
              <label className="CBA__pseudo-file-select" htmlFor="baseline-scenario-results-folder-select" title={cbaOptions.baseline_scenario_path}>
                {cbaOptions.baseline_scenario_path ? path.basename(cbaOptions.baseline_scenario_path) : "Valitse.."}
              </label>
              <input className="CBA__hidden-input"
                id="baseline-scenario-results-folder-select"
                type="text"
                onClick={async () => {
                  const folder = await openFolderDialog(
                    projectFolder
                  );
                  if (folder) {
                    cbaOptions.baseline_scenario_path = folder;
                  }
                }}
              />
            </td>
            {/* Projected scenario results folder */}
            <td>
              <span className="CBA__pseudo-label">Hankevaihtoehto</span>
              <label className="CBA__pseudo-file-select" htmlFor="projected-scenario-results-folder-select" title={cbaOptions.projected_scenario_path}>
                {cbaOptions.projected_scenario_path ? path.basename(cbaOptions.projected_scenario_path) : "Valitse.."}
              </label>
              <input className="CBA__hidden-input"
                id="projected-scenario-results-folder-select"
                type="text"
                 onClick={async () => {
                  const folder = await openFolderDialog(
                    projectFolder
                  );
                  if (folder) {
                    cbaOptions.projected_scenario_path = folder;
                  }
                }}
              />
            </td>
          </tr>
          <tr>
            {/* Baseline scenario 2 results folder */}
            <td>
              <span className="CBA__pseudo-label">Vertailuvaihtoehto vuosi 2 (valinnainen)</span>
              <label className="CBA__pseudo-file-select" htmlFor="baseline-scenario-2-results-folder-select" title={cbaOptions.baseline_scenario_2_path}>
                {cbaOptions.baseline_scenario_2_path ? path.basename(cbaOptions.baseline_scenario_2_path) : "Valitse.."}
              </label>
              <input className="CBA__hidden-input"
                id="baseline-scenario-2-results-folder-select"
                type="text"
                onClick={async () => {
                  const folder = await openFolderDialog(
                    projectFolder
                  );
                  if (folder) {
                    cbaOptions.baseline_scenario_2_path = folder;
                  }
                }}
              />
            </td>
            {/* Projected scenario 2 results folder */}
            <td>
              <span className="CBA__pseudo-label">Hankevaihtoehto vuosi 2 (valinnainen)</span>
              <label className="CBA__pseudo-file-select" htmlFor="projected-scenario-2-results-folder-select" title={cbaOptions.projected_scenario_2_path}>
                {cbaOptions.projected_scenario_2_path ? path.basename(cbaOptions.projected_scenario_2_path) : "Valitse.."}
              </label>
              <input className="CBA__hidden-input"
                id="projected-scenario-2-results-folder-select"
                type="text"
                onClick={async () => {
                  const folder = await openFolderDialog(
                    projectFolder
                  );
                  if (folder) {
                    cbaOptions.projected_scenario_2_path = folder;
                  }
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="CBA__run">
        <button onClick={(e) => { runCbaScript(cbaOptions) }}>Aja skenaariovertailu</button>
      </div>
    </div>);
};

export default CostBenefitAnalysis;