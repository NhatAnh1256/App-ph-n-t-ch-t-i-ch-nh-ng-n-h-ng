import { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { ProcessedData } from './types';
import { parseExcel } from './utils/dataProcessor';

export default function App() {
  const [data, setData] = useState<ProcessedData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileProcessed = async (buffer: ArrayBuffer) => {
    try {
      setLoading(true);
      setError(null);
      // Let React render the loading state first
      await new Promise(r => setTimeout(r, 50));
      const processed = parseExcel(buffer);
      if (processed.length === 0) {
        throw new Error("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
      }
      setData(processed);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi đọc file.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#1E3A5F] flex items-center justify-center">
              <span className="text-white font-bold tracking-tighter">BCTC</span>
            </div>
            <div>
              <h1 className="font-bold text-[#1E3A5F] leading-tight">PHÂN TÍCH TÀI CHÍNH NGÀNH NGÂN HÀNG VIỆT NAM</h1>
              <p className="text-xs text-gray-500">Dashboard tổng hợp báo cáo tài chính 25 ngân hàng</p>
            </div>
          </div>
          {data && (
            <FileUploader onFileProcessed={handleFileProcessed} isLoading={loading} buttonOnly />
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 pb-24">
        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <strong>Lỗi:</strong> {error}
          </div>
        )}

        {!data && !error && (
          <FileUploader onFileProcessed={handleFileProcessed} isLoading={loading} />
        )}

        {data && (
          <Dashboard rawData={data} />
        )}
      </main>
    </div>
  );
}
