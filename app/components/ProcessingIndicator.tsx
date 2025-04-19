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
        <div className={styles.spinner}></div>
        <div className={styles.progressDetails}>
          <p>Processando arquivos, aguarde...</p>
          <p className={styles.currentFile}>
            {currentFile ? `Arquivo atual: ${currentFile}` : 'Inicializando...'}
          </p>
          <div className={styles.progressStats}>
            <span>Arquivos: {filesProcessed}/{totalFiles}</span>
            <span>Produtos encontrados: {productsFound}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${percentComplete}%` }}
        ></div>
        <span className={styles.progressPercentage}>{percentComplete}%</span>
      </div>
    </div>
  );
}
