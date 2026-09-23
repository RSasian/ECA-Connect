import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { theme } from './theme';
import { X, Edit2, Upload, Trash2, Plus, Save, BarChart3, Newspaper, Heart, Phone, Building2, Users, Sparkles } from 'lucide-react';

export default function AdminPanel({ isOpen, onClose, onCategoriesUpdated }) {
  const [activeTab, setActiveTab] = useState('businesses'); // 'businesses', 'categories', 'profiles', 'metrics', 'gaceta'
  const [businesses, setBusinesses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [gacetaArticles, setGacetaArticles] = useState([]);
  
  // Estados para la edición de fichas y perfiles
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  
  // Estados para los buscadores de Negocios y Familias
  const [businessSearch, setBusinessSearch] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  
  // Estado para el ABC y diseño de Tipos de Negocio (Categorías con colores)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newColorBg, setNewColorBg] = useState('#F7FAFC');
  const [newColorText, setNewColorText] = useState('#2D3748');
  const [newColorBorder, setNewColorBorder] = useState('#CBD5E0');
  const [newColorTagBg, setNewColorTagBg] = useState('#EDF2F7');

  // Estado para editar una categoría existente
  const [editingCategory, setEditingCategory] = useState(null);

  // Estados para la Gaceta ECA
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleContent, setNewArticleContent] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [articleFile, setArticleFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDataForAdmin();
    }
  }, [isOpen]);

  const fetchDataForAdmin = async () => {
    const { data: catData } = await supabase.from('categories').select('*').order('name');
    if (catData) setCategoriesList(catData);

    // Traemos negocios junto con sus perfiles y sus likes asociados
    const { data: bData } = await supabase
      .from('business_cards')
      .select('*, profiles:user_id(full_name), business_likes(user_id)');
    if (bData) setBusinesses(bData);

    const { data: pData } = await supabase.from('profiles').select('*');
    if (pData) setProfiles(pData);

    // Intentamos cargar artículos de gaceta si la tabla existe
    try {
      const { data: gData } = await supabase.from('gaceta_articles').select('*').order('created_at', { ascending: false });
      if (gData) setGacetaArticles(gData);
    } catch (e) {
      setGacetaArticles([]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateBusiness = async (e) => {
    e.preventDefault();
    setLoading(true);

    let updatedImageUrl = editingBusiness.image_url;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('business-images')
          .getPublicUrl(filePath);
        updatedImageUrl = publicUrlData.publicUrl;
      }
    }

    let cleanedKeywords = editingBusiness.keywords || '';
    if (editingBusiness.category.toLowerCase() !== 'otros') {
      cleanedKeywords = cleanedKeywords.replace(/\[Revisar Categoría:.*?\]/g, '').trim();
    }

    const { error } = await supabase
      .from('business_cards')
      .update({
        title: editingBusiness.title,
        description: editingBusiness.description,
        category: editingBusiness.category,
        whatsapp: editingBusiness.whatsapp,
        keywords: cleanedKeywords,
        image_url: updatedImageUrl,
        is_active: editingBusiness.is_active ?? true, // Guardamos el estado Activa / Inactiva
        is_sponsored: editingBusiness.is_sponsored || false // Actualizamos el estado de patrocinio
      })
      .eq('id', editingBusiness.id);

    setLoading(false);

    if (!error) {
      setEditingBusiness(null);
      setImageFile(null);
      setPreviewUrl(null);
      fetchDataForAdmin();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } else {
      alert('Error al actualizar el negocio. Asegúrate de que la columna "is_active" y "is_sponsored" existan en tu tabla "business_cards".');
    }
  };

const handleUpdateProfile = async (e) => {
  e.preventDefault();
  setLoading(true);

  // 1. Verificamos si la cuenta seleccionada es PRO
  const isPro = editingProfile.plan_type === 'pro';

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: editingProfile.full_name,
      plan_type: editingProfile.plan_type, // Controla la suscripción (free / pro)
      is_premium: isPro,                   // Mantiene compatibilidad previa
      max_cards: isPro ? 999 : 1,          // Límite de negocios según el plan
      children_data: editingProfile.children_data
    })
    .eq('id', editingProfile.id);

  setLoading(false);

  if (!error) {
    setEditingProfile(null);
    fetchDataForAdmin();
  } else {
    alert("Error al actualizar el perfil: " + error.message);
  }
};

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('categories')
      .insert([{ 
        name: newCategoryName.trim(),
        color_bg: newColorBg,
        color_text: newColorText,
        color_border: newColorBorder,
        color_tag_bg: newColorTagBg
      }]);

    setLoading(false);

    if (!error) {
      setNewCategoryName('');
      fetchDataForAdmin();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } else {
      alert('Error al agregar categoría o ya existe.');
    }
  };

  const handleSaveCategoryEdit = async (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('categories')
      .update({
        name: editingCategory.name.trim(),
        color_bg: editingCategory.color_bg,
        color_text: editingCategory.color_text,
        color_border: editingCategory.color_border,
        color_tag_bg: editingCategory.color_tag_bg
      })
      .eq('id', editingCategory.id);

    setLoading(false);

    if (!error) {
      setEditingCategory(null);
      fetchDataForAdmin();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } else {
      alert('Error al actualizar la categoría.');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('¿Estás seguro de eliminar este tipo de negocio?')) return;
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', catId);

    if (!error) {
      fetchDataForAdmin();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } else {
      alert('No se pudo eliminar la categoría.');
    }
  };

  const handleCreateArticle = async (e) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleContent.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('gaceta_articles')
      .insert([{ title: newArticleTitle.trim(), content: newArticleContent.trim() }]);

    setLoading(false);

    if (!error) {
      setNewArticleTitle('');
      setNewArticleContent('');
      fetchDataForAdmin();
    } else {
      alert('Asegúrate de que la tabla "gaceta_articles" exista en Supabase.');
    }
  };

  const handleDeleteArticle = async (artId) => {
    if (!window.confirm('¿Eliminar este artículo de la gaceta?')) return;
    const { error } = await supabase.from('gaceta_articles').delete().eq('id', artId);
    if (!error) fetchDataForAdmin();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', backgroundColor: '#EDF2F7', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: theme.colors.textPrimary }}>Panel de Administración APF</h2>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid #CBD5E0', paddingBottom: '8px', overflowX: 'auto' }}>
          <button onClick={() => { setActiveTab('businesses'); setEditingBusiness(null); }} style={{ padding: '6px 10px', background: activeTab === 'businesses' ? theme.colors.primary : '#EDF2F7', color: activeTab === 'businesses' ? '#FFF' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
            Negocios
          </button>
          <button onClick={() => { setActiveTab('categories'); setEditingCategory(null); }} style={{ padding: '6px 10px', background: activeTab === 'categories' ? theme.colors.primary : '#EDF2F7', color: activeTab === 'categories' ? '#FFF' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
            Tipos y Colores
          </button>
          <button onClick={() => { setActiveTab('profiles'); setEditingProfile(null); }} style={{ padding: '6px 10px', background: activeTab === 'profiles' ? theme.colors.primary : '#EDF2F7', color: activeTab === 'profiles' ? '#FFF' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
            Familias
          </button>
          <button onClick={() => setActiveTab('metrics')} style={{ padding: '6px 10px', background: activeTab === 'metrics' ? theme.colors.primary : '#EDF2F7', color: activeTab === 'metrics' ? '#FFF' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <BarChart3 size={12} /> Métricas
          </button>
          <button onClick={() => setActiveTab('gaceta')} style={{ padding: '6px 10px', background: activeTab === 'gaceta' ? theme.colors.primary : '#EDF2F7', color: activeTab === 'gaceta' ? '#FFF' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Newspaper size={12} /> Gaceta ECA
          </button>
        </div>

        {/* SECCIÓN 1: GESTIÓN Y EDICIÓN DE NEGOCIOS */}
        {activeTab === 'businesses' && (
          <div>
            {editingBusiness ? (
              <form onSubmit={handleUpdateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.primary }}>Editar Ficha de Negocio</h3>
                
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>Título del Negocio</label>
                  <input type="text" value={editingBusiness.title} onChange={e => setEditingBusiness({...editingBusiness, title: e.target.value})} style={inputStyle} required />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>Categoría</label>
                  <select value={editingBusiness.category} onChange={e => setEditingBusiness({...editingBusiness, category: e.target.value})} style={inputStyle}>
                    {categoriesList.map(cat => (
                      <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Casilla de Estatus Activa / Inactiva */}
                <div style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="is_active"
                    checked={editingBusiness.is_active ?? true} 
                    onChange={e => setEditingBusiness({...editingBusiness, is_active: e.target.checked})} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_active" style={{ fontSize: '12px', fontWeight: 'bold', color: '#2D3748', cursor: 'pointer' }}>
                    Publicación Activa (Visible en el directorio público)
                  </label>
                </div>

                {/* Casilla para marcar como Patrocinador VIP */}
                <div style={{ backgroundColor: '#FEFCBF', border: '1px solid #ECC94B', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="is_sponsored"
                    checked={editingBusiness.is_sponsored || false} 
                    onChange={e => setEditingBusiness({...editingBusiness, is_sponsored: e.target.checked})} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_sponsored" style={{ fontSize: '12px', fontWeight: 'bold', color: '#744210', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} color="#D69E2E" /> Negocio Patrocinado / Destacado (Carrusel VIP)
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>Descripción</label>
                  <textarea value={editingBusiness.description} onChange={e => setEditingBusiness({...editingBusiness, description: e.target.value})} rows={3} style={{ ...inputStyle, resize: 'none' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>WhatsApp</label>
                  <input type="tel" value={editingBusiness.whatsapp} onChange={e => setEditingBusiness({...editingBusiness, whatsapp: e.target.value})} style={inputStyle} required />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px', display: 'block' }}>Cambiar Imagen</label>
                  {editingBusiness.image_url && !previewUrl && (
                    <div style={{ marginBottom: '8px' }}>
                      <img src={editingBusiness.image_url} alt="Actual" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', border: '1px dashed #CBD5E0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', background: '#F8F9FA' }}>
                    <Upload size={16} /> Subir nueva foto
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                  {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }} />}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" disabled={loading} style={{ background: theme.colors.primary, color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button type="button" onClick={() => { setEditingBusiness(null); setPreviewUrl(null); }} style={{ background: '#CBD5E0', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Haz clic en el lápiz para editar cualquier negocio o cambiar su estatus:</p>
                
                {/* BUSCADOR DE NEGOCIOS */}
                <input 
                  type="text" 
                  placeholder="Buscar negocio por título, categoría o dueño..." 
                  value={businessSearch} 
                  onChange={e => setBusinessSearch(e.target.value)} 
                  style={{ ...inputStyle, marginBottom: '4px' }} 
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '330px', overflowY: 'auto' }}>
                  {businesses
                    .filter(b => {
                      const query = businessSearch.toLowerCase();
                      const titleMatch = b.title?.toLowerCase().includes(query);
                      const catMatch = b.category?.toLowerCase().includes(query);
                      const ownerMatch = b.profiles?.full_name?.toLowerCase().includes(query);
                      return titleMatch || catMatch || ownerMatch;
                    })
                    .map(b => {
                      const isActive = b.is_active ?? true;
                      return (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: isActive ? (b.is_sponsored ? '#FEFCBF' : '#F7FAFC') : '#FFF5F5', borderRadius: '8px', border: `1px solid ${isActive ? (b.is_sponsored ? '#ECC94B' : '#E2E8F0') : '#FEB2B2'}` }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13px', color: theme.colors.textPrimary }}>{b.title}</strong>
                              {b.is_sponsored && <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#FAF089', color: '#744210', padding: '2px 5px', borderRadius: '4px' }}>VIP</span>}
                              {!isActive && <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#FED7D7', color: '#C53030', padding: '2px 5px', borderRadius: '4px' }}>Inactiva</span>}
                            </div>
                            <span style={{ fontSize: '11px', color: '#718096' }}>Cat: <strong>{b.category}</strong> | Dueño: {b.profiles?.full_name || 'N/A'}</span>
                          </div>
                          <button onClick={() => setEditingBusiness(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary, padding: '6px' }}>
                            <Edit2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: TIPOS DE NEGOCIO Y COLORES */}
        {activeTab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {editingCategory ? (
              <form onSubmit={handleSaveCategoryEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#EFF6FF', padding: '12px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1D4ED8', margin: 0 }}>Editar Categoría: {editingCategory.name}</h4>
                <input type="text" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} style={inputStyle} required />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', marginBottom: '2px' }}>Fondo tarjeta</label>
                    <input type="color" value={editingCategory.color_bg || '#F7FAFC'} onChange={e => setEditingCategory({...editingCategory, color_bg: e.target.value})} style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', marginBottom: '2px' }}>Texto categoría</label>
                    <input type="color" value={editingCategory.color_text || '#2D3748'} onChange={e => setEditingCategory({...editingCategory, color_text: e.target.value})} style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" disabled={loading} style={{ background: '#2563EB', color: '#FFF', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', flex: 1 }}>Guardar</button>
                  <button type="button" onClick={() => setEditingCategory(null)} style={{ background: '#CBD5E0', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F7FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.primary, margin: 0 }}>Agregar Nuevo Tipo de Negocio</h4>
                <input type="text" placeholder="Nombre (ej. Gastronomía)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} style={inputStyle} required />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', marginBottom: '2px' }}>Fondo tarjeta</label>
                    <input type="color" value={newColorBg} onChange={e => setNewColorBg(e.target.value)} style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', marginBottom: '2px' }}>Texto categoría</label>
                    <input type="color" value={newColorText} onChange={e => setNewColorText(e.target.value)} style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{ background: theme.colors.primary, color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>
                  <Plus size={16} /> Guardar Categoría
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {categoriesList.map(cat => (
                <div key={cat.id || cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: cat.color_bg || '#F7FAFC', borderRadius: '6px', border: `1px solid ${cat.color_border || '#E2E8F0'}` }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: cat.color_text || theme.colors.textPrimary }}>{cat.name}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setEditingCategory(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', padding: '4px' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53E3E', padding: '4px' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN 3: PERFILES Y FAMILIAS */}
        {activeTab === 'profiles' && (
          <div>
            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: theme.colors.primary, margin: 0 }}>Editar Perfil y Familia</h3>
                
                {/* Campo Responsable */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '4px' }}>Responsable / Padre de Familia</label>
                  <input 
                    type="text" 
                    value={editingProfile.full_name || ''} 
                    onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})} 
                    style={inputStyle} 
                  />
                </div>

                {/* CAMPO NUEVO: Selector de Plan (PRO / FREE) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '4px' }}>Plan de la Cuenta</label>
                  <select
                    value={editingProfile.plan_type || 'free'}
                    onChange={e => setEditingProfile({...editingProfile, plan_type: e.target.value})}
                    style={{
                      ...inputStyle,
                      backgroundColor: editingProfile.plan_type === 'pro' ? '#FEF3C7' : '#FFF',
                      color: editingProfile.plan_type === 'pro' ? '#D97706' : '#334155',
                      fontWeight: 'bold'
                    }}
                  >
                    <option value="free">Gratuito (Límite 1 negocio)</option>
                    <option value="pro">ECA Connect PRO (Ilimitado)</option>
                  </select>
                </div>

                {/* SECCIÓN DINÁMICA DE HIJOS (Remplaza el textarea JSON) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>Alumnos Registrados:</label>
                  
                  {(!editingProfile.children_data || editingProfile.children_data.length === 0) ? (
                    <p style={{ fontSize: '11px', color: '#A0AEC0', fontStyle: 'italic', margin: '2px 0' }}>No hay alumnos registrados en esta familia.</p>
                  ) : (
                    editingProfile.children_data.map((child, index) => (
                      <div key={index} style={{ border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', backgroundColor: '#F7FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#718096' }}>Alumno #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProfile.children_data.filter((_, i) => i !== index);
                              setEditingProfile({ ...editingProfile, children_data: updated });
                            }}
                            style={{ border: 'none', background: 'none', color: '#E53E3E', cursor: 'pointer', padding: 0 }}
                            title="Eliminar alumno"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Nombre completo del Alumno"
                          value={child.name || ''}
                          onChange={e => {
                            const updated = [...editingProfile.children_data];
                            updated[index].name = e.target.value;
                            setEditingProfile({ ...editingProfile, children_data: updated });
                          }}
                          style={{ ...inputStyle, marginBottom: '6px' }}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={child.level || 'Primaria'}
                            onChange={e => {
                              const updated = [...editingProfile.children_data];
                              updated[index].level = e.target.value;
                              setEditingProfile({ ...editingProfile, children_data: updated });
                            }}
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
                            value={child.grade || ''}
                            onChange={e => {
                              const updated = [...editingProfile.children_data];
                              updated[index].grade = e.target.value;
                              setEditingProfile({ ...editingProfile, children_data: updated });
                            }}
                            style={{ ...inputStyle, flex: 0.8 }}
                          />
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const current = editingProfile.children_data || [];
                      setEditingProfile({
                        ...editingProfile,
                        children_data: [...current, { name: '', level: 'Primaria', grade: '' }]
                      });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: theme.colors.primary, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', width: 'fit-content', marginTop: '2px' }}
                  >
                    <Plus size={14} /> Agregar otro hijo/a
                  </button>
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="submit" disabled={loading} style={{ background: theme.colors.primary, color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: 1 }}>Guardar Cambios</button>
                  <button type="button" onClick={() => setEditingProfile(null)} style={{ background: '#CBD5E0', color: '#2D3748', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Busca por nombre de responsable o correo:</p>

                {/* BUSCADOR DE FAMILIAS */}
                <input 
                  type="text" 
                  placeholder="Buscar familia..." 
                  value={profileSearch} 
                  onChange={e => setProfileSearch(e.target.value)} 
                  style={{ ...inputStyle, marginBottom: '4px' }} 
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '330px', overflowY: 'auto' }}>
                  {profiles
                    .filter(p => {
                      const query = profileSearch.toLowerCase();
                      const nameMatch = p.full_name?.toLowerCase().includes(query);
                      const emailMatch = p.email?.toLowerCase().includes(query);
                      return nameMatch || emailMatch;
                    })
                    .map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F7FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', color: theme.colors.textPrimary }}>{p.full_name || 'Sin nombre'}</strong>
                            {p.plan_type === 'pro' && (
                              <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>PRO</span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#718096', display: 'block' }}>{p.email}</span>
                        </div>
                        <button onClick={() => setEditingProfile(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary, padding: '6px' }}><Edit2 size={18} /></button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 4: ANÁLISIS DE MÉTRICAS (APF) */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ backgroundColor: '#EBF8FF', padding: '12px', borderRadius: '8px', border: '1px solid #BEE3F8' }}>
              <h3 style={{ fontSize: '13px', color: theme.colors.primary, margin: '0 0 4px 0' }}>Panel de Impacto para la APF</h3>
              <p style={{ fontSize: '11px', color: '#2B6CB0', margin: 0 }}>Métricas de participación y tracción de los emprendimientos familiares.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Building2 size={22} color={theme.colors.primary} style={{ marginBottom: '4px' }} />
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 'bold', color: theme.colors.textPrimary }}>{businesses.length}</span>
                <span style={{ fontSize: '11px', color: '#718096' }}>Negocios Totales</span>
              </div>
              <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Users size={22} color={theme.colors.primary} style={{ marginBottom: '4px' }} />
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 'bold', color: theme.colors.textPrimary }}>{profiles.length}</span>
                <span style={{ fontSize: '11px', color: '#718096' }}>Familias Registradas</span>
              </div>
            </div>

            <h4 style={{ fontSize: '12px', color: theme.colors.textPrimary, margin: '4px 0 0 0' }}>Negocios con más interacciones (WhatsApp y Likes):</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {businesses.sort((a, b) => ((b.whatsapp_clicks || 0) + (b.business_likes?.length || 0)) - ((a.whatsapp_clicks || 0) + (a.business_likes?.length || 0))).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#FFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ maxWidth: '65%' }}>
                    <strong style={{ fontSize: '12px', display: 'block', color: theme.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</strong>
                    <span style={{ fontSize: '10px', color: '#718096' }}>{b.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#25D366' }}>
                      <Phone size={13} /> {b.whatsapp_clicks || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#E53E3E' }}>
                      <Heart size={13} fill="#E53E3E" /> {b.business_likes?.length || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN 5: GACETA ECA */}
        {activeTab === 'gaceta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newArticleTitle.trim() || !newArticleContent.trim()) return;
            setLoading(true);

            let attachmentUrl = null;
            if (articleFile) {
                const fileExt = articleFile.name.split('.').pop();
                const fileName = `gaceta-${Date.now()}.${fileExt}`;
                const filePath = `gaceta-files/${fileName}`;

                const { error: uploadError } = await supabase.storage
                .from('business-images') // O puedes usar un bucket general de storage que tengas
                .upload(filePath, articleFile);

                if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from('business-images')
                    .getPublicUrl(filePath);
                attachmentUrl = publicUrlData.publicUrl;
                }
            }

            const { error } = await supabase
                .from('gaceta_articles')
                .insert([{ 
                title: newArticleTitle.trim(), 
                content: newArticleContent.trim(),
                attachment_url: attachmentUrl 
                }]);

            setLoading(false);

            if (!error) {
                setNewArticleTitle('');
                setNewArticleContent('');
                setArticleFile(null);
                fetchDataForAdmin();
            } else {
                alert('Error al publicar. Asegúrate de que la columna "attachment_url" exista en la tabla "gaceta_articles".');
            }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F7FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            
            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.primary, margin: 0 }}>Publicar Artículo / Aviso en la Gaceta ECA</h4>
            
            <input type="text" placeholder="Título del artículo" value={newArticleTitle} onChange={e => setNewArticleTitle(e.target.value)} style={inputStyle} required />
            
            <textarea placeholder="Contenido o mensaje para la comunidad..." value={newArticleContent} onChange={e => setNewArticleContent(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} required />

            <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '4px' }}>Archivo o Imagen Anexa (Opcional)</label>
                <input type="file" accept="image/*,.pdf" onChange={e => setArticleFile(e.target.files[0])} style={{ fontSize: '11px' }} />
            </div>

            <button type="submit" disabled={loading} style={{ background: theme.colors.secondary, color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
                {loading ? 'Publicando...' : 'Publicar en Gaceta'}
            </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textPrimary, margin: 0 }}>Artículos Publicados (Más reciente primero):</h4>
            {gacetaArticles.length === 0 ? (
                <p style={{ fontSize: '11px', color: '#718096' }}>No hay artículos publicados todavía.</p>
            ) : (
                gacetaArticles.map(art => (
                <div key={art.id} style={{ padding: '10px', background: '#FFF', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                    <strong style={{ fontSize: '12px', color: theme.colors.textPrimary, display: 'block' }}>{art.title}</strong>
                    <p style={{ fontSize: '11px', color: '#4A5568', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{art.content}</p>
                    {art.attachment_url && <span style={{ fontSize: '10px', color: theme.colors.primary, fontWeight: 'bold', display: 'block', marginTop: '4px' }}>📎 Incluye archivo/imagen anexa</span>}
                    </div>
                    <button onClick={() => handleDeleteArticle(art.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53E3E', padding: '2px' }}>
                    <Trash2 size={15} />
                    </button>
                </div>
                ))
            )}
            </div>
        </div>
        )}

            </div>
            </div>
        );
        }

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
};