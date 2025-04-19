/**
 * Interface para detalhes padronizados de produto
 */
export interface ProductDetails {
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  condition?: string;
  extra?: string;
}

/**
 * Normaliza os detalhes do produto para facilitar comparação entre fornecedores
 */
export function normalizeProductDetails(details: ProductDetails): {
  normalizedCode: string;
  normalizedDescription: string;
} {
  // Normaliza textos (remove acentos, converte para minúsculas)
  const normalize = (text: string) => 
    text.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
  
  // Normaliza cada componente
  const brand = normalize(details.brand);
  const model = normalize(details.model).replace(/iphone/i, '').trim();
  const storage = details.storage ? normalize(details.storage) : '';
  const color = details.color ? normalize(details.color) : '';
  const condition = details.condition ? normalize(details.condition) : 'novo';
  
  // Cria um código padronizado que facilita a comparação
  const normalizedCode = `${brand}-${model}-${storage}-${color}-${condition}`
    .replace(/\s+/g, '-');
  
  // Cria uma descrição padronizada
  const normalizedDescription = `${details.brand} ${details.model} ${details.storage || ''} ${details.color || ''} ${details.condition || ''}`.trim();
  
  return { normalizedCode, normalizedDescription };
}

/**
 * Verifica se dois produtos são equivalentes (mesmo modelo, armazenamento, etc)
 */
export function areProductsEquivalent(product1: ProductDetails, product2: ProductDetails): boolean {
  const { normalizedCode: code1 } = normalizeProductDetails(product1);
  const { normalizedCode: code2 } = normalizeProductDetails(product2);
  
  return code1 === code2;
}
