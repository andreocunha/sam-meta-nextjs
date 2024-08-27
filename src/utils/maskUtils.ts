function isEdge(x: number, y: number, width: number, height: number, maskData: Float32Array): boolean {
    const index = y * width + x;
    if (maskData[index] <= 0.0) return false;

    const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
    ];

    return neighbors.some(([nx, ny]) => {
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            return maskData[ny * width + nx] <= 0.0;
        }
        return true;
    });
}

export function verifyMaskSize(maskData: Float32Array): boolean {
    let maskSize = 0;
    const maxAllowedSize = 300000;

    for (let i = 0; i < maskData.length; i++) {
        if (maskData[i] > 0.0) {
            maskSize++;
            if (maskSize > maxAllowedSize) {
                console.log(`Mask size exceeded limit: ${maskSize}`);
                return false;
            }
        }
    }
    
    console.log(`Mask size: ${maskSize}`);
    return true;
}


export function highlightMaskArea(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    originalImageData: ImageData
) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const maskColor = [0, 0, 255, 255];
    const lineWidth = Math.max(1, Math.floor(width / 250));
    const halfLineWidth = lineWidth / 2;
    const imageData = ctx.getImageData(0, 0, width, height);

    // Primeiro, restaurar as cores originais na área da máscara
    for (let i = 0; i < maskData.length; i++) {
        const pixelIndex = i * 4;
        if (maskData[i] > 0.0) {
            const originalColor = originalImageData.data.subarray(pixelIndex, pixelIndex + 4);
            imageData.data.set(originalColor, pixelIndex);
        }
    }

    // Agora desenhar a linha azul ao redor da borda da máscara
    ctx.putImageData(imageData, 0, 0);
    ctx.fillStyle = `rgba(${maskColor.join(',')})`;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isEdge(x, y, width, height, maskData)) {
                ctx.beginPath();
                ctx.arc(x, y, halfLineWidth, 0, 2 * Math.PI, false);
                ctx.fill();
            }
        }
    }
}

export function removeMaskHighlight(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    originalImageData: ImageData
) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const lineWidth = Math.max(1, Math.floor(width / 250));
    const halfLineWidth = Math.floor(lineWidth / 2);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const darkenBuffer = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const pixelIndex = index * 4;

            if (maskData[index] > 0.0 || isEdge(x, y, width, height, maskData)) {
                for (let dy = -halfLineWidth; dy <= halfLineWidth; dy++) {
                    for (let dx = -halfLineWidth; dx <= halfLineWidth; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                            const neighborIndex = ny * width + nx;
                            const neighborPixelIndex = neighborIndex * 4;
                            darkenBuffer[neighborPixelIndex] = 1;
                        }
                    }
                }
            }
        }
    }

    for (let i = 0; i < maskData.length; i++) {
        const pixelIndex = i * 4;
        if (darkenBuffer[pixelIndex] === 1) {
            for (let k = 0; k < 3; k++) {
                data[pixelIndex + k] = originalImageData.data[pixelIndex + k] * 0.5;
            }
            data[pixelIndex + 3] = 255; // O canal alpha permanece inalterado
        }
    }

    ctx.putImageData(imageData, 0, 0);
}



export function isPointInMask(
    x: number,
    y: number,
    maskData: Float32Array,
    canvasWidth: number
): boolean {
    const index = Math.floor(y) * canvasWidth + Math.floor(x);
    return maskData[index] > 0.0;
}

export function drawPointAndArc(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pointRadius: number = 20,
    arcRadius: number = 100,
    color: string = 'red',
    arcWidth: number = 20
) {
    // Desenhar o ponto vermelho
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();

    // Desenhar o arco ao redor do ponto
    ctx.lineWidth = arcWidth;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, arcRadius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
}