import React from 'react';
import { theme } from './theme';
import { X, CheckCircle2, Sparkles, Rocket, Image, Award, MessageCircle } from 'lucide-react';

export default function ProUpgradeModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  // REEMPLAZA CON TU NÚMERO DE WHATSAPP (Incluye código de país, ej: 521 + 10 dígitos)
  const ADMIN_WHATSAPP = '5214492286585';

    const handleWhatsAppClick = () => {
        const fullName = user?.user_metadata?.full_name || user?.email || 'Padre de Familia';
        const email = user?.email || '';
        
        // Incluimos explícitamente "ECA Connect" en el mensaje
        const message = `¡Hola! Soy ${fullName} (${email}). Me interesa contratar el Plan PRO de $990 MXN / ciclo escolar para mi cuenta en ECA Connect.`;
        
        const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: '20px', width: '100%',
        maxWidth: '440px', padding: '28px', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
      }}>
        {/* Botón Cerrar */}
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={20} color={theme.colors.textSecondary} />
        </button>

        {/* Encabezado Visual */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            backgroundColor: '#FEF3C7', color: '#D97706', padding: '6px 12px', 
            borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' 
          }}>
            <Sparkles size={14} /> PLAN ILIMITADO
          </div>
          
          <h2 style={{ fontSize: '22px', color: theme.colors.primary, margin: '0 0 6px 0', fontWeight: '800' }}>
            Desbloquea ECA Connect PRO
          </h2>
          <p style={{ fontSize: '13px', color: theme.colors.textSecondary, margin: 0 }}>
            Llega a toda la comunidad escolar sin límites y maximiza la visibilidad de tus negocios.
          </p>
        </div>

        {/* Tarjeta de Precio */}
        <div style={{
          backgroundColor: '#F8FAFC', border: `2px solid ${theme.colors.primary}`,
          borderRadius: '16px', padding: '16px', textAlign: 'center', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '12px', color: '#64748B', textDecoration: 'line-through' }}>
            Precio regular: $1,200 MXN
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: theme.colors.primary, lineHeight: '1.1' }}>
            $990 <span style={{ fontSize: '14px', fontWeight: 'normal' }}>MXN</span>
          </div>
          <div style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>
            Acceso completo durante todo el ciclo escolar
          </div>
        </div>

        {/* Beneficios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <div style={featureRowStyle}>
            <Rocket size={18} color={theme.colors.primary} style={{ flexShrink: 0 }} />
            <span style={featureTextStyle}><strong>Negocios Ilimitados:</strong> Publica todos los emprendimientos que tengas con tu misma cuenta.</span>
          </div>

          <div style={featureRowStyle}>
            <Image size={18} color={theme.colors.primary} style={{ flexShrink: 0 }} />
            <span style={featureTextStyle}><strong>Fotos Ilimitadas:</strong> Muestra tus productos o servicios con galerías completas en tus descripciones.</span>
          </div>

          <div style={featureRowStyle}>
            <Sparkles size={18} color={theme.colors.primary} style={{ flexShrink: 0 }} />
            <span style={featureTextStyle}><strong>Carrusel Destacado:</strong> Aparición prioritaria en la pantalla principal de la app.</span>
          </div>

          <div style={featureRowStyle}>
            <Award size={18} color={theme.colors.primary} style={{ flexShrink: 0 }} />
            <span style={featureTextStyle}><strong>Distintivo "ECA PRO":</strong> Insignia de verificación que transmite confianza a otros padres de familia.</span>
          </div>
        </div>

        {/* Botón de Acción Principal a WhatsApp */}
        <button
          onClick={handleWhatsAppClick}
          style={{
            width: '100%', backgroundColor: '#25D366', color: '#FFF', border: 'none',
            padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
          }}
        >
          <MessageCircle size={20} /> Solicitar Upgrade por WhatsApp
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: theme.colors.textSecondary, marginTop: '12px', marginBotton: 0 }}>
          Te daremos atención directa y activaremos tu cuenta inmediatamente al verificar tu pago.
        </p>
      </div>
    </div>
  );
}

const featureRowStyle = {
  display: 'flex', alignItems: 'flex-start', gap: '10px'
};

const featureTextStyle = {
  fontSize: '13px', color: '#334155', lineHeight: '1.4'
};