import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { theme } from './theme';
import {
  Search, Phone, ShieldCheck, Plus, Building2, LogOut, Settings, Heart,
  GraduationCap, X, Image as ImageIcon, Newspaper, Sparkles, ChevronRight, Edit2
} from 'lucide-react';
import AuthModal from './AuthModal';
import CreateCardModal from './CreateCardModal';
import AdminPanel from './AdminPanel';
import ResetPasswordModal from './ResetPasswordModal';
import ProUpgradeModal from './ProUpgradeModal';

export default function App() {
  const [cards, setCards] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [gacetaArticles, setGacetaArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Estados de Modales y Edición
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null); // Modal de detalle
  const [activeImageIndex, setActiveImageIndex] = useState(0); // Estado global para la galería
  const [selectedGacetaArticle, setSelectedGacetaArticle] = useState(null); // Modal de Gaceta
  const [currentIndex, setCurrentIndex] = useState(0);

  const sponsoredCards = cards.filter(c => c.is_sponsored);

  useEffect(() => {
    if (!sponsoredCards || sponsoredCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sponsoredCards.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sponsoredCards]);

  useEffect(() => {
    fetchCategories();
    fetchCards();
    fetchGacetaArticles();
    checkUser();

    if (window.location.hash.includes('type=recovery')) {
      setIsResetPasswordOpen(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true);
      }
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        checkAdminStatus(u.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) checkAdminStatus(user.id);
  };

  const checkAdminStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (data && data.is_admin) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data && data.length > 0) {
      setCategoriesList(data);
    }
  };

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_cards')
      .select('*, profiles:user_id (full_name, children_data), business_likes(user_id)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCards(data);
    } else {
      const { data: basicData } = await supabase
        .from('business_cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (basicData) setCards(basicData);
    }
    setLoading(false);
  };

  const fetchGacetaArticles = async () => {
    try {
      const { data } = await supabase
        .from('gaceta_articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setGacetaArticles(data);
    } catch (e) {
      setGacetaArticles([]);
    }
  };

  const handleOpenCardDetails = (card) => {
    setActiveImageIndex(0);
    setSelectedCard(card);
  };

  const handleOpenAddModal = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', user.id)
        .single();

      const { count } = await supabase
        .from('business_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const isPro = profile?.plan_type === 'pro';
      const businessCount = count || 0;

      if (!isPro && businessCount >= 1) {
        setIsProModalOpen(true);
      } else {
        setCardToEdit(null);
        setIsCreateOpen(true);
      }
    } catch (err) {
      console.error('Error al verificar negocios:', err);
      setCardToEdit(null);
      setIsCreateOpen(true);
    }
  };

  const handleEditCard = (card, e) => {
    if (e) e.stopPropagation();
    setCardToEdit(card);
    if (selectedCard) setSelectedCard(null);
    setIsCreateOpen(true);
  };

  const handleWhatsAppClick = async (cardId, whatsappNumber) => {
    setCards(cards.map(c => {
      if (c.id === cardId) {
        return { ...c, whatsapp_clicks: (c.whatsapp_clicks || 0) + 1 };
      }
      return c;
    }));

    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(prev => ({
        ...prev,
        whatsapp_clicks: (prev.whatsapp_clicks || 0) + 1
      }));
    }

    try {
      const card = cards.find(c => c.id === cardId);
      const currentClicks = card?.whatsapp_clicks || 0;
      await supabase
        .from('business_cards')
        .update({ whatsapp_clicks: currentClicks + 1 })
        .eq('id', cardId);
    } catch (error) {
      console.error('Error al registrar el clic de WhatsApp:', error);
    }

    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleToggleLike = async (cardId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const likes = card.business_likes || [];
    const hasLiked = likes.some(like => like.user_id === user.id);

    if (hasLiked) {
      const { error } = await supabase
        .from('business_likes')
        .delete()
        .eq('business_card_id', cardId)
        .eq('user_id', user.id);

      if (!error) {
        setCards(cards.map(c => {
          if (c.id === cardId) {
            return {
              ...c,
              business_likes: (c.business_likes || []).filter(l => l.user_id !== user.id)
            };
          }
          return c;
        }));

        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(prev => ({
            ...prev,
            business_likes: (prev.business_likes || []).filter(l => l.user_id !== user.id)
          }));
        }
      }
    } else {
      const { error } = await supabase
        .from('business_likes')
        .insert([{ business_card_id: cardId, user_id: user.id }]);

      if (!error) {
        const newLikeEntry = { user_id: user.id };
        setCards(cards.map(c => {
          if (c.id === cardId) {
            return {
              ...c,
              business_likes: [...(c.business_likes || []), newLikeEntry]
            };
          }
          return c;
        }));

        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(prev => ({
            ...prev,
            business_likes: [...(prev.business_likes || []), newLikeEntry]
          }));
        }
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const sortedCategoriesList = [...categoriesList].sort((a, b) => {
    if (a.name.toLowerCase() === 'otros') return 1;
    if (b.name.toLowerCase() === 'otros') return -1;
    return a.name.localeCompare(b.name);
  });

  const filteredCards = cards.filter(card => {
    const isActive = card.is_active ?? true;
    if (!isActive) return false;
    const query = search.toLowerCase();
    const matchesSearch = card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query) ||
      (card.keywords && card.keywords.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'Todas' || card.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const catA = a.category.toLowerCase();
    const catB = b.category.toLowerCase();
    if (catA === 'otros' && catB !== 'otros') return 1;
    if (catB === 'otros' && catA !== 'otros') return -1;
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }
    return a.title.localeCompare(b.title);
  });

  const getCategoryStyle = (catName) => {
    if (!catName) return { bg: '#F7FAFC', text: '#4A5568', border: '#CBD5E0', tagBg: '#EDF2F7' };
    const cleanSearchName = catName.trim().toLowerCase();
    const found = categoriesList.find(c => c.name && c.name.trim().toLowerCase() === cleanSearchName);
    if (found) {
      return {
        bg: found.color_bg || '#F7FAFC',
        text: found.color_text || '#2D3748',
        border: found.color_border || '#CBD5E0',
        tagBg: found.color_tag_bg || '#EDF2F7'
      };
    }
    return { bg: '#F7FAFC', text: '#4A5568', border: '#CBD5E0', tagBg: '#EDF2F7' };
  };

  return (
    <div style={{
      maxWidth: '480px', margin: '0 auto', minHeight: '100vh',
      backgroundColor: theme.colors.background, position: 'relative', paddingBottom: '80px'
    }}>
      {/* Header Institucional */}
      <header style={{
        backgroundColor: theme.colors.primary, color: '#FFF', padding: '12px 16px',
        borderBottom: `4px solid ${theme.colors.secondary}`, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, lineHeight: '1.2' }}>ECA Connect</h1>
          <p style={{ fontSize: '11px', opacity: 0.85, margin: 0 }}>Directorio Comunitario ECA</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          {user && isAdmin && (
            <button
              onClick={() => setIsAdminOpen(true)}
              title="Panel de Administración"
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: theme.colors.secondary,
                padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold'
              }}
            >
              <Settings size={16} />
              <span>Admin</span>
            </button>
          )}

          {!user ? (
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{
                backgroundColor: theme.colors.secondary, color: '#FFF', border: 'none',
                padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Iniciar
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
                  padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '3px'
                }}
              >
                <LogOut size={13} />
                Salir
              </button>
            </div>
          )}

          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${theme.colors.primary}`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            padding: '2px', flexShrink: 0
          }}>
            <img
              src="/logo-eca.png"
              alt="Logo ECA"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        </div>
      </header>

      <div style={{ padding: '16px' }}>
        {/* COMUNICADOS DE LA GACETA ECA */}
        {user && gacetaArticles.length > 0 && (
          <div style={{ marginBottom: '16px', backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Newspaper size={16} color={theme.colors.secondary} />
                <h3 style={{ fontSize: '13px', color: theme.colors.secondary, margin: 0, fontWeight: 'bold' }}>
                  Gaceta ECA & Comunicados
                </h3>
              </div>
            </div>
            <div
              onClick={() => setSelectedGacetaArticle(gacetaArticles[0])}
              style={{ backgroundColor: '#FFF', padding: '10px', borderRadius: '8px', border: '1px solid #FED7D7', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                  {gacetaArticles[0].title}
                </span>
                <ChevronRight size={16} color="#A0AEC0" />
              </div>
              <p style={{
                fontSize: '11px', color: theme.colors.textSecondary, margin: '4px 0 0 0',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {gacetaArticles[0].content}
              </p>
            </div>
          </div>
        )}

        {/* NEGOCIOS PATROCINADOS/VIP */}
        {sponsoredCards.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={16} color="#D69E2E" />
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#744210', margin: 0 }}>
                NEGOCIOS DESTACADOS
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[0, 1].map((offset) => {
                const card = sponsoredCards[(currentIndex + offset) % sponsoredCards.length];
                if (!card) return null;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleOpenCardDetails(card)}
                    style={{
                      backgroundColor: '#FEFCBF',
                      border: '1px solid #ECC94B',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span style={{
                      fontSize: '9px', fontWeight: 'bold', background: '#FAF089',
                      color: '#744210', padding: '2px 6px', borderRadius: '4px', display: 'inline-block',
                      marginBottom: '6px'
                    }}>
                      PATROCINADOR
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.title}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#718096', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Banner Comunidad Segura */}
        <div style={{
          backgroundColor: '#EBF8FF', border: '1px solid #BEE3F8', borderRadius: '12px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '16px'
        }}>
          <ShieldCheck size={28} color={theme.colors.primary} />
          <div>
            <h4 style={{ fontSize: '13px', color: theme.colors.primary, margin: 0 }}>Comunidad Segura ECA</h4>
            <p style={{ fontSize: '11px', color: theme.colors.textSecondary, margin: '2px 0 0 0' }}>
              Consume local y apoya los negocios de las familias ECA.
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={18} color="#A0AEC0" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Buscar productos, servicios o profesionales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px',
              border: `1px solid ${theme.colors.border}`, fontSize: '14px', outline: 'none',
              backgroundColor: '#FFF'
            }}
          />
        </div>

        {/* Categorías (Filtros) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setSelectedCategory('Todas')}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px',
              fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'pointer',
              backgroundColor: selectedCategory === 'Todas' ? theme.colors.primary : '#EDF2F7',
              color: selectedCategory === 'Todas' ? '#FFF' : theme.colors.textPrimary
            }}
          >
            Todas
          </button>
          {sortedCategoriesList.map((cat, index) => {
            const catStyle = getCategoryStyle(cat.name);
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.id ? `cat-${cat.id}` : `cat-index-${index}`}
                onClick={() => setSelectedCategory(cat.name)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `1px solid ${isSelected ? theme.colors.primary : catStyle.border}`,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? theme.colors.primary : (catStyle.tagBg || '#EDF2F7'),
                  color: isSelected ? '#FFF' : (catStyle.text || theme.colors.textPrimary)
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Lista de Tarjetas */}
        {loading ? (
          <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: '40px' }}>
            Cargando directorio...
          </p>
        ) : filteredCards.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px', backgroundColor: '#FFF',
            borderRadius: '12px', border: `1px solid ${theme.colors.border}`
          }}>
            <Building2 size={40} color="#CBD5E0" style={{ marginBottom: '8px' }} />
            <h3 style={{ fontSize: '16px', color: theme.colors.textPrimary }}>Aún no hay publicaciones</h3>
            <p style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '4px' }}>
              Sé el primero en anunciar tu negocio en la comunidad ECA.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredCards.map((card) => {
              const catColor = getCategoryStyle(card.category);
              const likes = card.business_likes || [];
              const hasLiked = user ? likes.some(l => l.user_id === user.id) : false;
              const likesCount = likes.length;
              const isOwner = user && card.user_id === user.id;

              return (
                <div
                  key={card.id}
                  onClick={() => handleOpenCardDetails(card)}
                  style={{
                    backgroundColor: catColor.bg,
                    borderRadius: '12px', padding: '16px',
                    border: `1px solid ${catColor.border}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 'bold', color: catColor.text,
                          backgroundColor: catColor.tagBg, padding: '3px 8px', borderRadius: '10px',
                          textTransform: 'uppercase'
                        }}>
                          {card.category}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 'bold', color: theme.colors.primary,
                          backgroundColor: '#EBF8FF', padding: '3px 8px', borderRadius: '10px',
                          display: 'inline-flex', alignItems: 'center', gap: '3px'
                        }}>
                          <ShieldCheck size={12} /> ECA Verificado
                        </span>
                        {(card.images_url?.length > 0 || card.image_url) && (
                          <span style={{
                            fontSize: '10px', fontWeight: 'bold', color: '#4A5568',
                            backgroundColor: '#EDF2F7', padding: '3px 6px', borderRadius: '10px',
                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}>
                            <ImageIcon size={11} /> Con foto
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: '16px', color: theme.colors.textPrimary, margin: 0 }}>
                        {card.title}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <a
                        href="#whatsapp"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleWhatsAppClick(card.id, card.whatsapp);
                        }}
                        title="Contactar por WhatsApp"
                        style={{
                          backgroundColor: theme.colors.whatsapp, color: '#FFF',
                          width: '40px', height: '40px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none', boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        <Phone size={20} />
                      </a>
                      <button
                        onClick={(e) => handleToggleLike(card.id, e)}
                        title={hasLiked ? "Quitar recomendación" : "Recomendar negocio"}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '3px', padding: '4px'
                        }}
                      >
                        <Heart
                          size={16}
                          color="#E53E3E"
                          fill={hasLiked ? "#E53E3E" : "none"}
                        />
                        <span style={{ fontSize: '11px', color: theme.colors.textSecondary, fontWeight: '600' }}>
                          {likesCount}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '13px', color: theme.colors.textSecondary, marginTop: '8px',
                    marginBottom: 0, lineHeight: '1.4',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {card.description}
                  </p>

                  {/* BOTÓN EDICIÓN SI ES DUEÑO */}
                  {isOwner && (
                    <div style={{
                      marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0',
                      display: 'flex', justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={(e) => handleEditCard(card, e)}
                        style={{
                          backgroundColor: theme.colors.primary, color: '#FFF', border: 'none',
                          padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <Edit2 size={12} /> Editar mi negocio
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón flotante para Agregar Negocio */}
      {user && (
        <button
          onClick={handleOpenAddModal}
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            backgroundColor: theme.colors.secondary, color: '#FFF',
            border: 'none', borderRadius: '30px', padding: '12px 20px',
            fontSize: '14px', fontWeight: 'bold', display: 'flex',
            alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(227, 28, 35, 0.4)',
            cursor: 'pointer', zIndex: 90
          }}
        >
          <Plus size={20} /> Anunciar mi negocio
        </button>
      )}

      {/* MODAL DE COMUNICADO GACETA */}
      {selectedGacetaArticle && (() => {
        const currentIndexGaceta = gacetaArticles.findIndex(art => art.id === selectedGacetaArticle.id);
        const hasPrevious = currentIndexGaceta > 0;
        const hasNext = currentIndexGaceta < gacetaArticles.length - 1;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 400, padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#FFF', borderRadius: '16px', width: '100%',
              maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative'
            }}>
              <button
                onClick={() => setSelectedGacetaArticle(null)}
                style={{
                  position: 'absolute', right: '16px', top: '16px', border: 'none',
                  backgroundColor: '#EDF2F7', borderRadius: '50%', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
              <span style={{
                fontSize: '10px', fontWeight: 'bold', background: '#FED7D7', color: '#C53030',
                padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px'
              }}>
                COMUNICADO OFICIAL ({currentIndexGaceta + 1} de {gacetaArticles.length})
              </span>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '12px' }}>
                {selectedGacetaArticle.title}
              </h2>
              <div style={{ fontSize: '13px', color: '#4A5568', lineHeight: '1.5', whiteSpace: 'pre-line', marginBottom: '16px' }}>
                {selectedGacetaArticle.content}
              </div>
              {selectedGacetaArticle.attachment_url && (
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <a href={selectedGacetaArticle.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', textDecoration: 'none' }}>
                    <img
                      src={selectedGacetaArticle.attachment_url}
                      alt="Anexo Gaceta"
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #CBD5E0', objectFit: 'cover' }}
                    />
                    <span style={{ display: 'block', fontSize: '11px', color: theme.colors.primary, marginTop: '4px', fontWeight: 'bold' }}>
                      Ver imagen/archivo completo &gt;
                    </span>
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => hasNext && setSelectedGacetaArticle(gacetaArticles[currentIndexGaceta + 1])}
                  disabled={!hasNext}
                  style={{
                    padding: '8px 12px', background: hasNext ? '#EDF2F7' : '#F7FAFC',
                    color: hasNext ? '#2D3748' : '#A0AEC0', border: 'none', borderRadius: '6px',
                    cursor: hasNext ? 'pointer' : 'default', fontWeight: 'bold', fontSize: '12px'
                  }}
                >
                  &larr; Anterior
                </button>
                <button
                  onClick={() => hasPrevious && setSelectedGacetaArticle(gacetaArticles[currentIndexGaceta - 1])}
                  disabled={!hasPrevious}
                  style={{
                    padding: '8px 12px', background: hasPrevious ? '#EDF2F7' : '#F7FAFC',
                    color: hasPrevious ? '#2D3748' : '#A0AEC0', border: 'none', borderRadius: '6px',
                    cursor: hasPrevious ? 'pointer' : 'default', fontWeight: 'bold', fontSize: '12px'
                  }}
                >
                  Siguiente &rarr;
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE DETALLE DE TARJETA CON GALERÍA DE FOTOS CORREGIDA */}
      {selectedCard && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFF', borderRadius: '16px', width: '100%',
            maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <button
              onClick={() => setSelectedCard(null)}
              style={{
                position: 'absolute', right: '16px', top: '16px', border: 'none',
                backgroundColor: '#EDF2F7', borderRadius: '50%', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                zIndex: 5
              }}
            >
              <X size={18} color={theme.colors.textSecondary} />
            </button>

            {/* SECCIÓN GALERÍA DE IMÁGENES INTERACTIVA */}
            {(() => {
              const allPhotos = selectedCard.images_url?.length
                ? selectedCard.images_url
                : (selectedCard.image_url ? [selectedCard.image_url] : []);

              if (allPhotos.length === 0) return null;

              const currentPhoto = allPhotos[activeImageIndex] || allPhotos[0];

              return (
                <div style={{ marginBottom: '16px' }}>
                  {/* Foto Principal */}
                  <div style={{
                    width: '100%', height: '220px', backgroundColor: '#EDF2F7',
                    borderRadius: '12px', overflow: 'hidden', marginBottom: '10px'
                  }}>
                    <img
                      src={currentPhoto}
                      alt={selectedCard.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.2s ease' }}
                    />
                  </div>

                  {/* Miniaturas Navegables */}
                  {allPhotos.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {allPhotos.map((imgUrl, idx) => {
                        const isSelected = activeImageIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                              padding: 0,
                              border: isSelected ? '2px solid #E31C23' : '2px solid transparent',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: 'none',
                              opacity: isSelected ? 1 : 0.6,
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={imgUrl}
                              alt={`Foto ${idx + 1}`}
                              style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 'bold', color: theme.colors.primary,
                  backgroundColor: '#EBF8FF', padding: '3px 8px', borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  {selectedCard.category}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 'bold', color: theme.colors.primary,
                  backgroundColor: '#EBF8FF', padding: '3px 8px', borderRadius: '10px',
                  display: 'inline-flex', alignItems: 'center', gap: '3px'
                }}>
                  <ShieldCheck size={12} /> ECA Verificado
                </span>
              </div>

              {(() => {
                const likes = selectedCard.business_likes || [];
                const hasLiked = user ? likes.some(l => l.user_id === user.id) : false;
                return (
                  <button
                    onClick={(e) => handleToggleLike(selectedCard.id, e)}
                    style={{
                      background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '20px',
                      padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                  >
                    <Heart size={16} color="#E53E3E" fill={hasLiked ? "#E53E3E" : "none"} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#C53030' }}>
                      {likes.length}
                    </span>
                  </button>
                );
              })()}
            </div>

            <h2 style={{ fontSize: '20px', color: theme.colors.textPrimary, marginBottom: '12px', lineHeight: '1.2' }}>
              {selectedCard.title}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>
                Descripción del Negocio
              </h4>
              <p style={{ fontSize: '14px', color: theme.colors.textPrimary, lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>
                {selectedCard.description}
              </p>
            </div>

            {/* BOTÓN EDITAR DENTRO DEL DETALLE (Si es dueño) */}
            {user && selectedCard.user_id === user.id && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={(e) => handleEditCard(selectedCard, e)}
                  style={{
                    width: '100%', backgroundColor: theme.colors.primary, color: '#FFF',
                    border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold',
                    fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Edit2 size={16} /> Editar mi negocio
                </button>
              </div>
            )}

            {user && selectedCard.profiles && (
              <div style={{
                backgroundColor: '#F7FAFC', border: `1px solid ${theme.colors.border}`,
                borderRadius: '10px', padding: '12px', marginBottom: '20px',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: theme.colors.primary }}>
                  <GraduationCap size={16} />
                  <span>Información de la Comunidad ECA</span>
                </div>
                <p style={{ fontSize: '13px', color: theme.colors.textSecondary, margin: 0 }}>
                  <strong>Responsable:</strong> {selectedCard.profiles.full_name || 'Miembro de la comunidad'}
                </p>

                {(() => {
                  const profileData = Array.isArray(selectedCard.profiles) ? selectedCard.profiles[0] : selectedCard.profiles;
                  const children = (profileData?.children_data && profileData.children_data.length > 0)
                    ? profileData.children_data
                    : [];

                  if (children.length === 0) return null;

                  return (
                    <div style={{ marginTop: '2px' }}>
                      <strong style={{ fontSize: '12px', color: theme.colors.textSecondary }}>Hijos en el colegio:</strong>
                      <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: '12px', color: theme.colors.textSecondary }}>
                        {children.map((child, index) => (
                          <li key={index}>
                            {child.name} - {child.grade} {child.level ? `(${child.level})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}

            <a
              href="#whatsapp"
              onClick={(e) => {
                e.preventDefault();
                handleWhatsAppClick(selectedCard.id, selectedCard.whatsapp);
              }}
              style={{
                backgroundColor: theme.colors.whatsapp, color: '#FFF',
                width: '100%', padding: '12px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                textDecoration: 'none', fontWeight: 'bold', fontSize: '15px',
                boxShadow: '0 4px 10px rgba(37, 211, 102, 0.3)', cursor: 'pointer'
              }}
            >
              <Phone size={20} /> Contactar por WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* MODALES DE SOPORTE */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          setIsAuthOpen(false);
        }}
      />

      <CreateCardModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCardToEdit(null);
        }}
        user={user}
        categories={categoriesList}
        cardToEdit={cardToEdit}
        onCardCreated={fetchCards}
      />

      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        user={user}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          fetchCards();
          fetchGacetaArticles();
        }}
        onCategoriesUpdated={fetchCategories}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    </div>
  );
}