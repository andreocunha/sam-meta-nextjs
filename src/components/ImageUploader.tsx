import React, { useState } from 'react';
import { generateAndDownloadMask } from '@/utils/maskGenerator';

export const ImageUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      try {
        const downloadName = await generateAndDownloadMask(selectedFile);
        console.log(`Download completed: ${downloadName}`);
      } catch (error) {
        console.error('Error during the mask generation and download:', error);
      }
    } else {
      alert("Please select a file first!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button
        className="mt-4 p-2 bg-blue-500 text-white rounded"
        onClick={handleUpload}
      >
        Upload and Process Image
      </button>
    </div>
  );
};
