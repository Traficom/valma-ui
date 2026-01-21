import React, { useState } from 'react';

const SubScenario = ({
    subScenarioEdit,
    handleChange,
    handleSave,
    handleCancel,
    scenarioNames,
}) => {

    function checkName(newName) {
        return !newName || newName == 0 ||
            scenarioNames.find((existingName) => existingName.name == newName && existingName.id != subScenarioEdit.id)
    }
    const [nameIsInValid, setNameIsInValid] = useState(checkName(subScenarioEdit.name)); // all scenario and subScenario names 
    const namePlaceHolder = subScenarioEdit.parentScenarioName + "_SUB";

    function handleNameChange(val) {
        const newName = cutUnvantedCharacters(val);
        setNameIsInValid(checkName(newName));
        handleChange({ ...subScenarioEdit, name: newName });
    }

    return (
        <div className="SubScenario">

            <div className="SubScenario_overlay" onClick={(e) => handleCancel()}>{/* Dark background overlay */}</div>

            <div className="SubScenario_dialog">

                <div className="SubScenario_dialog-controls" onClick={(e) => handleCancel()}></div>

                <div className="SubScenario_dialog-heading">Aliskenaarion asetukset</div>

                {/* Sub model name */}
                <label className="SubScenario_label"
                    htmlFor="sub_cenario__name">Aliskenaarion nimi</label>
                <input id="sub_scenario-name"
                    className="SubScenario_input"
                    type="text"
                    placeholder={namePlaceHolder}
                    value={subScenarioEdit.name}
                    onChange={(e) => {
                        handleNameChange(e.target.value);
                    }}
                />
                {nameIsInValid ? <span className="SubScenario_error">Tarkista aliskenaarion nimi. Nimi ei voi olla tyhjä tai sama kuin jo olemassa oleva skenaarionimi.</span> : ""}
                {/* Emme scenario number */}
                <label className="SubScenario_label"
                    htmlFor="submodel">EMME-skenaarion numero</label>
                <input id="project_name"
                    className="SubScenario_input"
                    type="number"
                    min="1"
                    value={subScenarioEdit.emmeScenarioNumber || 1}
                    onChange={(e) => {
                        handleChange({ ...subScenarioEdit, emmeScenarioNumber: e.target.value });
                    }}
                />

                {/* File path to cost data */}
                <div>
                    <span className="SubScenario_label">Liikenteen hintadata</span>
                    <div className="SubScenario_input_with_reset">
                    <label className="SubScenario_input" htmlFor="sub-cost-data-file-select" title={subScenarioEdit.cost_data_file ? subScenarioEdit.cost_data_file : "Cost data file"}>
                        {subScenarioEdit.cost_data_file ? path.basename(subScenarioEdit.cost_data_file) : "Valitse.."}
                    </label>
                    {subScenarioEdit.cost_data_file &&
                            <span onClick={(event) => {
                                event.preventDefault();
                                handleChange({ ...subScenarioEdit, cost_data_file: "" });
                            }}>
                                <ResetIcon />
                            </span>
                    }
                    </div>
                    <input className="SubScenario__hidden-input"
                        id="sub-cost-data-file-select"
                        type="text"
                        onClick={() => {
                            dialog.showOpenDialog({
                                defaultPath: subScenarioEdit.cost_data_file ? subScenarioEdit.cost_data_file : subScenarioEdit.parentCostDataFile,
                                filters: [
                                    { name: 'Json', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ],
                                properties: ['openFile']
                            }).then((e) => {
                                if (!e.canceled) {
                                    handleChange({ ...subScenarioEdit, cost_data_file: e.filePaths[0] });
                                }
                            })
                        }}
                    />
                </div>

                <label className="SubScenario_label"
                    htmlFor="submodel">Aliskenaarion kysyntämatriisit otetaan skenaariosta <b>{subScenarioEdit.parentScenarioName}</b></label>


                <div className="SubScenario_buttons">
                    <button
                        className="SubScenario_btn"
                        disabled={nameIsInValid}
                        readOnly={nameIsInValid}
                        onClick={(e) => { !nameIsInValid && handleSave() }}
                    >
                        <span>Tallenna</span>
                    </button>
                    <button
                        className="SubScenario_btn"
                        onClick={(e) => handleCancel()}
                    >
                        <span>Peruuta</span>
                    </button>
                </div>

            </div>
        </div>
    )

}