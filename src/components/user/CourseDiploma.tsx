import { useRef } from 'react';
import { CourseEnrollment } from '../../types';

// Templates de diploma disponíveis
export const DIPLOMA_TEMPLATES = [
  { id: 'azul', label: 'Azul Padrão', image: 'https://ik.imagekit.io/lflb43qwh/StorePage/StorePage%20azul.png' },
  { id: 'azul_2', label: 'Azul Moderno', image: 'https://ik.imagekit.io/lflb43qwh/StorePage/StorePage%20azul%202.png' },
  { id: 'bronze', label: 'Bronze', image: 'https://ik.imagekit.io/lflb43qwh/StorePage/StorePage%20bronze.png' },
  { id: 'vermelho_dourado', label: 'Vermelho & Dourado', image: 'https://ik.imagekit.io/lflb43qwh/StorePage/StorePage%20%20vermelho%20e%20dourado.png' },
  { id: 'preto_dourado', label: 'Preto & Dourado', image: 'https://ik.imagekit.io/lflb43qwh/StorePage/preto%20e%20dourado%20StorePage%20.png' },
] as const;

export type DiplomaTemplateId = typeof DIPLOMA_TEMPLATES[number]['id'];

interface CourseDiplomaProps {
  studentName: string;
  courseTitle: string;
  companyName: string;
  enrollment: CourseEnrollment;
  companyLogo?: string;
  templateId?: DiplomaTemplateId;
}

const getTemplateStyles = (templateId: string) => {
  switch (templateId) {
    case 'preto_dourado':
      return {
        text: '#171717',
        subtext: '#52525b',
        accent: '#d4af37',
        line: '#d4af37'
      };
    case 'vermelho_dourado':
      return {
        text: '#4a0e0e',
        subtext: '#7f1d1d',
        accent: '#991b1b',
        line: '#991b1b'
      };
    case 'bronze':
      return {
        text: '#452b14',
        subtext: '#78350f',
        accent: '#b87333',
        line: '#854d0e'
      };
    case 'azul_2':
      return {
        text: '#0f172a',
        subtext: '#475569',
        accent: '#2563eb',
        line: '#334155'
      };
    case 'azul':
    default:
      return {
        text: '#1e293b',
        subtext: '#64748b',
        accent: '#1e40af',
        line: '#334155'
      };
  }
};

export function CourseDiploma({ studentName, courseTitle, companyName, enrollment, companyLogo, templateId = 'azul' }: CourseDiplomaProps) {
  const diplomaRef = useRef<HTMLDivElement>(null);

  const template = DIPLOMA_TEMPLATES.find(t => t.id === templateId) || DIPLOMA_TEMPLATES[0];
  const styles = getTemplateStyles(template.id);

  const completionDate = enrollment.completed_at
    ? new Date(enrollment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div 
      ref={diplomaRef}
      style={{
        width: '297mm',
        minHeight: '210mm',
        backgroundImage: `url(${template.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 100px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}
    >
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, width: '100%', maxWidth: '700px' }}>
        <p style={{ 
          fontSize: '12px', 
          letterSpacing: '6px', 
          textTransform: 'uppercase', 
          color: styles.subtext,
          fontWeight: 700,
          marginBottom: '12px'
        }}>
          Certificado de Conclusão
        </p>

        <h1 style={{
          fontSize: '36px',
          fontWeight: 900,
          color: styles.text,
          marginBottom: '24px',
          lineHeight: 1.3
        }}>
          {courseTitle}
        </h1>

        <p style={{ fontSize: '13px', color: styles.subtext, marginBottom: '6px' }}>
          Concedido a
        </p>

        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: styles.text,
          marginBottom: '20px',
          display: 'inline-block',
          minWidth: '350px'
        }}>
          {studentName}
        </h2>

        <p style={{
          fontSize: '12px',
          color: styles.subtext,
          maxWidth: '480px',
          margin: '0 auto 40px',
          lineHeight: 1.8
        }}>
          Por ter concluído com sucesso este treinamento com aproveitamento de{' '}
          <strong style={{ color: styles.accent }}>{enrollment.score_percent || 0}%</strong>, 
          demonstrando domínio das competências exigidas.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '120px', marginTop: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              borderTop: `2px solid ${styles.line}`, 
              width: '180px', 
              marginBottom: '8px' 
            }} />
            <p style={{ fontSize: '10px', color: styles.subtext, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
              Data
            </p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: styles.text }}>{completionDate}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              borderTop: `2px solid ${styles.line}`, 
              width: '180px', 
              marginBottom: '8px' 
            }} />
            <p style={{ fontSize: '10px', color: styles.subtext, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
              {companyName}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: styles.text }}>Responsável</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função utilitária para abrir a impressão diretamente
export function printDiploma(
  studentName: string, 
  courseTitle: string, 
  companyName: string, 
  enrollment: { score_percent?: number; completed_at?: string },
  templateId: DiplomaTemplateId = 'azul',
  companyLogoUrl?: string | null
) {
  const template = DIPLOMA_TEMPLATES.find(t => t.id === templateId) || DIPLOMA_TEMPLATES[0];
  const styles = getTemplateStyles(template.id);

  const completionDate = enrollment.completed_at
    ? new Date(enrollment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // A url da imagem agora já é absoluta do ImageKit
  const templateImageUrl = template.image;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Diploma - ${courseTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Playfair+Display:ital,wght@1,700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Montserrat', sans-serif; }
        @media print {
          @page { size: landscape A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .diploma {
          width: 297mm; min-height: 210mm;
          background-image: url('${templateImageUrl}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 100px; position: relative; overflow: hidden;
        }
        .content { text-align: center; position: relative; z-index: 1; width: 100%; max-width: 800px; }
        .label { font-size: 13px; letter-spacing: 8px; text-transform: uppercase; color: ${styles.subtext}; font-weight: 700; margin-bottom: 24px; }
        .title { font-size: 40px; font-weight: 900; color: ${styles.text}; margin-bottom: 30px; line-height: 1.2; word-wrap: break-word; padding: 0 40px; }
        .given-to { font-size: 14px; color: ${styles.subtext}; margin-bottom: 8px; font-weight: 600; }
        .student { font-size: 42px; font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; color: ${styles.text}; margin-bottom: 24px; display: inline-block; min-width: 350px; }
        .desc { font-size: 13px; color: ${styles.subtext}; max-width: 580px; margin: 0 auto 50px; line-height: 1.8; }
        .score { color: ${styles.accent}; font-weight: 800; }
        .footer { display: flex; justify-content: center; gap: 150px; margin-top: 16px; }
        .footer-col { text-align: center; display: flex; flex-direction: column; align-items: center; }
        .footer-line { border-top: 2px solid ${styles.line}; width: 220px; margin-bottom: 12px; }
        .footer-label { font-size: 11px; color: ${styles.subtext}; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
        .footer-value { font-size: 14px; font-weight: 700; color: ${styles.text}; }
        .company-logo { width: 85px; height: 85px; border-radius: 50%; object-fit: contain; margin-top: 4px; border: 2px solid rgba(255,255,255,0.8); background: white; padding: 4px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
      </style>
    </head>
    <body>
      <div class="diploma">
        <div class="content">
          <p class="label">Certificado de Conclusão</p>
          <h1 class="title">${courseTitle}</h1>
          <p class="given-to">Concedido a</p>
          <h2 class="student">${studentName}</h2>
          <p class="desc">
            Por ter concluído com sucesso este treinamento com aproveitamento de
            <span class="score"> ${enrollment.score_percent || 0}%</span>,
            demonstrando domínio das competências exigidas.
          </p>
          <div class="footer">
            <div class="footer-col">
              <div class="footer-line"></div>
              <p class="footer-label">Data</p>
              <p class="footer-value">${completionDate}</p>
            </div>
            <div class="footer-col">
              <div class="footer-line"></div>
              <p class="footer-label">${companyName}</p>
              ${companyLogoUrl 
                ? `<img src="${companyLogoUrl}" class="company-logo" alt="Logo" crossorigin="anonymous" />` 
                : `<p class="footer-value" style="color: ${styles.text}">Instituição</p>`}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  // Aguardar imagem carregar antes de imprimir
  const img = new Image();
  img.src = templateImageUrl;
  img.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
  img.onerror = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

