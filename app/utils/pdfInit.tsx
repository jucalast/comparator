'use client';

/**
 * Este arquivo contém os métodos para inicializar o PDF.js
 * e configurar seu worker de forma compatível com Next.js.
 */

import * as pdfjsLib from 'pdfjs-dist';

let initialized = false;

/**
 * Inicializa o PDF.js de forma segura para uso no lado do cliente
 */
export async function initPdfJs(): Promise<typeof pdfjsLib> {
  if (typeof window === 'undefined') {
    throw new Error('initPdfJs só pode ser chamado no navegador');
  }

  if (!initialized) {
    try {
      // Força a configuração para ambiente de navegador
      (pdfjsLib as any).disableWorker = false;
      (pdfjsLib as any).disableRange = true;
      (pdfjsLib as any).disableStream = true;
      (pdfjsLib as any).disableAutoFetch = true;
      (pdfjsLib as any).disableCreateObjectURL = true;
      (pdfjsLib as any).disableNodeJS = true;
      (pdfjsLib as any).isNodeJS = false;
      
      // Configura o worker com caminho absoluto
      const workerPath = `${window.location.origin}/pdf.worker.min.js`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
      
      initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar o PDF.js:', error);
      throw new Error(`Erro ao inicializar PDF.js: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return pdfjsLib;
}
