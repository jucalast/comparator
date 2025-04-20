'use server';

import { prisma } from '@/app/lib/prisma';
import { Product } from '@/app/types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Divide um array em lotes de tamanho especificado
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Função de espera com tempo especificado
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Tenta executar uma função com retentativas em caso de erro
 */
async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  delay = 500
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`);
      await sleep(delay);
      // Aumenta o tempo de espera exponencialmente
      delay *= 2;
    }
  }

  throw lastError;
}

/**
 * Processa um único produto de forma independente
 */
async function processProduct(product: Product): Promise<{
  id: string;
  code: string;
  description: string;
}> {
  return await withRetry(async () => {
    try {
      // Busca o fornecedor pelo nome, cria se não existir
      let supplier = await prisma.supplier.findUnique({
        where: { name: product.source }
      });
      
      if (!supplier) {
        try {
          supplier = await prisma.supplier.create({
            data: {
              name: product.source,
              description: `Fornecedor ${product.source}`
            }
          });
          console.log(`Criado novo fornecedor: ${supplier.name}`);
        } catch (error) {
          // Se ocorrer erro ao criar (possível concorrência), tenta buscar novamente
          if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            supplier = await prisma.supplier.findUnique({
              where: { name: product.source }
            });
            if (!supplier) {
              throw new Error(`Não foi possível criar ou encontrar o fornecedor: ${product.source}`);
            }
          } else {
            throw error;
          }
        }
      }
      
      // Extrai os detalhes do produto
      const details = product.details || {
        brand: 'Desconhecido',
        model: product.description,
        storage: null,
        color: null,
        condition: 'Novo',
        extra: null
      };
      
      // Verifica se o produto já existe pelo código
      let existingProduct = await prisma.product.findUnique({
        where: { code: product.code }
      });
      
      // Se o produto não existe, cria
      if (!existingProduct) {
        try {
          // Tenta criar o produto e o preço inicial em uma única transação
          existingProduct = await prisma.$transaction(async (tx) => {
            try {
              const newProduct = await tx.product.create({
                data: {
                  code: product.code,
                  description: product.description,
                  brand: details.brand,
                  model: details.model,
                  storage: details.storage || null,
                  color: details.color || null,
                  condition: details.condition || 'Novo',
                  extra: details.extra || null,
                }
              });
  
              await tx.price.create({
                data: {
                  price: product.price,
                  product: { connect: { id: newProduct.id } },
                  supplier: { connect: { id: supplier!.id } }
                }
              });
  
              return newProduct;
            } catch (txError) {
              // Se ocorrer erro na transação, propaga para ser tratado
              throw txError;
            }
          });
          
          console.log(`Criado novo produto: ${existingProduct.code} - ${existingProduct.description}`);
        } catch (createError) {
          // Se ocorrer erro por unicidade (outro processo criou o produto), tenta buscar o produto
          if (createError instanceof PrismaClientKnownRequestError && createError.code === 'P2002') {
            existingProduct = await prisma.product.findUnique({
              where: { code: product.code }
            });
            
            if (!existingProduct) {
              throw new Error(`Falha ao criar produto ${product.code} e não foi possível encontrá-lo`);
            }
          } else {
            throw createError;
          }
        }
      } else {
        // Verifica se é necessário atualizar o produto existente
        const needsUpdate = existingProduct.description !== product.description ||
                           existingProduct.brand !== details.brand ||
                           existingProduct.model !== details.model ||
                           existingProduct.storage !== (details.storage || null) ||
                           existingProduct.color !== (details.color || null) ||
                           existingProduct.condition !== (details.condition || 'Novo') ||
                           existingProduct.extra !== (details.extra || null);
        
        // Atualiza o produto se necessário
        if (needsUpdate) {
          existingProduct = await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              description: product.description,
              brand: details.brand,
              model: details.model,
              storage: details.storage || null, 
              color: details.color || null,
              condition: details.condition || 'Novo',
              extra: details.extra || null,
            }
          });
          console.log(`Atualizado produto: ${existingProduct.code}`);
        }
      }
      
      // Gerencia o preço em uma operação separada, para evitar problemas de transação
      try {
        // Busca se já existe um preço para este produto/fornecedor
        const existingPrice = await prisma.price.findUnique({
          where: {
            productId_supplierId: {
              productId: existingProduct!.id,
              supplierId: supplier!.id
            }
          }
        });
        
        // Se o preço existe, atualiza. Senão, cria
        if (existingPrice) {
          // Só atualiza se o preço mudou
          if (existingPrice.price !== product.price) {
            await prisma.price.update({
              where: { id: existingPrice.id },
              data: { price: product.price }
            });
            console.log(`Atualizado preço do produto ${existingProduct!.code} para R$ ${product.price}`);
          }
        } else {
          await prisma.price.create({
            data: {
              price: product.price,
              product: { connect: { id: existingProduct!.id } },
              supplier: { connect: { id: supplier!.id } }
            }
          });
          console.log(`Criado novo ponto de preço para ${existingProduct!.code}: R$ ${product.price}`);
        }
      } catch (priceError) {
        console.error(`Erro ao gerenciar preço para ${product.code}: ${priceError}`);
        // Não interrompe o processamento por erro no preço, produto já está salvo/atualizado
      }
      
      return {
        id: existingProduct!.id,
        code: existingProduct!.code,
        description: existingProduct!.description
      };
    } catch (error) {
      console.error(`Erro no processamento do produto ${product.code}: ${error}`);
      throw error; // Propaga o erro para a função de retry
    }
  }, 5, 1000); // Aumenta o número de tentativas e o tempo inicial de espera
}

/**
 * Salva produtos no banco de dados
 * - Cria novos produtos se não existirem
 * - Atualiza produtos existentes
 * - Cria/atualiza pontos de preço
 * - Processa utilizando lotes e processamento concorrente limitado
 */
export async function saveProducts(products: Product[]) {
  try {
    console.log(`Processando ${products.length} produtos para salvar no banco de dados`);
    
    // Divide os produtos em lotes para evitar sobrecarga de memória
    const BATCH_SIZE = 10; // Lotes menores para processamento mais seguro
    const CONCURRENT_OPERATIONS = 3; // Limita operações concorrentes
    const batches = chunkArray(products, BATCH_SIZE);
    
    const allResults = [];
    
    // Processa cada lote sequencialmente, mas com processamento paralelo interno limitado
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processando lote ${i + 1}/${batches.length} (${batch.length} produtos)`);
      
      // Processa produtos do lote em paralelo, com limite de concorrência
      const batchPromises = [];
      for (let j = 0; j < batch.length; j += CONCURRENT_OPERATIONS) {
        const chunk = batch.slice(j, j + CONCURRENT_OPERATIONS);
        const chunkPromises = chunk.map(product => 
          processProduct(product)
            .catch(error => {
              console.error(`Erro ao processar produto ${product.code}:`, error);
              return null;
            })
        );
        
        // Aguarda este pequeno grupo de operações paralelas terminar
        const results = await Promise.all(chunkPromises);
        batchPromises.push(...results.filter(Boolean)); // Filtra resultados nulos
        
        // Pequena pausa entre chunks para evitar sobrecarga
        await sleep(100);
      }
      
      allResults.push(...batchPromises);
      
      // Pausa entre lotes para liberar recursos
      if (i < batches.length - 1) {
        await sleep(500);
      }
    }
    
    return { 
      success: true, 
      message: `${allResults.length} produtos processados com sucesso`, 
      products: allResults 
    };
  } catch (error) {
    console.error('Erro ao salvar produtos:', error);
    return { 
      success: false, 
      message: `Erro ao salvar produtos: ${(error as Error).message}` 
    };
  }
}
