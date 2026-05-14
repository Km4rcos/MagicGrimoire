import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CardMagic from '../components/CardMagic'

const CACHE_KEY = 'fichario_cache'
const CACHE_TEMPO = 1000 * 60 * 10

const lerCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { dados, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TEMPO) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return dados
  } catch { return null }
}

const salvarCache = (dados) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ dados, timestamp: Date.now() }))
  } catch {}
}

const limparCache = () => {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}

export default function Fichario({ session }) {
  const [inventario, setInventario] = useState([])
  const [cartasDetalhes, setCartasDetalhes] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [buscaNome, setBuscaNome] = useState('')
  const [filtroCor, setFiltroCor] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSubtipo, setFiltroSubtipo] = useState('')
  const [filtroColecao, setFiltroColecao] = useState('')

  const carregarInventario = async (forcarRecarga = false) => {
    setLoading(true)

    const { data } = await supabase.from('inventario').select('*').eq('usuario_id', session.user.id)
    if (!data || data.length === 0) {
      setCartasDetalhes([]); setInventario([]); setLoading(false)
      limparCache()
      return
    }
    setInventario(data)

    if (!forcarRecarga) {
      const cache = lerCache()
      if (cache && cache.length === data.length) {
        const cacheAtualizado = cache.map(carta => {
          const itemAtual = data.find(i => i.scryfall_id === carta.id)
          return itemAtual ? { ...carta, quantidade: itemAtual.quantidade } : carta
        })
        setCartasDetalhes(cacheAtualizado)
        setLoading(false)
        return
      }
    }

    const lotes = []
    for (let i = 0; i < data.length; i += 75) {
      lotes.push(data.slice(i, i + 75))
    }

    const todasAsCartas = []
    for (const lote of lotes) {
      try {
        const res = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers: lote.map(i => ({ id: i.scryfall_id })) })
        })
        const json = await res.json()
        if (json.data) {
          json.data.forEach(cartaApi => {
            const item = lote.find(i => i.scryfall_id === cartaApi.id)
            todasAsCartas.push({ ...cartaApi, quantidade: item?.quantidade || 1 })
          })
        }
      } catch (err) {
        console.error('Erro ao buscar lote:', err)
      }
    }

    salvarCache(todasAsCartas)
    setCartasDetalhes(todasAsCartas)
    setLoading(false)
  }

  const remover = async (carta) => {
    if (!window.confirm(`Tem certeza que deseja remover "${carta.printed_name || carta.name}" do seu fichário?`)) return
    setInventario(prev => prev.filter(i => i.scryfall_id !== carta.id))
    setCartasDetalhes(prev => prev.filter(c => c.id !== carta.id))
    limparCache()
    const { error } = await supabase.from('inventario').delete().eq('usuario_id', session.user.id).eq('scryfall_id', carta.id)
    if (error) { setMsg('Erro ao remover. Recarregando...'); carregarInventario(true) }
  }

  const alterarQuantidade = async (carta, delta) => {
    const item = inventario.find(i => i.scryfall_id === carta.id)
    if (!item) return
    const novaQuantidade = item.quantidade + delta
    if (novaQuantidade <= 0) { await remover(carta); return }
    setInventario(prev => prev.map(i => i.scryfall_id === carta.id ? { ...i, quantidade: novaQuantidade } : i))
    setCartasDetalhes(prev => prev.map(c => c.id === carta.id ? { ...c, quantidade: novaQuantidade } : c))
    limparCache()
    const { error } = await supabase.from('inventario').update({ quantidade: novaQuantidade }).eq('usuario_id', session.user.id).eq('scryfall_id', carta.id)
    if (error) { setMsg('Erro ao atualizar. Recarregando...'); carregarInventario(true) }
  }

  useEffect(() => { carregarInventario() }, [])

  const colecoesUnicas = [...new Set(cartasDetalhes.map(c => c.set_name).filter(Boolean))].sort()

  const tribosSet = new Set()
  cartasDetalhes.forEach(carta => {
    const typeLine = carta.type_line || ''
    if (typeLine.includes('—')) {
      typeLine.split('—')[1].trim().split(' ').forEach(sub => { if (sub) tribosSet.add(sub) })
    }
  })
  const tribosUnicas = [...tribosSet].sort()

  const cartasFiltradas = cartasDetalhes.filter(carta => {
    const matchNome = carta.name?.toLowerCase().includes(buscaNome.toLowerCase()) ||
                      carta.printed_name?.toLowerCase().includes(buscaNome.toLowerCase())
    let matchCor = true
    if (filtroCor === 'M') matchCor = carta.colors && carta.colors.length > 1
    else if (filtroCor === 'C') matchCor = !carta.colors || carta.colors.length === 0
    else if (filtroCor) matchCor = carta.colors && carta.colors.length === 1 && carta.colors.includes(filtroCor)
    const typeLineOriginal = carta.type_line || ''
    const matchTipo = filtroTipo ? typeLineOriginal.toLowerCase().includes(filtroTipo.toLowerCase()) : true
    const matchSubtipo = filtroSubtipo ? typeLineOriginal.includes(filtroSubtipo) : true
    const matchColecao = filtroColecao ? carta.set_name === filtroColecao : true
    return matchNome && matchCor && matchTipo && matchSubtipo && matchColecao
  }).sort((a, b) => (a.printed_name || a.name || '').localeCompare(b.printed_name || b.name || ''))

  const totalUnicasFiltradas = cartasFiltradas.length
  const totalUnicasGeral = cartasDetalhes.length
  const totalCopiasFiltradas = cartasFiltradas.reduce((acc, c) => acc + c.quantidade, 0)
  const totalCopiasGeral = cartasDetalhes.reduce((acc, c) => acc + c.quantidade, 0)

  const calcularValorTotal = () => {
    let total = 0
    cartasDetalhes.forEach(c => {
      const preco = parseFloat(c.prices?.usd || c.prices?.usd_foil || 0)
      total += preco * (c.quantidade || 0)
    })
    return total.toFixed(2)
  }

  const valorTotalColecao = calcularValorTotal()

  const exportarParaTexto = () => {
    if (cartasFiltradas.length === 0) return
    navigator.clipboard.writeText(cartasFiltradas.map(c => `${c.quantidade} ${c.printed_name || c.name}`).join('\n'))
    setMsg('Lista copiada!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={styles.page}>
      {msg && <div style={styles.alertaFixo}>{msg}</div>}
      
      <div style={styles.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={styles.title}>Meu Fichário</h2>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={styles.badge}>
              {totalUnicasFiltradas}{totalUnicasFiltradas !== totalUnicasGeral ? ` de ${totalUnicasGeral}` : ''} CARTAS ÚNICAS 
              {' | '} 
              {totalCopiasFiltradas}{totalCopiasFiltradas !== totalCopiasGeral ? ` de ${totalCopiasGeral}` : ''} CÓPIAS
            </span>
            
            <span style={styles.badgeValor}>
              US$ {valorTotalColecao}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button style={styles.btnRecarregar} onClick={() => carregarInventario(true)}>🔄</button>
          <button style={styles.btnExport} onClick={exportarParaTexto}>📋 Exportar</button>
        </div>
      </div>

      <div style={styles.filterRow}>
        <input style={styles.inputBusca} placeholder="Nome da carta..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} />
        <select style={styles.select} value={filtroCor} onChange={e => setFiltroCor(e.target.value)}>
          <option value="">Todas as Cores</option>
          <option value="W">Branco (Mono)</option>
          <option value="U">Azul (Mono)</option>
          <option value="B">Preto (Mono)</option>
          <option value="R">Vermelho (Mono)</option>
          <option value="G">Verde (Mono)</option>
          <option value="M">Multicoloridas</option>
          <option value="C">Incolor</option>
        </select>
        <select style={styles.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os Tipos</option>
          <option value="creature">Criatura</option>
          <option value="instant">Mágica Instantânea</option>
          <option value="sorcery">Feitiço</option>
          <option value="artifact">Artefato</option>
          <option value="enchantment">Encantamento</option>
          <option value="planeswalker">Planeswalker</option>
          <option value="land">Terreno</option>
        </select>
        <select style={styles.select} value={filtroSubtipo} onChange={e => setFiltroSubtipo(e.target.value)}>
          <option value="">Todas as Tribos</option>
          {tribosUnicas.map(tribo => <option key={tribo} value={tribo}>{tribo}</option>)}
        </select>
        <select style={styles.select} value={filtroColecao} onChange={e => setFiltroColecao(e.target.value)}>
          <option value="">Todas as Coleções</option>
          {colecoesUnicas.map(colecao => <option key={colecao} value={colecao}>{colecao}</option>)}
        </select>
      </div>

      {loading && (
        <div style={styles.skeletonGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      )}

      {!loading && cartasDetalhes.length === 0 && <p style={styles.info}>Seu fichário está vazio. Busque cartas para adicionar!</p>}
      {!loading && cartasDetalhes.length > 0 && cartasFiltradas.length === 0 && <p style={styles.info}>Nenhuma carta corresponde a esses filtros.</p>}

      {!loading && (
        <div style={styles.grid}>
          {cartasFiltradas.map(carta => (
            <CardMagic
              key={carta.id}
              carta={carta}
              quantidade={carta.quantidade}
              onRemover={remover}
              onAumentarQtd={() => alterarQuantidade(carta, 1)}
              onDiminuirQtd={() => alterarQuantidade(carta, -1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { 
    padding:'2rem', 
    background:'transparent', 
    minHeight:'100vh' 
  },
  headerRow: { 
    display:'flex', 
    justifyContent:'space-between', 
    alignItems:'center', 
    marginBottom:'1.5rem', 
    flexWrap:'wrap', 
    gap:'1rem' 
  },
  title: { 
    color:'var(--accent-gold)', 
    margin:'0', fontSize:'1.8rem', 
    fontFamily:'var(--font-magic)', 
    letterSpacing:'1px', 
    textShadow:'0 2px 4px rgba(0,0,0,0.5)', 
    textTransform: 'uppercase' 
  },
  badge: { 
    color:'var(--text-main)', 
    background:'rgba(255,255,255,0.05)', 
    padding:'0.4rem 0.8rem', 
    borderRadius:'4px', 
    border:'1px solid rgba(255,255,255,0.1)', 
    fontFamily:'var(--font-sans)', 
    fontSize:'0.9rem', 
    letterSpacing:'0.5px' 
  },
  badgeValor: { 
    color: '#10b981', 
    fontWeight: 'bold', 
    fontSize: '0.9rem', 
    fontFamily: 'var(--font-sans)', 
    background: 'rgba(16, 185, 129, 0.1)', 
    padding: '0.4rem 0.8rem', 
    borderRadius: '4px', 
    border: '1px solid rgba(16, 185, 129, 0.3)', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
  },
  btnExport: { 
    padding:'0.6rem 1.2rem', 
    background:'#4b5563', 
    color:'#fff', border:'none', 
    borderRadius:'4px', 
    ursor:'pointer', 
    fontWeight:'bold', 
    fontFamily:'var(--font-magic)', 
    letterSpacing:'1px', 
    textTransform:'uppercase', 
    fontSize:'0.85rem', 
    transition:'all 0.2s' 
  },
  btnRecarregar: { 
    padding:'0.6rem 0.8rem', 
    fontFamily: 'var(--font-magic)', 
    background:'var(--bg-card)', 
    color:'var(--text-main)', 
    border:'1px solid rgba(255,255,255,0.05)', 
    borderRadius:'4px', cursor:'pointer', 
    fontSize:'1rem' 
  },
  alertaFixo: { 
    position: 'fixed', 
    top: '20px', 
    right: '20px', 
    background: 'rgba(13, 14, 21, 0.95)', 
    color: 'var(--accent-gold)', 
    border: '1px solid var(--accent-gold)', 
    padding: '1rem 1.5rem', 
    borderRadius: '4px', 
    zIndex: 9999, 
    fontFamily: 'var(--font-magic)', 
    fontSize: '1.1rem', 
    letterSpacing: '1px', 
    boxShadow: '0 4px 15px rgba(255,255,255,0.05)', 
    backdropFilter: 'blur(4px)' 
  },
  filterRow: { 
    display:'flex', 
    gap:'0.8rem', 
    marginBottom:'2rem', 
    flexWrap:'wrap' 
  },
  inputBusca: { 
    flex:2, 
    minWidth:'180px', 
    padding:'0.75rem', 
    borderRadius:'4px', 
    border:'1px solid rgba(255,255,255,0.05)', 
    background:'var(--bg-card)', 
    color:'var(--text-main)', 
    fontSize:'1rem', 
    fontFamily:'var(--font-sans)' 
  },
  select: { 
    flex:1, 
    minWidth:'140px', 
    padding:'0.75rem', 
    borderRadius:'4px', 
    border:'1px solid rgba(255,255,255,0.05)', 
    background:'var(--bg-card)', 
    color:'var(--text-main)', 
    fontSize:'0.9rem', 
    cursor:'pointer', 
    fontFamily:'var(--font-sans)' 
  },
  info: { 
    color:'var(--accent-gold)', 
    fontFamily:'var(--font-magic)', 
    letterSpacing:'1px' 
  },
  grid: { 
    display:'flex', 
    flexWrap:'wrap', 
    gap:'1rem' 
  },
  skeletonGrid: { 
    display:'flex', 
    flexWrap:'wrap', 
    gap:'1rem' 
  },
  skeleton: { 
    width:'180px', 
    height:'320px', 
    borderRadius:'10px', 
    background:'linear-gradient(90deg, #1a1a2e 25%, #252540 50%, #1a1a2e 75%)', 
    backgroundSize:'400px 100%', 
    animation:'shimmer 1.5s infinite' 
  }
}