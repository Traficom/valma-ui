import React from 'react';
import { SUBMODEL_PREFIX } from '../../../../constants';

/* ----------------------------- Types ----------------------------- */

interface ScenarioSummary {
  id: string;
  name: string;
}

interface ScenariosToRunProps {
  scenariosToRun?: ScenarioSummary[];
}

/* --------------------------- Component --------------------------- */

const ScenariosToRun: React.FC<ScenariosToRunProps> = ({ scenariosToRun }) => {
  return (<p className="Runtime__start-stop-description">
    {scenariosToRun && scenariosToRun.length > 0 && scenariosToRun.map ? (
      <span className="Runtime__start-stop-scenarios">
        {scenariosToRun.filter(s => !s.id.includes(SUBMODEL_PREFIX)).map(s => s.name).join(", ")}
      </span>
    ) : (
      <span>Ei ajettavaksi valittuja skenaarioita</span>
    )}
  </p>)
};

export default ScenariosToRun;