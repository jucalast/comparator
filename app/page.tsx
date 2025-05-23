'use client';

import { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import ResultsTable from './components/ResultsTable';
import ProcessingIndicator from './components/ProcessingIndicator';
import { ComparisonResult, FileWithPreview, Product, ProcessingProgress } from './types';
import { processTextFile } from './utils/fileProcessor';
import { saveProducts } from './actions/saveProducts';
import { getProductsWithPrices } from './actions/getProducts';
import styles from './styles/Home.module.css';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ProcessingProgress>({
    filesProcessed: 0,
    totalFiles: 0,
    productsFound: 0
  });
  
  // Carregar produtos do banco de dados ao iniciar
  useEffect(() => {
    async function loadProductsFromDB() {
      try {
        setIsLoading(true);
        const response = await getProductsWithPrices();
        if (response.success && response.results.length > 0) {
          setResults(response.results);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do banco:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProductsFromDB();
  }, []);
  
  // Atualizar resultados quando novos produtos são encontrados
  const updateResultsWithProducts = (newProducts: Product[]) => {
    setResults(prevResults => {
      // Cria uma cópia profunda dos resultados anteriores
      const productMap = new Map<string, ComparisonResult>();
      
      // Adiciona os resultados existentes ao mapa
      prevResults.forEach(result => {
        productMap.set(result.code, result);
      });
      
      // Processa novos produtos
      newProducts.forEach(product => {
        const normalizedCode = product.code;
        
        if (productMap.has(normalizedCode)) {
          // Produto já existe, atualiza preços
          const existingResult = productMap.get(normalizedCode)!;
          
          // Adiciona o novo preço à lista de preços
          const hasSource = existingResult.allPrices.some(p => p.source === product.source);
          if (!hasSource) {
            existingResult.allPrices.push({
              source: product.source,
              price: product.price
            });
            
            // Reordena os preços
            existingResult.allPrices.sort((a, b) => a.price - b.price);
            
            // Atualiza melhor preço se necessário
            if (product.price < existingResult.bestPrice) {
              existingResult.bestPrice = product.price;
              existingResult.bestSource = product.source;
            }
          }
        } else {
          // Novo produto, cria um novo resultado
          productMap.set(normalizedCode, {
            code: product.code,
            description: product.description,
            bestPrice: product.price,
            bestSource: product.source,
            allPrices: [{
              source: product.source,
              price: product.price
            }],
            details: product.details
          });
        }
      });
      
      // Converte o mapa de volta para array e ordena
      return Array.from(productMap.values())
        .sort((a, b) => a.code.localeCompare(b.code));
    });
  };

  const processFiles = async (files: FileWithPreview[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    // Inicializa o progresso
    setProgress({
      filesProcessed: 0,
      totalFiles: files.length,
      productsFound: 0
    });
    
    console.log(`Iniciando processamento de ${files.length} arquivos`);
    
    try {
      const processingErrors: string[] = [];
      
      // Processar cada arquivo sequencialmente
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(prev => ({
          ...prev,
          currentFile: file.name
        }));
        
        try {
          let products: Product[] = [];
          
          if (file.name.toLowerCase().endsWith('.txt') || 
            file.name.toLowerCase().endsWith('.csv')) {
            products = await processTextFile(file);
          } else {
            processingErrors.push(`Tipo de arquivo não suportado: ${file.name}`);
            continue;
          }
          
          // Atualiza o progresso
          setProgress(prev => ({
            ...prev,
            filesProcessed: prev.filesProcessed + 1,
            productsFound: prev.productsFound + products.length
          }));
          
          if (products.length === 0) {
            processingErrors.push(`Nenhum produto encontrado em: ${file.name}`);
          } else {
            updateResultsWithProducts(products);
            
            // Salva produtos no banco de dados
            try {
              await saveProducts(products);
            } catch (dbError) {
              console.error('Erro ao salvar no banco de dados:', dbError);
              processingErrors.push(`Erro ao salvar dados no banco: ${file.name}`);
            }
          }
          
        } catch (fileError) {
          console.error(`Erro ao processar arquivo ${file.name}:`, fileError);
          processingErrors.push(`Erro ao processar: ${file.name}`);
        }
      }
      
      // Mostra erros se houver
      if (processingErrors.length > 0) {
        setError(`Alguns arquivos não puderam ser processados corretamente: ${processingErrors.join(', ')}`);
      }
      
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setError('Ocorreu um erro ao processar os arquivos. Verifique se os formatos estão corretos.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Sidebar com informações fixas */}
        <aside className={styles.sidebar}>
          <div className={styles.logoArea}>
            <div className={styles.logo}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
              </svg>
              Comparador de Preços
            </div>
          </div>
          
          <header className={styles.header}>
            <h1 className={styles.title}>Análise de Preços</h1>
            
            <p className={styles.description}>
              Faça upload de tabelas de preços em TXT/CSV para encontrar os melhores preços para cada produto.
            </p>
          </header>
          
          <FileUploader onFilesUploaded={processFiles} />
          
          <div className={styles.processingWrapper}>
            {isProcessing && (
              <ProcessingIndicator progress={progress} />
            )}
            
            {error && (
              <div className={styles.error} role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.iconSm}>
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            )}
          </div>
        </aside>
        
        {/* Área principal com a tabela de resultados */}
        <section className={styles.contentArea}>
          {results.length > 0 && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                <h2>
                  Resultados da Comparação 
                  {isProcessing && <span>Atualizando...</span>}
                </h2>
                
                <div className={styles.exportOptions}>
                  <button
                    onClick={() => {
                      const csv = [
                        ['Código', 'Descrição', 'Melhor Preço', 'Fonte'],
                        ...results.map(r => [r.code, r.description, r.bestPrice.toFixed(2).replace('.', ','), r.bestSource])
                      ].map(row => row.join(';')).join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', 'comparacao-precos.csv');
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className={styles.exportButton}
                    aria-label="Exportar resultados para CSV"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.iconSm}>
                      <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                    </svg>
                    Exportar CSV
                  </button>
                </div>
              </div>
              
              <ResultsTable results={results} />
            </div>
          )}
          
          {!results.length && !isProcessing && (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.iconXl}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <h3>Nenhum resultado para exibir</h3>
              <p>Faça o upload de arquivos para ver os resultados da comparação.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
