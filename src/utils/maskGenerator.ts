const API_ENDPOINT = "https://model-zoo.metademolab.com/predictions/segment_everything_box_model";

// Tipagem para o retorno esperado da API
interface SegmentationResponse {
  [index: number]: string;
}

export async function generateAndDownloadMask(file: File): Promise<string | void> {
  // Verificação se o arquivo é válido
  if (!(file instanceof File)) {
    throw new Error("Invalid input: The provided argument is not a valid File.");
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': file.type
      },
      body: file
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const segJSON: SegmentationResponse = await response.json();

    if (!Array.isArray(segJSON) || segJSON.length === 0) {
      throw new Error("Invalid response: The server did not return the expected data.");
    }

    const embedArr = segJSON.map((arrStr) => {
      const binaryString = window.atob(arrStr);
      const uint8arr = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8arr[i] = binaryString.charCodeAt(i);
      }
      return new Float32Array(uint8arr.buffer);
    });

    const float32Array = embedArr[0];
    console.log(float32Array);

    const buffer = float32Array.buffer;
    const blob = new Blob([buffer], { type: 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'api_result.bin';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    return a.download;
  } catch (error) {
    console.error("Error occurred during the process:", error);
    throw error;
  }
}