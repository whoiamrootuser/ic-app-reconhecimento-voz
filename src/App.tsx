import React from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { Controls } from './components/Controls';

const App: React.FC = () => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();

  return (
    <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        <header className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-cyan-400">
            Legenda em tempo real
          </h1>
          <div className="text-sm text-gray-400">
            {isListening ? 'Ouvindo...' : 'Inativo'}
          </div>
        </header>

        <TranscriptDisplay
          transcript={transcript}
          interimTranscript={interimTranscript}
        />
        
        {error && (
            <div className="px-6 py-2 text-center text-red-400 bg-red-900/50">
                <p><strong>Error:</strong> {error}</p>
                <p className="text-sm text-red-300">Por favor habilite a permissão ao microfone e utilize navegadores com suporte (Chrome, Edge).</p>
            </div>
        )}

        <footer className="flex-shrink-0 p-4 bg-gray-800/50 border-t border-gray-700">
          <Controls
            isListening={isListening}
            onStart={startListening}
            onStop={stopListening}
            onClear={clearTranscript}
          />
        </footer>
      </div>
       <div className="text-center mt-4 text-gray-500 text-xs">
          <p>IC 2025</p>
        </div>
    </main>
  );
};

export default App;