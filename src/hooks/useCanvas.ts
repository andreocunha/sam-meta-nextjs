import { useState, useEffect, RefObject, useRef } from 'react';
import { initializeCanvas, handleCanvasClick, createMaskFromDrawing } from '@/utils/canvasUtils';

export function useCanvas(canvasRef: RefObject<HTMLCanvasElement>) {
  const [maskDataList, setMaskDataList] = useState<Float32Array[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const drawingPoints = useRef<{ x: number; y: number }[]>([]);
  const isTouchEvent = useRef(true);

  useEffect(() => {
    async function initialize() {
      if (canvasRef.current) {
        setLoading(true);
        setError(null);

        const result = await initializeCanvas(canvasRef.current);

        if (result && result.success) {
          setLoading(false);
        } else {
          setLoading(false);
          setError(result?.message || 'Erro ao inicializar o canvas');
        }
      }
    }

    initialize();
  }, [canvasRef]);

  const getPos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width; 
    const scaleY = canvasRef.current.height / rect.height;

    let clientX = 0, clientY = 0;
    if ('touches' in event) {  // Verifica se é um evento de toque
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if(loading || error) return;
    
    // Determina se o evento é de toque
    isTouchEvent.current = 'touches' in event;

    const pos = getPos(event);
    startPosition.current = { x: pos.x, y: pos.y };

    if (isDrawing && canvasRef.current) {
      setIsDrawingActive(true);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 0, 0)';
        const width = canvasRef.current.width;
        ctx.lineWidth = Math.max(1, Math.floor(width / 500));

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);

        drawingPoints.current = [{ x: pos.x, y: pos.y }];
      }
    }
  };

  const handleMove = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if(loading || error) return;

    if (!startPosition.current) return;

    const pos = getPos(event);

    if (isDrawing && isDrawingActive && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        drawingPoints.current.push({ x: pos.x, y: pos.y }); 
      }
    }
  };

  const handleEnd = async (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if(loading || error) return;

    if (!isDragging && !isDrawing && canvasRef.current && !isTouchEvent.current) {
      handleCanvasClick(event as React.MouseEvent<HTMLCanvasElement>, canvasRef.current, maskDataList, setMaskDataList);
      isTouchEvent.current = false;
    }

    startPosition.current = null;
    setIsDragging(false);

    if (isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.closePath();

        createMaskFromDrawing(canvasRef.current, drawingPoints.current, setMaskDataList);

        drawingPoints.current = [];
        setIsDrawingActive(false);
        setIsDrawing(false);
      }
    }
  };

  const toggleDrawingMode = () => {
    setIsDrawing(prev => !prev);
  };

  return { 
    handleMouseDown: handleStart, 
    handleMouseMove: handleMove, 
    handleMouseUp: handleEnd,
    handleTouchStart: handleStart,  
    handleTouchMove: handleMove,   
    handleTouchEnd: handleEnd,    
    toggleDrawingMode,
    isDrawing,
    loading, 
    error 
  };
}
