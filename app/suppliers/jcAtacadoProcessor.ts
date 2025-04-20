import { Product } from '../types';
import { SupplierProcessor } from './supplierInterface';
import { normalizeProductDetails } from '../utils/productNormalizer';

/**
 * Processador específico para o fornecedor JC Atacado
 */
export class JCAtacadoProcessor implements SupplierProcessor {
  name = 'JC Atacado';
  
  /**
   * Verifica se o texto pode ser processado por este fornecedor
   */
  canProcess(text: string): boolean {
    // Verifica por padrões específicos do JC Atacado
    const hasJCAtacado = text.includes('JC ATACADO LISTA') || text.includes('LISTA DE SEMINOVOS');
    const hasIphones = text.includes('IPHONES') && text.includes('GB');
    const hasSymbols = text.includes('➖') || text.includes('➡');
    
    return hasJCAtacado && hasIphones && hasSymbols;
  }
  
  /**
   * Extrai produtos do texto no formato JC Atacado
   */
  extractProducts(text: string, source: string): Product[] {
    const products: Product[] = [];
    
    try {
      console.log(`Processando texto como JC Atacado, ${text.length} caracteres`);
      
      // Divide o texto em linhas para processamento
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let currentModel = '';
      let currentStorage = '';
      let currentPrice = 0;
      let inProductSection = false;
      
      // Processa linha por linha
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detecta início da seção de produtos
        if (line.includes('LISTA DE SEMINOVOS') || line.includes('IPHONES')) {
          inProductSection = true;
          continue;
        }
        
        if (!inProductSection) continue;
        
        // Detecta final da seção de produtos
        if (line.includes('GARANTIA DE') || line.includes('ATENÇÃO VALORES')) {
          inProductSection = false;
          continue;
        }
        
        // Detecta linha de modelo (ex: "➖ 11 64GB")
        const modelMatch = line.match(/➖\s+(.+?)\s+(\d+GB)/);
        if (modelMatch) {
          currentModel = modelMatch[1].trim();
          currentStorage = modelMatch[2].trim();
          continue;
        }
        
        // Detecta linha de preço (ex: "R$ 1.450,00")
        const priceMatch = line.match(/R\$\s*([\d\.,]+)/);
        if (priceMatch && currentModel) {
          const priceStr = priceMatch[1].trim();
          currentPrice = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
          continue;
        }
        
        // Detecta linha de cores (ex: "➡ Preto, Branco")
        const colorsMatch = line.match(/➡\s+(.+)/);
        if (colorsMatch && currentModel && currentPrice > 0) {
          const colorsText = colorsMatch[1].trim();
          const colors = colorsText.split(/,\s*/).map(color => color.trim());
          
          // Cria um produto para cada cor
          colors.forEach(color => {
            // Padronizar: normalizar storage para remover espaços
            const normalizedStorage = currentStorage.replace(/\s+/g, '');
            
            // Gera descrição padronizada para facilitar comparação entre fornecedores
            const details = {
              brand: 'Apple',
              model: `iPhone ${currentModel.replace(/iPhone|iphone/i, '').trim()}`,
              storage: normalizedStorage,
              color: color,
              condition: 'Seminovo'
            };
            
            // Normaliza o código usando a função auxiliar
            const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
            
            // Adiciona o produto com código normalizado
            products.push({
              code: normalizedCode,
              description: `${normalizedDescription} - JC Atacado`,
              price: currentPrice,
              source: `JC Atacado`,
              details
            });
            
            console.log(`Produto extraído: ${normalizedDescription} - R$ ${currentPrice}`);
          });
          
          // Reinicia preço para tratar eventual próximo conjunto preço-cores
          currentPrice = 0;
          continue;
        }
      }
      
      console.log(`Total de ${products.length} produtos extraídos do fornecedor JC Atacado`);
    } catch (error) {
      console.error('Erro ao processar texto do JC Atacado:', error);
    }
    
    return products;
  }
}
