import React, { useState } from 'react';
import { supabase } from './supabase';
import { theme } from './theme';
import { X, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Estado dinamico para manejar multiples hijos
  const [children, setChildren] = useState([
    { name: '', level: 'Primaria', grade: '' }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Agregar un nuevo formulario de hijo
  const handleAddChild = () => {
    setChildren([...children, { name: '', level: 'Primaria', grade: '' }]);
  };

  // Eliminar un hijo de la lista (si hay mas de uno)
  const handleRemoveChild = (index) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  // Actualizar un campo especifico de un hijo en la posicion indicadas
  const handleChildChange = (index, field, value) => {
    const updatedChildren = [...children];
    updatedChildren[index][field] = value;
    setChildren(updatedChildren);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignUp) {
      // Validar correo institucional ECA
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.endsWith('@eca.edu.mx') && !cleanEmail.endsWith('@eca.com')) {
        setError('Acceso restringido: Debes usar un correo institucional de la ECA (@eca.edu.mx).');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            children: children,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Guardar la estructura completa de hijos en la base de datos
        await supabase.from('profiles').upsert([
          {
            id: data.user.id,
            email,
            full_name: fullName,
            children: children,
          },
        ]);
        onAuthSuccess(data.user);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Credenciales inválidas. Revisa tu correo y contraseña.');
        setLoading(false);
        return;
      }

      if (data.user) {
        onAuthSuccess(data.user);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: '16px', width: '100%',
        maxWidth: '420px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={20} color={theme.colors.textSecondary} />
        </button>

        <h2 style={{ fontSize: '18px', color: theme.colors.primary, marginBottom: '6px' }}>
          {isSignUp ? 'Crear cuenta ECA' : 'Iniciar Sesión'}
        </h2>

        {error && (
          <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', color: '#C53030', padding: '8px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isSignUp && (
            <>
              <input 
                type="text" 
                placeholder="Nombre completo del Padre/Tutor" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                style={inputStyle} 
              />

              {/* Seccion Dinamica de Hijos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                  Datos del / de los Alumnos:
                </span>

                {children.map((child, index) => (
                  <div key={index} style={{
                    border: `1px solid ${theme.colors.border}`, 
                    padding: '10px', 
                    borderRadius: '8px', 
                    backgroundColor: '#FAFAFA'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.colors.textSecondary }}>
                        Hijo/a #{index + 1}
                      </span>
                      {children.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveChild(index)} 
                          style={{ border: 'none', background: 'none', color: '#E53E3E', cursor: 'pointer', padding: 0 }}
                          title="Eliminar este alumno"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Nombre completo del Alumno" 
                      value={child.name} 
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)} 
                      required 
                      style={{ ...inputStyle, marginBottom: '6px' }} 
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={child.level}
                        onChange={(e) => handleChildChange(index, 'level', e.target.value)}
                        required
                        style={{ ...inputStyle, flex: 1.2, backgroundColor: '#FFF' }}
                      >
                        <option value="Preescolar">Preescolar</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                        <option value="Preparatoria">Preparatoria</option>
                      </select>

                      <input 
                        type="text" 
                        placeholder="Grado (ej. 3°A)" 
                        value={child.grade} 
                        onChange={(e) => handleChildChange(index, 'grade', e.target.value)} 
                        required 
                        style={{ ...inputStyle, flex: 0.8 }} 
                      />
                    </div>
                  </div>
                ))}

                {/* Boton para agregar mas hijos */}
                <button
                  type="button"
                  onClick={handleAddChild}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', background: 'none',
                    border: 'none', color: theme.colors.primary, fontSize: '12px',
                    fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', width: 'fit-content'
                  }}
                >
                  <Plus size={14} /> Agregar otro hijo/a
                </button>
              </div>
            </>
          )}

          <input type="email" placeholder="Correo electrónico (@eca.edu.mx)" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

          <button type="submit" disabled={loading} style={{ backgroundColor: theme.colors.primary, color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            {loading ? 'Cargando...' : isSignUp ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ border: 'none', background: 'none', color: theme.colors.secondary, fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, fontSize: '13px', outline: 'none'
};