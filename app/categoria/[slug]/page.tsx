import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  // 2. Buscar os produtos reais vinculados a essa categoria através do category_id
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)

  if (prodError) {
    console.error('Erro ao buscar produtos da categoria:', prodError)
  }

  const productList = products || []

  return (
    <main className="catalog-page">
      <header className="category-header">
        <a href="/" className="back-link">← Voltar</a>
        <div className="brand-mark">Medellín</div>
      </header>
      
      <section className="hero category-hero">
        <p className="eyebrow">Categoria</p>
        <h1>{category.name}</h1>
      </section>

      <section className="category-products">
        {productList.length === 0 ? (
          <p style={{ color: '#fff', textAlign: 'center' }}>Nenhum produto cadastrado nesta categoria ainda.</p>
        ) : (
          productList.map((product) => (
            <article className="category-product" key={product.id}>
              <img src={product.image || '/products/baseados.png'} alt={product.name} />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description || 'Produto selecionado da categoria.'}</p>
                <strong>{product.price}</strong>
                <button className="product-button" type="button">Pedir agora</button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}