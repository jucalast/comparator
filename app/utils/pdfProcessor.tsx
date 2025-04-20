'use client';

import { Product } from '../types';
import { findSupplierProcessor } from '../suppliers';

// Expressão regular mais flexível para capturar diferentes formatos de produtos
const PRODUCT_REGEX = /(\d{5,6}-\d+)\s+(.+?)\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?:R\$)?/gm;

/**
 * Extrai texto de um arquivo PDF usando PDF.js CDN
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`Iniciando extração de texto do PDF: ${file.name}`);
    
    // Carrega dinamicamente a biblioteca PDF.js do CDN
    if (typeof window === 'undefined') {
      throw new Error('extractTextFromPDF só pode ser executado no navegador');
    }
    
    // Carrega a biblioteca PDF.js via CDN se ainda não estiver carregada
    if (!(window as any).pdfjsLib) {
      console.log('Carregando biblioteca PDF.js do CDN...');
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          console.log('PDF.js carregado com sucesso');
          resolve();
        };
        script.onerror = (error) => {
          console.error('Falha ao carregar PDF.js:', error);
          reject(new Error('Falha ao carregar PDF.js'));
        };
        document.head.appendChild(script);
      });
      
      // Configura o worker
      console.log('Configurando worker do PDF.js...');
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    const pdfjsLib = (window as any).pdfjsLib;
    
    // Processa o arquivo PDF
    console.log(`Lendo arquivo PDF: ${file.name} (${file.size} bytes)`);
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF carregado em buffer, tamanho: ${arrayBuffer.byteLength} bytes`);
    
    // Tenta carregar o documento com opções de segurança
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      disableAutoFetch: true,
      disableStream: true,
    });
    
    console.log('Carregando documento PDF...');
    const pdf = await loadingTask.promise;
    
    console.log(`PDF carregado: ${pdf.numPages} páginas`);
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processando página ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      console.log(`Página ${i}: extraídos ${pageText.length} caracteres`);
    }

    console.log(`Texto completo extraído: ${fullText.length} caracteres`);
    console.log('Amostra dos primeiros 200 caracteres:', fullText.substring(0, 200));
    
    return fullText;
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    throw new Error(`Erro ao processar o PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extrai produtos de um texto usando processadores específicos ou regex genérica
 */
export function extractProductsWithRegex(text: string, source: string): Product[] {
  console.log(`Analisando texto do PDF: ${source}`);
  
  // Primeiro tenta usar processadores específicos de fornecedores
  const supplierProcessor = findSupplierProcessor(text);
  if (supplierProcessor) {
    console.log(`Usando processador específico: ${supplierProcessor.name}`);
    return supplierProcessor.extractProducts(text, source);
  }
  
  // Se nenhum processador específico for encontrado, usa o regex genérico
  console.log(`Usando extração genérica por regex para: ${source}`);
  
  const products: Product[] = [];
  const regex = new RegExp(PRODUCT_REGEX);
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    try {
      const [fullMatch, code, description, priceStr] = match;
      
      // Normaliza o preço: remove R$, pontos de milhar e substitui vírgula por ponto
      let normalizedPrice = priceStr.replace(/R\$/g, '')
                                  .replace(/\./g, '')
                                  .replace(/,/g, '.');
      
      const price = parseFloat(normalizedPrice);
      
      if (!isNaN(price) && price > 0) {
        products.push({
          code,
          description: description.trim(),
          price,
          source
        });
      }
    } catch (err) {
      console.error('Erro ao processar match:', match, err);
    }
  }
  
  console.log(`Extraídos ${products.length} produtos do arquivo ${source} usando regex genérica`);
  return products;
}
