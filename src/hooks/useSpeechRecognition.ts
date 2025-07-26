import { useState, useRef, useCallback, useEffect } from 'react';

// The WebSocket URL for the Python speech recognition service.
const WEBSOCKET_URL = 'ws://localhost:8765';

// The code for our AudioWorkletProcessor, which will run in a separate thread.
const audioWorkletCode = `
class AudioStreamProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.targetSampleRate = 16000;
    }

    // Simple downsampling function to convert audio to the target sample rate.
    downsample(buffer, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) {
            return buffer;
        }
        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0 && input[0].length > 0) {
            const audioChunk = input[0]; // Float32Array from -1.0 to 1.0

            // Downsample to 16kHz, a common rate for speech recognition models.
            const downsampled = this.downsample(audioChunk, sampleRate, this.targetSampleRate);

            // Convert Float32 to 16-bit PCM.
            const pcm16Buffer = new Int16Array(downsampled.length);
            for (let i = 0; i < downsampled.length; i++) {
                pcm16Buffer[i] = Math.max(-1, Math.min(1, downsampled[i])) * 0x7FFF;
            }

            // Post the raw PCM buffer to the main thread for sending.
            this.port.postMessage(pcm16Buffer.buffer, [pcm16Buffer.buffer]);
        }
        return true; // Keep the processor alive.
    }
}
registerProcessor('audio-stream-processor', AudioStreamProcessor);
`;

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const websocketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const stopListening = useCallback(() => {
        if (!isListening) return;

        setIsListening(false);
        setInterimTranscript('');

        websocketRef.current?.close();
        websocketRef.current = null;

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current.port.onmessage = null;
            audioWorkletNodeRef.current = null;
        }

        if (audioContextRef.current?.state !== 'closed') {
            audioContextRef.current?.close();
            audioContextRef.current = null;
        }
    }, [isListening]);

    const startListening = useCallback(async () => {
        if (isListening) return;

        setTranscript([]);
        setInterimTranscript('');
        setError(null);

        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error('Error getting user media:', err);
            setError('Por favor habilite a permissão ao microfone.');
            return;
        }
        
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
            setError("O navegador não suporta AudioContext.");
            return;
        }
        audioContextRef.current = new AudioContext();
        
        if (!audioContextRef.current.audioWorklet) {
             setError("O navegador não suporta AudioWorklet. Tente um navegador moderno como Chrome ou Firefox.");
             stopListening();
             return;
        }

        const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
        const workletURL = URL.createObjectURL(blob);

        try {
            await audioContextRef.current.audioWorklet.addModule(workletURL);
        } catch (e) {
            console.error('Error adding AudioWorklet module', e);
            setError('Falha ao carregar o processador de áudio.');
            stopListening();
            return;
        }

        audioWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-stream-processor');
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        source.connect(audioWorkletNodeRef.current).connect(audioContextRef.current.destination);

        websocketRef.current = new WebSocket(WEBSOCKET_URL);
        
        websocketRef.current.onopen = () => {
            console.log('WebSocket connection opened.');
            setIsListening(true);
            audioWorkletNodeRef.current!.port.onmessage = (event) => {
                websocketRef.current?.readyState === WebSocket.OPEN && websocketRef.current.send(event.data);
            };
        };

        websocketRef.current.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.is_final) {
                    const finalTranscript = data.transcript.trim();
                    if (finalTranscript) {
                       setTranscript(prev => [...prev, finalTranscript]);
                    }
                    setInterimTranscript('');
                } else {
                    setInterimTranscript(data.transcript);
                }
            } catch (e) {
                console.warn('Could not parse incoming message as JSON:', event.data);
            }
        };

        websocketRef.current.onerror = (event: Event) => {
            console.error('A WebSocket error occurred. This is often followed by an `onclose` event with more details.');
            setError('A conexão com o serviço de transcrição falhou. Verifique se o servidor Python está em execução.');
            stopListening();
        };

        websocketRef.current.onclose = (event: CloseEvent) => {
            console.log(`WebSocket connection closed: Code=${event.code}, Reason="${event.reason}", Clean=${event.wasClean}`);
            
            if (!event.wasClean) {
                let errorMessage = `A conexão foi perdida (código: ${event.code}).`;
                if (event.code === 1011) { // 1011 is Internal Server Error
                    errorMessage += ' Ocorreu um erro interno no servidor. Verifique o console do servidor Python para a mensagem de erro específica (ex: TypeError).';
                } else {
                    errorMessage += ' Verifique se o servidor Python está em execução e a conexão de rede.';
                }
                setError(errorMessage);
            }
            stopListening();
        };

    }, [isListening, stopListening]);
    
    const clearTranscript = useCallback(() => {
        setTranscript([]);
        setInterimTranscript('');
    }, []);

    // Effect for cleaning up resources when the component unmounts.
    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return { isListening, transcript, interimTranscript, startListening, stopListening, clearTranscript, error };
};