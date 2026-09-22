import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { theme } from './theme';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResetPasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Escuchamos automáticamente si el usuario llegó a la app mediante el enlace de recuperación del correo
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsOpen(true); // ¡Abre el modal automáticamente!
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Supabase actualiza la contraseña del usuario temporalmente autenticado por el enlace
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('¡Contraseña actualizada con éxito!');
      // Cerramos el modal después de 2 segundos y redirigimos al login
      setTimeout(() => {
        setIsOpen(false);
        window.location.href = '/login'; // O la ruta de tu login
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: '16px', width: '100%',
        maxWidth: '400px', padding: '24px', position: 'relative'
      }}>
        <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={20} color={theme.colors.textSecondary} />
        </button>

        <h2 style={{ fontSize: '18px', color: theme.colors.primary, marginBottom: '16px' }}>
          Actualizar Contraseña
        </h2>

        {error && (
          <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', color: '#C53030', padding: '8px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ backgroundColor: '#F0FFF4', border: '1px solid #9AE6B4', color: '#276749', padding: '8px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> <span>{message}</span>
          </div>
        )}

        {!message && (
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="password" 
              placeholder="Escribe tu nueva contraseña" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, fontSize: '13px', outline: 'none' }} 
            />
            <button type="submit" disabled={loading} style={{ backgroundColor: theme.colors.primary, color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}