'use client'

import { FormEvent, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Product = { 
  id: string; 
  name: string; 
  description: string; 
  price: string; 
  old_price: string; 
  category_id: string; 
  available: boolean; 
  promo: boolean;
  image?: string;
  action?: string;
}

type Category = { 
  id: string; 
  name: string; 
  slug: string; 
  image?: string;
  description?: string;
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'categories'|'products'>('overview')
  
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  
  const emptyCategoryForm = { name: '', description: '', image: '/products/baseados.png' }
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [categoryImageFile, setCategoryCategoryImageFile] = useState<File | null>(null)
  const [uploadingCategoryImg, setUploadingCategoryImg] = useState(false)

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const emptyForm = { name: '', description: '', price: '', old_price: '', category_id: '', available: true, promo: false, image: '/products/baseados.png' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setLoggedIn(true)
      }
      setLoadingSession(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loggedIn) {
      fetchData()
    }
  }, [loggedIn])

  async function fetchData() {
    const { data: catData, error: catError } = await supabase.from('categories').select('*')
    const { data: prodData, error: prodError } = await supabase.from('products').select('*')

    if (catData) setCategories(catData)
    if (prodData) setProducts(prodData)
    if (catError || prodError) console.error('Erro ao buscar dados:', catError || prodError)
  }

  const login = async (event: FormEvent) => { 
    event.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Erro ao entrar: E-mail ou senha incorretos.')
    } else {
      setLoggedIn(true)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
  }

  async function uploadImageToStorage(file: File | null, currentImage: string): Promise<string | null> {
    if (!file) return currentImage || null

    const fileExt = file.name.split('.').pop()
    const fileName = `cat_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file)

    if (uploadError) {
      setMessage('Erro ao enviar imagem: ' + uploadError.message)
      return null
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    return data.publicUrl
  }

  const saveProduct = async (event: FormEvent) => { 
    event.preventDefault()
    if (!form.name || !form.price || (form.promo && !form.old_price)) {
      return setMessage('Preencha o preço antigo e o novo preço para promoções.') 
    }

    let imageUrl = form.image
    if (imageFile) {
      setUploading(true)
      const uploadedUrl = await uploadImageToStorage(imageFile, form.image)
      setUploading(false)
      if (uploadedUrl) {
        imageUrl = uploadedUrl
      } else {
        return 
      }
    }

    if (editingId) {
      const { error } = await supabase
        .from('products')
        .update({
          name: form.name,
          description: form.description,
          price: form.price,
          old_price: form.old_price || null,
          category_id: form.category_id || null,
          available: form.available,
          promo: form.promo,
          image: imageUrl
        })
        .eq('id', editingId)

      if (error) {
        setMessage('Erro ao atualizar produto: ' + error.message)
      } else {
        setMessage('Produto atualizado com sucesso!')
        finishProductForm()
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: form.name,
          description: form.description,
          price: form.price,
          old_price: form.old_price || null,
          category_id: form.category_id || null,
          available: form.available,
          promo: form.promo,
          image: imageUrl,
          action: 'Pedir agora'
        }])

      if (error) {
        setMessage('Erro ao criar produto: ' + error.message)
      } else {
        setMessage('Produto criado com sucesso!')
        finishProductForm()
      }
    }
  }

  const editProduct = (product: Product) => { 
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      old_price: product.old_price || '',
      category_id: product.category_id || '',
      available: product.available,
      promo: product.promo,
      image: product.image || '/products/baseados.png'
    })
    setImageFile(null)
    setEditingId(product.id)
    setShowProductForm(true)
    setActiveTab('products') 
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      setMessage('Produto excluído com sucesso.')
      fetchData()
    }
  }

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault()
    if (!categoryForm.name.trim()) return

    let imageUrl = categoryForm.image
    if (categoryImageFile) {
      setUploadingCategoryImg(true)
      const uploadedUrl = await uploadImageToStorage(categoryImageFile, categoryForm.image)
      setUploadingCategoryImg(false)
      if (uploadedUrl) {
        imageUrl = uploadedUrl
      } else {
        return
      }
    }

    const slug = categoryForm.name.toLowerCase().replaceAll(' ', '-')

    if (editingCategoryId) {
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryForm.name,
          slug,
          description: categoryForm.description,
          image: imageUrl
        })
        .eq('id', editingCategoryId)

      if (error) {
        alert('Erro ao atualizar categoria: ' + error.message)
      } else {
        finishCategoryForm()
        fetchData()
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert([{
          name: categoryForm.name,
          slug,
          description: categoryForm.description,
          image: imageUrl
        }])

      if (error) {
        alert('Erro ao criar categoria: ' + error.message)
      } else {
        finishCategoryForm()
        fetchData()
      }
    }
  }

  const editCategory = (cat: Category) => {
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      image: cat.image || '/products/baseados.png'
    })
    setCategoryCategoryImageFile(null)
    setEditingCategoryId(cat.id)
    setShowCategoryForm(true)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) {
      fetchData()
    }
  }

  const finishProductForm = () => {
    setShowProductForm(false)
    setEditingId(null)
    setImageFile(null)
    setForm(emptyForm)
    fetchData()
  }

  const finishCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategoryId(null)
    setCategoryCategoryImageFile(null)
    setCategoryForm(emptyCategoryForm)
  }

  if (loadingSession) {
    return (
      <main className="admin-login-page">
        <div className="admin-login-card">
          <p className="muted" style={{ textAlign: 'center' }}>Carregando sessão...</p>
        </div>
      </main>
    )
  }

  if (!loggedIn) return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <div className="brand-mark admin-brand">M</div>
        <p className="eyebrow">Área restrita</p>
        <h1>Painel admin</h1>
        <p className="muted">Entre com sua conta autorizada para gerenciar o catálogo.</p>
        
        {message && <div className="admin-message" style={{ marginBottom: '16px', background: '#ff444422', borderColor: '#ff4444', color: '#ff4444' }}>{message}</div>}

        <form onSubmit={login} className="admin-form">
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@loja.com" required /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label>
          <button className="admin-primary-button">Entrar no painel</button>
        </form>
      </div>
    </main>
  )

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="brand-mark">M</div>
          <span>Medellín</span>
        </div>
        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Visão geral</button>
          <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>Categorias</button>
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Produtos</button>
        </nav>
        <a href="/" className="back-store">← Ver loja</a>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>{activeTab === 'overview' ? 'Visão geral' : activeTab === 'categories' ? 'Categorias' : 'Produtos'}</h1>
          </div>
          <button className="admin-outline-button" onClick={logout}>Sair</button>
        </header>

        {message && <div className="admin-message" onClick={() => setMessage('')}>{message}</div>}

        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="stat-card"><span>Categorias ativas</span><strong>{categories.length}</strong></div>
            <div className="stat-card"><span>Produtos cadastrados</span><strong>{products.length}</strong></div>
            <div className="stat-card accent"><span>Em promoção</span><strong>{products.filter((p) => p.promo).length}</strong></div>
            <div className="admin-section">
              <div className="section-heading"><h2>Gerencie sua loja</h2></div>
              <div className="quick-actions">
                <button onClick={() => { setActiveTab('products'); setForm(emptyForm); setEditingId(null); setImageFile(null); setShowProductForm(true) }}>+ Novo produto</button>
                <button onClick={() => { setActiveTab('categories'); finishCategoryForm(); setShowCategoryForm(true) }}>+ Nova categoria</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="admin-section">
            <div className="section-heading">
              <h2>Todas as categorias</h2>
              <button className="admin-primary-button small" onClick={() => { finishCategoryForm(); setShowCategoryForm(true) }}>+ Criar categoria</button>
            </div>
            
            {showCategoryForm && (
              <form className="product-editor" onSubmit={saveCategory}>
                <h3>{editingCategoryId ? 'Editar categoria' : 'Adicionar categoria'}</h3>
                
                <label>Nome da categoria
                  <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Ex: Eletrônicos" required />
                </label>

                <label>Descrição
                  <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Descreva a categoria..." rows={3} />
                </label>

                <label>Foto da Categoria (Arquivo do computador)
                  <input type="file" accept="image/*" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCategoryCategoryImageFile(e.target.files[0])
                    }
                  }} />
                </label>
                {categoryForm.image && !categoryImageFile && <small style={{ color: '#888' }}>Imagem atual: {categoryForm.image}</small>}

                <div className="editor-actions">
                  <button className="admin-primary-button" type="submit" disabled={uploadingCategoryImg}>
                    {uploadingCategoryImg ? 'Enviando imagem...' : editingCategoryId ? 'Atualizar categoria' : 'Salvar categoria'}
                  </button>
                  <button type="button" className="admin-outline-button" onClick={finishCategoryForm}>Cancelar</button>
                </div>
              </form>
            )}

            <div className="data-list">
              {categories.map((category) => (
                <div className="data-row" key={category.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {category.image && (
                      <img src={category.image} alt={category.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                    )}
                    <div>
                      <strong>{category.name}</strong>
                      <span>/{category.slug}</span>
                    </div>
                  </div>
                  <div className="product-status">
                    <button type="button" className="edit-product-button" onClick={() => editCategory(category)}>Editar</button>
                    <button type="button" className="edit-product-button" style={{ color: '#ff4444', marginLeft: '8px' }} onClick={() => deleteCategory(category.id)}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="admin-section">
            <div className="section-heading">
              <h2>Produtos</h2>
              <button className="admin-primary-button small" onClick={() => { setForm(emptyForm); setEditingId(null); setImageFile(null); setShowProductForm(true) }}>+ Novo produto</button>
            </div>

            {showProductForm && (
              <form className="product-editor" onSubmit={saveProduct}>
                <h3>{editingId ? 'Editar produto' : 'Adicionar produto'}</h3>
                
                <label>Nome
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" required />
                </label>
                
                <label>Descrição
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o produto" rows={3} />
                </label>

                <div className="form-columns">
                  <label>Novo preço
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="R$ 0,00 ou Consulte" required />
                  </label>
                  
                  <label>Categoria
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">Selecione</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                </div>

                <label>Imagem do Produto (Arquivo do computador)
                  <input type="file" accept="image/*" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0])
                    }
                  }} />
                </label>
                {form.image && !imageFile && <small style={{ color: '#888' }}>Imagem atual: {form.image}</small>}

                <label className="check-label">
                  <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Produto disponível
                </label>

                <label className="check-label">
                  <input type="checkbox" checked={form.promo} onChange={(e) => setForm({ ...form, promo: e.target.checked })} /> Marcar como promoção
                </label>

                {form.promo && (
                  <label>Preço antigo
                    <input value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} placeholder="R$ 0,00" required />
                  </label>
                )}

                <div className="editor-actions">
                  <button className="admin-primary-button" type="submit" disabled={uploading}>
                    {uploading ? 'Enviando imagem...' : editingId ? 'Atualizar produto' : 'Salvar produto'}
                  </button>
                  <button type="button" className="admin-outline-button" onClick={() => setShowProductForm(false)}>Cancelar</button>
                </div>
              </form>
            )}

            <div className="data-list">
              {products.map((product) => {
                const catObj = categories.find(c => c.id === product.category_id)
                return (
                  <div className="data-row" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{catObj ? catObj.name : 'Sem categoria'} · {product.promo && <s>{product.old_price}</s>} {product.price}</span>
                    </div>
                    <div className={product.promo ? 'product-status promo-status' : product.available ? 'product-status' : 'product-status off-status'}>
                      {product.promo ? 'Promoção' : product.available ? 'Disponível' : 'Indisponível'}
                      <button type="button" className="edit-product-button" onClick={() => editProduct(product)}>Editar</button>
                      <button type="button" className="edit-product-button" style={{ color: '#ff4444', marginLeft: '8px' }} onClick={() => deleteProduct(product.id)}>Excluir</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}