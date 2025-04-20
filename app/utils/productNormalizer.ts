/**
 * Interface para detalhes padronizados de produto
 */
export interface ProductDetails {
  brand: string;           // Marca (Apple, Samsung, etc)
  model: string;           // Modelo (iPhone 11, Galaxy S20, etc)
  storage?: string;        // Armazenamento (64GB, 128GB, etc)
  color?: string;          // Cor (Preto, Branco, etc)
  condition?: string;      // Estado (Novo, Seminovo, etc)
  extra?: string;          // Informações adicionais
}

/**
 * Normaliza os detalhes do produto para facilitar comparação entre fornecedores
 */
export function normalizeProductDetails(details: ProductDetails): {
  normalizedCode: string;
  normalizedDescription: string;
} {
  // Normaliza textos (remove acentos, converte para minúsculas)
  const normalize = (text: string | undefined): string => {
    if (!text) return '';
    return text.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
  };
  
  // Pré-processamento dos valores
  const brandRaw = details.brand || 'unknown';
  const modelRaw = details.model || '';
  const storageRaw = details.storage || '';
  const colorRaw = details.color || '';
  const conditionRaw = details.condition || 'novo';
  
  // Normaliza cada componente
  let brand = normalize(brandRaw);
  
  // Normalização aprimorada do modelo
  let model = normalize(modelRaw);
  
  // Para iPhones - garante formato padronizado
  if (model.includes('iphone') || /^\d+(\s+(pro|max|plus|mini))*$/.test(model) || 
      /^(xr|xs)(\s+max)?$/.test(model)) {
    
    // Remove prefixo "iphone" se existir
    model = model.replace(/iphone\s*/i, '');
    
    // Extrai número do modelo e sufixos
    const modelMatch = model.match(/^(xr|xs|se|(\d+))(\s+(pro|max|plus|mini|ultra|air))*(\s+(max|plus|mini|ultra))*$/i);
    
    if (modelMatch) {
      // Constrói modelo normalizado garantindo espaços corretos
      model = modelMatch[1].trim();
      
      // Adiciona sufixos se existirem
      if (modelMatch[4]) {
        model += '-' + modelMatch[4].trim();
      }
      
      if (modelMatch[6]) {
        model += '-' + modelMatch[6].trim();
      }
    }
  }
  
  // Normalização aprimorada do armazenamento
  let storage = normalize(storageRaw)
    .replace(/\s+/g, '')      // Remove espaços
    .replace(/^(\d+)(gb|tb)$/i, '$1$2'); // Garante formato padronizado
  
  // Certifica que termina com GB ou TB se for um número sozinho
  if (/^\d+$/.test(storage)) {
    storage += 'gb';
  }
  
  // Normalização aprimorada de cores
  const colorMap: Record<string, string> = {
    'preto': 'black',
    'branco': 'white',
    'prata': 'silver',
    'grafite': 'black',
    'azul': 'blue',
    'vermelho': 'red',
    'verde': 'green',
    'roxo': 'purple',
    'rosa': 'pink',
    'dourado': 'gold',
    'cinza': 'gray',
    'space gray': 'gray',
    'midnight': 'black', // Considerando midnight como variação de preto
    'starlight': 'white', // Considerando starlight como variação de branco
    'natural': 'silver',
    'desert': 'gold',
  };
  
  // Normaliza as cores para um padrão único
  let color = normalize(colorRaw);
  
  // Busca correspondência no mapa de cores
  Object.entries(colorMap).forEach(([key, value]) => {
    if (color === key || color.includes(key)) {
      color = value;
    }
  });
  
  // Normaliza a condição
  let condition = normalize(conditionRaw);
  if (condition.includes('semi') || condition.includes('usado')) {
    condition = 'used';
  } else {
    condition = 'new';
  }
  
  // Cria um código padronizado que facilita a comparação
  // Formato: brand-model-storage-color-condition
  const normalizedCode = `apple-${model}-${storage}-${color}-${condition}`
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')  // Remove hífens duplicados
    .replace(/-$/g, '');  // Remove hífen no final
  
  // Cria uma descrição padronizada
  const normalizedDescription = `${details.brand} ${details.model} ${details.storage || ''} ${details.color || ''} ${details.condition || ''}`.trim();
  
  return { normalizedCode, normalizedDescription };
}

/**
 * Extrai detalhes de um iPhone a partir da descrição
 * Ex: "iPhone 13 128GB Preto" -> { brand: "Apple", model: "iPhone 13", storage: "128GB", color: "Preto" }
 */
export function extractiPhoneDetails(description: string): ProductDetails | null {
  // Padrão comum em descrições de iPhone
  const iphonePattern = /i?phone\s+(\d+(?:\s+pro(?:\s+max)?)?)\s+(\d+\s*gb)\s*(.*)/i;
  const match = description.match(iphonePattern);
  
  if (match) {
    const model = match[1].trim();
    const storage = match[2].trim();
    const rest = match[3].trim();
    
    // Tenta identificar a cor e condição
    let color = rest;
    let condition = 'Novo';
    
    // Verifica se há indicação de condição no restante do texto
    if (rest.toLowerCase().includes('seminovo') || rest.toLowerCase().includes('usado')) {
      condition = 'Seminovo';
      color = rest.replace(/seminovo|usado/i, '').trim();
    }
    
    return {
      brand: 'Apple',
      model: `iPhone ${model}`,
      storage: storage.toUpperCase(),
      color: color,
      condition: condition
    };
  }
  
  return null;
}

/**
 * Verifica se dois produtos são equivalentes (mesmo modelo, armazenamento, etc)
 */
export function areProductsEquivalent(product1: ProductDetails, product2: ProductDetails): boolean {
  const { normalizedCode: code1 } = normalizeProductDetails(product1);
  const { normalizedCode: code2 } = normalizeProductDetails(product2);
  
  return code1 === code2;
}
