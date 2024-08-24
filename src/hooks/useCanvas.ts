import { useState, useEffect, RefObject, useRef } from 'react';
import { initializeCanvas, handleCanvasClick as handleClick } from '@/utils/canvasUtils';

export function useCanvas(canvasRef: RefObject<HTMLCanvasElement>) {
  const [maskDataList, setMaskDataList] = useState<Float32Array[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);

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

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if(loading || error) return;
    setIsDragging(false);
    startPosition.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if(loading || error) return;
    if (startPosition.current) {
      const distance = Math.sqrt(
        Math.pow(event.clientX - startPosition.current.x, 2) + Math.pow(event.clientY - startPosition.current.y, 2)
      );
      if (distance > 5) { // Limiar de movimento para considerar como drag
        setIsDragging(true);
      }
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if(loading || error) return;
    if (!isDragging && canvasRef.current) {
      handleClick(event, canvasRef.current, maskDataList, setMaskDataList);
    }
    startPosition.current = null;
    setIsDragging(false);
  };

  return { handleMouseDown, handleMouseMove, handleMouseUp, loading, error };
}
