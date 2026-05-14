import { useState } from 'react'
import { supabase } from '../supabaseClient'
import CardMagic from '../components/CardMagic'

export default function Busca({ session }) {
  const [query, setQuery] = useState('')
  const [tipoBusca, setTipoBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const normalizar = (texto) => texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ''

  const buscar = async () => {
    if (!query.trim() || query.length > 100) return
    setLoading(true)
    setMsg('')
    setResultados([])
    const queryLimpa = query.replace(/[<>"']/g, '')

    let urlQuery = encodeURIComponent(queryLimpa)
    if (tipoBusca) urlQuery += `+t%3A${tipoBusca}`

    let resBusca = await fetch(`https://api.scryfall.com/cards/search?q=${urlQuery}&unique=cards`)
    let dataBusca = await resBusca.json()

    if (dataBusca.object === 'error') {
      resBusca = await fetch(`https://api.scryfall.com/cards/search?q=${urlQuery}+lang%3Apt&unique=cards`)
      dataBusca = await resBusca.json()
    }

    if (dataBusca.object === 'error') {
      setMsg('Nenhuma carta encontrada com esses filtros.')
      setLoading(false)
      return
    }

    const cartasUnicas = []
    const oracleIdsVistos = new Set()
    for (const carta of dataBusca.data.slice(0, 40)) {
      const chave = carta.oracle_id || carta.id
      if (!oracleIdsVistos.has(chave)) {
        oracleIdsVistos.add(chave)
        cartasUnicas.push(carta)
      }
    }

    const queryNorm = normalizar(queryLimpa)
    cartasUnicas.sort((a, b) => {
      const nomeA = normalizar(a.printed_name || a.name)
      const nomeB = normalizar(b.printed_name || b.name)
      if (nomeA === queryNorm && nomeB !== queryNorm) return -1
      if (nomeB === queryNorm && nomeA !== queryNorm) return 1
      return 0
    })

    const resultadosFinal = await Promise.all(
      cartasUnicas.slice(0, 20).map(async (carta) => {
        try {
          const resPt = await fetch(`https://api.scryfall.com/cards/${carta.set}/${carta.collector_number}/pt`)
          const dataPt = await resPt.json()
          if (dataPt.object !== 'error' && dataPt.printed_name) {
            return { ...dataPt, idioma: 'PT' }
          }
        } catch {}
        return { ...carta, idioma: 'EN' }
      })
    )

    setResultados(resultadosFinal)
    setLoading(false)
  }

  const adicionar = async (carta) => {
    const { error } = await supabase.from('inventario').upsert({
      usuario_id: session.user.id,
      scryfall_id: carta.id,
      quantidade: 1
    }, { onConflict: 'usuario_id,scryfall_id', ignoreDuplicates: false })
    if (error) { setMsg('Erro ao adicionar carta.'); return }
    setMsg(`"${carta.printed_name || carta.name}" adicionada ao inventário!`)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Adicionar Cartas</h2>
      <p style={styles.dica}>💡 Busque pelo nome em português ou inglês e filtre pelo tipo!</p>
      <div style={styles.searchRow}>
        <input
          style={styles.input}
          placeholder="Ex: Vampira Bizarra, Lightning Bolt..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
        />
        <select style={styles.select} value={tipoBusca} onChange={e => setTipoBusca(e.target.value)}>
          <option value="">Qualquer Tipo</option>
          <option value="land">Terreno</option>
          <option value="creature">Criatura</option>
          <option value="artifact">Artefato</option>
          <option value="enchantment">Encantamento</option>
          <option value="instant">Mágica Instantânea</option>
          <option value="sorcery">Feitiço</option>
          <option value="planeswalker">Planeswalker</option>
        </select>
        <button style={styles.btn} onClick={buscar}>Buscar</button>
      </div>
      {msg && <p style={styles.msg}>{msg}</p>}
      {loading && <p style={styles.info}>Buscando e traduzindo... aguarde.</p>}
      <div style={styles.grid}>
        {resultados.map(carta => (
          <CardMagic key={carta.id} carta={carta} onAdicionar={adicionar} />
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { padding:'2rem', background:'transparent', minHeight:'100vh' },
  title: { color:'var(--accent-gold)', marginBottom:'0.5rem', fontFamily:'var(--font-magic)', letterSpacing:'1px', textShadow:'0 2px 4px rgba(0,0,0,0.5)' },
  dica: { color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem', fontFamily:'var(--font-sans)', fontStyle:'italic' },
  searchRow: { display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  input: { flex:2, minWidth:'200px', padding:'0.75rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.05)', background:'var(--bg-card)', color:'var(--text-main)', fontSize:'1rem', fontFamily:'var(--font-sans)' },
  select: { flex:1, minWidth:'150px', padding:'0.75rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.05)', background:'var(--bg-card)', color:'var(--text-main)', fontSize:'1rem', cursor:'pointer', fontFamily:'var(--font-sans)' },
  btn: { padding:'0.75rem 1.5rem', background:'var(--accent-purple)', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.9rem', transition:'all 0.2s' },  
  msg: { color:'var(--accent-gold)', fontFamily:'var(--font-magic)', background:'rgba(212, 175, 55, 0.1)', padding:'0.5rem 1rem', borderRadius:'4px', border:'1px solid rgba(212, 175, 55, 0.3)', display:'inline-block', marginBottom:'1rem', letterSpacing:'1px' },
  info: { color:'var(--accent-gold)', marginBottom:'1rem', fontFamily:'var(--font-magic)', letterSpacing:'1px' },
  grid: { display:'flex', flexWrap:'wrap', gap:'1rem' }
}