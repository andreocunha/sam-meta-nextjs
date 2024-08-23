import React, { useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useCanvas } from '@/hooks/useCanvas';

export const CanvasHandler: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp 
  } = useCanvas(canvasRef);

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
            />
          </div>
        </TransformComponent>
      )}
    </TransformWrapper>
  );
};
