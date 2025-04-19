'use client';

import { useEffect, useState } from 'react';

interface PDFLiteLoaderProps {
  file: File;
  onTextExtracted: (text: string) => void;
  onError: (error: string) => void;
}

/**
 * A simplified PDF loader component that uses a CDN-hosted PDF.js for text extraction
 */
export default function PDFLiteLoader({ file, onTextExtracted, onError }: PDFLiteLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load PDF.js from CDN to avoid bundling issues
    const loadPdfJs = async () => {
      try {
        setLoading(true);
        
        // Load PDF.js script from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Configure PDF.js worker
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Read the file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        onTextExtracted(fullText);
      } catch (error) {
        console.error('Error loading or processing PDF:', error);
        onError(`Erro ao processar PDF: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdfJs();
  }, [file, onTextExtracted, onError]);

  return (
    <div className="pdf-lite-loader">
      {loading && <p>Carregando PDF...</p>}
    </div>
  );
}
