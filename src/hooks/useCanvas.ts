import { useState, useEffect, RefObject, useRef } from 'react';
import { initializeCanvas, handleCanvasClick, createMaskFromDrawing } from '@/utils/canvasUtils';

export function useCanvas(canvasRef: RefObject<HTMLCanvasElement>) {
  const [maskDataList, setMaskDataList] = useState<Float32Array[]>([]);
  const [countourPointsList, setCountourPointsList] = useState<{ points: { x: number; y: number }[], color: string }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('blue');
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const drawingPoints = useRef<{ x: number; y: number }[]>([]);
  const isTouchEvent = useRef(true);
  const isMoving = useRef(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    let hasInitialized = false;
  
    async function initialize() {
      if (hasInitialized) return;
      hasInitialized = true;
  
      if (canvasRef.current) {
        setLoading(true);
        setError(null);
  
        const result = await initializeCanvas(canvasRef.current);
  
        if (result && result.success) {
          setLoading(false);
  
          const savedData = localStorage.getItem('contourPointsList');
          if (savedData) {
            const contourPointsList = JSON.parse(savedData);
            if (contourPointsList.length > 0) {
              const canvas = canvasRef.current;
              if (!canvas) return;
  
              setMaskDataList([]);
              setCountourPointsList([]);
  
              const { width, height } = canvas;
  
              contourPointsList.forEach((contourData: any) => {
                const { points, color } = contourData;
                const absolutePoints = points.map((point: any) => ({
                  x: Math.round(point.x * width),
                  y: Math.round(point.y * height),
                }));
  
                createMaskFromDrawing(
                  canvas,
                  absolutePoints,
                  setMaskDataList,
                  setCountourPointsList,
                  color
                );
              });
            }
          }
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
    if (loading || error) return;
  
    isMoving.current = false; // Reset moving state
  
    isTouchEvent.current = 'touches' in event;
  
    const pos = getPos(event);
    startPosition.current = { x: pos.x, y: pos.y };
  
    if (isDrawing && canvasRef.current) {
      setIsDrawingActive(true);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // ctx.strokeStyle = 'rgba(255, 0, 0)';
        ctx.strokeStyle = selectedColor;
        const width = canvasRef.current.width;
        ctx.lineWidth = Math.max(1, Math.floor(width / 500));
  
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
  
        drawingPoints.current = [{ x: pos.x, y: pos.y }];
      }
    }
  };
  

  const handleEnd = async (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (loading || error) return;
    if(isProcessing.current) return;
  
    // Check if the user was moving, if yes, do not trigger the click handler
    if (!isMoving.current && !isDrawing && canvasRef.current && !isTouchEvent.current) {
      isProcessing.current = true;
      await handleCanvasClick(
        event as React.MouseEvent<HTMLCanvasElement>, 
        canvasRef.current, 
        maskDataList, 
        setMaskDataList,
        setCountourPointsList,
        selectedColor
      );
      isProcessing.current = false;
    }
  
    startPosition.current = null;
  
    if (isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.closePath();
  
        createMaskFromDrawing(
          canvasRef.current, 
          drawingPoints.current, 
          setMaskDataList,
          setCountourPointsList,
          selectedColor
        );
  
        drawingPoints.current = [];
        setIsDrawingActive(false);
        setIsDrawing(false);
      }
    }
  
    isMoving.current = false;
  };
  

  const handleMove = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (loading || error) return;
  
    if (!startPosition.current) return;
  
    const pos = getPos(event);
  
    // Set isMoving to true if the mouse/touch has moved
    isMoving.current = true;
  
    if (isDrawing && isDrawingActive && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
  
        drawingPoints.current.push({ x: pos.x, y: pos.y }); 
      }
    }
  };
  


  const toggleDrawingMode = () => {
    setIsDrawing(prev => !prev);
  };
  
  
  function saveAllContoursPoints() {
    if (!canvasRef.current) return;
  
    const { width, height } = canvasRef.current;
  
    const relativeContours = countourPointsList.map(contour => ({
      points: contour.points.map(point => ({
        x: point.x / width,
        y: point.y / height,
      })),
      color: contour.color,  // Salva a cor associada ao contorno
    }));
  
    localStorage.setItem('contourPointsList', JSON.stringify(relativeContours));

    alert('Dados salvos com sucesso!');
  }
  

  function cleanAll(){
    if(confirm('Deseja limpar todos os desenhos?')){
      setMaskDataList([]);
      setCountourPointsList([]);
      localStorage.removeItem('contourPointsList');
      window.location.reload();
    }
  }
  

  return { 
    handleMouseDown: handleStart, 
    handleMouseMove: handleMove, 
    handleMouseUp: handleEnd,
    handleTouchStart: handleStart,  
    handleTouchMove: handleMove,   
    handleTouchEnd: handleEnd,    
    toggleDrawingMode,
    saveAllContoursPoints,
    setSelectedColor,
    cleanAll,
    selectedColor,
    isDrawing,
    loading, 
    error,
  };
}