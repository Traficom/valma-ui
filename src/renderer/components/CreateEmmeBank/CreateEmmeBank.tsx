import React, { useState } from 'react';
import './CreateEmmeBank.css';
import projectSubmodels from './ProjectSubmodels';

/* ----------------------------- Types ----------------------------- */

interface Submodel {
  name: string;
}

interface CreateEmmeBankProps {
  createProject: (
    submodel: string,
    numberOfEmmeScenarios: number,
    separateEmmeScenarios: boolean
  ) => void;
  handleCancel: () => void;
}

/* --------------------------- Component --------------------------- */

const CreateEmmeBank: React.FC<CreateEmmeBankProps> = ({
  createProject,
  handleCancel,
}) => {
  const [submodel, setSubmodel] = useState<string>('');
  const [numberOfEmmeScenarios, setNumberOfEmmeScenarios] = useState<number>(1);
  const [separateEmmeScenarios, setSeparateEmmeScenarios] =
    useState<boolean>(false);

  return (
    <div className="CreateEmmeBank">
      {/* Overlay */}
      <div
        className="CreateEmmeBank__overlay"
        onClick={handleCancel}
      />

      <div className="CreateEmmeBank__content">
        <h2>Luo Emme-pankki</h2>

        {/* Submodel */}
        <label>
          Osamalli
          <select
            value={submodel}
            onChange={e => setSubmodel(e.target.value)}
          >
            <option value="">--- valitse ---</option>
            {projectSubmodels &&
              projectSubmodels.map((sm: Submodel) => (
                <option key={sm.name} value={sm.name}>
                  {sm.name}
                </option>
              ))}
          </select>
        </label>

        {/* Scenario count */}
        <label>
          Skenaarioiden lukumäärä
          <input
            type="number"
            min={1}
            value={numberOfEmmeScenarios}
            onChange={e => setNumberOfEmmeScenarios(Number(e.target.value))}
          />
        </label>

        {/* Separate scenarios */}
        <label>
          <input
            type="checkbox"
            checked={separateEmmeScenarios}
            onChange={() =>
              setSeparateEmmeScenarios(!separateEmmeScenarios)
            }
          />
          Tallenna ajanjaksot erillisiin Emme-skenaarioihin
        </label>

        {/* Actions */}
        <div className="CreateEmmeBank__actions">
          <button
            onClick={() =>
              createProject(
                submodel,
                numberOfEmmeScenarios,
                separateEmmeScenarios
              )
            }
            disabled={!submodel}
          >
            Luo pankki
          </button>
          <button onClick={handleCancel}>Peruuta</button>
        </div>
      </div>
    </div>
  );
};

export default CreateEmmeBank;