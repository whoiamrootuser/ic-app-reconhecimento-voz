import React from 'react';
import { Icon } from './Icon';

interface ControlsProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ isListening, onStart, onStop, onClear }) => {
  return (
    <div className="flex justify-center items-center space-x-4">
      <button
        onClick={onClear}
        disabled={isListening}
        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        <Icon type="clear" />
        <span>Limpar</span>
      </button>

      {!isListening ? (
        <button
          onClick={onStart}
          className="px-8 py-4 bg-green-600 text-white rounded-full hover:bg-green-500 transition-transform transform hover:scale-105 shadow-lg flex items-center space-x-3 text-lg font-semibold"
        >
          <Icon type="mic" />
          <span>Ouvir</span>
        </button>
      ) : (
        <button
          onClick={onStop}
          className="px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-transform transform hover:scale-105 shadow-lg flex items-center space-x-3 text-lg font-semibold animate-pulse"
        >
          <Icon type="stop" />
          <span>Parar</span>
        </button>
      )}
    </div>
  );
};