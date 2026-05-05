import { api } from '../services/api/client';

export type ImageContext = 'avatar' | 'logo' | 'hero' | 'banner' | 'thumbnail' | 'generic';
export type StorageUploadPurpose =
  | 'avatar'
  | 'company-logo'
  | 'company-hero'
  | 'repository-cover'
  | 'repository-banner'
  | 'content-thumbnail'
  | 'content-file'
  | 'course-cover'
  | 'course-material'
  | 'course-hotspot'
  | 'survey-cover'
  | 'checklist-photo'
  | 'superadmin-company-logo';

const CONTEXT_SETTINGS: Record<ImageContext, { maxWidth: number; quality: number }> = {
  avatar: { maxWidth: 256, quality: 0.85 },
  logo: { maxWidth: 512, quality: 0.85 },
  hero: { maxWidth: 1280, quality: 0.8 },
  banner: { maxWidth: 1280, quality: 0.8 },
  thumbnail: { maxWidth: 640, quality: 0.8 },
  generic: { maxWidth: 1024, quality: 0.82 },
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  ogv: 'video/ogg',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const BLOCKED_UPLOAD_TYPES = new Set([
  'application/javascript',
  'application/octet-stream',
  'application/x-msdownload',
  'image/svg+xml',
  'text/html',
  'text/javascript',
  'text/xml',
]);

const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

interface UploadFileOptions {
  targetCompanyId?: string;
}

interface StorageUploadResponse {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
}

interface StoragePublicUrlResponse {
  bucket: string;
  path: string;
  publicUrl: string;
}

export const compressImage = (file: File, context: ImageContext = 'generic'): Promise<File> => {
  const { maxWidth, quality } = CONTEXT_SETTINGS[context];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(
            new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            }),
          );
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar a imagem para compressao.'));
    };

    img.src = objectUrl;
  });
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao preparar arquivo para upload.'));
    reader.readAsDataURL(file);
  });
}

export const uploadFile = async (
  file: File,
  purpose: StorageUploadPurpose,
  context: ImageContext = 'generic',
  options: UploadFileOptions = {},
): Promise<string | null> => {
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  const originalContentType = inferContentType(file);
  if (BLOCKED_UPLOAD_TYPES.has(originalContentType)) {
    throw new Error('Tipo de arquivo nao permitido para upload.');
  }

  let fileToUpload = file;
  if (COMPRESSIBLE_IMAGE_TYPES.has(originalContentType)) {
    fileToUpload = await compressImage(file, context);
  }

  const contentType = inferContentType(fileToUpload);

  const data = await api.post<StorageUploadResponse>('/storage/upload', {
    purpose,
    targetCompanyId: options.targetCompanyId,
    fileName: fileToUpload.name,
    contentType,
    base64: await fileToBase64(fileToUpload),
  });

  return data.publicUrl;
};

export const getPublicStorageUrl = async (path: string, bucket = 'uploads'): Promise<string | null> => {
  if (!path) return null;

  const data = await api.get<StoragePublicUrlResponse>('/storage/public-url', {
    query: { bucket, path },
  });

  return data.publicUrl;
};

function inferContentType(file: File): string {
  const explicitType = file.type.trim().toLowerCase();
  if (explicitType && explicitType !== 'application/octet-stream') {
    return explicitType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return (extension && CONTENT_TYPE_BY_EXTENSION[extension]) || explicitType || 'application/octet-stream';
}
