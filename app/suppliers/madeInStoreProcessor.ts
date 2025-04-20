import { Product } from '../types';
import { SupplierProcessor } from './supplierInterface';
import { normalizeProductDetails } from '../utils/productNormalizer';

/**
 * Processador específico para PDFs da Made In Store
 */
export class MadeInStoreProcessor implements SupplierProcessor {
  name = 'Made In Store';
  
  /**
   * Verifica se o texto pode ser processado por este fornecedor
   */
  canProcess(text: string): boolean {
    // Verifica por padrões específicos da Made In Store
    return text.includes('MADE IN STORE') || text.includes('TABELA APPLE') || 
           (text.match(/^\d+\-\d+\s+CEL\s+APPLE\s+IPHONE/im) !== null) ||
           (text.includes('IPHONE') && text.includes('MACBOOK') && text.includes('APPLE WATCHS'));
  }
  
  /**
   * Extrai produtos do texto dos PDFs da Made In Store
   */
  extractProducts(text: string, source: string): Product[] {
    const products: Product[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`Processando PDF Made In Store com ${lines.length} linhas`);
    
    // Padrão para identificar linhas de produto completas
    // Formato: CÓDIGO DESCRIÇÃO DO PRODUTO R$ PREÇO
    const productLinePattern = /^(\d+\-\d+)\s+(.*)\s+R\$\s*([\d\.,]+)$/i;
    
    // Padrão para identificar cabeçalhos de categorias
    const categoryPattern = /^(IPHONE|MACBOOKS|FONES APPLE|APPLE WATCHS|TABLETS APPLE)/i;
    
    let currentCategory = "";
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Verifica se é um cabeçalho de categoria
      const categoryMatch = line.match(categoryPattern);
      if (categoryMatch) {
        currentCategory = categoryMatch[1].trim();
        continue;
      }
      
      // Ignora linhas que só têm "R$ -" ou preços vazios
      if (line.match(/^R\$\s*\-$/)) {
        continue;
      }
      
      // Tenta identificar linhas de produto
      const productMatch = line.match(productLinePattern);
      if (productMatch) {
        const productCode = productMatch[1].trim();
        const description = productMatch[2].trim();
        const priceStr = productMatch[3].trim().replace(/\./g, '').replace(',', '.');
        const price = parseFloat(priceStr);
        
        if (!isNaN(price) && price > 0) {
          this.processProduct(productCode, description, price, currentCategory, products, source);
        }
      }
    }
    
    console.log(`Extraídos ${products.length} produtos do fornecedor Made In Store`);
    return products;
  }
  
  /**
   * Processa um produto individual e extrai suas informações
   */
  private processProduct(
    productCode: string, 
    description: string, 
    price: number, 
    category: string, 
    products: Product[], 
    source: string
  ): void {
    // Extrair informações do produto com base na descrição
    const modelPatterns = {
      iphone: /\b(IPHONE)\s*((?:PRO|AIR|MINI|MAX|PLUS|ULTRA|SE)?)\s*(\d+(?:\.\d+)?)\s*((?:PRO|AIR|MINI|MAX|PLUS|ULTRA|SE)?)/i,
      macbook: /\b(MACBOOK)\s*((?:PRO|AIR)?)\s*(M\d+(?:\s+(?:PRO|AIR|MAX))?)/i,
      ipad: /\b(IPAD)\s*((?:PRO|AIR|MINI)?)\s*(\d+(?:TH|RD|ND|ST)?(?:\-GERA)?|M\d+(?:\s+(?:PRO|MAX))?)/i,
      watch: /\b(WATCH)\s*((?:ULTRA|SE)?)\s*(\d+|S\d+)/i,
      airpods: /\b(AIRPODS)\s*((?:PRO|MAX)?)\s*(\d+)?/i
    };
    
    // Padrões para extrair detalhes específicos
    const storagePattern = /\b(\d+(?:\s*(?:GB|TB)))\b/i;
    const colorPattern = /\b(PRETO|BRANCO|GRAFITE|AZUL|VERDE|ROXO|DOURADO|GOLD|ROSA|PINK|RED|VERMELHO|SILVER|CINZA|SPACE\s*GRAY|STARLIGHT|BLACK|BLUE|MIDNIGHT|PURPLE|NATURAL|DESERT|WHITE|ORANGE|YELLOW|LIGHT PINK|ULTRAMARINE)\b/i;
    
    // Identificar tipo de produto e extrair detalhes específicos
    let productType = "";
    let model = "";
    let storage = "";
    let color = "";
    
    // Identifica o tipo de produto pela categoria ou descrição
    if (category.includes("IPHONE") || description.includes("IPHONE") || description.includes("CEL APPLE")) {
      productType = "iPhone";
      const match = description.match(modelPatterns.iphone);
      if (match) {
        const prefix = match[2]?.trim() || "";
        const version = match[3].trim();
        const suffix = match[4]?.trim() || "";
        model = `iPhone ${prefix} ${version} ${suffix}`.replace(/\s+/g, ' ').trim();
      } else if (description.includes("CEL APPLE IPHONE")) {
        // Extrair modelo do iPhone a partir do formato "CEL APPLE IPHONE 13 128GB A2633 HN BLUE"
        const iphoneMatch = description.match(/CEL\s+APPLE\s+IPHONE\s+(\d+(?:\s+(?:PRO|AIR|MINI|MAX|PLUS|ULTRA|SE))?)/i);
        if (iphoneMatch) {
          model = `iPhone ${iphoneMatch[1]}`.trim();
        }
      }
    } else if (category.includes("MACBOOK") || description.includes("MACBOOK") || description.includes("NB APPLE")) {
      productType = "MacBook";
      const match = description.match(/\b(MACBOOK|NB\s+APPLE)\s*((?:PRO|AIR)?)\s*(M\d+(?:\s+(?:PRO|AIR|MAX))?)/i);
      if (match) {
        const prefix = match[1].replace("NB APPLE", "MacBook").trim();
        const variant = match[2] || '';
        const chip = match[3] || '';
        model = `${prefix} ${variant} ${chip}`.replace(/\s+/g, ' ').trim();
        
        // Se não conseguiu extrair o chip, tenta novamente
        if (!chip) {
          const chipMatch = description.match(/\b(M\d+(?:\s+(?:PRO|AIR|MAX))?)\b/i);
          if (chipMatch) {
            model += ` ${chipMatch[1]}`;
          }
        }
      } else {
        // Fallback para MacBooks não identificados
        model = "MacBook";
      }
    } else if (category.includes("APPLE WATCH") || description.includes("WATCH")) {
      productType = "Apple Watch";
      const match = description.match(/\b(WATCH\s*(?:ULTRA|SE)?)\s*(S\d+|SERIES\s*\d+|\d+)?\b/i);
      if (match) {
        model = `Apple ${match[1]}`;
        if (match[2]) {
          model += ` ${match[2]}`;
        }
      }
    } else if (category.includes("IPAD") || description.includes("IPAD")) {
      productType = "iPad";
      const match = description.match(/\b(IPAD)\s*((?:PRO|AIR|MINI)?)\s*(\d+(?:TH|RD|ND|ST)?(?:\-GERA)?|M\d+(?:\s+(?:PRO|MAX))?)/i);
      if (match) {
        const type = match[1];
        const variant = match[2] || "";
        const version = match[3] || "";
        model = `${type} ${variant} ${version}`.replace(/\s+/g, ' ').trim();
      }
    } else if (description.includes("AIRPODS") || description.includes("FONE")) {
      productType = "AirPods";
      const match = description.match(/\b(AIRPODS|FONE\s+AIRPODS)\s*((?:PRO|MAX)?)\s*(\d+)?\b/i);
      if (match) {
        const variant = match[2] || "";
        const version = match[3] || "";
        model = `AirPods ${variant} ${version}`.replace(/\s+/g, ' ').trim();
      }
    } else {
      // Caso não consiga identificar o tipo específico
      productType = "Apple";
      model = description.split("R$")[0].trim();
    }
    
    // Extrair armazenamento e padronizar formato
    const storageMatch = description.match(storagePattern);
    if (storageMatch) {
      storage = storageMatch[1].replace(/\s+/g, '').toUpperCase();
    }
    
    // Extrair cor e normalizar
    const colorMatch = description.match(colorPattern);
    if (colorMatch) {
      color = colorMatch[1].trim();
    }
    
    // Determina se o produto é usado/seminovo ou novo (a maioria é novo)
    const isUsed = description.toLowerCase().includes('usado') || 
                   description.toLowerCase().includes('seminovo') || 
                   description.toLowerCase().includes('swap') ||
                   description.toLowerCase().includes('cpo');
    
    // Cria detalhes normalizados com modelo definido
    const details = {
      brand: 'Apple',
      model: model || productType, // Garante que sempre haja um modelo
      storage: storage,
      color: color,
      condition: isUsed ? 'Seminovo' : 'Novo'
    };
    
    // Normaliza o código usando a função auxiliar
    const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
    
    // Adiciona o produto
    products.push({
      code: normalizedCode || productCode,
      description: [model, storage, color].filter(Boolean).join(' ').trim() || description,
      price,
      source: `Made In Store`,
      details
    });
  }
}
