import { ProcessingProgress } from '../types';
import styles from '../styles/ProcessingIndicator.module.css';

interface ProcessingIndicatorProps {
  progress: ProcessingProgress;
}

export default function ProcessingIndicator({ progress }: ProcessingIndicatorProps) {
  const { filesProcessed, totalFiles, productsFound, currentFile } = progress;
  
  // Calcula a porcentagem de conclusão
  const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
  
  return (
    <div className={styles.processingContainer}>
      <div className={styles.progressInfo}>
        <div className={styles.spinner} aria-hidden="true"></div>
        
        <div className={styles.progressDetails}>
          <h3 className={styles.progressTitle}>Processando arquivos...</h3>
          
          <p className={styles.currentFile}>
            {currentFile ? currentFile : 'Inicializando...'}
          </p>
          
          <div className={styles.progressStats}>
            <div className={styles.statItem}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
              <span className={styles.statLabel}>Arquivos:</span>
              <span className={styles.statValue}>{filesProcessed}/{totalFiles}</span>
            </div>
            
            <div className={styles.statItem}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
              </svg>
              <span className={styles.statLabel}>Produtos encontrados:</span>
              <span className={styles.statValue}>{productsFound}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.progressBarContainer} role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${percentComplete}%` }}
        ></div>
        <span className={styles.progressPercentage}>{percentComplete}%</span>
      </div>
    </div>
  );
}
