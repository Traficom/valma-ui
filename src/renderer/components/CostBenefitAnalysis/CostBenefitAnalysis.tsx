import React from 'react';
import './CostBenefitAnalysis.css';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface CbaOptions {
  baseline_scenario_path?: string;
  projected_scenario_path?: string;
  baseline_scenario_2_path?: string;
  projected_scenario_2_path?: string;
}

interface CostBenefitAnalysisProps {
  projectFolder: string;
  cbaOptions: CbaOptions;
  setCbaOptions: (updater: (prev: CbaOptions) => CbaOptions) => void;
  runCbaScript: () => void;
}

/* ------------------------------------------------------------------ */

const CostBenefitAnalysis: React.FC<CostBenefitAnalysisProps> = ({
  projectFolder,
  cbaOptions,
  setCbaOptions,
  runCbaScript,
}) => {
  const selectDirectory = (key: keyof CbaOptions) => {
    window.dialog
      .showOpenDialog({
        defaultPath: projectFolder,
        properties: ['openDirectory'],
      })
      .then((e: any) => {
        if (!e.canceled) {
          const targetPath = e.filePaths[0];
          setCbaOptions(prev => ({
            ...prev,
            [key]: targetPath,
          }));
        }
      });
  };

  return (
    <div className="CostBenefitAnalysis">
      <h2>Skenaariovertailu</h2>

      <table>
        <tbody>
          <tr>
            {/* Baseline scenario */}
            <td>
              Vertailuvaihtoehto{' '}
              <button
                onClick={() =>
                  selectDirectory('baseline_scenario_path')
                }
              >
                {cbaOptions.baseline_scenario_path
                  ? window.api.path.basename(
                      cbaOptions.baseline_scenario_path
                    )
                  : 'Valitse..'}
              </button>
            </td>

            {/* Projected scenario */}
            <td>
              Hankevaihtoehto{' '}
              <button
                onClick={() =>
                  selectDirectory('projected_scenario_path')
                }
              >
                {cbaOptions.projected_scenario_path
                  ? window.api.path.basename(
                      cbaOptions.projected_scenario_path
                    )
                  : 'Valitse..'}
              </button>
            </td>
          </tr>

          <tr>
            {/* Baseline scenario year 2 */}
            <td>
              Vertailuvaihtoehto vuosi 2 (valinnainen){' '}
              <button
                onClick={() =>
                  selectDirectory(
                    'baseline_scenario_2_path'
                  )
                }
              >
                {cbaOptions.baseline_scenario_2_path
                  ? window.api.path.basename(
                      cbaOptions.baseline_scenario_2_path
                    )
                  : 'Valitse..'}
              </button>
            </td>

            {/* Projected scenario year 2 */}
            <td>
              Hankevaihtoehto vuosi 2 (valinnainen){' '}
              <button
                onClick={() =>
                  selectDirectory(
                    'projected_scenario_2_path'
                  )
                }
              >
                {cbaOptions.projected_scenario_2_path
                  ? window.api.path.basename(
                      cbaOptions.projected_scenario_2_path
                    )
                  : 'Valitse..'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <button onClick={runCbaScript}>
        Aja skenaariovertailu
      </button>
    </div>
  );
};

export default CostBenefitAnalysis;