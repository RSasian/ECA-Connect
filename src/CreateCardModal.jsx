import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { theme } from './theme';
import { X, Upload, AlertCircle } from 'lucide-react';

export default function CreateCardModal({ isOpen, onClose, user, categories, onCardCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategoryText, setOtherCategoryText] = useState(''); // Específico cuando eligen "Otros"
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [keywords, setKeywords] = useState('');

  // Ordenar categorías alfabéticamente, pero asegurando que "Otros" quede al final
  const sortedCategories = [...(categories || [])].sort((a, b) => {
    if (a.name.toLowerCase() === 'otros') return 1;
    if (b.name.toLowerCase() === 'otros') return -1;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    if (sortedCategories.length > 0 && !category) {
      setCategory(sortedCategories[0].name);
    }
  }, [categories]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('La imagen debe pesar menos de 5MB.');
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let currentUser = user;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user;
    }

    if (!currentUser) {
      setErrorMsg('Debes iniciar sesión para publicar un negocio.');
      setLoading(false);
      return;
    }

    // Si seleccionó "Otros", validamos que haya escrito la especificación
    const isOtherSelected = category.toLowerCase() === 'otros';
    if (isOtherSelected && !otherCategoryText.trim()) {
      setErrorMsg('Por favor especifica a qué categoría pertenece tu negocio.');
      setLoading(false);
      return;
    }

    // Subir imagen si existe
    let uploadedImageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        setErrorMsg('Error al subir la imagen. Intenta con otra foto.');
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      uploadedImageUrl = publicUrlData.publicUrl;
    }

    // Combinar las palabras clave con la especificación de "Otros" si aplica para que el admin lo vea
    const finalKeywords = isOtherSelected 
      ? `[Revisar Categoría: ${otherCategoryText}] ${keywords}` 
      : keywords;

    const { error } = await supabase.from('business_cards').insert([
      {
        user_id: currentUser.id,
        title,
        category,
        description,
        whatsapp,
        image_url: uploadedImageUrl,
        keywords: finalKeywords,
        is_active: true
      }
    ]);

    setLoading(false);

    if (error) {
      setErrorMsg('Ocurrió un error al guardar la publicación.');
    } else {
      setTitle('');
      setCategory(sortedCategories[0]?.name || '');
      setOtherCategoryText('');
      setDescription('');
      setWhatsapp('');
      setKeywords('');
      setImageFile(null);
      setPreviewUrl(null);
      onCardCreated();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: '16px', width: '100%',
        maxWidth: '400px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={20} color={theme.colors.textSecondary} />
        </button>

        <h2 style={{ fontSize: '18px', color: theme.colors.primary, marginBottom: '16px' }}>
          Publicar Nuevo Negocio
        </h2>

        {errorMsg && (
          <div style={{ backgroundColor: '#FFF5F5', color: '#C53030', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Título del Negocio o Servicio" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />

          {/* Selector de Categoría */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: '4px', display: 'block' }}>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {sortedCategories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Campo dinámico si eligen "Otros" */}
          {category.toLowerCase() === 'otros' && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', padding: '10px', borderRadius: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#B45309', display: 'block', marginBottom: '4px' }}>
                ¿Cuál otro tipo de negocio es? (Para valoración del Administrador) *
              </label>
              <input
                type="text"
                placeholder="Ej. Arquitectura, Mascotas, etc."
                value={otherCategoryText}
                onChange={(e) => setOtherCategoryText(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          )}

          <textarea placeholder="Descripción del producto o servicio..." value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} style={{ ...inputStyle, resize: 'none' }} />

          <div>
            <input
              type="text"
              placeholder="Palabras clave (ej. pasteles, bodas, postres)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              style={inputStyle}
            />
          </div>

          <input type="tel" placeholder="Número de WhatsApp (ej: 4491234567)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required style={inputStyle} />

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: '6px', display: 'block' }}>
              Foto o Logo del Negocio (Opcional)
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '8px', border: `2px dashed ${theme.colors.border}`,
              backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: '13px', color: theme.colors.primary
            }}>
              <Upload size={18} />
              <span>{imageFile ? 'Cambiar Foto' : 'Seleccionar desde la Galería'}</span>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>

            {previewUrl && (
              <div style={{ marginTop: '10px', position: 'relative', textAlign: 'center' }}>
                <img src={previewUrl} alt="Vista previa" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                  style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} style={{ backgroundColor: theme.colors.secondary, color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
            {loading ? 'Guardando y Subiendo Foto...' : 'Publicar Ahora'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, fontSize: '13px', outline: 'none'
};