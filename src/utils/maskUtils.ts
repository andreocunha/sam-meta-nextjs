export function drawMask(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    canvasWidth: number
) {
    const maskColor = [0, 0, 255, 255];
    const lineWidth = 2;

    const width = canvasWidth;
    const height = ctx.canvas.height;

    const isEdge = (x: number, y: number) => {
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
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isEdge(x, y)) {
                ctx.beginPath();
                ctx.arc(x, y, lineWidth / 2, 0, 2 * Math.PI, false);
                ctx.fillStyle = `rgba(${maskColor.join(',')})`;
                ctx.fill();
            }
        }
    }
}

export function removeMask(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    originalImageData: ImageData,
    canvasWidth: number
) {
    const imageData = ctx.getImageData(0, 0, canvasWidth, ctx.canvas.height);
    const width = canvasWidth;
    const height = ctx.canvas.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const pixelIndex = index * 4;

            if (maskData[index] > 0.0 || isNearbyAffectedPixel(x, y, maskData, width, height)) {
                const srcColor = originalImageData.data.subarray(pixelIndex, pixelIndex + 4);
                imageData.data.set(srcColor, pixelIndex);
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function isNearbyAffectedPixel(
    x: number,
    y: number,
    maskData: Float32Array,
    width: number,
    height: number
) {
    const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
    ];

    return neighbors.some(([nx, ny]) => {
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            return maskData[ny * width + nx] > 0.0;
        }
        return false;
    });
}

export function updateCanvasVisuals(
    ctx: CanvasRenderingContext2D,
    originalImageData: ImageData,
    maskDataList: Float32Array[],
    canvasWidth: number
): void {
    const width = canvasWidth;
    const height = originalImageData.height;
    const imageData = new ImageData(width, height);

    imageData.data.set(originalImageData.data);

    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.floor(imageData.data[i] * 0.5);
        imageData.data[i + 1] = Math.floor(imageData.data[i + 1] * 0.5);
        imageData.data[i + 2] = Math.floor(imageData.data[i + 2] * 0.5);
    }

    maskDataList.forEach((maskData) => {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                if (maskData[index] > 0.0) {
                    const pixelIndex = index * 4;
                    imageData.data[pixelIndex] = originalImageData.data[pixelIndex];
                    imageData.data[pixelIndex + 1] = originalImageData.data[pixelIndex + 1];
                    imageData.data[pixelIndex + 2] = originalImageData.data[pixelIndex + 2];
                }
            }
        }
    });

    ctx.putImageData(imageData, 0, 0);

    maskDataList.forEach((maskData) => {
        redrawContourLines(ctx, maskData, canvasWidth);
    });
}

function redrawContourLines(
    ctx: CanvasRenderingContext2D,
    maskData: Float32Array,
    canvasWidth: number
): void {
    const maskColor = [0, 0, 255, 255];
    const lineWidth = Math.max(1, Math.floor(canvasWidth / 250));
    const width = canvasWidth;
    const height = ctx.canvas.height;

    const isEdge = (x: number, y: number): boolean => {
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
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isEdge(x, y)) {
                ctx.beginPath();
                ctx.arc(x, y, lineWidth / 2, 0, 2 * Math.PI, false);
                ctx.fillStyle = `rgba(${maskColor.join(',')})`;
                ctx.fill();
            }
        }
    }
}
