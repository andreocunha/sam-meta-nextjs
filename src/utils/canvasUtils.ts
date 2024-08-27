import { setImageEmbedding, runSam } from '@/utils/samModel';
import { drawPointAndArc, highlightMaskArea, isPointInMask, removeMaskHighlight, verifyMaskSize } from '@/utils/maskUtils';
import { IMAGE_SRC, EMBEDDING_SRC } from '@/constants/paths';

let originalImageData: ImageData | null = null;
let imageEmbedding: Float32Array | null = null;
let isFirstMask = true;

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

    // Salvar o estado atual da imagem antes de desenhar o ponto e o arco
    const imageDataBeforeDraw = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Desenhar ponto e arco temporários
    drawPointAndArc(ctx, x, y);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restaurar a imagem ao estado anterior (remove ponto e arco)
    ctx.putImageData(imageDataBeforeDraw, 0, 0);

    // Verificar se o clique está em uma máscara existente
    const clickedMaskIndex = maskDataList.findIndex(mask => isPointInMask(x, y, mask, canvas.width));

    if (clickedMaskIndex !== -1) {
        // Se clicou em uma máscara existente, remover o destaque dessa máscara
        const maskToRemove = maskDataList[clickedMaskIndex];
        const newMaskDataList = maskDataList.filter((_, idx) => idx !== clickedMaskIndex);
        setMaskDataList(newMaskDataList);

        // Restaurar a área escurecida onde a máscara estava
        removeMaskHighlight(ctx, maskToRemove, originalImageData);
        return;
    }

    // Criar a nova máscara
    const newMaskData = await runSam([pt]);
    if (!verifyMaskSize(newMaskData)) return;

    // Escurecer a imagem na primeira vez que uma máscara é adicionada
    if (isFirstMask) {
        ctx.putImageData(originalImageData!, 0, 0);
        ctx.globalAlpha = 0.5; // Escurece a imagem
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0; // Restaurar alpha para o padrão
        isFirstMask = false;
    }

    // Destacar a nova máscara com borda
    highlightMaskArea(ctx, newMaskData, originalImageData!);

    // Atualizar a lista de máscaras
    setMaskDataList(prev => [...prev, newMaskData]);
}
