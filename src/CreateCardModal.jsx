import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { X, Upload, Trash2 } from 'lucide-react';

export default function CreateCardModal({ isOpen, onClose, user, categories, cardToEdit, onCardCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Manejo de múltiples imágenes
  const [existingImages, setExistingImages] = useState([]); // URLs que ya existen en la BD
  const [newFiles, setNewFiles] = useState([]);             // Archivos locales recién seleccionados
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cardToEdit) {
      setTitle(cardToEdit.title || '');
      setCategory(cardToEdit.category || (categories[0]?.name || ''));
      setDescription(cardToEdit.description || '');
      setKeywords(cardToEdit.keywords || '');
      setWhatsapp(cardToEdit.whatsapp || '');
      
      // Cargar imágenes existentes (matriz images_url o respaldo de image_url)
      const imgs = cardToEdit.images_url?.length 
        ? cardToEdit.images_url 
        : (cardToEdit.image_url ? [cardToEdit.image_url] : []);
      setExistingImages(imgs);
      setNewFiles([]);
    } else {
      setTitle('');
      setCategory(categories[0]?.name || '');
      setDescription('');
      setKeywords('');
      setWhatsapp('');
      setExistingImages([]);
      setNewFiles([]);
    }
  }, [cardToEdit, categories, isOpen]);

  if (!isOpen) return null;

  // Seleccionar archivos nuevos sin borrar los anteriores
  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...selected]);
    }
  };

  // Quitar una foto que ya estaba en Supabase
  const handleRemoveExisting = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Quitar una foto local seleccionada aún no subida
  const handleRemoveNew = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedUrls = [];

      // 1. Subir cada archivo nuevo al bucket de Supabase
      for (const file of newFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('business-images')
          .upload(fileName, file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from('business-images')
            .getPublicUrl(fileName);
          uploadedUrls.push(data.publicUrl);
        }
      }

      // 2. Unir imágenes anteriores conservadas + imágenes nuevas subidas
      const allImages = [...existingImages, ...uploadedUrls];

      const payload = {
        title,
        category,
        description,
        keywords,
        whatsapp,
        images_url: allImages,
        image_url: allImages[0] || null, // Guardamos la primera como portada principal
        user_id: user.id
      };

      if (cardToEdit) {
        await supabase.from('business_cards').update(payload).eq('id', cardToEdit.id);
      } else {
        await supabase.from('business_cards').insert([payload]);
      }

      onCardCreated();
      onClose();
    } catch (err) {
      console.error("Error al guardar:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: '#EDF2F7', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          {cardToEdit ? 'Editar Negocio' : 'Anunciar Negocio'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Título del negocio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E0' }}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E0' }}
          >
            {categories.map((c) => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          <textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E0' }}
          />

          <input
            type="text"
            placeholder="Palabras clave (separadas por coma)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E0' }}
          />

          <input
            type="text"
            placeholder="WhatsApp (10 dígitos)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E0' }}
          />

          {/* Área de Selección Múltiple de Fotos */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4A5568', display: 'block', marginBottom: '6px' }}>
              Fotos del Negocio
            </label>
            
            <input
              type="file"
              accept="image/*"
              multiple
              id="multi-image-input"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <label
              htmlFor="multi-image-input"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', border: '2px dashed #CBD5E0', borderRadius: '8px',
                cursor: 'pointer', backgroundColor: '#F7FAFC', fontSize: '13px', fontWeight: 'bold', color: '#4A5568'
              }}
            >
              <Upload size={16} /> Agregar Foto(s)
            </label>

            {/* Vista previa de imágenes */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {/* Fotos existentes en la BD */}
              {existingImages.map((url, idx) => (
                <div key={`exist-${idx}`} style={{ position: 'relative', width: '65px', height: '65px' }}>
                  <img src={url} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExisting(idx)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E53E3E', color: '#FFF', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Fotos nuevas seleccionadas */}
              {newFiles.map((file, idx) => (
                <div key={`new-${idx}`} style={{ position: 'relative', width: '65px', height: '65px' }}>
                  <img src={URL.createObjectURL(file)} alt="nueva foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '2px solid #3182CE' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveNew(idx)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E53E3E', color: '#FFF', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px', padding: '12px', backgroundColor: '#E31C23', color: '#FFF',
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}