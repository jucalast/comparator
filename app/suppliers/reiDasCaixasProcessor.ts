import { Product } from '../types';
import { SupplierProcessor } from './supplierInterface';
import { normalizeProductDetails } from '../utils/productNormalizer';

/**
 * Processador específico para o fornecedor Rei das Caixas
 */
export class ReiDasCaixasProcessor implements SupplierProcessor {
  name = 'Rei das Caixas';
  
  /**
   * Verifica se o texto pode ser processado por este fornecedor
   */
  canProcess(text: string): boolean {
    // Verifica por padrões específicos do Rei das Caixas
    const hasCrownEmoji = (text.match(/👑/g) || []).length > 3;
    
    // Amplia os padrões de detecção
    const hasSupplierName = text.includes('REI DAS CAIXAS') || 
                            text.includes('BOM DIA') ||
                            text.includes('Rei das Caixas');
                            
    const hasProductPattern = text.includes('👑 iPhone') || 
                              text.includes('👑IPhone') ||
                              text.match(/iPhone\s+\d+\s+(?:PRO|Pro|pro)?(?:\s+(?:MAX|Max|max))?\s+\d+GB/) !== null;
    
    // Log para diagnóstico
    console.log('Rei das Caixas - canProcess avaliação:', {
      hasCrownEmoji,
      hasSupplierName,
      hasProductPattern,
      resultado: hasCrownEmoji && (hasSupplierName || hasProductPattern)
    });
    
    // Relaxa as condições para aumentar a chance de detecção
    return (hasCrownEmoji && (hasSupplierName || hasProductPattern)) || 
           (hasSupplierName && hasProductPattern);
  }
  
  /**
   * Extrai produtos do texto no formato Rei das Caixas
   */
  extractProducts(text: string, source: string): Product[] {
    const products: Product[] = [];
    // Criar um buffer de cores separado para uso temporário
    let colorBuffer: string[] = [];
    
    try {
      console.log(`Processando texto como Rei das Caixas, ${text.length} caracteres`);
      
      // Divide o texto em linhas para processamento
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(`Total de ${lines.length} linhas para processamento`);
      
      // Para diagnóstico, vamos logar as primeiras linhas
      console.log('Primeiras 10 linhas do texto:');
      lines.slice(0, 10).forEach((line, i) => console.log(`[${i}] "${line}"`));
      
      let currentModel = '';
      let currentStorage = '';
      let currentRegion = '';
      let currentCondition = 'Seminovo'; // Padrão conforme mencionado no texto "Seminovo"
      let currentPrice = 0;
      let currentDetails: any = {};
      let inProductSection = false;
      
      // Processa linha por linha
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detecta início da seção de produtos - ampliado para mais padrões
        if (line.includes('👑 Seminovo') || line.includes('BOM DIA') || 
            line.includes('Seminovo') || line.includes('SEM DETALHES') ||
            line.includes('SEM ACESSÓRIOS')) {
          inProductSection = true;
          console.log(`Seção de produtos iniciada na linha ${i}: "${line}"`);
          continue;
        }
        
        // Forçar o processo para começar mesmo sem seção explicitamente marcada
        if (i > 10 && !inProductSection && line.match(/👑\s*(?:i|I)Phone\s+\d+/)) {
          inProductSection = true;
          console.log(`Seção de produtos forçada na linha ${i}: "${line}"`);
        }
        
        // Se ainda não entramos na seção de produtos, continua
        if (!inProductSection) continue;
        
        // Detecta linha de produto (padrão ampliado)
        // ex: "👑 iPhone 15 PRO Max 512GB (NUNCA FOI ATIVADO)" ou "👑IPhone 15 PRO Max 256GB"
        const productMatch = line.match(/^👑\s*(?:i|I)Phone\s+\d+/);
        
        // Padrão alternativo sem emoji para caso a formatação do texto seja alterada
        const altProductMatch = !productMatch && line.match(/^(?:i|I)Phone\s+\d+\s+(?:PRO|Pro|pro)?(?:\s+(?:MAX|Max|max))?\s+\d+GB/);
        
        if (productMatch || altProductMatch) {
          console.log(`Produto encontrado na linha ${i}: "${line}"`);
          
          // Reseta os detalhes do produto anterior caso exista
          if (currentModel && currentPrice > 0) {
            // Adiciona os produtos com as cores anteriores antes de resetar
            addProductsWithColors(products, currentDetails, currentPrice, source, colorBuffer);
            // Limpa o buffer de cores após adicionar os produtos
            colorBuffer = [];
          }
          
          // Extrai informações do modelo
          const modelInfo = extractModelInfo(line);
          currentModel = modelInfo.model;
          currentStorage = modelInfo.storage;
          currentRegion = modelInfo.region;
          currentCondition = modelInfo.condition;
          currentPrice = 0; // Reseta o preço para o novo modelo
          
          console.log(`Modelo extraído: ${currentModel}, Storage: ${currentStorage}, Região: ${currentRegion}`);
          
          // Prepara os detalhes básicos do produto
          currentDetails = {
            brand: 'Apple',
            model: currentModel,
            storage: currentStorage,
            condition: currentCondition,
            region: currentRegion
          };
          
          // Verifica se a mesma linha já contém um preço
          const priceInLineMatch = line.match(/R\$\s*([\d\.,]+)/);
          if (priceInLineMatch) {
            const priceStr = priceInLineMatch[1].trim();
            currentPrice = normalizePrice(priceStr);
            console.log(`Preço encontrado na mesma linha: R$ ${currentPrice}`);
          }
          
          continue;
        }
        
        // Detecta linha com preço (com mais flexibilidade)
        const priceMatch = line.match(/R\$\s*([\d\.,]+)/);
        if (priceMatch && currentModel) {
          // Processa o preço normalizado
          const priceStr = priceMatch[1].trim();
          currentPrice = normalizePrice(priceStr);
          
          console.log(`Preço encontrado: R$ ${currentPrice} para ${currentModel}`);
          
          // Se temos um modelo e um preço mas nenhuma cor, adicionamos com cor padrão
          if (colorBuffer.length === 0) {
            console.log(`Nenhuma cor definida para ${currentModel}, usando cor padrão`);
            // Verifica se o preço está em uma linha que também menciona uma cor
            const lineColors = extractColors(line);
            if (lineColors.length > 0) {
              colorBuffer = lineColors;
              console.log(`Cores encontradas na mesma linha do preço: ${colorBuffer.join(', ')}`);
            } else {
              // Se não encontramos cores, usamos "N/A" como padrão
              colorBuffer = ["N/A"];
            }
          }
          
          // Cria produtos para todas as cores definidas antes deste preço
          addProductsWithColors(products, currentDetails, currentPrice, source, colorBuffer);
          
          // Reseta as cores e o preço após adicionar os produtos
          colorBuffer = [];
          currentPrice = 0;
          
          continue;
        }
        
        // Detecta linhas de cor com emoji ou texto (padrão ampliado)
        if (currentModel && (line.match(/[🟠⚫🔵⚪🟣🟡🟢♥🔴]/) || 
            line.match(/^[⚫🔵⚪🟣🟡🟢♥🔴]/) || 
            line.match(/^(PRETO|BRANCO|AZUL|VERMELHO|DOURADO|VERDE|ROXO)/i) ||
            line.toLowerCase().includes('preto') ||
            line.toLowerCase().includes('azul') ||
            line.toLowerCase().includes('branco'))) {
            
          // Extrair cores da linha
          const colors = extractColors(line);
          
          // Adiciona as cores para processamento posterior
          if (colors.length > 0 && !line.includes('R$')) {
            colorBuffer.push(...colors);
            console.log(`Cores encontradas: ${colors.join(', ')} para ${currentModel}`);
          }
          
          continue;
        }
      }
      
      // Verificar se ainda há um produto pendente para adicionar no final
      if (currentModel && currentPrice > 0) {
        if (colorBuffer.length === 0) {
          colorBuffer = ["N/A"]; // Usa cor padrão se nenhuma foi definida
        }
        addProductsWithColors(products, currentDetails, currentPrice, source, colorBuffer);
      }
      
      console.log(`Total de ${products.length} produtos extraídos do fornecedor Rei das Caixas`);
      
      // Abordagem alternativa: busca direta por padrões de produtos
      if (products.length === 0) {
        console.log(`Tentando abordagem alternativa para Rei das Caixas`);
        products.push(...this.extractProductsAlternative(text, source));
      }
      
      // Se nenhum produto foi encontrado, registra informações para diagnóstico
      if (products.length === 0) {
        console.error('Nenhum produto encontrado no texto do Rei das Caixas.');
        console.error('Problemas possíveis:');
        console.error('1. Formato diferente do esperado');
        console.error('2. Falha nos padrões de detecção de produto/preço/cor');
        
        // Verifica se o texto contém alguns padrões chave
        const hasIPhone = lines.some(line => line.includes('iPhone') || line.includes('IPHONE'));
        const hasPrice = lines.some(line => line.includes('R$'));
        
        console.error(`- Contém iPhone: ${hasIPhone}`);
        console.error(`- Contém preços (R$): ${hasPrice}`);
      }
      
    } catch (error) {
      console.error('Erro ao processar texto do Rei das Caixas:', error);
    }
    
    return products;
  }
  
  /**
   * Método alternativo para extrair produtos usando uma abordagem de regex mais agressiva
   */
  private extractProductsAlternative(text: string, source: string): Product[] {
    const products: Product[] = [];
    console.log('Usando abordagem alternativa para extração de produtos');
    
    try {
      // Procura padrões de produto completos em uma única linha
      // iPhone 15 PRO Max 512GB ... R$ 6500
      const productPricePattern = /(?:👑\s*)?(?:i|I)Phone\s+(\d+(?:\s+(?:Pro|PRO|pro))?(?:\s+(?:Max|MAX|max))?)\s+(\d+(?:GB|TB)).*?(?:Americano|Dubai|Swap)?.*?R\$\s*([\d\.,]+)/g;
      
      let match;
      let count = 0;
      
      // Loop através de todos os matches
      while ((match = productPricePattern.exec(text)) !== null) {
        count++;
        const modelName = match[1].trim();
        const storage = match[2].replace(/\s+/g, '');
        const priceStr = match[3].trim();
        const fullLine = match[0];
        
        const price = normalizePrice(priceStr);
        
        if (!isNaN(price) && price > 0) {
          // Determina a região
          const region = fullLine.includes('Americano') || fullLine.includes('AMERICANO') ? 'USA' : 
                         fullLine.includes('Dubai') || fullLine.includes('DUBAI') ? 'Dubai' : '';
                       
          // Determina a condição
          let condition = 'Seminovo';
          if (fullLine.includes('Swap') || fullLine.includes('SWAP')) {
            condition = 'Swap';
          } else if (fullLine.includes('NUNCA FOI ATIVADO')) {
            condition = 'Novo';
          }
          
          // Extrai cor
          const colors = extractColors(fullLine);
          const color = colors.length > 0 ? colors[0] : 'N/A';
          
          // Detalhes do produto
          const details = {
            brand: 'Apple',
            model: `iPhone ${modelName}`,
            storage,
            color,
            condition,
            region
          };
          
          // Normaliza o código
          const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
          
          // Adiciona o produto
          products.push({
            code: normalizedCode,
            description: `iPhone ${modelName} ${storage} ${color} - Rei das Caixas`,
            price,
            source: `Rei das Caixas`,
            details
          });
          
          console.log(`Produto alternativo extraído: iPhone ${modelName} ${storage} ${color} - R$ ${price}`);
        }
      }
      
      console.log(`Abordagem alternativa encontrou ${count} padrões e extraiu ${products.length} produtos`);
      
    } catch (error) {
      console.error('Erro na extração alternativa:', error);
    }
    
    return products;
  }
}

/**
 * Extrai informações do modelo a partir da linha de texto
 */
function extractModelInfo(line: string): { 
  model: string; 
  storage: string; 
  region: string;
  condition: string;
} {
  // Valores padrão
  let model = '';
  let storage = '';
  let region = '';
  let condition = 'Seminovo';
  
  // Remove o emoji e espaços iniciais
  const cleanLine = line.replace(/^👑\s*/, '').trim();
  console.log(`Linha limpa para extração de modelo: "${cleanLine}"`);
  
  // Extrai o modelo e storage (padrão ampliado)
  // Tenta capturar vários formatos de modelo, como:
  // "iPhone 15 PRO Max 512GB", "IPhone 14 Pro 128GB Americano", etc.
  const modelMatch = cleanLine.match(/(?:i|I)Phone\s+(\d+(?:\s+(?:Pro|PRO|pro))?(?:\s+(?:Max|MAX|max))?)\s+(\d+(?:GB|TB))/i);
  
  if (modelMatch) {
    model = `iPhone ${modelMatch[1].trim()}`;
    storage = modelMatch[2].trim().replace(/\s+/g, '');
    console.log(`Modelo capturado: ${model}, Storage: ${storage}`);
  } else {
    // Tenta um padrão alternativo se o primeiro falhar
    const altMatch = cleanLine.match(/(?:i|I)Phone\s+([^\d]+?\s+\d+|\d+\s+[^\d]+?)\s+(\d+(?:GB|TB))/i);
    if (altMatch) {
      model = `iPhone ${altMatch[1].trim()}`;
      storage = altMatch[2].trim().replace(/\s+/g, '');
      console.log(`Modelo alternativo capturado: ${model}, Storage: ${storage}`);
    } else {
      console.warn(`Não foi possível extrair modelo/storage de: "${cleanLine}"`);
    }
  }
  
  // Verifica se é americano, dubai ou swap
  if (cleanLine.includes('Americano') || cleanLine.includes('AMERICANO') || cleanLine.includes('🇺🇸')) {
    region = 'USA';
  } else if (cleanLine.includes('Dubai') || cleanLine.includes('DUBAI')) {
    region = 'Dubai';
  }
  
  // Verifica se é Swap
  if (cleanLine.includes('Swap') || cleanLine.includes('SWAP')) {
    condition = 'Swap';
  } else if (cleanLine.includes('NUNCA FOI ATIVADO')) {
    condition = 'Novo';
  }
  
  return { model, storage, region, condition };
}

/**
 * Extrai cores a partir de uma linha de texto com emojis
 */
function extractColors(line: string): string[] {
  const colors: string[] = [];
  const colorPatterns = [
    { emoji: '⚫', name: 'BLACK' },
    { emoji: '🔵', name: 'BLUE' },
    { emoji: '⚪', name: 'WHITE' },
    { emoji: '🟠', name: 'ORANGE' },
    { emoji: '🟣', name: 'PURPLE' },
    { emoji: '🟡', name: 'GOLD' },
    { emoji: '🟢', name: 'GREEN' },
    { emoji: '♥', name: 'RED' },
    { emoji: '🔴', name: 'RED' },
    { emoji: '💛', name: 'GOLD' },
    { emoji: '🟤', name: 'BROWN' },
    { emoji: '⚪', name: 'WHITE' },
  ];
  
  // Procura cada padrão de cor na linha
  for (const pattern of colorPatterns) {
    if (line.includes(pattern.emoji)) {
      // Verifica se há um nome específico após o emoji
      const regex = new RegExp(`${pattern.emoji}\\s*([A-Za-zÀ-ÖØ-öø-ÿ]+)`, 'i');
      const match = line.match(regex);
      
      if (match) {
        // Usa o nome da cor mencionado no texto
        colors.push(match[1].trim().toUpperCase());
      } else {
        // Usa o nome padrão da cor
        colors.push(pattern.name);
      }
    }
  }
  
  // Também verifica nomes de cores específicos sem emoji
  const colorNames = [
    'preto', 'midnight', 'graphite', 'branco', 'azul', 'vermelho', 'verde', 
    'roxo', 'lilás', 'rose', 'dourado', 'natural'
  ];
  
  for (const colorName of colorNames) {
    if (line.toLowerCase().includes(colorName)) {
      colors.push(normalizeColor(colorName));
    }
  }
  
  return [...new Set(colors)]; // Remove duplicatas
}

/**
 * Normaliza o nome da cor
 */
function normalizeColor(colorText: string): string {
  const colorMap: Record<string, string> = {
    'preto': 'BLACK',
    'midnight': 'BLACK',
    'graphite': 'BLACK',
    'branco': 'WHITE',
    'starlight': 'WHITE',
    'azul': 'BLUE',
    'vermelho': 'RED',
    'verde': 'GREEN',
    'roxo': 'PURPLE',
    'lilás': 'PURPLE',
    'dourado': 'GOLD',
    'rose': 'PINK',
    'rosa': 'PINK',
    'natural': 'NATURAL'
  };
  
  const normalizedColor = colorText.trim().toLowerCase();
  return colorMap[normalizedColor] || normalizedColor.toUpperCase();
}

/**
 * Adiciona produtos à lista com base nos detalhes e no preço
 */
function addProductsWithColors(
  products: Product[], 
  details: any, 
  price: number, 
  source: string,
  colorBuffer: string[]
): void {
  if (!details.model || price <= 0) {
    console.log(`Ignorando produto com dados incompletos: Modelo=${details.model}, Preço=${price}`);
    return;
  }
  
  // Se não tiver cores, adiciona um produto sem cor especificada
  if (colorBuffer.length === 0) {
    const productDetails = { ...details, color: 'N/A' };
    addSingleProduct(products, productDetails, price, source);
    console.log(`Adicionado produto sem cor especificada: ${details.model} ${details.storage}`);
    return;
  }
  
  // Adiciona um produto para cada cor
  for (const color of colorBuffer) {
    const productDetails = { ...details, color };
    addSingleProduct(products, productDetails, price, source);
    console.log(`Adicionado produto com cor ${color}: ${details.model} ${details.storage}`);
  }
}

/**
 * Adiciona um único produto à lista
 */
function addSingleProduct(products: Product[], details: any, price: number, source: string): void {
  // Normaliza o código usando a função auxiliar
  const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
  
  // Cria a descrição completa do produto
  let fullDescription = `${details.model} ${details.storage} ${details.color}`;
  if (details.region) {
    fullDescription += ` (${details.region})`;
  }
  fullDescription += ` - Rei das Caixas`;
  
  // Adiciona o produto à lista
  products.push({
    code: normalizedCode,
    description: fullDescription,
    price,
    source: `Rei das Caixas`,
    details
  });
  
  console.log(`Produto extraído: ${fullDescription} - R$ ${price}`);
}

/**
 * Normaliza um valor de preço a partir de uma string
 * Lida com diferentes formatos como R$1.400.00, R$2.990,00, R$6500, etc.
 */
function normalizePrice(priceStr: string): number {
  // Remove possíveis espaços e caracteres não-numéricos exceto ponto e vírgula
  const cleaned = priceStr.trim().replace(/[^\d.,]/g, '');
  
  // Verifica se o preço tem apenas números, sem separadores
  if (!cleaned.includes('.') && !cleaned.includes(',')) {
    const price = parseInt(cleaned);
    // Se o valor for maior que 10000, provavelmente está em centavos
    return price > 10000 ? price / 100 : price;
  }
  
  // Se termina com dois zeros após um ponto (formato R$1.400.00)
  if (/\.\d{2}$/.test(cleaned)) {
    // Substitui todos os pontos exceto o último por nada
    // e o último ponto por vírgula
    const parts = cleaned.split('.');
    const lastPart = parts.pop();
    const firstPart = parts.join('');
    return parseFloat(`${firstPart}.${lastPart}`);
  }
  
  // Se há apenas um ponto ou vírgula
  if ((cleaned.match(/\./g) || []).length === 1) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  
  // Para casos com múltiplos separadores (1.234.56 ou 1,234.56)
  if ((cleaned.match(/\./g) || []).length > 1 || 
      ((cleaned.match(/\./g) || []).length === 1 && (cleaned.match(/,/g) || []).length === 1)) {
    // Assume que o formato é 1.234.56 (pontos como separadores de milhar e decimal)
    const parts = cleaned.split('.');
    const lastPart = parts.pop();
    const firstPart = parts.join('');
    return parseFloat(`${firstPart}.${lastPart}`);
  }
  
  // Fallback: substitui vírgula por ponto e converte
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}
