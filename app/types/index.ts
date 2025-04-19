import { ProductDetails } from '../utils/productNormalizer';

export interface Product {
  code: string;
  description: string;
  price: number;
  source: string;
  details?: ProductDetails; // Adicionamos os detalhes normalizados
}

export interface ComparisonResult {
  code: string;
  description: string;
  bestPrice: number;
  bestSource: string;
  allPrices: {
    source: string;
    price: number;
  }[];
  details?: ProductDetails; // Adicionamos os detalhes normalizados
}

export interface FileWithPreview extends File {
  preview: string;
}

// Informações de progresso de processamento
export interface ProcessingProgress {
  filesProcessed: number;
  totalFiles: number;
  productsFound: number;
  currentFile?: string;
}
