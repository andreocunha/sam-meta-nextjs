import * as ort from 'onnxruntime-web';
import { MODEL_PATH } from '@/constants/paths';

ort.env.debug = false;
// set global logging level
ort.env.logLevel = 'verbose';
ort.env.wasm.numThreads = 2;
ort.env.wasm.simd = true;
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': '/ort-wasm.wasm',
  'ort-wasm-simd.wasm': '/ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm': '/ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm'
} as any;


let ortSession: ort.InferenceSession | null = null;
let imageEmbeddingT: ort.Tensor | null = null;
let origImSizeT: ort.Tensor | null = null;

export async function setImageEmbedding(
  imageEmbedding: Float32Array,
  imgHeight: number,
  imgWidth: number
) {
  imageEmbeddingT = new ort.Tensor('float32', imageEmbedding, [1, 256, 64, 64]);
  origImSizeT = new ort.Tensor('float32', Float32Array.from([imgHeight, imgWidth]), [2]);

  if (!ortSession) {
    ortSession = await ort.InferenceSession.create(MODEL_PATH);
  }
}

export async function runSam(points: number[][]): Promise<Float32Array> {
  if (!ortSession || !imageEmbeddingT || !origImSizeT)
    throw new Error('Model or inputs are not ready');

  const nPoints = points.length;
  const labels = new Array(nPoints).fill(1);

  const pointCoords = Float32Array.from(points.flat());
  const pointCoordsT = new ort.Tensor('float32', pointCoords, [1, nPoints, 2]);
  const pointLabelsT = new ort.Tensor('float32', Float32Array.from(labels), [1, nPoints]);

  const maskInputT = new ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [1, 1, 256, 256]);
  const hasMaskInputT = new ort.Tensor('float32', new Float32Array(1).fill(0), [1]);

  const results = await ortSession.run({
    low_res_embedding: imageEmbeddingT,
    point_coords: pointCoordsT,
    point_labels: pointLabelsT,
    image_size: origImSizeT,
    last_pred_mask: maskInputT,
    has_last_pred: hasMaskInputT,
  });

  return results.output.data as Float32Array;
}
