import { Product } from '../types';

/**
 * Interface para implementação de processadores de fornecedores específicos
 */
export interface SupplierProcessor {
  /**
   * Nome do fornecedor
   */
  name: string;
  
  /**
   * Verifica se o conteúdo corresponde ao formato deste fornecedor
   */
  canProcess(text: string): boolean;
  
  /**
   * Processa o texto e extrai produtos
   */
  extractProducts(text: string, source: string): Product[];
}
