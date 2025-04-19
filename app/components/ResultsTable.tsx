'use client';

import { useMemo, useState } from 'react';
import { ComparisonResult } from '../types';
import styles from '../styles/ResultsTable.module.css';

interface ResultsTableProps {
  results: ComparisonResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'code' | 'description' | 'bestPrice'>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const sortedAndFilteredResults = useMemo(() => {
    // Primeiro filtramos
    const filtered = results.filter(result => 
      result.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Depois ordenamos
    return [...filtered].sort((a, b) => {
      if (sortField === 'bestPrice') {
        return sortDirection === 'asc' 
          ? a.bestPrice - b.bestPrice 
          : b.bestPrice - a.bestPrice;
      }
      
      // Para campos de texto
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [results, searchTerm, sortField, sortDirection]);
  
  const handleSort = (field: 'code' | 'description' | 'bestPrice') => {
    if (field === sortField) {
      // Se já estamos ordenando por este campo, invertemos a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Caso contrário, mudamos o campo e voltamos para ordenação ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Formata preço para exibição
  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };
  
  // Calcula a economia percentual
  const calculateSavings = (prices: {source: string, price: number}[]) => {
    if (prices.length <= 1) return null;
    
    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const bestPrice = sorted[0].price;
    const secondBestPrice = sorted[1].price;
    
    const savingsPercent = ((secondBestPrice - bestPrice) / secondBestPrice) * 100;
    return savingsPercent;
  };
  
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <input
          type="text"
          placeholder="Buscar por código ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        
        <div className={styles.resultsCount}>
          Exibindo {sortedAndFilteredResults.length} de {results.length} produtos
        </div>
      </div>
      
      <table className={styles.resultsTable}>
        <thead>
          <tr>
            <th onClick={() => handleSort('code')} className={styles.sortableHeader}>
              Código {sortField === 'code' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('description')} className={styles.sortableHeader}>
              Descrição {sortField === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('bestPrice')} className={styles.sortableHeader}>
              Melhor Preço {sortField === 'bestPrice' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th>Fornecedor</th>
            <th>Economia</th>
            <th>Comparação</th>
          </tr>
        </thead>
        <tbody>
          {sortedAndFilteredResults.map((result) => {
            const savings = calculateSavings(result.allPrices);
            
            return (
              <tr key={result.code}>
                <td>{result.code}</td>
                <td>{result.description}</td>
                <td className={styles.priceCell}>{formatPrice(result.bestPrice)}</td>
                <td>{result.bestSource}</td>
                <td>
                  {savings !== null && (
                    <span className={styles.savings}>
                      {savings.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td>
                  <details className={styles.priceDetails}>
                    <summary>Ver preços ({result.allPrices.length})</summary>
                    <ul className={styles.pricesList}>
                      {result.allPrices
                        .sort((a, b) => a.price - b.price)
                        .map((priceInfo, idx) => (
                          <li key={idx} className={
                            priceInfo.price === result.bestPrice 
                              ? styles.bestPrice 
                              : ''
                          }>
                            <span className={styles.priceSource}>{priceInfo.source}:</span> 
                            <span className={styles.priceValue}>{formatPrice(priceInfo.price)}</span>
                          </li>
                        ))
                      }
                    </ul>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
