import Papa from 'papaparse';
import { Product } from '../types';
import { findSupplierProcessor } from '../suppliers';

// Expressão regular mais flexível para capturar diferentes formatos de produtos
const PRODUCT_REGEX = /(\d{5,6}-\d+)\s+(.+?)\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?:R\$)?/gm;

/**
 * Extrai produtos de um texto usando regex
 */
export const extractProductsWithRegex = (text: string, source: string): Product[] => {
  console.log(`Analisando texto do arquivo ${source} com ${text.length} caracteres`);
  console.log('Primeiros 200 caracteres do texto:', text.substring(0, 200));
  
  // Usar expressão mais flexível com grupos de captura
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
  
  console.log(`Extraídos ${products.length} produtos do arquivo ${source} usando regex`);
  return products;
};

/**
 * Processa arquivo de texto (TXT/CSV)
 */
export const processTextFile = async (file: File): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        console.log(`Arquivo ${file.name} carregado: ${text.length} caracteres`);
        
        let products: Product[] = [];
        
        // Tenta processar usando processadores específicos de fornecedores
        const supplierProcessor = findSupplierProcessor(text);
        if (supplierProcessor) {
          console.log(`Processando arquivo usando ${supplierProcessor.name}`);
          products = supplierProcessor.extractProducts(text, file.name);
          
          if (products.length > 0) {
            console.log(`Extraídos ${products.length} produtos via processador específico`);
            resolve(products);
            return;
          }
        }
        
        // Se não conseguiu extrair por outros métodos, tenta CSV ou regex
        const isCSV = text.includes(',') || text.includes(';');
        
        // Se parece CSV, tenta processar como CSV primeiro
        if (isCSV) {
          try {
            Papa.parse(text, {
              delimiter: text.includes(';') ? ';' : ',', // Auto-detecta o delimitador
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                console.log(`CSV parsed, ${results.data.length} linhas encontradas`);
                console.log('Exemplo de linha:', results.data[0]);
                
                const csvProducts = results.data
                  .filter((row: any) => {
                    // Verifica se existe algum campo que pode ser um código
                    const hasCode = row.code || row.codigo || row.cod || 
                                   Object.values(row).some(val => 
                                     typeof val === 'string' && /^\d{5,6}-\d+$/.test(val.toString().trim())
                                   );
                    
                    // Verifica se existe algum campo que pode ser um preço
                    const hasPrice = row.price || row.preco || row.valor || 
                                    Object.values(row).some(val => 
                                      typeof val === 'string' && 
                                      /^\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*$/.test(val.toString().trim())
                                    );
                    
                    return hasCode && hasPrice;
                  })
                  .map((row: any) => {
                    try {
                      // Tenta identificar campos por nome ou padrão
                      

                      // Identificação do código
                      let code = row.code || row.codigo || row.cod;
                      if (!code) {
                        // Procura em todas as colunas por um padrão de código
                        for (const key in row) {
                          if (/^\d{5,6}-\d+$/.test(row[key].toString().trim())) {
                            code = row[key].toString().trim();
                            break;
                          }
                        }
                      }
                      
                      // Identificação da descrição
                      let description = row.description || row.descricao || row.desc || row.nome || row.produto;
                      if (!description) {
                        // Usa a primeira coluna que não é código nem preço como descrição
                        for (const key in row) {
                          const val = row[key].toString().trim();
                          if (val && val !== code && !/^\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*$/.test(val)) {
                            description = val;
                            break;
                          }
                        }
                      }
                      
                      // Identificação do preço
                      let priceStr = row.price || row.preco || row.valor;
                      if (!priceStr) {
                        // Procura em todas as colunas por um padrão de preço
                        for (const key in row) {
                          const val = row[key].toString().trim();
                          if (/^\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*$/.test(val)) {
                            priceStr = val;
                            break;
                          }
                        }
                      }
                      
                      // Normalização do preço
                      let normalizedPrice = priceStr.toString()
                                              .replace(/[^\d,\.]/g, '') // Remove tudo exceto números, vírgulas e pontos
                                              .replace(/\./g, '')       // Remove pontos
                                              .replace(',', '.');       // Substitui vírgula por ponto
                      

                      const price = parseFloat(normalizedPrice);
                      
                      if (code && description && !isNaN(price) && price > 0) {
                        return {
                          code,
                          description,
                          price,
                          source: file.name
                        };
                      }
                      return null;
                    } catch (error) {
                      console.error('Erro ao processar linha CSV:', row, error);
                      return null;
                    }
                  })
                  .filter((p): p is Product => p !== null);
                
                console.log(`Extraídos ${csvProducts.length} produtos via CSV de ${file.name}`);
                products = [...csvProducts];
              },
              error: (error: Error) => {
                console.error('Erro ao processar CSV:', error);
              }
            });
          } catch (csvError) {
            console.error('Falha ao processar como CSV, tentando regex:', csvError);
          }
        }
        
        // Se não conseguiu extrair por outros métodos, usa regex
        if (products.length === 0) {
          products = extractProductsWithRegex(text, file.name);
        }
        
        // Filtra produtos inválidos
        products = products.filter(p => p.price > 0 && !isNaN(p.price));
        
        console.log(`Total final: ${products.length} produtos do arquivo ${file.name}`);
        resolve(products);
      } catch (error) {
        console.error('Erro geral ao processar arquivo de texto:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Erro ao ler o arquivo ${file.name}`));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Compara produtos e retorna os melhores preços
 */
export const compareProducts = (allProducts: Product[]): Record<string, Product> => {
  const bestPrices: Record<string, Product> = {};

  allProducts.forEach(product => {
    if (!bestPrices[product.code] || product.price < bestPrices[product.code].price) {
      bestPrices[product.code] = product;
    }
  });

  return bestPrices;
};
