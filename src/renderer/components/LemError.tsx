import './LemError.css';
import React from 'react';

interface LemErrorProps {
  info: string;
  close: () => void;
}

const LemError: React.FC<LemErrorProps> = ({ info, close }) => {
  return (
    <div className="LemError">
            <div className="LemError__dialog">
                <div className="LemError__dialog-controls" onClick={(e) => close()}></div>
                <div className="LemError__dialog-heading">Virhe</div>
                <div className="LemError__dialog-info">{info}</div>
                <div className='LemError_ok_btn_div'>
                    <button
                        className="LemError_ok_btn"
                        onClick={(e) => close()}
                    >
                        <span>OK</span>
                    </button>
                </div>
            </div>
        </div>
  );
};

export default LemError;