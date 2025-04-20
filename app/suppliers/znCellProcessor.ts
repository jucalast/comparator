import { Product } from '../types';
import { SupplierProcessor } from './supplierInterface';
import { normalizeProductDetails } from '../utils/productNormalizer';

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
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let currentCategory = '';
      let currentProduct = '';
      let currentStorage = '';
      let isEsim = false;
      let isAnatel = false;
      let isChipFisico = false;
      let country = '';
      let inProductSection = false;
      let inAccessorySection = false;
      
      // Processa linha por linha
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Pula linhas vazias
        if (!line) continue;
        
        // Detecção de categorias
        if (line.includes('📱APPLE  LACRADO📱') || line.includes('📱GARANTIA UM ANO 📱') || 
            line.includes('NOVO LACRADO') || line.includes('🔰  NOVO LACRADO🔰')) {
          currentCategory = 'APPLE LACRADO';
          inProductSection = true;
          inAccessorySection = false;
          continue;
        } else if (line.includes('SWAP AMERICANOS') || line.includes('SWAP AMERICANO') || 
                   line.includes('IPHONE SWAP')) {
          currentCategory = 'SWAP AMERICANOS';
          inProductSection = true;
          inAccessorySection = false;
          continue;
        } else if (line.includes('ACESSÓRIOS APPLE') || line.match(/ACESSÓRIOS.*SEM GARANTIA/i)) {
          currentCategory = 'ACESSÓRIOS';
          inProductSection = false;
          inAccessorySection = true;
          continue;
        } else if (line.includes('XIAOMI') || line.match(/XIAOMI\s+GOLBAL/i)) {
          currentCategory = 'XIAOMI';
          inProductSection = true;
          inAccessorySection = false;
          continue;
        }
        
        // Detecta informações de país/região
        if (line.includes('🇺🇸')) {
          country = 'USA';
        } else if (line.includes('🇨🇳')) {
          country = 'CHINA';
        }
        
        // Processo específico para acessórios
        if (inAccessorySection || line.match(/^(🔌|🔋)/)) {
          this.processAccessoryLine(line, products, source, currentCategory);
          continue;
        }
        
        // Se não estamos em uma seção de produtos, continua
        if (!inProductSection) continue;
        
        // Detecta linhas de produto principal (ex: IPHONE XX XXGB)
        // Padrão melhorado para capturar diferentes formatos
        const productMatch = line.match(/^(?:\*)?([A-Z].*?)(?:\s+|-)(\d+(?:GB|TB|MM))\b\s*(?:\*)?/);
        
        if (productMatch && !line.includes('R$')) {
          currentProduct = productMatch[1].trim();
          currentStorage = productMatch[2].trim();
          
          // Adiciona prefixo de produto se estiver faltando
          currentProduct = addProductPrefix(currentProduct, currentCategory);
          
          // Reseta flags adicionais
          isEsim = line.includes('ESIM');
          isAnatel = line.includes('ANATEL');
          isChipFisico = line.toLowerCase().includes('chip fisico');
          
          continue;
        }
        
        // Detecta linhas com cor e preço
        const colorPriceMatch = line.match(/([⬜⬛🟦🟪🟩🟥🩷🥇🐪🩶💗🏳].*?)\s+R\$\s*([\d\.,]+)/);
        
        if (colorPriceMatch && currentProduct && currentStorage) {
          const colorText = colorPriceMatch[1].trim();
          const priceStr = colorPriceMatch[2].trim();
          
          // Normaliza o preço
          const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
          
          if (!isNaN(price) && price > 0) {
            // Extrai informações detalhadas do produto
            const model = extractModelInfo(currentProduct);
            const storage = currentStorage;
            const color = normalizeColor(colorText);
            
            // Determina a condição do produto com base na categoria e no contexto
            let condition = 'Novo';
            if (currentCategory === 'SWAP AMERICANOS' || currentProduct.includes('SWAP')) {
              condition = 'Swap';
            } else if (currentProduct.includes('SEMINOVO') || currentProduct.includes('USADO')) {
              condition = 'Seminovo';
            }
            
            // Cria detalhes específicos para o produto
            const details = {
              brand: getBrandFromProduct(currentProduct),
              model: model,
              storage: storage,
              color: color,
              condition: condition,
              region: country || ''
            };
            
            // ALTERAÇÃO: Usa normalizeProductDetails para gerar o código único
            const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
            
            // Cria descrição completa incluindo informações extras
            let description = `${currentProduct} ${currentStorage} ${color}`;
            
            // Adiciona informações extras à descrição
            if (isEsim) description += " (ESIM)";
            if (isAnatel) description += " (ANATEL)";
            if (isChipFisico) description += " (CHIP FÍSICO)";
            if (country) description += ` (${country})`;
            description += ` - ${currentCategory}`;
            
            // Adiciona o produto com o código normalizado
            products.push({
              code: normalizedCode, // Agora usando o código normalizado em vez do código personalizado
              description,
              price,
              source: `${source} (ZN CELL)`,
              details
            });
            
            console.log(`Produto extraído: ${description} - R$ ${price}`);
          }
        }
        
        // Caso especial para produtos com formato diferente como AIRPODS
        if ((line.includes('AIRPODS') || line.includes('🎧')) && line.includes('R$') && !colorPriceMatch) {
          // Fix: Corrigindo a expressão regular para capturar AIRPODS
          const airpodsPattern = /(?:🎧)?\s*(AIRPODS.*?)(?:\s+R\$|\.\s+R\$)([\d\.,]+)/i;
          const airpodsMatch = line.match(airpodsPattern);
          
          if (airpodsMatch && airpodsMatch.length >= 3) {
            const description = airpodsMatch[1].trim();
            const priceStr = airpodsMatch[2].trim();
            const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(price) && price > 0) {
              // Determina o modelo específico do AirPods
              const airpodsModel = extractAirPodsModel(description);
              
              // Cria detalhes específicos
              const details = {
                brand: 'Apple',
                model: airpodsModel,
                color: 'Branco',
                condition: currentCategory === 'SWAP AMERICANOS' ? 'Seminovo' : 'Novo'
              };
              
              // Adiciona o produto
              products.push({
                code: `AIRPODS-${airpodsModel.replace(/\s+/g, '-')}`,
                description: `${description} - ${currentCategory}`,
                price,
                source: `${source} (ZN CELL)`,
                details
              });
            }
          }
        }
        
        // Caso especial para produtos Xiaomi
        if (currentCategory === 'XIAOMI' && line.includes('XIAOMI') && line.includes('R$')) {
          const xiaomiMatch = line.match(/(XIAOMI\s+\w+(?:\s+\w+)*\s+\d+\/\d+GB).*?([🟦🟩⬛⬜])?(.*?)R\$\s*([\d\.,]+)/i);
          
          if (xiaomiMatch) {
            const description = xiaomiMatch[1].trim();
            const colorEmoji = xiaomiMatch[2] || '';
            const colorText = xiaomiMatch[3].trim();
            const priceStr = xiaomiMatch[4].trim();
            const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(price) && price > 0) {
              const color = colorEmoji ? colorEmojiToText(colorEmoji) : colorText;
              
              // Cria detalhes específicos
              const details = {
                brand: 'Xiaomi',
                model: description,
                color: color,
                condition: 'Novo'
              };
              
              products.push({
                code: `XIAOMI-${description.replace(/\s+/g, '-')}`,
                description: `${description} ${color} - Xiaomi Global`,
                price,
                source: `${source} (ZN CELL)`,
                details
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
  
  /**
   * Processa uma linha de acessório e adiciona à lista de produtos
   */
  private processAccessoryLine(line: string, products: Product[], source: string, category: string): void {
    // Verifica se a linha contém fonte, cabo ou emoji de acessório
    if (line.match(/^(🔌|🔋)/) || line.includes('FONTE') || line.includes('CABO')) {
      // Extrai informações do acessório
      const accessoryMatch = line.match(/(🔌|🔋)?(.*?)(?:R\$\s*|VA:\s*R\$\s*)([\d\.,]+)/i);
      
      if (accessoryMatch) {
        const description = accessoryMatch[2].trim();
        // Tenta pegar o melhor preço (atual se disponível)
        const priceMatch = line.match(/AT:\s*R\$\s*([\d\.,]+)/i);
        let priceStr = priceMatch ? priceMatch[1].trim() : accessoryMatch[3].trim();
        
        // Normaliza o preço para o formato correto usando ponto decimal
        let price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
        
        // Corrige preços inconsistentes (valores absurdamente altos para acessórios)
        if (price >= 1000 && description.match(/\b(FONTE|CABO)\b/i)) {
          price = price / 100;
        }
        
        if (!isNaN(price) && price > 0) {
          // Determina o tipo de acessório
          const accessoryType = description.includes('FONTE') ? 'Fonte' : 
                                description.includes('CABO') ? 'Cabo' : 'Acessório';
          
          // Cria um código único para o acessório
          const accessoryId = description.replace(/\s+/g, '-').substring(0, 15);
          const code = `ACES-${accessoryType}-${accessoryId}`;
          
          // Gera um modelo mais descritivo
          const accessoryModel = `${accessoryType}: ${description}`;
          
          // Adiciona o produto como acessório
          products.push({
            code,
            description: `${accessoryType}: ${description} - Acessório Apple`,
            price,
            source: `${source} (ZN CELL)`,
            details: {
              brand: 'Apple',
              model: accessoryModel,
              condition: 'Novo'
            }
          });
          
          console.log(`Acessório extraído: ${description} - R$ ${price}`);
        }
      }
    }
  }
}

/**
 * Adiciona prefixo de produto se estiver faltando
 */
function addProductPrefix(product: string, category: string): string {
  // Se é um número sozinho ou XR/XS, é um iPhone
  if (/^(\d+|XR|XS)(\s+|$)/i.test(product)) {
    return `IPHONE ${product}`;
  }
  
  // Se começa com 'S' seguido de número, é um Apple Watch
  if (/^S\d+/i.test(product)) {
    return `APPLE WATCH ${product}`;
  }
  
  // Se é um número sozinho e a categoria é APPLE
  if (/^\d+$/.test(product) && category === 'APPLE LACRADO') {
    return `IPAD ${product}`;
  }
  
  return product;
}

/**
 * Extrai informações de modelo do produto
 */
function extractModelInfo(productText: string): string {
  // Remove palavras gerais e mantém a informação específica do modelo
  return productText
    .replace(/IPHONE|APPLE WATCH|APPLE|IPAD|XIAOMI/i, '')
    .replace(/SWAP/i, '')
    .trim();
}

/**
 * Normaliza o nome da cor removendo duplicações e padronizando
 */
function normalizeColor(colorText: string): string {
  // 1. Primeiro, mapeamento entre emojis e cores
  const emojiMap: Record<string, string> = {
    '⬜': 'WHITE',
    '⬛': 'BLACK',
    '🟦': 'BLUE',
    '🟪': 'PURPLE',
    '🟩': 'GREEN',
    '🟥': 'RED',
    '🩷': 'PINK',
    '🥇': 'GOLD',
    '🐪': 'DESERT',
    '🩶': 'NATURAL',
    '💗': 'PINK',
    '🏳': 'WHITE'
  };
  
  // 2. Mapeamento entre nomes de cores em diferentes idiomas
  const colorMap: Record<string, string> = {
    'PRETO': 'BLACK',
    'BRANCO': 'WHITE',
    'AZUL': 'BLUE',
    'VERMELHO': 'RED',
    'VERDE': 'GREEN',
    'ROXO': 'PURPLE',
    'DOURADO': 'GOLD',
    'ROSA': 'PINK',
    'PRATA': 'SILVER'
  };
  
  // 3. Lista de todas as cores conhecidas para detecção de duplicações
  const allKnownColors = [
    'BLACK', 'WHITE', 'BLUE', 'RED', 'GREEN', 'PURPLE', 'GOLD', 'PINK', 'SILVER',
    'DESERT', 'NATURAL', 'MIDNIGHT', 'STARLIGHT',
    'PRETO', 'BRANCO', 'AZUL', 'VERMELHO', 'VERDE', 'ROXO', 'DOURADO', 'ROSA', 'PRATA'
  ];
  
  // 4. Inicializa o processamento
  let result = colorText;
  
  // 5. Remove todos os emojis substituindo-os pelo nome equivalente
  for (const [emoji, colorName] of Object.entries(emojiMap)) {
    if (result.includes(emoji)) {
      result = result.replace(new RegExp(emoji, 'g'), ` ${colorName} `);
    }
  }
  
  // 6. Remove texto após ponto ou parênteses
  result = result.split('.')[0].split('(')[0].trim();
  
  // 7. Remove emojis restantes
  result = result.replace(/[\u{1F300}-\u{1F6FF}]/gu, '').trim();
  
  // 8. Normaliza espaços
  result = result.replace(/\s+/g, ' ').trim().toUpperCase();
  
  // 9. Converte todas as cores para inglês
  for (const [localizedColor, englishColor] of Object.entries(colorMap)) {
    // Usa uma expressão regular que só corresponde a palavras completas
    const regex = new RegExp(`\\b${localizedColor}\\b`, 'gi');
    result = result.replace(regex, englishColor);
  }
  
  // 10. Remove duplicações consecutivas de cores (ex: "BLACK BLACK")
  for (const color of allKnownColors) {
    const duplicateRegex = new RegExp(`\\b${color}\\s+${color}\\b`, 'gi');
    result = result.replace(duplicateRegex, color);
  }
  
  // 11. Remove duplicações combinadas de cores (ex: "GREENGREEN", "GREENBLUE GREEN")
  let cleanedResult = result;
  for (const color of allKnownColors) {
    // Check for colors stuck together
    for (const otherColor of allKnownColors) {
      if (color === otherColor) continue;
      
      // If we have combined colors (like GREENBLUE), remove the first one if 
      // the second one also appears separately
      if (cleanedResult.includes(`${color}${otherColor}`) && 
          (cleanedResult.includes(` ${color} `) || cleanedResult === color)) {
        cleanedResult = cleanedResult.replace(`${color}${otherColor}`, otherColor);
      }
      // If we have combined colors (like GREENBLUE), remove the second one if 
      // the first one also appears separately
      else if (cleanedResult.includes(`${color}${otherColor}`) && 
               (cleanedResult.includes(` ${otherColor} `) || cleanedResult === otherColor)) {
        cleanedResult = cleanedResult.replace(`${color}${otherColor}`, color);
      }
      // If we have two colors next to each other without space
      else if (cleanedResult.includes(`${color}${otherColor}`)) {
        cleanedResult = cleanedResult.replace(`${color}${otherColor}`, `${color}`);
      }
    }
  }
  
  result = cleanedResult;
  
  // 12. Se depois de toda a normalização restaram duas ou mais cores conhecidas,
  // escolhe a primeira
  const foundColors = allKnownColors.filter(color => {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    return regex.test(result);
  });
  
  if (foundColors.length > 1) {
    // Se temos mais de uma cor, verificamos se alguma está no início
    for (const color of foundColors) {
      if (result.startsWith(color)) {
        return color;
      }
    }
    // Caso contrário, retorna a primeira cor encontrada
    return foundColors[0];
  }
  
  // 13. Normaliza espaços finais
  result = result.replace(/\s+/g, ' ').trim();
  
  // 14. Se o resultado está vazio depois de toda a normalização, retorna o texto original
  return result || colorText.trim();
}

/**
 * Converte emoji de cor para texto
 */
function colorEmojiToText(emoji: string): string {
  const emojiMap: Record<string, string> = {
    '⬜': 'WHITE',
    '⬛': 'BLACK',
    '🟦': 'BLUE',
    '🟪': 'PURPLE',
    '🟩': 'GREEN',
    '🟥': 'RED',
    '🩷': 'PINK',
    '🥇': 'GOLD',
    '🐪': 'DESERT',
    '🩶': 'NATURAL',
    '💗': 'PINK',
    '🏳': 'WHITE'
  };
  
  return emojiMap[emoji] || 'N/A';
}

/**
 * Determina a marca do produto a partir do texto
 */
function getBrandFromProduct(product: string): string {
  if (product.includes('IPHONE') || product.includes('APPLE') || 
      product.includes('IPAD') || product.includes('WATCH')) {
    return 'Apple';
  } else if (product.includes('XIAOMI')) {
    return 'Xiaomi';
  }
  
  return 'Outros';
}

/**
 * Extrai o modelo específico dos AirPods
 */
function extractAirPodsModel(description: string): string {
  if (description.includes('AIRPODS PRO')) {
    return 'AirPods Pro';
  } else if (description.includes('AIRPODS MAX')) {
    return 'AirPods Max';
  } else if (description.match(/AIRPODS\s+\d/)) {
    const versionMatch = description.match(/AIRPODS\s+(\d)/);
    if (versionMatch) {
      return `AirPods ${versionMatch[1]}`;
    }
  }
  
  return 'AirPods';
}
