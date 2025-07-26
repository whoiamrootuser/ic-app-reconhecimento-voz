import React, { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcript: string[];
  interimTranscript: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript, interimTranscript }) => {
  const endOfTranscriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfTranscriptRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  return (
    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
      <div className="text-2xl sm:text-3xl md:text-4xl leading-relaxed text-gray-200">
        {transcript.map((chunk, index) => (
          <span key={index}>{chunk}&nbsp;</span>
        ))}
        <span className="text-gray-400">{interimTranscript}</span>
      </div>
      <div ref={endOfTranscriptRef} />
    </div>
  );
};