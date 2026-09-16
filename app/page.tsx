'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Category = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

type Product = { 
  id: string;
  name: string; 
  description?: string;
  image: string; 
  price: string; 
  old_price?: string; 
  action?: string; 
  promo?: boolean;
  category_id?: string | null;
}

type CartItem = {
  product: Product;
  quantity: number;
}

function formatPrice(priceStr: string) {
  if (!priceStr) return 'R$ 0,00'
  if (priceStr.toLowerCase() === 'consulte' || priceStr.startsWith('R$')) {
    return priceStr
  }
  const numeric = parseFloat(priceStr.replace(',', '.'))
  if (isNaN(numeric)) return priceStr
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [productModal, setProductModal] = useState<Product | Category | null>(null)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Estados do Carrinho / Sacola e Forma de Pagamento
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('Pix') // Pix por padrão

  // Controla qual categoria foi aberta ao clicar em "Confira"
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: catData } = await supabase.from('categories').select('*')
      if (catData) setCategories(catData)

      const { data: prodData } = await supabase.from('products').select('*')
      if (prodData) setProducts(prodData)

      setLoading(false)
    }

    fetchData()
  }, [])

  const addToCart = (product: Product, quantityToAdd = 1) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id)
      if (existingIndex > -1) {
        const newCart = [...prevCart]
        newCart[existingIndex].quantity += quantityToAdd
        return newCart
      } else {
        return [...prevCart, { product, quantity: quantityToAdd }]
      }
    })
    setIsCartOpen(true)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean) as CartItem[]
    })
  }

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const cleanPrice = item.product.price
        .replace(/[^\d,]/g, '')
        .replace(',', '.')
      const numericPrice = parseFloat(cleanPrice) || 0
      return sum + (numericPrice * item.quantity)
    }, 0).toFixed(2).replace('.', ',')
  }

  const checkoutWhatsApp = () => {
    if (cart.length === 0) return

    const WHATSAPP_NUMBER = '5585999294702' // Substitua pelo seu número com DDI e DDD

    let message = '🛍️ *NOVO PEDIDO - MEDELLÍN*\n'
    message += '----------------------------------\n\n'
    
    cart.forEach((item, index) => {
      message += `*${index + 1}. ${item.product.name}*\n`
      message += `   ▫️ Qtd: ${item.quantity}\n`
      message += `   ▫️ Valor un.: ${formatPrice(item.product.price)}\n\n`
    })

    message += '----------------------------------\n'
    message += `💳 *Forma de Pagamento:* ${paymentMethod}\n`
    message += `💰 *Total do Pedido:* *R$ ${calculateTotal()}*\n`
    message += '----------------------------------\n'
    message += '✨ _Pedido gerado através do catálogo online._'

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`

    // Abre o WhatsApp
    window.open(whatsappUrl, '_blank')

    // Esvazia a sacola SOMENTE após enviar
    setCart([])
    setIsCartOpen(false)
  }

  const categoryIds = new Set(categories.map(c => c.id))
  const standaloneProducts = products.filter(p => !p.category_id || !categoryIds.has(p.category_id))
  const activeCategoryProducts = activeCategory 
    ? products.filter(p => p.category_id === activeCategory.id)
    : []

  return (
    <main className="catalog-page">
      <header className="site-header">
        <div className="brand-mark" aria-label="Medellín">Medellín</div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => setIsCartOpen(true)}
            style={{
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              position: 'relative'
            }}
          >
            🛒 Sacola
            {totalItemsCount > 0 && (
              <span style={{
                background: '#e53e3e',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {totalItemsCount}
              </span>
            )}
          </button>

          <button 
            className={`menu-toggle ${menuOpen ? 'is-open' : ''}`} 
            type="button" 
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} 
            aria-expanded={menuOpen} 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <nav className="menu-panel" aria-label="Navegação principal">
            <a href="#catalogo" onClick={() => setActiveCategory(null)}>Catálogo</a>
            <a href="#sobre">Sobre nós</a>
            <a href="#contato">Contato</a>
            <a href="/admin">Painel admin</a>
          </nav>
        )}
      </header>

      {!activeCategory ? (
        <>
          <section className="hero" id="catalogo">
            <h1>Catálogo</h1>
          </section>

          <section className="catalog-grid" aria-label="Categorias e produtos avulsos">
            {loading ? (
              <p style={{ color: '#777', textAlign: 'center', gridColumn: '1 / -1' }}>Carregando catálogo...</p>
            ) : categories.length === 0 && standaloneProducts.length === 0 ? (
              <p style={{ color: '#777', textAlign: 'center', gridColumn: '1 / -1' }}>Nenhum item cadastrado no momento.</p>
            ) : (
              <>
                {categories.map((category) => (
                  <article className="product-card" key={category.id}>
                    <div className="product-image-container">
                      <img 
                        src={category.image && category.image.trim() !== '' ? category.image : '/products/baseados.png'} 
                        alt={category.name} 
                        className="product-art" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/products/baseados.png';
                        }}
                      />
                      <button 
                        className="zoom-button" 
                        type="button" 
                        title="Ver descrição da categoria"
                        onClick={() => setProductModal(category)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <h3 style={{ color: '#000000', fontSize: '1.1rem', margin: '10px 0 4px', textAlign: 'center', fontWeight: 600 }}>
                      {category.name}
                    </h3>

                    <div className="price-stack">
                      <p className="product-price" style={{ fontSize: '15px', color: '#666' }}>Categoria</p>
                    </div>
                    
                    <button 
                      className="product-button" 
                      type="button"
                      onClick={() => setActiveCategory(category)}
                    >
                      Confira
                    </button>
                  </article>
                ))}

                {standaloneProducts.map((product) => (
                  <article className={`product-card ${product.promo ? 'is-promo' : ''}`} key={product.id}>
                    {product.promo && <div className="promo-ribbon">PROMOÇÃO</div>}
                    
                    <div className="product-image-container">
                      <img 
                        src={product.image && product.image.trim() !== '' ? product.image : '/products/baseados.png'} 
                        alt={product.name} 
                        className="product-art" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/products/baseados.png';
                        }}
                      />
                      <button 
                        className="zoom-button" 
                        type="button" 
                        title="Ver descrição"
                        onClick={() => {
                          setModalQuantity(1)
                          setProductModal(product)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <h3 style={{ color: '#000000', fontSize: '1.1rem', margin: '10px 0 4px', textAlign: 'center', fontWeight: 600 }}>
                      {product.name}
                    </h3>

                    <div className="price-stack">
                      {product.old_price && <span className="old-price">{formatPrice(product.old_price)}</span>}
                      <p className="product-price">{formatPrice(product.price)}</p>
                    </div>
                    
                    <button className="product-button" type="button" onClick={() => addToCart(product, 1)}>
                      {product.action || 'Pedir agora'}
                    </button>
                  </article>
                ))}
              </>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="hero category-hero" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
              <button 
                onClick={() => setActiveCategory(null)} 
                style={{ 
                  background: '#ffffff', 
                  color: '#000000', 
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                ← Voltar pra loja
              </button>
            </div>

            <div style={{ textAlign: 'center', width: '100%', padding: '0 150px' }}>
              <p className="eyebrow">Categoria</p>
              <h1>{activeCategory.name}</h1>
            </div>
          </section>

          <section className="catalog-grid" aria-label="Produtos da categoria">
            {activeCategoryProducts.length === 0 ? (
              <p style={{ color: '#fff', textAlign: 'center', gridColumn: '1 / -1' }}>Nenhum produto cadastrado nesta categoria ainda.</p>
            ) : (
              activeCategoryProducts.map((product) => (
                <article className={`product-card ${product.promo ? 'is-promo' : ''}`} key={product.id}>
                  {product.promo && <div className="promo-ribbon">PROMOÇÃO</div>}
                  
                  <div className="product-image-container">
                    <img 
                      src={product.image && product.image.trim() !== '' ? product.image : '/products/baseados.png'} 
                      alt={product.name} 
                      className="product-art" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/products/baseados.png';
                      }}
                    />
                    <button 
                      className="zoom-button" 
                      type="button" 
                      title="Ver descrição"
                      onClick={() => {
                        setModalQuantity(1)
                        setProductModal(product)
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </button>
                  </div>
                  
                  <h3 style={{ color: '#000000', fontSize: '1.1rem', margin: '10px 0 4px', textAlign: 'center', fontWeight: 600 }}>
                    {product.name}
                  </h3>

                  <div className="price-stack">
                    {product.old_price && <span className="old-price">{formatPrice(product.old_price)}</span>}
                    <p className="product-price">{formatPrice(product.price)}</p>
                  </div>
                  
                  <button className="product-button" type="button" onClick={() => addToCart(product, 1)}>
                    {product.action || 'Pedir agora'}
                  </button>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {/* Modal de Detalhes / Quantidade */}
      {productModal && (
        <div className="modal-overlay" onClick={() => setProductModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setProductModal(null)}>×</button>
            <h3>{productModal.name}</h3>
            <p>{productModal.description && productModal.description.trim() !== '' ? productModal.description : 'Nenhuma descrição informada.'}</p>
            
            {'price' in productModal && (
              <div style={{ margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Quantidade:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                    style={{ padding: '4px 10px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{modalQuantity}</span>
                  <button 
                    type="button"
                    onClick={() => setModalQuantity(q => q + 1)}
                    style={{ padding: '4px 10px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {'price' in productModal && (
                <button 
                  className="admin-primary-button small" 
                  style={{ background: '#25d366', color: '#fff' }}
                  onClick={() => {
                    addToCart(productModal as Product, modalQuantity)
                    setProductModal(null)
                  }}
                >
                  Adicionar à Sacola
                </button>
              )}
              <button 
                className="admin-primary-button small" 
                onClick={() => setProductModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gaveta / Drawer da Sacola com Seleção de Pagamento */}
      {isCartOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#ffffff',
              height: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#000' }}>Sua Sacola</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#000' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }}>
              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#777', marginTop: '40px' }}>Sua sacola está vazia.</p>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f5f5f5', paddingBottom: '10px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: '#000' }}>{item.product.name}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>{formatPrice(item.product.price)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        style={{ width: '24px', height: '24px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        style={{ width: '24px', height: '24px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {/* Seletor da Forma de Pagamento */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
                    Forma de Pagamento:
                  </label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: '#f9f9f9',
                      fontSize: '0.95rem',
                      color: '#000',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '1.05rem', color: '#000' }}>
                  <span>Total estimado:</span>
                  <strong>R$ {calculateTotal()}</strong>
                </div>
                <button 
                  onClick={checkoutWhatsApp}
                  style={{
                    width: '100%',
                    background: '#25d366',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Finalizar Pedido via WhatsApp ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="toast" role="status">
          <span>{selected} selecionado</span>
          <button type="button" onClick={() => setSelected(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}
    </main>
  )
}