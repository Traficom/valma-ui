import React, { JSX } from 'react';
import { Tooltip } from 'react-tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

import { SCENARIO_TYPES } from '../../../../enums';
import SubScenarioRow from './SubScenarioRow';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface OverriddenProjectSettings {
  projectFolder?: string | null;
}

interface SubScenario {
  id: string;
  name: string;
}

interface ScenarioData {
  id: string;
  name: string;
  scenarioType: string;

  last_run?: string;
  run_success?: boolean;

  overriddenProjectSettings?: OverriddenProjectSettings;
  subScenarios?: SubScenario[];
}

interface ScenarioTableRowProps {
  scenarioData: ScenarioData;

  runningScenarioID?: string;
  openScenarioID?: string;
  scenarioIDsToRun: string[];

  handleClickScenarioToActive: (id: string) => void;
  duplicateScenario: (scenario: string) => void;
  handleClickCreateSubScenario: (id: string) => void;
  setOpenScenarioID: (id: string) => void;
  deleteScenario: (scenario: ScenarioData) => void;

  tooltipContent: (scenario: ScenarioData, subScenario?: SubScenario) => JSX.Element;

  projectFolder: string;

  duplicateSubScenario: (sub: SubScenario) => void;
  modifySubScenario: (sub: SubScenario) => void;
  deleteSubScenario: (sub: SubScenario) => void;
}

/* ------------------------------------------------------------------ */

const ScenarioTableRow: React.FC<ScenarioTableRowProps> = ({
  scenarioData,
  runningScenarioID,
  openScenarioID,
  scenarioIDsToRun,

  handleClickScenarioToActive,
  duplicateScenario,
  handleClickCreateSubScenario,
  setOpenScenarioID,
  deleteScenario,

  tooltipContent,
  projectFolder,

  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
}) => {
  const fsHelpers = window.fsHelpers;
  const isOverriddenProjectFolderSet =
    scenarioData.overriddenProjectSettings &&
    scenarioData.overriddenProjectSettings.projectFolder != null;

  const scenarioProjectFolder = isOverriddenProjectFolderSet
    ? scenarioData.overriddenProjectSettings!.projectFolder!
    : fsHelpers.join(projectFolder, scenarioData.name);

  const scenarioLogFilePath = fsHelpers.join(
    scenarioProjectFolder,
    `${scenarioData.name}.log`
  );

  const resultsExist = window.fsHelpers.exists(scenarioProjectFolder);
  const scenarioLogExists = window.fsHelpers.exists(scenarioLogFilePath);

  const openResultsFolder = () => {
    window.electron.openPath(scenarioProjectFolder);
  };

  const openLogFile = () => {
    if (scenarioLogExists) {
      window.electron.openPath(scenarioLogFilePath);
    }
  };

  const scenarioTypeLabel = (() => {
    switch (scenarioData.scenarioType) {
      case SCENARIO_TYPES.GOODS_TRANSPORT:
        return 'Tavaraliikenne';
      case SCENARIO_TYPES.PASSENGER_TRANSPORT:
        return 'Henkilöliikenne';
      case SCENARIO_TYPES.LONG_DISTANCE:
        return 'Pitkät matkat';
      default:
        return 'Henkilöliikenne';
    }
  })();

  return (
    <>
      <tr
        className="ScenarioTableRow"
        onClick={() => handleClickScenarioToActive(scenarioData.id)}
      >
        <td>
          {scenarioData.name
            ? scenarioData.name
            : `Unnamed project (${scenarioData.id})`}
        </td>

        <td>{scenarioTypeLabel}</td>

        <td>{resultsExist && scenarioData.last_run}</td>

        <td>
          {resultsExist && scenarioLogExists && (
            <button onClick={openLogFile}>
              {scenarioData.run_success ? 'OK' : 'LOG'}
            </button>
          )}
        </td>

        <td>
          {resultsExist && (
            <button onClick={openResultsFolder}>NÄYTÄ</button>
          )}
        </td>

        <td>
          {scenarioData.scenarioType !== SCENARIO_TYPES.GOODS_TRANSPORT && (
            <button
              onClick={() =>
                handleClickCreateSubScenario(scenarioData.id)
              }
            >
              Luo aliskenaario
            </button>
          )}
        </td>

        <td>
          <button onClick={() => duplicateScenario(scenarioData.id)}>
            KOPIOI
          </button>
        </td>

        <td>
          <button
            disabled={!!runningScenarioID}
            onClick={() =>
              !runningScenarioID &&
              setOpenScenarioID(scenarioData.id)
            }
          >
            MUOKKAA
          </button>
        </td>

        <td>
          <button
            disabled={!!runningScenarioID}
            onClick={() =>
              !runningScenarioID && deleteScenario(scenarioData)
            }
          >
            POISTA
          </button>
        </td>

        <Tooltip
          anchorSelect={`#scenario-${scenarioData.id}`}
          html={renderToStaticMarkup(tooltipContent(scenarioData))}
        />
      </tr>

      {scenarioData.subScenarios &&
        scenarioData.subScenarios.map(subScenario => (
          <SubScenarioRow
            key={subScenario.id}
            scenarioData={scenarioData}
            subScenario={subScenario}
            runningScenarioID={runningScenarioID}
            openScenarioID={openScenarioID}
            scenarioIDsToRun={scenarioIDsToRun}
            handleClickScenarioToActive={() => {}}
            duplicateSubScenario={duplicateSubScenario}
            modifySubScenario={modifySubScenario}
            deleteSubScenario={deleteSubScenario}
            tooltipContent={tooltipContent}
            projectFolder={projectFolder}
            parentScenarioIsRunOrSelectedForRunning={
              scenarioIDsToRun.includes(scenarioData.id)
            }
            parentScenarioResultDataFolder={scenarioProjectFolder}
          />
        ))}
    </>
  );
};

export default ScenarioTableRow;