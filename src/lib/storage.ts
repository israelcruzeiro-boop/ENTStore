import { supabase } from './supabaseClient';
import { Logger } from '../utils/logger';

/**
 * Dimensões máximas por contexto de uso
 */
export type ImageContext = 'avatar' | 'logo' | 'hero' | 'banner' | 'thumbnail' | 'generic';

const CONTEXT_SETTINGS: Record<ImageContext, { maxWidth: number; quality: number }> = {
  avatar:    { maxWidth: 256,  quality: 0.85 },
  logo:      { maxWidth: 512,  quality: 0.85 },
  hero:      { maxWidth: 1280, quality: 0.80 },
  banner:    { maxWidth: 1280, quality: 0.80 },
  thumbnail: { maxWidth: 640,  quality: 0.80 },
  generic:   { maxWidth: 1024, quality: 0.82 },
};

/**
 * Comprime e redimensiona uma imagem usando Canvas API nativa (sem dependências).
 * Converte para WebP para máxima eficiência.
 */
export const compressImage = (
  file: File,
  context: ImageContext = 'generic'
): Promise<File> => {
  const { maxWidth, quality } = CONTEXT_SETTINGS[context];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calcular dimensões mantendo proporção
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
            // Fallback: retorna o arquivo original sem compressão
            resolve(file);
            return;
          }
          // Gera nome com extensão .webp
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar a imagem para compressão.'));
    };

    img.src = objectUrl;
  });
};

/**
 * Faz upload de um arquivo para o Supabase Storage com compressão automática.
 * Retorna a URL pública do arquivo.
 */
export const uploadToSupabase = async (
  file: File,
  bucket: string = 'uploads',
  folder: string = 'uploads',
  context: ImageContext = 'generic'
): Promise<string | null> => {
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  // Comprime somente imagens (ignora PDF, XLSX, etc.)
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file, context);
  }

  // Nome único e seguro com crypto.randomUUID
  const fileExt = fileToUpload.name.split('.').pop() ?? 'webp';
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const filePath = `${folder}/${uuid}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileToUpload, {
      cacheControl: '31536000', // 1 ano — paths são únicos (imutáveis)
      upsert: false,
    });

  if (error) {
    Logger.error('Erro de upload Supabase:', error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};
