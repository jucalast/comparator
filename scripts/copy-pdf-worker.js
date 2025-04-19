const fs = require('fs');
const path = require('path');

// Define source and destination paths
const sourceDir = path.join(__dirname, '../node_modules/pdfjs-dist/build');
const destDir = path.join(__dirname, '../public');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the file
const workerFiles = ['pdf.worker.min.js', 'pdf.worker.js'].filter(
  file => fs.existsSync(path.join(sourceDir, file))
);

if (workerFiles.length === 0) {
  console.error('PDF.js worker files not found in node_modules!');
  process.exit(1);
}

// Copy the first available worker file
const workerFile = workerFiles[0];
fs.copyFileSync(
  path.join(sourceDir, workerFile),
  path.join(destDir, 'pdf.worker.min.js')
);

console.log('PDF.js worker file copied successfully to public folder');
