import React from 'react';
import { Tooltip } from 'react-tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface SubScenario {
  id: string;
  name: string;
  lastRun?: string;
  runSuccess?: boolean;
}

interface ScenarioData {
  id: string;
  name: string;
}

interface SubScenarioRowProps {
  scenarioData: ScenarioData;
  subScenario: SubScenario;

  runningScenarioID?: string;
  openScenarioID?: string;

  scenarioIDsToRun: string[];

  handleClickScenarioToActive: (subScenario: SubScenario) => void;
  duplicateSubScenario: (subScenario: SubScenario) => void;
  modifySubScenario: (subScenario: SubScenario) => void;
  deleteSubScenario: (subScenario: SubScenario) => void;

  tooltipContent: (scenario: ScenarioData, subScenario: SubScenario) => JSX.Element;

  projectFolder: string;
  parentScenarioIsRunOrSelectedForRunning: boolean;
  parentScenarioResultDataFolder: string;
}

/* ------------------------------------------------------------------ */

const SubScenarioRow: React.FC<SubScenarioRowProps> = ({
  scenarioData,
  subScenario,

  runningScenarioID,
  openScenarioID,

  scenarioIDsToRun,

  handleClickScenarioToActive,
  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,

  tooltipContent,
  projectFolder,
  parentScenarioIsRunOrSelectedForRunning,
  parentScenarioResultDataFolder,
}) => {
  const scenarioLogFilePath = window.fsHelpers.join(
    projectFolder,
    subScenario.name,
    `${subScenario.name}.log`
  );

  const resultsExist = window.fsHelpers.exists(parentScenarioResultDataFolder);
  const scenarioLogExists = window.fsHelpers.exists(scenarioLogFilePath);

  const openResultDataFolder = () => {
    window.electron.openPath(parentScenarioResultDataFolder);
  };

  const openLogFile = () => {
    if (scenarioLogExists) {
      window.electron.openPath(scenarioLogFilePath);
    }
  };

  return (
    <tr
      className="SubScenarioRow"
      onClick={() => handleClickScenarioToActive(subScenario)}
    >
      <td>
        {subScenario.name
          ? subScenario.name
          : `Unnamed project (${subScenario.id})`}
      </td>

      <td>
        {resultsExist && subScenario.lastRun && subScenario.lastRun}
      </td>

      <td>
        {resultsExist && scenarioLogExists && (
          <button onClick={openLogFile}>
            {subScenario.runSuccess ? 'OK' : 'LOG'}
          </button>
        )}
      </td>

      <td>
        {resultsExist && (
          <button onClick={openResultDataFolder}>NÄYTÄ</button>
        )}
      </td>

      <td>
        <button onClick={() => duplicateSubScenario(subScenario)}>
          KOPIOI
        </button>
      </td>

      <td>
        <button
          disabled={!!runningScenarioID}
          onClick={() =>
            !runningScenarioID && modifySubScenario(subScenario)
          }
        >
          MUOKKAA
        </button>
      </td>

      <td>
        <button
          disabled={!!runningScenarioID}
          onClick={() =>
            !runningScenarioID && deleteSubScenario(subScenario)
          }
        >
          POISTA
        </button>
      </td>

      <Tooltip
        anchorSelect={`#subscenario-${subScenario.id}`}
        html={renderToStaticMarkup(
          tooltipContent(scenarioData, subScenario)
        )}
      />
    </tr>
  );
};

export default SubScenarioRow;