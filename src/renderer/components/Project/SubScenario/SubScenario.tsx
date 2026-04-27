import React, { useState } from 'react';
import './SubScenario.css';

const { dialog } = require('electron').remote;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ScenarioName {
  id: string;
  name: string;
}

interface SubScenarioEdit {
  id: string | null;
  parentScenarioId: string;
  parentScenarioName: string;
  name: string;
  emmeScenarioNumber: number | string;
  cost_data_file: string;
  parentCostDataFile: string;
}

interface SubScenarioProps {
  subScenarioEdit: SubScenarioEdit;
  handleChange: (sub: SubScenarioEdit) => void;
  handleSave: () => void;
  handleCancel: () => void;
  scenarioNames: ScenarioName[];
}

/* ------------------------------------------------------------------ */

const SubScenario: React.FC<SubScenarioProps> = ({
  subScenarioEdit,
  handleChange,
  handleSave,
  handleCancel,
  scenarioNames,
}) => {
  const checkName = (newName: string): boolean => {
    return (
      !newName ||
      scenarioNames.find(
        existing =>
          existing.name === newName &&
          existing.id !== subScenarioEdit.id
      ) !== undefined
    );
  };
  
  const path = window.api.path;
  const [nameIsInvalid, setNameIsInvalid] = useState<boolean>(
    checkName(subScenarioEdit.name)
  );

  const namePlaceholder = `${subScenarioEdit.parentScenarioName}_SUB`;

  const handleNameChange = (val: string) => {
    const newName = val;
    setNameIsInvalid(checkName(newName));
    handleChange({ ...subScenarioEdit, name: newName });
  };

  return (
    <div className="SubScenario">
      {/* Overlay */}
      <div className="SubScenario__overlay" onClick={handleCancel} />

      <div className="SubScenario__content">
        <h2>Aliskenaarion asetukset</h2>

        {/* Subscenario name */}
        <label>
          Aliskenaarion nimi
          <input
            type="text"
            placeholder={namePlaceholder}
            value={subScenarioEdit.name}
            onChange={e => handleNameChange(e.target.value)}
          />
        </label>

        {nameIsInvalid && (
          <div className="SubScenario__error">
            Tarkista aliskenaarion nimi. Nimi ei voi olla tyhjä
            tai sama kuin jo olemassa oleva skenaarion nimi.
          </div>
        )}

        {/* Emme scenario number */}
        <label>
          EMME-skenaarion numero
          <input
            type="number"
            min={1}
            max={999}
            value={subScenarioEdit.emmeScenarioNumber}
            onChange={e =>
              handleChange({
                ...subScenarioEdit,
                emmeScenarioNumber: Number(e.target.value),
              })
            }
          />
        </label>

        {/* Cost data file */}
        <label>
          Liikenteen hintadata
          <button
            onClick={() =>
              dialog
                .showOpenDialog({
                  defaultPath: subScenarioEdit.cost_data_file
                    ? subScenarioEdit.cost_data_file
                    : subScenarioEdit.parentCostDataFile,
                  filters: [
                    { name: 'Json', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] },
                  ],
                  properties: ['openFile'],
                })
                .then(e => {
                  if (!e.canceled) {
                    handleChange({
                      ...subScenarioEdit,
                      cost_data_file: e.filePaths[0],
                    });
                  }
                })
            }
          >
            {subScenarioEdit.cost_data_file
              ? path.basename(subScenarioEdit.cost_data_file)
              : 'Valitse..'}
          </button>

          {subScenarioEdit.cost_data_file && (
            <button
              onClick={e => {
                e.preventDefault();
                handleChange({
                  ...subScenarioEdit,
                  cost_data_file: '',
                });
              }}
            >
              ✕
            </button>
          )}
        </label>

        <p>
          Aliskenaarion kysyntämatriisit otetaan skenaariosta{' '}
          <strong>{subScenarioEdit.parentScenarioName}</strong>
        </p>

        {/* Actions */}
        <div className="SubScenario__actions">
          <button
            disabled={nameIsInvalid}
            onClick={handleSave}
          >
            Tallenna
          </button>
          <button onClick={handleCancel}>Peruuta</button>
        </div>
      </div>
    </div>
  );
};

export default SubScenario;