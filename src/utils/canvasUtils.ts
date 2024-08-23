import { setImageEmbedding, runSam } from '@/utils/samModel';
import { drawMask, removeMask, updateCanvasVisuals } from '@/utils/maskUtils';
import { IMAGE_SRC, EMBEDDING_SRC } from '@/constants/paths';

let originalImageData: ImageData | null = null;
let imageEmbedding: Float32Array | null = null;

export async function initializeCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const img = new Image();
  img.src = IMAGE_SRC;

  img.onload = async () => {
    const { width, height, visualWidth, visualHeight } = calculateCanvasSize(img);
    canvas.width = width;
    canvas.height = height;

    canvas.style.width = `${visualWidth}px`;
    canvas.style.height = `${visualHeight}px`;

    ctx.drawImage(img, 0, 0, width, height);
    originalImageData = ctx.getImageData(0, 0, width, height);

    const response = await fetch(EMBEDDING_SRC);
    const data = await response.arrayBuffer();
    imageEmbedding = new Float32Array(data);
    await setImageEmbedding(imageEmbedding, height, width);
  };
}

function calculateCanvasSize(img: HTMLImageElement) {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    let { width, height } = img;
  
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const visualWidth = width * scale;
    const visualHeight = height * scale;
  
    const resolutionMultiplier = 2;
    const resolutionScale = (window.devicePixelRatio || 1) * resolutionMultiplier;
  
    return {
      width: visualWidth * resolutionScale,
      height: visualHeight * resolutionScale,
      visualWidth,
      visualHeight,
    };
  }
  

export async function handleCanvasClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  maskDataList: Float32Array[],
  setMaskDataList: React.Dispatch<React.SetStateAction<Float32Array[]>>
) {
  if (!originalImageData || !imageEmbedding) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const pt = [x, y];

  const maskIndexToRemove = maskDataList.findIndex(maskData =>
    maskData[(Math.floor(y) * canvas.width) + Math.floor(x)] > 0.0
  );

  if (maskIndexToRemove >= 0) {
    const updatedMasks = maskDataList.filter((_, index) => index !== maskIndexToRemove);
    setMaskDataList(updatedMasks);
    removeMask(ctx, maskDataList[maskIndexToRemove], originalImageData, canvas.width);
    await updateCanvasVisuals(ctx, originalImageData, updatedMasks, canvas.width);
  } else {
    const newMaskData = await runSam([pt]);
    setMaskDataList(prev => [...prev, newMaskData]);
    drawMask(ctx, newMaskData, canvas.width);
    await updateCanvasVisuals(ctx, originalImageData, [...maskDataList, newMaskData], canvas.width);
  }
}
