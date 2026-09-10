export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfOptions {
  format?: 'A4';
  landscape?: boolean;
  margin?: PdfMargin;
  printBackground?: boolean;
}

export interface PdfGeneratorInterface {
  generate(html: string, outputPath: string, options?: PdfOptions): Promise<void>;
}
