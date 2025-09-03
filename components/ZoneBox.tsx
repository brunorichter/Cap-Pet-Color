import React from 'react';
import type { Zone } from '../types';

interface ZoneBoxProps {
  zone: Zone;
}

const ZoneBox: React.FC<ZoneBoxProps> = ({ zone }) => {
  const isIdentified = zone.colorName !== 'Analisando...' && zone.colorName !== 'Nenhuma' && zone.colorName !== 'Erro';

  const boxStyle = {
    borderColor: zone.colorHex,
    boxShadow: isIdentified ? `0 0 15px ${zone.colorHex}, inset 0 0 10px ${zone.colorHex}` : 'none',
  };

  const textStyle = {
    color: isIdentified ? zone.colorHex : '#FFFFFF',
    textShadow: '0 0 5px rgba(0,0,0,0.8)',
  };

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.width}%`,
        height: `${zone.height}%`,
      }}
    >
      <div 
        className="w-full h-auto mb-2 text-center text-2xl font-bold transition-opacity duration-300"
        style={textStyle}
      >
        {zone.isProcessing ? '...' : zone.colorName}
      </div>
      <div
        className="w-full h-full border-4 bg-white/10 backdrop-blur-sm rounded-lg transition-all duration-500 ease-in-out"
        style={boxStyle}
      ></div>
    </div>
  );
};

export default ZoneBox;