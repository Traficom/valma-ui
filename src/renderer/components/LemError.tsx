import './LemError.css';
import React from 'react';

interface LemErrorProps {
  info: string;
  close: () => void;
}

const LemError: React.FC<LemErrorProps> = ({ info, close }) => {
  return (
    <div className="LemError">
      <div className="LemError__content">
        <h2>Virhe</h2>
        <pre>{info}</pre>
        <button onClick={close}>OK</button>
      </div>
    </div>
  );
};

export default LemError;