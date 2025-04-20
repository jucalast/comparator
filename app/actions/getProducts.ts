'use server';

import { prisma } from '@/app/lib/prisma';

/**
 * Busca produtos do banco de dados com seus respectivos preços
 */
export async function getProductsWithPrices() {
  try {
    const products = await prisma.product.findMany({
      include: {
        prices: {
          include: {
            supplier: true
          }
        }
      }
    });
    
    // Transforma os dados no formato esperado pela aplicação
    const formattedResults = products.map((product: {
      code: string;
      description: string;
      brand: string;
      model: string;
      storage: string | null;
      color: string | null;
      condition: string | null;
      extra: string | null;
      prices: {
        price: number;
        supplier: {
          name: string;
        };
      }[];
    }) => {
      // Organiza os preços por fornecedor
      const allPrices = product.prices.map(price => ({
        source: price.supplier.name,
        price: price.price
      }));
      
      // Ordena preços do menor para o maior
      allPrices.sort((a, b) => a.price - b.price);
      
      // Dados do melhor preço
      const bestPrice = allPrices.length > 0 ? allPrices[0].price : 0;
      const bestSource = allPrices.length > 0 ? allPrices[0].source : '';
      
      return {
        code: product.code,
        description: product.description,
        bestPrice,
        bestSource,
        allPrices,
        details: {
          brand: product.brand,
          model: product.model,
          storage: product.storage || undefined,
          color: product.color || undefined,
          condition: product.condition || undefined,
          extra: product.extra || undefined
        }
      };
    });
    
    return { 
      success: true, 
      results: formattedResults
    };
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return { 
      success: false, 
      message: `Erro ao buscar produtos: ${(error as Error).message}`,
      results: []
    };
  }
}
