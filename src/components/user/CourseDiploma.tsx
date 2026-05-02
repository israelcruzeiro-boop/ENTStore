import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { CourseEnrollment } from '../../types';
import { Logger } from '../../utils/logger';

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

// Função utilitária para gerar e baixar PDF diretamente (Perfeito para Mobile)
export function printDiploma(
  studentName: string, 
  courseTitle: string, 
  companyName: string, 
  enrollment: { score_percent?: number; completed_at?: string },
  templateId: DiplomaTemplateId = 'azul',
  companyLogoUrl?: string | null
) {
  const tId = toast.loading('Preparando certificado...', { id: 'diploma-gen' });
  
  // Create an off-screen container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  
  const generatePdf = async () => {
    try {
      toast.loading('Gerando imagem de alta qualidade...', { id: tId });
      // Aguardar para garantir que a imagem de fundo (carregada via URL) esteja pronta
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const el = container.firstElementChild as HTMLElement;
      if (!el) throw new Error('Elemento do certificado não encontrado');

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2, // Alta qualidade
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      toast.loading('Finalizando PDF...', { id: tId });
      const imgData = canvas.toDataURL('image/png');
      
      // A4 landscape possui aproximadamente 297 x 210 mm
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      
      const safeTitle = courseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`Certificado_${safeTitle}.pdf`);
      
      toast.success('Certificado baixado com sucesso!', { id: tId });
    } catch (error) {
    Logger.error('Error generating diploma PDF', error);
      toast.error('Erro ao gerar certificado', { id: tId });
    } finally {
      // Limpeza
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  // Renderiza o componente React dentro do off-screen container
  root.render(
    <CourseDiploma 
      studentName={studentName}
      courseTitle={courseTitle}
      companyName={companyName}
      enrollment={enrollment as any}
      templateId={templateId}
      companyLogo={companyLogoUrl || undefined}
    />
  );
  
  // Dispara a conversão logo após montar o componente principal
  setTimeout(generatePdf, 100);
}
