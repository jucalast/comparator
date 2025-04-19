'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileWithPreview } from '../types';
import styles from '../styles/FileUploader.module.css';

interface FileUploaderProps {
  onFilesUploaded: (files: FileWithPreview[]) => void;
}

export default function FileUploader({ onFilesUploaded }: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    ) as FileWithPreview[];
    
    setFiles(prev => [...prev, ...filesWithPreview]);
    onFilesUploaded(filesWithPreview);
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.csv'],
    }
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    // Revocar URL para evitar vazamentos de memória
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  return (
    <div className={styles.container}>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Solte os arquivos aqui...</p>
        ) : (
          <p>Arraste PDFs, TXTs, ou CSVs aqui, ou clique para selecionar arquivos</p>
        )}
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          <h3>Arquivos Carregados:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={file.name + index} className={styles.fileItem}>
                <span>{file.name}</span>
                <button 
                  onClick={() => removeFile(index)}
                  className={styles.removeButton}
                  aria-label="Remover arquivo"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
