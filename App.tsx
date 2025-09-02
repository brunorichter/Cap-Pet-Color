
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Zone } from './types';
import ZoneBox from './components/ZoneBox';
import { identifyColor } from './services/geminiService';

const INITIAL_ZONES: Zone[] = [
  { id: 1, name: 'Zone 1', x: 5, y: 5, width: 43, height: 43, colorName: 'Scanning...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 2, name: 'Zone 2', x: 52, y: 5, width: 43, height: 43, colorName: 'Scanning...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 3, name: 'Zone 3', x: 5, y: 52, width: 43, height: 43, colorName: 'Scanning...', colorHex: '#FFFFFF', isProcessing: false },
  { id: 4, name: 'Zone 4', x: 52, y: 52, width: 43, height: 43, colorName: 'Scanning...', colorHex: '#FFFFFF', isProcessing: false },
];

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isProcessingRef = useRef(false);

  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access was denied. Please allow camera permissions in your browser settings.");
      }
    };
    startCamera();
  }, []);

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

    const getZoneImageData = (zone: Zone): string => {
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

    try {
      const analysisPromises = zones.map(zone => {
          const imageData = getZoneImageData(zone);
          return identifyColor(imageData).then(result => ({ zoneId: zone.id, ...result }));
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
        setError("Failed to analyze image. See console for details.");
        setZones(prev => prev.map(z => ({ ...z, isProcessing: false, colorName: 'Error', colorHex: '#FF4136' })));
    } finally {
        isProcessingRef.current = false;
    }
  }, [isCameraReady, zones]);

  useEffect(() => {
    if (!isCameraReady) return;
    const intervalId = setInterval(processFrames, 3000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraReady, processFrames]);

  return (
    <main className="relative w-screen h-screen bg-gray-900 text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 -z-10" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 z-10 p-4 bg-black/40 flex flex-col">
        <header className="text-center py-4 shrink-0">
          <h1 className="text-4xl font-bold tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>PET Cap Color Identifier</h1>
          <p className="text-lg text-gray-200" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Position bottle caps within the zones for detection</p>
        </header>

        <div className="flex-grow relative">
          {!isCameraReady ? (
            <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-semibold animate-pulse">Initializing Camera...</p>
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
