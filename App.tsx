
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Zone, IdentificationMode } from './types';
import ZoneBox from './components/ZoneBox';
import { identifyColor } from './services/geminiService';
import { identifyColorByRgb } from './services/rgbService';


const INITIAL_ZONES: Zone[] = [
  { id: 1, name: 'Zona 1', x: 5, y: 5, width: 43, height: 43, colorName: 'Analisando...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 2, name: 'Zona 2', x: 52, y: 5, width: 43, height: 43, colorName: 'Analisando...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 3, name: 'Zona 3', x: 5, y: 52, width: 43, height: 43, colorName: 'Analisando...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 4, name: 'Zona 4', x: 52, y: 52, width: 43, height: 43, colorName: 'Analisando...', colorHex: '#FFFFFF', isProcessing: false },
];

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isProcessingRef = useRef(false);

  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [identificationMode, setIdentificationMode] = useState<IdentificationMode>('gemini');

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error accessing or enumerating devices:", err);
        setError("O acesso à câmera foi negado. Por favor, permita o acesso à câmera nas configurações do seu navegador.");
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId }, width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
            setError(null);
          };
        }
      } catch (err) {
        console.error("Error starting camera:", err);
        setError("Não foi possível iniciar a câmera selecionada. Tente outra ou atualize a página.");
        setIsCameraReady(false);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  const processFrames = useCallback(async () => {
    if (isProcessingRef.current || !videoRef.current || !canvasRef.current || !isCameraReady) {
      return;
    }
    isProcessingRef.current = true;
    setZones(prev => prev.map(z => ({ ...z, isProcessing: true })));

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      isProcessingRef.current = false;
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const getZoneBase64Data = (zone: Zone): string => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return '';
        
        const sx = (zone.x / 100) * canvas.width;
        const sy = (zone.y / 100) * canvas.height;
        const sWidth = (zone.width / 100) * canvas.width;
        const sHeight = (zone.height / 100) * canvas.height;

        tempCanvas.width = sWidth;
        tempCanvas.height = sHeight;
        tempCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        
        return tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    };
    
    const getZoneImageData = (zone: Zone): ImageData | null => {
      const sx = (zone.x / 100) * canvas.width;
      const sy = (zone.y / 100) * canvas.height;
      const sWidth = (zone.width / 100) * canvas.width;
      const sHeight = (zone.height / 100) * canvas.height;
      return ctx.getImageData(sx, sy, sWidth, sHeight);
    };

    try {
        const analysisPromises = zones.map(async (zone) => {
            if (identificationMode === 'gemini') {
                const base64Data = getZoneBase64Data(zone);
                return identifyColor(base64Data).then(result => ({ zoneId: zone.id, ...result }));
            } else { // RGB mode
                const imageData = getZoneImageData(zone);
                if (!imageData) return { zoneId: zone.id, colorName: 'Erro', hexCode: '#FF4136' };
                const result = identifyColorByRgb(imageData);
                return { zoneId: zone.id, ...result };
            }
        });
      const results = await Promise.all(analysisPromises);
      
      setZones(prevZones => 
        prevZones.map(zone => {
          const result = results.find(r => r.zoneId === zone.id);
          return result 
            ? { ...zone, colorName: result.colorName, colorHex: result.hexCode, isProcessing: false } 
            : { ...zone, isProcessing: false };
        })
      );
    } catch (apiError) {
        console.error("An error occurred during API calls:", apiError);
        setError("Falha ao analisar a imagem. Veja o console para detalhes.");
        setZones(prev => prev.map(z => ({ ...z, isProcessing: false, colorName: 'Erro', colorHex: '#FF4136' })));
    } finally {
        isProcessingRef.current = false;
    }
  }, [isCameraReady, zones, identificationMode]);

  useEffect(() => {
    if (!isCameraReady) return;
    const intervalId = setInterval(processFrames, 3000);
    return () => clearInterval(intervalId);
  }, [isCameraReady, processFrames]);

  return (
    <main className="relative w-screen h-screen bg-gray-900 text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 -z-10" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 z-10 p-4 bg-black/40 flex flex-col">
        <div className="absolute top-4 left-4 z-20">
             <label htmlFor="mode-select" className="sr-only">Modo de Identificação</label>
             <select
                 id="mode-select"
                 value={identificationMode}
                 onChange={(e) => setIdentificationMode(e.target.value as IdentificationMode)}
                 className="bg-gray-800 text-white border border-gray-600 rounded-md p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
                 <option value="gemini">IA Gemini</option>
                 <option value="rgb">Cor RGB</option>
             </select>
        </div>

        {devices.length > 1 && (
            <div className="absolute top-4 right-4 z-20">
                <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-gray-800 text-white border border-gray-600 rounded-md p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Selecionar câmera"
                >
                    {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Câmera ${index + 1}`}
                        </option>
                    ))}
                </select>
            </div>
        )}
        <header className="text-center py-4 shrink-0">
          <h1 className="text-4xl font-bold tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>Identificador de Cor de Tampa PET</h1>
          <p className="text-lg text-gray-200" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Posicione as tampas de garrafa dentro das zonas para detecção</p>
        </header>

        <div className="flex-grow relative">
          {!isCameraReady ? (
            <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-semibold animate-pulse">Iniciando Câmera...</p>
                {error && <p className="text-red-400 mt-4 max-w-md">{error}</p>}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {zones.map(zone => (
                <ZoneBox key={zone.id} zone={zone} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default App;
