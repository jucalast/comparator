'use client';

import { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import ResultsTable from './components/ResultsTable';
import ProcessingIndicator from './components/ProcessingIndicator';
import { ComparisonResult, FileWithPreview, Product, ProcessingProgress } from './types';
import { processTextFile } from './utils/fileProcessor';
import { extractProductsWithRegex, extractTextFromPDF } from './utils/pdfProcessor';
import styles from './styles/Home.module.css';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    filesProcessed: 0,
    totalFiles: 0,
    productsFound: 0
  });
  
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
    setIsProcessing(true);
    setError(null);
    setResults([]);
    
    // Inicializa o progresso
    setProgress({
      filesProcessed: 0,
      totalFiles: files.length,
      productsFound: 0
    });
    
    console.log(`Iniciando processamento de ${files.length} arquivos`);
    
    try {
      const processingErrors: string[] = [];
      
      // Processar cada arquivo sequencialmente, atualizando os resultados em tempo real
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(prev => ({
          ...prev,
          currentFile: file.name
        }));
        
        console.log(`Processando arquivo: ${file.name} (${file.size} bytes, tipo: ${file.type})`);
        
        try {
          let products: Product[] = [];
          
          if (file.name.toLowerCase().endsWith('.pdf')) {
            // Processar arquivo PDF
            console.log(`Extraindo texto de PDF: ${file.name}`);
            const text = await extractTextFromPDF(file);
            products = extractProductsWithRegex(text, file.name);
          } else if (
            file.name.toLowerCase().endsWith('.txt') || 
            file.name.toLowerCase().endsWith('.csv')
          ) {
            // Processar arquivo TXT/CSV
            console.log(`Processando arquivo de texto: ${file.name}`);
            products = await processTextFile(file);
          } else {
            console.warn(`Tipo de arquivo não suportado: ${file.name}`);
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
            // Atualiza os resultados com os novos produtos imediatamente
            updateResultsWithProducts(products);
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
        <h1 className={styles.title}>Comparador de Preços</h1>
        
        <p className={styles.description}>
          Faça upload de tabelas de preços em PDF ou TXT/CSV para comparar e encontrar os melhores preços para cada produto.
        </p>
        
        <div className={styles.formatInfo}>
          <details>
            <summary>📋 Formatos de arquivo suportados</summary>
            <div className={styles.formatDetails}>
              <p><strong>PDFs:</strong> O sistema busca por linhas no formato "12345-67 DESCRIÇÃO DO PRODUTO 123,45R$".</p>
              <p><strong>Listas de Preços em TXT:</strong> O sistema reconhece formatos específicos de fornecedores:</p>
              <ul>
                <li><strong>ZN CELL:</strong> Lista com emojis de cores e preços</li>
                <li><strong>JC Atacado:</strong> Lista com símbolos "➖" e "➡" para modelos e cores</li>
                <li><strong>Genérico:</strong> Qualquer lista com produto, preço em formato "R$ XX,XX"</li>
              </ul>
              <p><strong>CSV/TXT:</strong> Arquivos com colunas que contenham código, descrição e preço do produto.</p>
            </div>
          </details>
        </div>
        
        <FileUploader onFilesUploaded={processFiles} />
        
        {isProcessing && (
          <ProcessingIndicator progress={progress} />
        )}
        
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}
        
        {results.length > 0 && (
          <div className={styles.results}>
            <h2>Resultados da Comparação {isProcessing ? '(Atualizando em tempo real)' : ''}</h2>
            <ResultsTable results={results} />
            
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
                }}
                className={styles.exportButton}
              >
                Exportar Resultados (CSV)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
