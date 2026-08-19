import React from 'react';
import arrow_down_white from './arrow_down_white.svg';


const ArrowDownWhite: React.FC = () => {
  return (
       <span style={{ paddingTop: "10px" }}><img src={arrow_down_white} alt="link" width="24" height="24" /></span>
  );
};

export default ArrowDownWhite;