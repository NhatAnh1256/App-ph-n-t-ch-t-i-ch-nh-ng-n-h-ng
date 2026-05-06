import React, { useCallback, useState } from 'react';
import { Upload, FileDown, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  onFileProcessed: (arrayBuffer: ArrayBuffer) => void;
  isLoading: boolean;
  buttonOnly?: boolean;
}

export function FileUploader({ onFileProcessed, isLoading, buttonOnly }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (buffer && buffer instanceof ArrayBuffer) {
        onFileProcessed(buffer);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (buttonOnly) {
    return (
      <div className="relative">
        <input
          type="file"
          accept=".xlsx"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        <button
          className="flex items-center space-x-2 bg-[#1E3A5F] hover:bg-[#023E8A] bg-opacity-10 hover:bg-opacity-20 text-[#1E3A5F] px-4 py-2 rounded-lg font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span>Upload New File</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`max-w-xl mx-auto mt-20 p-8 border-2 border-dashed rounded-2xl text-center transition-colors ${
        dragActive ? 'border-[#00B4D8] bg-[#00B4D8] bg-opacity-5' : 'border-gray-300 hover:border-[#1E3A5F]'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".xlsx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
        disabled={isLoading}
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        {isLoading ? (
          <Loader2 className="w-16 h-16 text-[#00B4D8] animate-spin mb-4" />
        ) : (
          <div className="w-20 h-20 bg-[#00B4D8] bg-opacity-10 rounded-full flex items-center justify-center mb-6">
            <FileDown className="w-10 h-10 text-[#00B4D8]" />
          </div>
        )}
        <h2 className="text-2xl font-semibold text-[#1E3A5F] mb-2">
          {isLoading ? 'Đang xử lý dữ liệu...' : 'Tải lên dữ liệu BCTC'}
        </h2>
        <p className="text-gray-500 mb-6">Kéo thả file .xlsx vào đây hoặc click để chọn file</p>
        <button
          className="bg-[#1E3A5F] hover:bg-[#023E8A] text-white px-6 py-3 rounded-lg font-medium transition-colors pointer-events-none"
        >
          Chọn File
        </button>
      </label>
    </div>
  );
}
