
export function highlightMaskArea(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    originalImageData: ImageData
) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Desenhar a máscara restaurando as cores originais
    for (let i = 0; i < maskData.length; i++) {
        const pixelIndex = i * 4;
        if (maskData[i] > 0.0) {
            const originalColor = originalImageData.data.subarray(pixelIndex, pixelIndex + 4);
            imageData.data.set(originalColor, pixelIndex);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}


export function removeMaskHighlight(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    originalImageData: ImageData
) {
     const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = 0; i < maskData.length; i++) {
        const pixelIndex = i * 4;
        if (maskData[i] > 0.0) {
            const darkenedColor = new Uint8ClampedArray(4);

            for (let k = 0; k < 3; k++) {
                darkenedColor[k] = originalImageData.data[pixelIndex + k] * 0.5;
            }
            darkenedColor[3] = 255; // O canal alpha permanece inalterado

            imageData.data.set(darkenedColor, pixelIndex);
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