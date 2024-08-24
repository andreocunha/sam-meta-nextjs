import React, { useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useCanvas } from '@/hooks/useCanvas';

export const CanvasHandler: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp,
    loading,
    error 
  } = useCanvas(canvasRef);

  if(error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <TransformWrapper
      wheel={{ step: 0.1 }}
      doubleClick={{ mode: 'reset' }}
    >
      {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
        <TransformComponent>
          <div
            className="w-full h-full min-h-screen flex flex-col justify-center items-center"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{ filter: loading ? 'blur(5px)' : 'none' }}
            />
          </div>
        </TransformComponent>
      )}
    </TransformWrapper>
  );
};
