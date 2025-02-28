
/**
 * Utility functions for file validation
 */

/**
 * Validates if a file is a PDF or DOCX
 * @param file The file to validate
 * @returns Boolean indicating if the file is a valid PDF or DOCX
 */
export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

/**
 * Validates if a file is a DOCX
 * @param file The file to validate
 * @returns Boolean indicating if the file is a valid DOCX
 */
export const isDocxFile = (file: File): boolean => {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
};

/**
 * Validates if a file is an allowed document type (PDF or DOCX)
 * @param file The file to validate
 * @returns Boolean indicating if the file is a valid document type
 */
export const isAllowedFile = (file: File): boolean => {
  return isPdfFile(file) || isDocxFile(file);
};

/**
 * Gets a human-readable file size
 * @param bytes Size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};
