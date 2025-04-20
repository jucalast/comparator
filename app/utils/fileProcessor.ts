import { Product, FileWithPreview } from '../types';
import { getAllProcessors } from '../suppliers/processorRegistry';
import { normalizeProductDetails } from './productNormalizer';

/**
 * Lê o conteúdo de um arquivo como texto
 */
async function readFileText(file: FileWithPreview): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}

/**
 * Extrai produtos usando expressões regulares
 */
function extractProductsByRegex(text: string, source: string): Product[] {
  const products: Product[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`Tentando extrair produtos por regex de ${lines.length} linhas`);
  
  // Padrão básico para iPhone com preço
  const iphonePattern = /(?:i|I)Phone\s+(\d+(?:\s+(?:Pro|PRO|pro))?(?:\s+(?:Max|MAX|max))?)\s+(\d+(?:GB|TB)).*?R\$\s*([\d\.,]+)/g;
  
  // Aplicar regex em todo o texto
  let match;
  while ((match = iphonePattern.exec(text)) !== null) {
    const model = match[1].trim();
    const storage = match[2].trim().replace(/\s+/g, '');
    const priceStr = match[3].trim();
    const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
    
    if (!isNaN(price) && price > 0) {
      // Extrai informações de cor se disponível
      const fullLine = match[0];
      let color = 'N/A';
      
      // Lista de cores comuns para tentar detectar
      const colors = ['preto', 'branco', 'azul', 'vermelho', 'verde', 
                      'roxo', 'dourado', 'rose', 'gold', 'black', 
                      'white', 'blue', 'red', 'green', 'purple'];
                      
      for (const c of colors) {
        if (fullLine.toLowerCase().includes(c)) {
          color = c.toUpperCase();
          break;
        }
      }
      
      // Detalhes do produto
      const details = {
        brand: 'Apple',
        model: `iPhone ${model}`,
        storage,
        color,
        condition: fullLine.toLowerCase().includes('seminovo') ? 'Seminovo' : 'Novo'
      };
      
      // Normaliza o código usando a função auxiliar
      const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
      
      // Adiciona o produto
      products.push({
        code: normalizedCode,
        description: `iPhone ${model} ${storage} ${color} - Extração Genérica`,
        price,
        source: source,
        details
      });
      
      console.log(`Produto extraído por regex: iPhone ${model} ${storage} ${color} - R$ ${price}`);
    }
  }
  
  return products;
}

/**
 * Processa texto no formato CSV para extrair produtos
 */
function parseCSV(text: string, source: string): Product[] {
  const products: Product[] = [];
  
  try {
    // Detecta o separador (vírgula ou ponto-e-vírgula)
    const separator = text.includes(';') ? ';' : ',';
    
    // Separa linhas e filtra vazias
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`CSV parsed, ${lines.length} linhas encontradas`);
    console.log(`Exemplo de linha: ${JSON.stringify(lines[0].split(separator))}`);
    
    // Se tiver menos de 2 linhas, não processa (precisa de pelo menos cabeçalho e uma linha de dados)
    if (lines.length < 2) return products;
    
    // Extrai cabeçalhos
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    // Verifica se temos colunas necessárias
    const hasProducts = headers.some(h => 
      h.includes('produto') || h.includes('descrição') || h.includes('model')
    );
    
    const hasPrices = headers.some(h => 
      h.includes('preço') || h.includes('valor') || h.includes('price')
    );
    
    if (!hasProducts || !hasPrices) {
      console.warn('CSV não contém colunas para produtos ou preços');
      return products;
    }
    
    // Identifica os índices das colunas importantes
    const descIndex = headers.findIndex(h => 
      h.includes('produto') || h.includes('descrição') || h.includes('model')
    );
    
    const priceIndex = headers.findIndex(h => 
      h.includes('preço') || h.includes('valor') || h.includes('price')
    );
    
    // Extrai outras colunas úteis se presentes
    const storageIndex = headers.findIndex(h => 
      h.includes('armazenamento') || h.includes('storage') || h.includes('capacidade')
    );
    
    const colorIndex = headers.findIndex(h => 
      h.includes('cor') || h.includes('color')
    );
    
    // Processa linhas de dados
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(separator).map(c => c.trim());
      
      // Pula se não tiver colunas suficientes
      if (columns.length <= Math.max(descIndex, priceIndex)) continue;
      
      const description = columns[descIndex];
      let priceStr = columns[priceIndex].replace(/[^\d\.,]/g, ''); // Remove tudo exceto números, pontos e vírgulas
      
      // Formata o preço corretamente
      priceStr = priceStr.replace(/\./g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      
      if (!isNaN(price) && price > 0 && description) {
        // Extrai informações extras quando disponíveis
        const storage = storageIndex >= 0 && columns[storageIndex] ? columns[storageIndex] : '';
        const color = colorIndex >= 0 && columns[colorIndex] ? columns[colorIndex] : '';
        
        // Tenta extrair um modelo a partir da descrição
        let model = description;
        let extractedStorage = storage;
        
        // Se for um iPhone, iPad, etc, tenta extrair o modelo
        const appleMatch = description.match(/(?:iPhone|iPad|MacBook|Watch)\s+([^,]+)/i);
        if (appleMatch) {
          model = appleMatch[0];
          
          // Se não temos storage definido, tenta extrair da descrição
          if (!extractedStorage) {
            const storageMatch = description.match(/\b(\d+(?:GB|TB))\b/i);
            if (storageMatch) {
              extractedStorage = storageMatch[1];
            }
          }
        }
        
        // Tenta extrair a marca do modelo ou da descrição
        let brand = 'Unknown';
        if (model.toLowerCase().includes('iphone') || model.toLowerCase().includes('ipad') || 
            model.toLowerCase().includes('macbook') || model.toLowerCase().includes('watch')) {
          brand = 'Apple';
        } else if (model.toLowerCase().includes('samsung') || description.toLowerCase().includes('samsung')) {
          brand = 'Samsung';
        } else if (model.toLowerCase().includes('xiaomi') || description.toLowerCase().includes('xiaomi')) {
          brand = 'Xiaomi';
        }
        
        // Cria detalhes normalizados
        const details = {
          brand,
          model,
          storage: extractedStorage,
          color,
          condition: description.toLowerCase().includes('seminovo') ? 'Seminovo' : 'Novo'
        };
        
        // Tenta normalizar o código
        try {
          const { normalizedCode, normalizedDescription } = normalizeProductDetails(details);
          
          // Cria o produto normalizado
          products.push({
            code: normalizedCode || `CSV-${i}`,
            description: normalizedDescription || description,
            price,
            source,
            details
          });
        } catch (error) {
          // Fallback se a normalização falhar
          products.push({
            code: `CSV-${i}`,
            description,
            price,
            source,
            details
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar CSV:', error);
  }
  
  return products;
}

/**
 * Processa um arquivo de texto e extrai produtos
 */
export async function processTextFile(file: FileWithPreview): Promise<Product[]> {
  const text = await readFileText(file);
  console.log(`Analisando texto do arquivo ${file.name} com ${text.length} caracteres`);
  console.log(`Primeiros 200 caracteres do texto: ${text.substring(0, 200)}`);
  
  // Log para debug em caso de arquivo vazio
  if (!text || text.trim().length === 0) {
    console.error(`Arquivo ${file.name} está vazio ou inválido`);
    return [];
  }
  
  let products: Product[] = [];
  
  // 1. Tenta processar usando processadores específicos para diferentes fornecedores
  const processors = getAllProcessors();
  
  // Debug: lista todos os processadores disponíveis
  console.log(`Processadores disponíveis: ${processors.map(p => p.name).join(', ')}`);
  
  let matchingProcessor = null;
  
  for (const processor of processors) {
    try {
      const canProcess = processor.canProcess(text);
      console.log(`Processador ${processor.name}: canProcess retornou ${canProcess}`);
      
      if (canProcess) {
        console.log(`Usando processador específico para ${processor.name}`);
        matchingProcessor = processor;
        products = processor.extractProducts(text, processor.name);
        
        // Log detalhado de resultado
        console.log(`Processador ${processor.name} extraiu ${products.length} produtos`);
        
        // Se encontrou produtos, interrompe o processamento
        if (products.length > 0) {
          break;
        } else {
          console.warn(`Processador ${processor.name} não encontrou produtos, tentando próximo processador...`);
        }
      }
    } catch (error) {
      console.error(`Erro ao usar processador ${processor.name}:`, error);
    }
  }
  
  // 2. Se nenhum processador específico encontrou produtos, tenta abordagem de extração simples por regex
  if (products.length === 0) {
    console.log(`Nenhum processador específico encontrou produtos, tentando extração genérica por regex`);
    products = extractProductsByRegex(text, file.name);
    console.log(`Extraídos ${products.length} produtos do arquivo ${file.name} usando regex`);
  }
  
  // 3. Tentativa especial para formatos CSV
  if (products.length === 0 && (file.name.endsWith('.csv') || text.includes(';') || text.includes(','))) {
    console.log(`Tentando processar ${file.name} como CSV`);
    products = parseCSV(text, file.name);
    console.log(`Extraídos ${products.length} produtos via CSV de ${file.name}`);
  }
  
  // 4. Tentativa específica para Rei das Caixas se o nome do arquivo ou conteúdo indicar
  if (products.length === 0 && (
      file.name.includes('REI DAS CAIXAS') || 
      file.name.includes('👑') ||
      text.includes('REI DAS CAIXAS') || 
      (text.match(/👑/g) || []).length > 3)) {
    
    console.log(`Tentando processamento especial para Rei das Caixas`);
    
    // Força o processamento através do processador Rei das Caixas se disponível
    const reiDasCaixasProcessor = processors.find(p => p.name === 'Rei das Caixas');
    if (reiDasCaixasProcessor) {
      console.log(`Forçando uso do processador Rei das Caixas`);
      products = reiDasCaixasProcessor.extractProducts(text, 'Rei das Caixas');
      console.log(`Processamento forçado extraiu ${products.length} produtos de Rei das Caixas`);
    }
  }
  
  console.log(`Total final: ${products.length} produtos do arquivo ${file.name}`);
  
  return products;
}
