import { setImageEmbedding, runSam } from '@/utils/samModel';
import { drawPointAndArc, getContourPointsFromMask, highlightMaskArea, isPointInMask, removeMaskHighlight, verifyMaskSize } from '@/utils/maskUtils';
import { IMAGE_SRC, EMBEDDING_SRC } from '@/constants/paths';
import concaveman from 'concaveman';


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
    setMaskDataList: React.Dispatch<React.SetStateAction<Float32Array[]>>,
    setCountourPointsList: React.Dispatch<React.SetStateAction<{ x: number; y: number }[][]>>,
    color: string = 'blue'
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
        setMaskDataList(prev => prev.filter((_, index) => index !== clickedMaskIndex));

        setCountourPointsList(prev => prev.filter((_, index) => index !== clickedMaskIndex));

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

    const countourPoints = getContourPointsFromMask(newMaskData, canvas.width, canvas.height);

    createMaskFromDrawing(
        canvas, 
        countourPoints, 
        setMaskDataList, 
        setCountourPointsList, 
        color
    );
}


export function createMaskFromDrawing(
    canvas: HTMLCanvasElement,
    points: { x: number; y: number }[],
    setMaskDataList: React.Dispatch<React.SetStateAction<Float32Array[]>>,
    setCountourPointsList: React.Dispatch<React.SetStateAction<{ x: number; y: number }[][]>>,
    color: string = 'blue'
) {
    if (!originalImageData) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Criar um novo canvas para desenhar e preencher a área do contorno
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Desenhar o contorno no novo canvas
    tempCtx.fillStyle = 'white'; // A cor branca representa a área que será a máscara
    tempCtx.beginPath();
    const countourPoints = getContourPoints(points);
    tempCtx.moveTo(countourPoints[0].x, countourPoints[0].y);
    countourPoints.forEach(point => {
        tempCtx.lineTo(point.x, point.y);
    });
    tempCtx.closePath();
    tempCtx.fill(); // Preencher a área delimitada pelo contorno

    // Extrair a imagem preenchida do tempCanvas e converter para máscara
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const maskData = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const alpha = imageData.data[index + 3]; // Verifica o canal alpha
            maskData[y * width + x] = alpha > 0 ? 1.0 : 0.0;
        }
    }

    // Escurecer a imagem na primeira vez que uma máscara é adicionada
    if (isFirstMask) {
        ctx.putImageData(originalImageData, 0, 0);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;
        isFirstMask = false;
    }

    // Destacar a área da máscara
    highlightMaskArea(ctx, maskData, originalImageData, color);

    // Atualizar a lista de máscaras
    setMaskDataList(prev => [...prev, maskData]);

    // Atualizar a lista de pontos do contorno
    setCountourPointsList(prev => [...prev, points]);
}

export function getContourPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
    // Convertendo os pontos para o formato esperado pela biblioteca
    const pointArray = points.map(p => [p.x, p.y]);

    // Calculando o concave hull
    const concaveHullPoints = concaveman(pointArray);

    // Convertendo de volta para o formato original
    return concaveHullPoints.map(([x, y]) => ({ x, y }));
}