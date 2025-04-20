import { SupplierProcessor } from './supplierInterface';
import { JCAtacadoProcessor } from './jcAtacadoProcessor';
import { ZNCellProcessor } from './znCellProcessor';
import { MadeInStoreProcessor } from './madeInStoreProcessor';
import { ReiDasCaixasProcessor } from './reiDasCaixasProcessor';

/**
 * Centraliza o registro de todos os processadores de fornecedores
 */
export function getAllProcessors(): SupplierProcessor[] {
  // Instancia e retorna todos os processadores disponíveis
  return [
    new JCAtacadoProcessor(),
    new ZNCellProcessor(),
    new MadeInStoreProcessor(),
    new ReiDasCaixasProcessor()
  ];
}
