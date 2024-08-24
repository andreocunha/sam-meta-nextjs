import { setImageEmbedding, runSam } from '@/utils/samModel';
import { drawMask, removeMask, updateCanvasVisuals } from '@/utils/maskUtils';
import { IMAGE_SRC, EMBEDDING_SRC } from '@/constants/paths';

let originalImageData: ImageData | null = null;
let imageEmbedding: Float32Array | null = null;

export async function initializeCanvas(canvas: HTMLCanvasElement): Promise<{ success: boolean; message: string }> {
    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            return { success: false, message: 'Failed to get canvas context' };
        }

        const img = new Image();
        img.src = IMAGE_SRC;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

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

        return { success: true, message: 'Canvas initialized successfully' };
    } catch (error: any) {
        return { success: false, message: `Error initializing canvas: ${error.message}` };
    }
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

    // Desenhar o ponto vermelho no centro
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI); // Ponto pequeno de 5px de raio
    ctx.fill();
    ctx.closePath();

    // Desenhar o arco ao redor do ponto
    ctx.lineWidth = 20; // Espessura do arco
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 100, 0, 2 * Math.PI); // Arco maior com 50px de raio
    ctx.stroke();
    ctx.closePath();

    // Dar um pequeno atraso para que o ponto vermelho e o arco sejam visíveis
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms de atraso (ajuste conforme necessário)

    // Limpar o ponto vermelho e o arco antes de atualizar as máscaras
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCanvasVisuals(ctx, originalImageData, maskDataList, canvas.width); // Redesenha o estado atual do canvas sem o ponto e arco vermelhos

    if (maskIndexToRemove >= 0) {
        const updatedMasks = maskDataList.filter((_, index) => index !== maskIndexToRemove);
        setMaskDataList(updatedMasks);
        removeMask(ctx, maskDataList[maskIndexToRemove], originalImageData, canvas.width);
        updateCanvasVisuals(ctx, originalImageData, updatedMasks, canvas.width);
    } else {
        const newMaskData = await runSam([pt]);
        // console.log('New mask data:', newMaskData);
        setMaskDataList(prev => [...prev, newMaskData]);
        drawMask(ctx, newMaskData, canvas.width);
        updateCanvasVisuals(ctx, originalImageData, [...maskDataList, newMaskData], canvas.width);
    }
}
