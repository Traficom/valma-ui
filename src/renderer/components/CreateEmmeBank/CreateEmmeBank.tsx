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

      <div className="CreateEmmeBank_overlay" onClick={(e) => handleCancel()}>{/* Dark background overlay */}</div>

      <div className="CreateEmmeBank_dialog">

        <div className="CreateEmmeBank_dialog-controls" onClick={(e) => handleCancel()}></div>

        <div className="CreateEmmeBank_dialog-heading">Luo Emme-pankki</div>

        {/* Sub model selection */}
        <label className="CreateEmmeBank_label"
          htmlFor="submodel">Osamalli</label>
        <div className="Submodel_select">
          <select id="submodel" value={submodel} onChange={e => setSubmodel(e.target.value)}>
            <option key={"submodel_select"} value={""}>--- valitse ---</option>
            {projectSubmodels && projectSubmodels.map((submodel) =>
              <option key={submodel.id} value={submodel.id}>{submodel.name}</option>)
            }
          </select>
        </div>
        {/* Amount of scenerios */}
        <label className="CreateEmmeBank_label"
          htmlFor="submodel">Skenaarioiden lukumäärä</label>
        <input className='CreateEmmeBank_input'
          type="number"
          min="1"
          max="999"
          step="1"
          value={numberOfEmmeScenarios}
          onChange={e => setNumberOfEmmeScenarios(Number(e.target.value))}
        />

        {/* Save to separate emme scenarios */}
        <div className='CreateEmmeBank_checkbox_container'>
          <input id="separate-emme-scenarios"
            className='CreateEmmeBank_checkbox'
            type="checkbox"
            checked={separateEmmeScenarios}
            onChange={(e) => {
              setSeparateEmmeScenarios(!separateEmmeScenarios);
            }}
          />
          <label className="CreateEmmeBank_checkbox_label"
            htmlFor="separate-emme-scenarios">Tallenna ajanjaksot erillisiin Emme-skenaarioihin</label>
        </div>

        <div className="CreateEmmeBank_buttons">
          <button
            className="CreateEmmeBank_btn"
            onClick={e => createProject(submodel, numberOfEmmeScenarios, separateEmmeScenarios)}
          >
            <span>Luo pankki</span>
          </button>
          <button
            className="CreateEmmeBank_btn"
            onClick={(e) => handleCancel()}
          >
            <span>Peruuta</span>
          </button>
        </div>

      </div>
    </div>)
};

export default CreateEmmeBank;