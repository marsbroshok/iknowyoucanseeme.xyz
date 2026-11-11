import fs from 'fs';
import yaml from 'yaml';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export const CatalogueConfigSchema = z.object({
  works: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title_fr: z.string(),
    zone: z.enum(['arrival', 'lens', 'leak']),
    size: z.object({ w: z.number(), h: z.number() }).optional(),
    pdf_index: z.number()
  }))
});

export type CatalogueWork = z.infer<typeof CatalogueConfigSchema>['works'][number];

/**
 * readCatalogue
 */
export function readCatalogue(yamlPath: string): CatalogueWork[] {
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Catalogue config not found at ${yamlPath}`);
  }
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.parse(content);
  
  const result = CatalogueConfigSchema.parse(parsed);
  return result.works;
}

/**
 * PdfThumbnailExtractor
 */
export class PdfThumbnailExtractor {
  constructor(private execFn: (cmd: string) => Promise<{ stdout: string; stderr: string }> = execAsync) {}

  async extract(pdfPath: string, outputDir: string): Promise<void> {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF not found: ${pdfPath}`);
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      await this.execFn(`pdfimages -j "${pdfPath}" "${outputDir}/img"`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('command not found')) {
        throw new Error('Prerequisite pdfimages is not installed. Please install poppler.');
      }
      throw new Error(`Failed to extract images from PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
