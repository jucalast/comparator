import { SupplierProcessor } from './supplierInterface';
import { JCAtacadoProcessor } from './jcAtacadoProcessor';
import { ZNCellProcessor } from './znCellProcessor';

// Registro de processadores de fornecedores
const supplierProcessors: SupplierProcessor[] = [
  new JCAtacadoProcessor(),
  new ZNCellProcessor(),
  // Adicionar novos processadores aqui
];

/**
 * Encontra o processador apropriado para o texto
 */
export function findSupplierProcessor(text: string): SupplierProcessor | null {
  for (const processor of supplierProcessors) {
    if (processor.canProcess(text)) {
      console.log(`Fornecedor detectado: ${processor.name}`);
      return processor;
    }
  }
  return null;
}

/**
 * Exporta todos os processadores para uso direto
 */
export { JCAtacadoProcessor, ZNCellProcessor };
export type { SupplierProcessor };
