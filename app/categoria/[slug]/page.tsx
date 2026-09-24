import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

function formatPrice(priceStr: string) {
  if (!priceStr) return 'R$ 0,00'
  if (priceStr.toLowerCase() === 'consulte' || priceStr.startsWith('R$')) {
    return priceStr
  }
  const numeric = parseFloat(priceStr.replace(',', '.'))
  if (isNaN(numeric)) return priceStr
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 1. Buscar a categoria real no Supabase pelo slug
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (catError || !category) {
    notFound()
  }

  // 2. Buscar os produtos vinculados a essa categoria com ORDENAÇÃO FIXA (created_at ASC)
  // Isso impede que o produto vá para o topo ao ser editado/atualizado.
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('created_at', { ascending: true }) // <--- TRAVA A ORDEM ORIGINAL

  if (prodError) {
    console.error('Erro ao buscar produtos da categoria:', prodError)
  }

  const productList = products || []

  return (
    <main className="catalog-page">
      <header className="site-header">
        <Link href="/" className="back-link" style={{ color: '#000', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
          ← Voltar pra loja
        </Link>
        <div className="brand-mark" aria-label="Medellín">Medellín</div>
      </header>
      
      {/* Hero responsivo para evitar quebra no mobile */}
      <section className="hero category-hero" style={{ textAlign: 'center', padding: '30px 16px' }}>
        <p className="eyebrow" style={{ fontSize: '0.85rem', opacity: 0.8, margin: 0 }}>Categoria</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', margin: '6px 0 0 0', wordBreak: 'break-word' }}>
          {category.name}
        </h1>
        {category.description && (
          <p style={{ maxWidth: '600px', margin: '10px auto 0', color: '#555', fontSize: '0.95rem' }}>
            {category.description}
          </p>
        )}
      </section>

      {/* Grid de produtos idêntica à página principal para manter o padrão visual */}
      <section className="catalog-grid" aria-label="Produtos da categoria" style={{ padding: '20px 16px', maxWidth: '1200px', margin: '0 auto' }}>
        {productList.length === 0 ? (
          <p style={{ color: '#777', textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0' }}>
            Nenhum produto cadastrado nesta categoria ainda.
          </p>
        ) : (
          productList.map((product) => (
            <article className={`product-card ${product.promo ? 'is-promo' : ''}`} key={product.id}>
              {product.promo && <div className="promo-ribbon">PROMOÇÃO</div>}
              
              <div className="product-image-container">
                <img 
                  src={product.image && product.image.trim() !== '' ? product.image : '/products/baseados.png'} 
                  alt={product.name} 
                  className="product-art" 
                />
              </div>
              
              <h3 style={{ color: '#000000', fontSize: '1.1rem', margin: '10px 0 4px', textAlign: 'center', fontWeight: 600 }}>
                {product.name}
              </h3>

              {product.description && (
                <p style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center', margin: '0 0 10px', minHeight: '36px' }}>
                  {product.description}
                </p>
              )}

              <div className="price-stack" style={{ textAlign: 'center', marginBottom: '12px' }}>
                {product.old_price && <span className="old-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85rem', marginRight: '6px' }}>{formatPrice(product.old_price)}</span>}
                <p className="product-price" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000', display: 'inline' }}>{formatPrice(product.price)}</p>
              </div>
              
              <a 
                href={`https://wa.me/5571999999999?text=${encodeURIComponent(`🛍️ Olá, gostaria de pedir o produto:\n*${product.name}* (${formatPrice(product.price)})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="product-button" 
                style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
              >
                {product.action || 'Pedir agora'}
              </a>
            </article>
          ))
        )}
      </section>
    </main>
  )
}