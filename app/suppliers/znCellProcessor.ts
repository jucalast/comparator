import { Product } from '../types';
import { SupplierProcessor } from './supplierInterface';

/**
 * Processador específico para o fornecedor ZN CELL
 */
export class ZNCellProcessor implements SupplierProcessor {
  name = 'ZN CELL';
  
  /**
   * Verifica se o texto pode ser processado por este fornecedor
   */
  canProcess(text: string): boolean {
    // Verifica por padrões específicos do ZN CELL
    const hasAppleLacrado = text.includes('📱APPLE  LACRADO📱');
    const hasSwapAmericanos = text.includes('SWAP AMERICANOS');
    const hasEmojis = /[⬜⬛🟦🟪🟩🟥🩷🥇🐪🩶💗🏳]/.test(text);
    
    return hasEmojis && (hasAppleLacrado || hasSwapAmericanos);
  }
  
  /**
   * Extrai produtos do texto no formato ZN CELL
   */
  extractProducts(text: string, source: string): Product[] {
    const products: Product[] = [];
    
    try {
      console.log(`Processando texto como ZN CELL, ${text.length} caracteres`);
      
      // Divide o texto em linhas para processamento
      const lines = text.split('\n');
      
      let currentCategory = '';
      let currentProduct = '';
      let currentStorage = '';
      let inProductSection = false;
      
      // Processa linha por linha
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Pula linhas vazias
        if (!line) continue;
        
        // Detecção de categorias
        if (line.includes('📱APPLE  LACRADO📱')) {
          currentCategory = 'APPLE LACRADO';
          inProductSection = true;
          continue;
        } else if (line.includes('SWAP AMERICANOS')) {
          currentCategory = 'SWAP AMERICANOS';
          inProductSection = true;
          continue;
        } else if (line.includes('ACESSÓRIOS APPLE')) {
          currentCategory = 'ACESSÓRIOS';
          inProductSection = true;
          continue;
        } else if (line.includes('XIAOMI')) {
          currentCategory = 'XIAOMI';
          inProductSection = true;
          continue;
        }
        
        // Se não estamos em uma seção de produtos, continua
        if (!inProductSection) continue;
        
        // Detecta linhas de produto principal (IPHONE XX XXGB)
        const productMatch = line.match(/^([A-Z].*?)\s+(\d+(?:GB|MM))\b/);
        if (productMatch && !line.includes('R$')) {
          currentProduct = productMatch[1].trim();
          currentStorage = productMatch[2].trim();
          continue;
        }
        
        // Detecta linhas com cor e preço
        const colorPriceMatch = line.match(/([⬜⬛🟦🟪🟩🟥🩷🥇🐪🩶💗🏳].*?)\s+R\$\s*([\d\.,]+)/);
        if (colorPriceMatch && currentProduct) {
          const color = colorPriceMatch[1].trim();
          const priceStr = colorPriceMatch[2].trim();
          
          // Normaliza o preço
          const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
          
          if (!isNaN(price) && price > 0) {
            // Gera código único baseado nos detalhes do produto
            const model = currentProduct.replace(/IPHONE|APPLE WATCH|AIRPODS|IPAD|XIAOMI/i, '').trim();
            const baseCode = `${currentCategory.substring(0, 3)}-${model}-${currentStorage}`;
            const colorCode = color.replace(/[^\w\s]/g, '').trim().substring(0, 3);
            const code = `${baseCode}-${colorCode}`.replace(/\s+/g, '-');
            
            // Cria a descrição completa
            const description = `${currentProduct} ${currentStorage} ${color} - ${currentCategory}`;
            
            // Adiciona o produto
            products.push({
              code,
              description,
              price,
              source: `${source} (ZN CELL)`
            });
            
            console.log(`Produto extraído: ${description} - R$ ${price}`);
          }
        }
        
        // Caso especial para acessórios
        if (currentCategory === 'ACESSÓRIOS' && line.match(/^🔌|^🔋/) && line.includes('R$')) {
          const accessoryMatch = line.match(/(🔌|🔋)(.*?)R\$\s*([\d\.,]+)/);
          if (accessoryMatch) {
            const description = accessoryMatch[2].trim();
            const priceStr = accessoryMatch[3].trim();
            const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(price) && price > 0) {
              const code = `ACES-${description.substring(0, 15)}`.replace(/\s+/g, '-');
              
              products.push({
                code,
                description: `${description} - Acessório`,
                price,
                source: `${source} (ZN CELL)`
              });
            }
          }
        }
        
        // Processa caso especial como o AIRPODS
        if (line.includes('🎧') && line.includes('R$')) {
          const airpodsMatch = line.match(/🎧(.*?)R\$\s*([\d\.,]+)/);
          if (airpodsMatch) {
            const description = airpodsMatch[1].trim();
            const priceStr = airpodsMatch[2].trim();
            const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(price) && price > 0) {
              products.push({
                code: `AIRPODS-${description.substring(0, 10)}`.replace(/\s+/g, '-'),
                description: `${description} - ${currentCategory}`,
                price,
                source: `${source} (ZN CELL)`
              });
            }
          }
        }
      }
      
      console.log(`Total de ${products.length} produtos extraídos do fornecedor ZN CELL`);
    } catch (error) {
      console.error('Erro ao processar texto do ZN CELL:', error);
    }
    
    return products;
  }
}
