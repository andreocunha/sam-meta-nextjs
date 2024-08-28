import React, { useRef, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useCanvas } from '@/hooks/useCanvas';
import { toggleScrollAndTouchBehavior } from '@/utils/touch';
import { FaSave, FaCircle } from 'react-icons/fa';
import { MdDraw } from "react-icons/md";

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
    error,
    saveAllContoursPoints,
  } = useCanvas(canvasRef);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('blue');

  useEffect(() => {
    toggleScrollAndTouchBehavior(isDrawing);

    return () => {
      toggleScrollAndTouchBehavior(false);
    };
  }, [isDrawing]);

  useEffect(() => {
    setColor(selectedColor);
  }, [selectedColor]);

  const setColor = (color: string) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
  };

  const colorOptions: { [key: string]: string } = {
    blue: "Livre",
    red: "Início/Fim",
    yellow: "Pé",
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <nav className="fixed top-0 right-0 w-full md:w-[250px] md:right-0 bg-gray-800 text-white z-10 flex justify-between items-center p-4 md:rounded-bl-md shadow-md">
        <div className="flex space-x-4 items-center">
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="bg-gray-700 p-2 rounded flex items-center">
              <FaCircle className={`mr-2 text-${selectedColor}-500`} />
              {colorOptions[selectedColor]}
            </button>
            {dropdownOpen && (
              <div className="absolute bg-gray-700 rounded mt-2 shadow-lg">
                <button onClick={() => { setSelectedColor('blue'); setDropdownOpen(false); }} className="flex w-full items-center p-2 space-x-2 hover:bg-gray-600">
                  <FaCircle className="text-blue-500" /> <span>Livre</span>
                </button>
                <button onClick={() => { setSelectedColor('red'); setDropdownOpen(false); }} className="flex w-full items-center p-2 space-x-2 hover:bg-gray-600">
                  <FaCircle className="text-red-500" /> <span>Início/Fim</span>
                </button>
                <button onClick={() => { setSelectedColor('yellow'); setDropdownOpen(false); }} className="flex w-full items-center p-2 space-x-2 hover:bg-gray-600">
                  <FaCircle className="text-yellow-500" /> <span>Pé</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={toggleDrawingMode} className={`text-white p-2 rounded border ${isDrawing ? 'border-white' : 'border-transparent'}`}>
            <MdDraw size={20} />
          </button>
        </div>
        <div>
          <button onClick={() => saveAllContoursPoints()} className="text-white p-2">
            <FaSave size={20} />
          </button>
        </div>
      </nav>
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
