'use client';

import { useState, useMemo } from 'react';
import { ComparisonResult } from '../types';
import { ProductDetails } from '../utils/productNormalizer';
import styles from '../styles/ResultsTable.module.css';

interface ResultsTableProps {
  results: ComparisonResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'model' | 'storage' | 'bestPrice'>('model');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  
  // Calcula estatísticas dos resultados
  const stats = useMemo(() => {
    const totalSavings = results.reduce((sum, result) => {
      if (result.allPrices.length > 1) {
        const sorted = [...result.allPrices].sort((a, b) => a.price - b.price);
        return sum + (sorted[1].price - sorted[0].price);
      }
      return sum;
    }, 0);
    
    const uniqueProducts = results.length;
    const multipleSourceProducts = results.filter(r => r.allPrices.length > 1).length;
    
    return {
      totalSavings,
      uniqueProducts,
      multipleSourceProducts
    };
  }, [results]);
  
  // Aplica filtros e ordenação
  const filteredAndSortedResults = useMemo(() => {
    // Filtros
    let filtered = results;
    
    // Filtro por condição (novo/seminovo)
    if (filterCondition !== 'all') {
      filtered = filtered.filter(result => {
        const condition = result.details?.condition?.toLowerCase() || '';
        return condition.includes(filterCondition.toLowerCase());
      });
    }
    
    // Filtro por texto de busca
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(result => 
        result.description.toLowerCase().includes(lowercaseSearch) ||
        result.code.toLowerCase().includes(lowercaseSearch) ||
        result.bestSource.toLowerCase().includes(lowercaseSearch)
      );
    }
    
    // Ordenação com melhor tratamento de tipos de dados
    return [...filtered].sort((a, b) => {
      // Primeiro normaliza os valores a serem comparados
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortField === 'bestPrice') {
        aValue = a.bestPrice;
        bValue = b.bestPrice;
      } else if (sortField === 'storage') {
        // Extrai o valor numérico do armazenamento (ex: "128GB" -> 128)
        const getStorageSize = (result: ComparisonResult) => {
          const storage = result.details?.storage || '';
          const match = storage.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        
        aValue = getStorageSize(a);
        bValue = getStorageSize(b);
      } else { // model
        const getModelNumber = (result: ComparisonResult) => {
          const model = result.details?.model || '';
          
          // Primeiro tenta extrair números de iPhones (ex: "iPhone 13" -> 13)
          const iphoneMatch = model.match(/(\d+)/);
          if (iphoneMatch) return parseInt(iphoneMatch[1]);
          
          // Tratamento especial para modelos como XR, XS
          if (model.toLowerCase().includes('xr')) return 10.5;
          if (model.toLowerCase().includes('xs')) return 10.3;
          if (model.toLowerCase().includes('x')) return 10;
          
          return 0;
        };
        
        aValue = getModelNumber(a);
        bValue = getModelNumber(b);
      }
      
      // Aplica a direção da ordenação
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      
      // Fallback para ordenação de strings
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [results, searchTerm, sortField, sortDirection, filterCondition]);
  
  // Atualizar a função formatPrice para lidar com preços muito altos
  const formatPrice = (price: number) => {
    // Se o preço parece estar em centavos (muito alto), converte para reais
    if (price > 10000 && price % 1 === 0) {
      const adjustedPrice = price / 100;
      return `R$ ${adjustedPrice.toFixed(2).replace('.', ',')}`;
    }
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };
  
  // Calcula a economia percentual
  const calculateSavings = (prices: {source: string, price: number}[]) => {
    if (prices.length <= 1) return null;
    
    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const bestPrice = sorted[0].price;
    const secondBestPrice = sorted[1].price;
    
    const savingsAmount = secondBestPrice - bestPrice;
    const savingsPercent = (savingsAmount / secondBestPrice) * 100;
    
    return {
      amount: savingsAmount,
      percent: savingsPercent
    };
  };
  
  // Função para alternar ordenação
  const toggleSort = (field: 'model' | 'storage' | 'bestPrice') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Melhorar a exibição do modelo, extraindo informações mais precisas
  const getDisplayModel = (result: ComparisonResult): string => {
    if (!result.details) return result.description.split(' ')[0];
    
    const model = result.details.model || '';
    const description = result.description || '';
    
    // Se não temos um modelo definido, tentamos extrair da descrição
    if (!model || model === 'N/A' || model === 'undefined') {
      // Verifica se é um acessório (Cabo ou Fonte)
      if (description.toLowerCase().includes('cabo')) {
        return description.split('-')[0].trim(); // Pega a parte antes do hífen
      }
      
      if (description.toLowerCase().includes('fonte')) {
        return description.split('-')[0].trim();
      }
      
      // Verifica MacBooks e outros produtos Apple
      if (description.includes('MACBOOK') || description.includes('MacBook')) {
        const macbookMatch = description.match(/(MacBook|MACBOOK)(\s+\w+)?\s+(M\d+)/i);
        if (macbookMatch) {
          return `${macbookMatch[1]} ${macbookMatch[2] || ''} ${macbookMatch[3]}`.trim();
        }
      }
      
      // Para iPads
      if (description.includes('IPAD') || description.includes('iPad')) {
        const ipadMatch = description.match(/(iPad|IPAD)(\s+\w+)?\s+(\w+)/i);
        if (ipadMatch) {
          return `${ipadMatch[1]} ${ipadMatch[2] || ''} ${ipadMatch[3] || ''}`.trim();
        }
      }
      
      // Para AirPods
      if (description.includes('AirPods') || description.includes('AIRPODS')) {
        const airpodsMatch = description.match(/(AirPods|AIRPODS)(\s+\w+)?/i);
        if (airpodsMatch) {
          return `${airpodsMatch[1]} ${airpodsMatch[2] || ''}`.trim();
        }
      }
      
      // Para Apple Watch
      if (description.includes('Watch') || description.includes('WATCH')) {
        const watchMatch = description.match(/(Apple Watch|APPLE WATCH|Watch)(\s+\w+)?/i);
        if (watchMatch) {
          return `${watchMatch[1]} ${watchMatch[2] || ''}`.trim();
        }
      }
      
      // Se nada funcionou, usa o primeiro segmento da descrição
      return description.split(' ')[0];
    }
    
    // Para iPhones, garantir que apareça com o prefixo "iPhone"
    if (model.toLowerCase().includes('iphone') || 
        /^\d+(\s+(pro|max|plus|mini))*$/i.test(model) ||
        /^(xr|xs)(\s+max)?$/i.test(model)) {
      
      if (model.toLowerCase().startsWith('iphone')) {
        return model;
      } else {
        return `iPhone ${model}`;
      }
    }
    
    return model;
  };
  
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.statsContainer}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Produtos encontrados:</span>
            <span className={styles.statValue}>{stats.uniqueProducts}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Com múltiplos fornecedores:</span>
            <span className={styles.statValue}>{stats.multipleSourceProducts}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Economia total potencial:</span>
            <span className={styles.statValue}>{formatPrice(stats.totalSavings)}</span>
          </div>
        </div>
        
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Buscar produto, código ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filterButtons}>
            <select 
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos os produtos</option>
              <option value="novo">Apenas novos</option>
              <option value="seminovo">Apenas seminovos</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className={styles.resultsInfo}>
        Exibindo {filteredAndSortedResults.length} de {results.length} produtos
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.resultsTable}>
          <thead>
            <tr>
              <th 
                onClick={() => toggleSort('model')} 
                className={styles.sortableHeader}
                data-direction={sortField === 'model' ? sortDirection : undefined}
                aria-sort={sortField === 'model' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Modelo
              </th>
              <th 
                onClick={() => toggleSort('storage')} 
                className={styles.sortableHeader}
                data-direction={sortField === 'storage' ? sortDirection : undefined}
                aria-sort={sortField === 'storage' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Armazenamento
              </th>
              <th>
                Cor
              </th>
              <th>
                Condição
              </th>
              <th 
                onClick={() => toggleSort('bestPrice')} 
                className={styles.sortableHeader}
                data-direction={sortField === 'bestPrice' ? sortDirection : undefined}
                aria-sort={sortField === 'bestPrice' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Melhor Preço
              </th>
              <th>
                Economia
              </th>
              <th>
                Comparação
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedResults.map((result) => {
              const savings = calculateSavings(result.allPrices);
              
              // Extrai informações estruturadas se disponíveis
              const details = result.details || {} as ProductDetails;
              const model = details.model || result.description.split(' ')[0];
              const storage = details.storage || 'N/A';
              const color = details.color || 'N/A';
              const condition = details.condition || 'N/A';
              
              // Formata a condição para exibição
              const formattedCondition = (() => {
                if (!condition || condition === 'N/A') return 'N/A';
                if (condition.toLowerCase().includes('novo')) return 'Novo';
                if (condition.toLowerCase().includes('semi')) return 'Seminovo';
                if (condition.toLowerCase().includes('swap')) return 'Swap';
                if (condition.toLowerCase().includes('used')) return 'Seminovo';
                return condition;
              })();
              
              // Determina a classe de estilo para a condição
              const conditionClass = (() => {
                if (formattedCondition === 'Novo') return styles.conditionNew;
                if (formattedCondition === 'Seminovo') return styles.conditionUsed;
                if (formattedCondition === 'Swap') return styles.conditionSwap;
                return '';
              })();
              
              // Encontra o segundo melhor preço (mais caro que o melhor)
              const sortedPrices = [...result.allPrices].sort((a, b) => a.price - b.price);
              const secondBestPrice = sortedPrices.length > 1 ? sortedPrices[1] : null;
              
              return (
                <tr key={result.code} className={result.allPrices.length > 1 ? styles.multipleSourcesRow : ''}>
                  <td title={getDisplayModel(result)}>{getDisplayModel(result)}</td>
                  <td title={storage}>{storage}</td>
                  <td title={color}>{color}</td>
                  <td>
                    <span className={conditionClass} title={formattedCondition}>
                      {formattedCondition}
                    </span>
                  </td>
                  <td className={styles.priceCell}>
                    <div className={styles.bestPriceContainer}>
                      <span className={styles.priceValue}>{formatPrice(result.bestPrice)}</span>
                      <span className={styles.priceSource} title={result.bestSource}>{result.bestSource}</span>
                    </div>
                  </td>
                  <td>
                    {savings && (
                      <div className={styles.savingsContainer}>
                        <span className={styles.savingsPercent}>
                          {savings.percent.toFixed(1)}%
                        </span>
                        <span className={styles.savingsAmount}>
                          {formatPrice(savings.amount)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {secondBestPrice ? (
                      <div className={styles.comparisonContainer}>
                        <span className={styles.comparisonPrice}>{formatPrice(secondBestPrice.price)}</span>
                        <span className={styles.comparisonSource} title={secondBestPrice.source}>{secondBestPrice.source}</span>
                      </div>
                    ) : (
                      <span className={styles.singlePrice}>Único fornecedor</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredAndSortedResults.length === 0 && (
        <div className={styles.noResults}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.iconLg}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3>Nenhum produto encontrado</h3>
          <p>Tente alterar os filtros ou critérios de busca.</p>
        </div>
      )}
    </div>
  );
}
