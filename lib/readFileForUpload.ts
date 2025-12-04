export type UploadFileData = {
  buffer: ArrayBuffer | Uint8Array;
  size: number;
};

const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

export const readFileForUpload = async (uri: string): Promise<UploadFileData> => {
  if (!uri) {
    throw new Error('Missing file uri');
  }

  console.log('[Upload Utils] Reading file for upload:', uri);

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Failed to fetch file from uri');
  }

  try {
    if (typeof response.blob === 'function') {
      const blob = await response.blob();
      const buffer = await blobToArrayBuffer(blob);

      return {
        buffer,
        size: blob.size,
      };
    }
  } catch (error) {
    console.warn('[Upload Utils] blob upload fallback triggered', error);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: arrayBuffer,
    size: arrayBuffer.byteLength,
  };
};
