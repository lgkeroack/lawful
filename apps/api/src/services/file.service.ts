import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client } from '../config/s3.js';
import { env } from '../config/env.js';
import { FileTypeError, FileSizeError, InternalError } from '../lib/errors.js';
import { createModuleLogger } from '../lib/logger.js';

const logger = createModuleLogger('file.service');

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'application/rtf': 'rtf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_MIME_TYPES));

export class FileService {
  /**
   * Validates a file's type using magic byte detection.
   * Returns the detected MIME type and extension.
   */
  async validateFileType(
    buffer: Buffer,
    originalFilename: string,
  ): Promise<{ mimeType: string; extension: string }> {
    // Detect file type from magic bytes
    const detected = await fileTypeFromBuffer(buffer);

    if (detected) {
      const ext = ALLOWED_MIME_TYPES[detected.mime];
      if (!ext) {
        throw new FileTypeError(
          `File type "${detected.mime}" is not supported. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        );
      }
      return { mimeType: detected.mime, extension: ext };
    }

    // Fall back to extension check for text-based files (no reliable magic bytes)
    const fileExt = path.extname(originalFilename).toLowerCase().replace('.', '');
    if (fileExt === 'txt') {
      return { mimeType: 'text/plain', extension: 'txt' };
    }
    if (fileExt === 'csv') {
      return { mimeType: 'text/csv', extension: 'csv' };
    }

    throw new FileTypeError(
      `Unable to determine file type. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    );
  }

  /**
   * Sanitizes a filename by stripping path traversal characters,
   * control characters, and truncating to a safe length.
   */
  sanitizeFilename(filename: string): string {
    // Strip path components
    let sanitized = path.basename(filename);

    // Remove control characters and null bytes
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    // Remove path traversal sequences
    sanitized = sanitized.replace(/\.\./g, '');

    // Replace any remaining unsafe characters
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_');

    // Collapse multiple underscores/spaces
    sanitized = sanitized.replace(/_{2,}/g, '_').replace(/\s+/g, ' ').trim();

    // Truncate to 200 characters (leaving room for extension)
    if (sanitized.length > 200) {
      const ext = path.extname(sanitized);
      const baseName = path.basename(sanitized, ext);
      sanitized = baseName.slice(0, 200 - ext.length) + ext;
    }

    // If empty after sanitization, use a default
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      sanitized = 'unnamed_file';
    }

    return sanitized;
  }

  /**
   * Extracts text content from a PDF buffer using pdf-parse.
   */
  async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import for pdf-parse (CommonJS module)
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      return result.text || '';
    } catch (err) {
      logger.warn({
        message: 'Failed to extract PDF text',
        error: err instanceof Error ? err.message : String(err),
      });
      return '';
    }
  }

  /**
   * Uploads a file buffer to S3/MinIO.
   */
  async streamToS3(
    fileKey: string,
    buffer: Buffer,
    mimeType: string,
    originalFilename: string,
  ): Promise<void> {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: env.S3_BUCKET,
          Key: fileKey,
          Body: buffer,
          ContentType: mimeType,
          Metadata: {
            'original-filename': encodeURIComponent(originalFilename),
          },
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024, // 5 MB
      });

      await upload.done();
      logger.info({ message: 'File uploaded to S3', fileKey, mimeType });
    } catch (err) {
      logger.error({
        message: 'Failed to upload file to S3',
        fileKey,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new InternalError('Failed to upload file to storage');
    }
  }

  /**
   * Deletes a file from S3/MinIO.
   */
  async deleteFromS3(fileKey: string): Promise<void> {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: fileKey,
        }),
      );
      logger.info({ message: 'File deleted from S3', fileKey });
    } catch (err) {
      logger.error({
        message: 'Failed to delete file from S3',
        fileKey,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new InternalError('Failed to delete file from storage');
    }
  }

  /**
   * Generates a UUID-based S3 key for a file upload.
   * Format: uploads/{userId}/{uuid}.{ext}
   */
  generateFileKey(userId: string, extension: string): string {
    const uuid = randomUUID();
    return `uploads/${userId}/${uuid}.${extension}`;
  }

  /**
   * Retrieves a file from S3 and returns a readable stream along with metadata.
   */
  async getFileStream(
    fileKey: string,
  ): Promise<{ stream: Readable; contentType: string; contentLength: number }> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: fileKey,
        }),
      );

      if (!response.Body) {
        throw new InternalError('Empty response from storage');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch (err) {
      if (err instanceof InternalError) throw err;
      logger.error({
        message: 'Failed to retrieve file from S3',
        fileKey,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new InternalError('Failed to retrieve file from storage');
    }
  }
}

export const fileService = new FileService();
