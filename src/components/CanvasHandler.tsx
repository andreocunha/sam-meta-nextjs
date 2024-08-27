import React, { useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useCanvas } from '@/hooks/useCanvas';
import { toggleScrollAndTouchBehavior } from '@/utils/touch';

export const CanvasHandler: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp,
    handleTouchStart,
    handleTouchMove, 
    handleTouchEnd,  
    toggleDrawingMode,  
    isDrawing,  
    loading,
    error 
  } = useCanvas(canvasRef);

  useEffect(() => {
    toggleScrollAndTouchBehavior(isDrawing);

    return () => {
      toggleScrollAndTouchBehavior(false);
    };
  }, [isDrawing]);

  if(error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={toggleDrawingMode} className="p-2 bg-blue-500 text-white absolute top-0 right-0 m-4 z-10">
        {isDrawing ? 'Desativar modo desenho' : 'Ativar modo desenho'}
      </button>
      <TransformWrapper
        disabled={isDrawing}
        wheel={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <TransformComponent>
            <div className="w-full h-full min-h-screen flex flex-col justify-center items-center relative">
              {loading && 
              <div className='absolute w-full h-screen top-0 left-0 z-20 flex items-center justify-center'>
                <div className="loading-circle" />
              </div>
              }
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}  
                onTouchEnd={handleTouchEnd}    
                onContextMenu={(e) => e.preventDefault()}
                style={{ filter: loading ? 'blur(5px)' : 'none' }}
              />
            </div>
          </TransformComponent>
        )}
      </TransformWrapper>
    </div>
  );
};
