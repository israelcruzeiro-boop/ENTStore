import { api } from '../services/api/client';

export type ImageContext = 'avatar' | 'logo' | 'hero' | 'banner' | 'thumbnail' | 'generic';

const CONTEXT_SETTINGS: Record<ImageContext, { maxWidth: number; quality: number }> = {
  avatar: { maxWidth: 256, quality: 0.85 },
  logo: { maxWidth: 512, quality: 0.85 },
  hero: { maxWidth: 1280, quality: 0.8 },
  banner: { maxWidth: 1280, quality: 0.8 },
  thumbnail: { maxWidth: 640, quality: 0.8 },
  generic: { maxWidth: 1024, quality: 0.82 },
};

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
  bucket = 'uploads',
  folder = 'uploads',
  context: ImageContext = 'generic',
): Promise<string | null> => {
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file, context);
  }

  const fileExt = fileToUpload.name.split('.').pop() ?? 'webp';
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const filePath = `${folder}/${uuid}.${fileExt}`;

  const data = await api.post<StorageUploadResponse>('/storage/upload', {
    bucket,
    folder,
    fileName: filePath,
    contentType: fileToUpload.type || 'application/octet-stream',
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
