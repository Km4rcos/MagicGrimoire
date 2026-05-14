import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CardMagic from '../components/CardMagic'
import IdentidadeCores from '../components/IdentidadeCores'
import { useLocation } from 'react-router-dom'

const enriquecerCartasEmLote = async (itensSupabase) => {
  if (!itensSupabase || itensSupabase.length === 0) return []
  const resultados = []
  const pedacos = []
  for (let i = 0; i < itensSupabase.length; i += 75) {
    pedacos.push(itensSupabase.slice(i, i + 75))
  }
  for (const pedaco of pedacos) {
    const corpo = { identifiers: pedaco.map(item => ({ id: item.scryfall_id })) }
    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      })
      const jsonResult = await res.json()
      if (jsonResult.data) {
        const loteEnriquecido = jsonResult.data.map(cartaApi => {
          const itemOriginal = pedaco.find(i => i.scryfall_id === cartaApi.id)
          return { ...cartaApi, quantidade_deck: itemOriginal?.quantidade || 0, ...itemOriginal }
        })
        resultados.push(...loteEnriquecido)
      }
    } catch (err) {
      console.error('Erro ao buscar lote no Scryfall:', err)
    }
  }
  return resultados
}

const TERRENOS_BASICOS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
  'Wastes', 'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest']

const getIconeDeck = (deck) => {
  const cores = deck.cores || []
  
  if (cores.length === 0) {
    return <i className="ms ms-c ms-cost ms-shadow" style={{ marginRight: '10px', fontSize: '1.1rem' }}></i>
  }

  const iconesClasses = { W: 'ms-w', U: 'ms-u', B: 'ms-b', R: 'ms-r', G: 'ms-g', C: 'ms-c' }

  return (
    <span style={{ display: 'inline-flex', gap: '4px', marginRight: '12px', alignItems: 'center' }}>
      {cores.map(cor => (
        <i key={cor} className={`ms ${iconesClasses[cor]} ms-cost ms-shadow`} style={{ fontSize: '1.1rem' }}></i>
      ))}
    </span>
  )
}

const SkeletonCard = () => (
  <div style={{
    width:'180px', height:'320px', borderRadius:'10px',
    background:'linear-gradient(90deg, #1a1a2e 25%, #252540 50%, #1a1a2e 75%)',
    backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite'
  }} />
)

export default function Decks({ session }) {
  const [decks, setDecks] = useState([])
  const [nomeDeck, setNomeDeck] = useState('')
  const [modoDeck, setModoDeck] = useState('standard') 
  const [msg, setMsg] = useState('')
  const [tela, setTela] = useState('lista')
  const [deckSelecionado, setDeckSelecionado] = useState(null)
  const [cartasNoDeck, setCartasNoDeck] = useState([])
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscaNome, setBuscaNome] = useState('')
  const [filtroCor, setFiltroCor] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSubtipo, setFiltroSubtipo] = useState('')
  const [filtroColecao, setFiltroColecao] = useState('')
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [maoInicial, setMaoInicial] = useState([])
  const [modalMaoAberta, setModalMaoAberta] = useState(false)

  const location = useLocation()

  useEffect(() => {
    setTela('lista')
    setDeckSelecionado(null)
    setCartasNoDeck([])
    setInventario([])
    setMsg('')
    setEditandoNome(false)
    setModalMaoAberta(false)
    setMaoInicial([])
  }, [location.pathname])


  const LIMITE_DECK = deckSelecionado?.modo === 'commander' ? 100 : 60
  const MAX_COPIAS = deckSelecionado?.modo === 'commander' ? 1 : 4

  const totalCartasDeck = cartasNoDeck.reduce((acc, c) => acc + c.quantidade_deck, 0)
  const deckCompleto = totalCartasDeck >= LIMITE_DECK

  const carregarDecks = async () => {
    const { data } = await supabase.from('decks').select('*').eq('usuario_id', session.user.id)
    setDecks(data || [])
  }

  const criarDeck = async () => {
    if (!nomeDeck.trim()) return
    const { error } = await supabase.from('decks').insert({
      usuario_id: session.user.id,
      nome: nomeDeck,
      modo: modoDeck
    })
    if (error) { setMsg('Erro ao criar deck.'); return }
    setNomeDeck('')
    setModoDeck('standard')
    setMsg('Deck criado!')
    setTimeout(() => setMsg(''), 3000)
    carregarDecks()
  }

  const excluirDeck = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este deck?')) return
    await supabase.from('decks').delete().eq('id', id)
    carregarDecks()
  }

  const salvarNome = async () => {
    if (!novoNome.trim()) return
    await supabase.from('decks').update({ nome: novoNome }).eq('id', deckSelecionado.id)
    setDeckSelecionado({ ...deckSelecionado, nome: novoNome })
    setEditandoNome(false)
    setMsg('Nome atualizado!')
    setTimeout(() => setMsg(''), 3000)
  }

  const exportarParaTexto = () => {
    if (cartasNoDeck.length === 0) return
    const textoFormatado = cartasNoDeck.map(c => `${c.quantidade_deck} ${c.printed_name || c.name}`).join('\n')
    navigator.clipboard.writeText(textoFormatado)
    setMsg('Lista copiada!')
    setTimeout(() => setMsg(''), 3000)
  }

  const abrirVisualizacao = async (deck) => {
    setDeckSelecionado(deck)
    setNovoNome(deck.nome)
    setTela('ver')
    await carregarApenasDeck(deck.id)
  }

  const abrirEditor = async (deck) => {
    setDeckSelecionado(deck)
    setNovoNome(deck.nome)
    setTela('editar')
    setBuscaNome(''); setFiltroCor(''); setFiltroTipo(''); setFiltroSubtipo(''); setFiltroColecao('');
    await carregarEditor(deck.id)
  }

  const voltar = () => {
    setTela('lista')
    setDeckSelecionado(null)
    setCartasNoDeck([])
    setInventario([])
    setMsg('')
    setEditandoNome(false)
    setModalMaoAberta(false) 
    setMaoInicial([])
  
    carregarDecks()
  }

  const carregarApenasDeck = async (deckId) => {
    setLoading(true)
    const { data: deckData } = await supabase.from('deck_cartas').select('*').eq('deck_id', deckId)
    const deckEnriquecido = await enriquecerCartasEmLote(deckData)
    setCartasNoDeck(deckEnriquecido)
    setLoading(false)
  }

  const carregarEditor = async (deckId) => {
    setLoading(true)
    const { data: invData } = await supabase.from('inventario').select('*').eq('usuario_id', session.user.id)
    const { data: meusDecks } = await supabase.from('decks').select('id').eq('usuario_id', session.user.id)
    const meusDecksIds = meusDecks.map(d => d.id)
    const { data: todasCartasAlocadas } = await supabase.from('deck_cartas').select('*').in('deck_id', meusDecksIds)

    const idsUnicos = [...new Set([...invData.map(i => i.scryfall_id), ...todasCartasAlocadas.map(i => i.scryfall_id)])]
    const listaParaApi = idsUnicos.map(id => ({ scryfall_id: id }))
    const todasAsCartasInfo = await enriquecerCartasEmLote(listaParaApi)

    const invEnriquecido = invData.map(item => {
      const info = todasAsCartasInfo.find(c => c.id === item.scryfall_id)
      const qtdUsadaTotal = todasCartasAlocadas
        .filter(c => c.scryfall_id === item.scryfall_id)
        .reduce((acc, curr) => acc + curr.quantidade, 0)
      return { ...info, qtdFisica: item.quantidade, qtdUsadaTotal, disponivel: item.quantidade - qtdUsadaTotal }
    })

    const deckData = todasCartasAlocadas.filter(c => c.deck_id === deckId)
    const deckEnriquecido = deckData.map(item => {
      const info = todasAsCartasInfo.find(c => c.id === item.scryfall_id)
      return { ...info, quantidade_deck: item.quantidade }
    })

    const coresDosDeck = [...new Set(deckEnriquecido.flatMap(c => c.colors || []))]
    await supabase.from('decks').update({ cores: coresDosDeck }).eq('id', deckId)

    setInventario(invEnriquecido); setCartasNoDeck(deckEnriquecido); setLoading(false)
  }

  const validarAdicao = (carta) => {
    const cartaInv = inventario.find(i => i.id === carta.id)
    if (!cartaInv || cartaInv.disponivel <= 0) return 'Sem cópias físicas disponíveis!'

    const cartaNoDeck = cartasNoDeck.find(c => c.id === carta.id)
    const qtdAtual = cartaNoDeck ? cartaNoDeck.quantidade_deck : 0
    const eTerrenoBasico = TERRENOS_BASICOS.includes(carta.name)

    if (!eTerrenoBasico && qtdAtual >= MAX_COPIAS) {
      return `Limite de ${MAX_COPIAS} cópia${MAX_COPIAS > 1 ? 's' : ''} por carta no modo ${deckSelecionado?.modo === 'commander' ? 'Commander' : 'Standard'}!`
    }
    return null
  }

  const adicionarAoDeck = async (carta) => {
    const erro = validarAdicao(carta)
    if (erro) { setMsg(erro); setTimeout(() => setMsg(''), 3000); return }

    const cartaNoDeck = cartasNoDeck.find(c => c.id === carta.id)
    const qtdAtual = cartaNoDeck ? cartaNoDeck.quantidade_deck : 0

    setCartasNoDeck(prev => {
      if (qtdAtual === 0) return [...prev, { ...carta, quantidade_deck: 1 }]
      return prev.map(c => c.id === carta.id ? { ...c, quantidade_deck: c.quantidade_deck + 1 } : c)
    })
    setInventario(prev => prev.map(i =>
      i.id === carta.id ? { ...i, disponivel: i.disponivel - 1, qtdUsadaTotal: i.qtdUsadaTotal + 1 } : i
    ))

    if (qtdAtual === 0) {
      await supabase.from('deck_cartas').insert({ deck_id: deckSelecionado.id, scryfall_id: carta.id, quantidade: 1 })
    } else {
      await supabase.from('deck_cartas').update({ quantidade: qtdAtual + 1 }).eq('deck_id', deckSelecionado.id).eq('scryfall_id', carta.id)
    }
  }

  const diminuirDoDeck = async (carta) => {
    const novaQtd = carta.quantidade_deck - 1
    setCartasNoDeck(prev => {
      if (novaQtd <= 0) return prev.filter(c => c.id !== carta.id)
      return prev.map(c => c.id === carta.id ? { ...c, quantidade_deck: novaQtd } : c)
    })
    setInventario(prev => prev.map(i =>
      i.id === carta.id ? { ...i, disponivel: i.disponivel + 1, qtdUsadaTotal: i.qtdUsadaTotal - 1 } : i
    ))
    if (novaQtd <= 0) {
      await supabase.from('deck_cartas').delete().eq('deck_id', deckSelecionado.id).eq('scryfall_id', carta.id)
    } else {
      await supabase.from('deck_cartas').update({ quantidade: novaQtd }).eq('deck_id', deckSelecionado.id).eq('scryfall_id', carta.id)
    }
  }

  const removerTudoDoDeck = async (carta) => {
    const qtdRemovida = carta.quantidade_deck
    setCartasNoDeck(prev => prev.filter(c => c.id !== carta.id))
    setInventario(prev => prev.map(i =>
      i.id === carta.id ? { ...i, disponivel: i.disponivel + qtdRemovida, qtdUsadaTotal: i.qtdUsadaTotal - qtdRemovida } : i
    ))
    await supabase.from('deck_cartas').delete().eq('deck_id', deckSelecionado.id).eq('scryfall_id', carta.id)
  }

  useEffect(() => { carregarDecks() }, [])

  const estatisticas = () => {
    const tipos = { Criatura: 0, Terreno: 0, Feitiço: 0, 'Mágica Instantânea': 0, Artefato: 0, Encantamento: 0, Planeswalker: 0, Outro: 0 }
    cartasNoDeck.forEach(c => {
      const t = (c.type_line || '').toLowerCase()
      const q = c.quantidade_deck
      if (t.includes('creature')) tipos['Criatura'] += q
      else if (t.includes('land')) tipos['Terreno'] += q
      else if (t.includes('sorcery')) tipos['Feitiço'] += q
      else if (t.includes('instant')) tipos['Mágica Instantânea'] += q
      else if (t.includes('artifact')) tipos['Artefato'] += q
      else if (t.includes('enchantment')) tipos['Encantamento'] += q
      else if (t.includes('planeswalker')) tipos['Planeswalker'] += q
      else tipos['Outro'] += q
    })
    return Object.entries(tipos).filter(([, v]) => v > 0)
  }

  const curvaMana = () => {
    const curva = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 }
    cartasNoDeck.forEach(c => {
      const t = (c.type_line || '').toLowerCase()
      if (t.includes('land')) return 

      const custo = Math.floor(c.cmc || 0)
      if (custo >= 6) curva['6+'] += c.quantidade_deck
      else curva[custo.toString()] += c.quantidade_deck
    })
    return Object.entries(curva).filter(([, v]) => v > 0)
  }

  const cores_stats = { Criatura:'#7c3aed', Terreno:'#059669', Feitiço:'#2563eb', 'Mágica Instantânea':'#0891b2', Artefato:'#6b7280', Encantamento:'#d97706', Planeswalker:'#dc2626', Outro:'#374151' }

  const simularMao = () => {
    if (totalCartasDeck === 0) {
      setMsg('Adicione cartas ao deck primeiro para simular!')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    
    const deckVirtual = []
    cartasNoDeck.forEach(carta => {
      for (let i = 0; i < carta.quantidade_deck; i++) {
        deckVirtual.push(carta)
      }
    })

    for (let i = deckVirtual.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckVirtual[i], deckVirtual[j]] = [deckVirtual[j], deckVirtual[i]]
    }

    setMaoInicial(deckVirtual.slice(0, 7))
    setModalMaoAberta(true)
  }

  const BarraProgresso = () => {
    const progresso = Math.min((totalCartasDeck / LIMITE_DECK) * 100, 100)
    const cor = deckCompleto ? '#059669' : totalCartasDeck >= LIMITE_DECK * 0.7 ? '#f59e0b' : 'var(--accent-purple)'
    const stats = estatisticas()
    const curva = curvaMana()

    const calcularValor = () => {
      let total = 0
      cartasNoDeck.forEach(c => {
        const preco = parseFloat(c.prices?.usd || c.prices?.usd_foil || 0)
        total += preco * c.quantidade_deck
      })
      return total.toFixed(2)
    }
    
    const valorTotal = calcularValor()

    const coresSet = new Set()
    cartasNoDeck.forEach(c => {
      if (c.colors && c.colors.length > 0) {
        c.colors.forEach(cor => coresSet.add(cor))
      }
    })
    const coresAtuais = Array.from(coresSet)

    const getBgCurva = () => {
      if (coresAtuais.length === 0) return '#8c8d91' 
      
      const paleta = {
        W: '#F0F2C0', 
        U: '#B5CDE3', 
        B: '#ACA29A', 
        R: '#DB8664', 
        G: '#93B483'  
      }

      if (coresAtuais.length === 1) return paleta[coresAtuais[0]]
      
      const colorStops = coresAtuais.map(c => paleta[c]).join(', ')
      return `linear-gradient(135deg, ${colorStops})`
    }
    
    const bgCurvaDinâmico = getBgCurva()

    return (
      <div style={styles.progressoContainer}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ color:'var(--text-muted)', fontSize:'0.85rem', fontFamily:'var(--font-sans)', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:'bold', display: 'flex', alignItems: 'center' }}>
            {deckSelecionado?.modo === 'commander' ? '👑 Commander' : '⚔️ Standard'} — Cartas no deck
          </span>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Valor estimado via Scryfall (USD)">
              US$ {valorTotal}
            </span>

            <span style={{ color: cor, fontWeight:'bold', fontSize:'0.9rem', fontFamily:'var(--font-sans)' }}>
              {totalCartasDeck}/{LIMITE_DECK} {deckCompleto ? '✅' : totalCartasDeck >= LIMITE_DECK * 0.7 ? '⚠️' : ''}
            </span>
          </div>
        </div>
        
        <div style={styles.progressoBarra}>
          <div style={{ ...styles.progressoFill, width:`${progresso}%`, background: cor }} />
        </div>
        
        {!deckCompleto && (
          <p style={{ color:'#f59e0b', fontSize:'0.75rem', margin:'0.4rem 0 0', fontFamily:'var(--font-sans)', fontWeight:'bold' }}>
            ⚠️ Faltam {LIMITE_DECK - totalCartasDeck} cartas para completar o deck
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1.2rem' }}>
          {stats.length > 0 && (
            <div>
              <p style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'0.6rem', fontFamily:'var(--font-sans)', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:'bold' }}>
                Distribuição de tipos:
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                {stats.map(([tipo, qtd]) => (
                  <span key={tipo} style={{
                    background: cores_stats[tipo] || '#374151',
                    color:'#fff', fontSize:'0.7rem', fontWeight:'bold',
                    padding:'0.3rem 0.8rem', borderRadius:'999px',
                    fontFamily:'var(--font-sans)', letterSpacing:'0.5px', textTransform:'uppercase',
                    boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    {tipo}: {qtd}
                  </span>
                ))}
              </div>
            </div>
          )}

          {curva.length > 0 && (
            <div>
              <p style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'0.6rem', fontFamily:'var(--font-sans)', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:'bold' }}>
                Curva de Mana:
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                {curva.map(([custo, qtd]) => (
                  <span key={`custo-${custo}`} style={{
                    background: bgCurvaDinâmico, 
                    color: '#fff', 
                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize:'0.7rem', fontWeight:'bold',
                    padding:'0.3rem 0.8rem', borderRadius:'999px',
                    fontFamily:'var(--font-sans)', letterSpacing:'0.5px', textTransform:'uppercase',
                    boxShadow:'0 2px 4px rgba(0,0,0,0.4)'
                  }}>
                    Custo {custo}: {qtd}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const HeaderDeck = ({ titulo }) => (
    <div style={styles.headerRow}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
        {editandoNome ? (
          <>
            <input style={styles.inputNome} value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvarNome()} autoFocus />
            <button style={styles.btnSalvar} onClick={salvarNome}>✔ Salvar</button>
            <button style={styles.btnCancelar} onClick={() => setEditandoNome(false)}>✖</button>
          </>
        ) : (
          <>
            <h2 style={styles.title}>{titulo}: {deckSelecionado.nome}</h2>
            <button style={styles.btnEditar} onClick={() => setEditandoNome(true)} title="Editar nome">✏️</button>
          </>
        )}
      </div>
      <div style={{ display:'flex', gap:'10px' }}>
        <button style={styles.btnSimular} onClick={simularMao}>🖐️ Comprar 7</button>
        <button style={styles.btnExport} onClick={exportarParaTexto}>📋 Exportar</button>
        <button style={styles.btnVoltar} onClick={voltar}>⬅ {tela === 'editar' ? 'Concluir' : 'Voltar'}</button>
      </div>
    </div>
  )

  if (tela === 'ver' && deckSelecionado) {
    return (
      <div style={styles.page}>
        {msg && <div style={styles.alertaFixo}>{msg}</div>}
        <HeaderDeck titulo="Visualizando" />
        <IdentidadeCores cartas={cartasNoDeck} />
        <BarraProgresso />
        {loading ? (
          <div style={styles.grid}>{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <div style={styles.gridDeck}>
            {[...cartasNoDeck]
              .sort((a, b) => (a.printed_name || a.name || '').localeCompare(b.printed_name || b.name || ''))
              .map(carta => (
              <CardMagic key={carta.id} carta={carta} quantidade={carta.quantidade_deck} />
            ))}
          </div>
        )}

        {modalMaoAberta && (
          <div style={styles.modalOverlay} onClick={() => setModalMaoAberta(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h2 style={{...styles.title, textAlign: 'center', marginBottom: '1.5rem'}}>Mão Inicial</h2>
              <div style={styles.maoGrid}>
                {maoInicial.map((carta, index) => (
                  <CardMagic key={`${carta.id}-${index}`} carta={carta} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                <button style={styles.btnSimular} onClick={simularMao}>🔄 Mulligan</button>
                <button style={styles.btnVoltar} onClick={() => setModalMaoAberta(false)}>✖ Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (tela === 'editar' && deckSelecionado) {
    const colecoesUnicas = [...new Set(inventario.map(c => c.set_name).filter(Boolean))].sort()
    
    const tribosSet = new Set()
    inventario.forEach(carta => {
      const typeLine = carta.type_line || ''
      if (typeLine.includes('—')) {
        typeLine.split('—')[1].trim().split(' ').forEach(sub => { if (sub) tribosSet.add(sub) })
      }
    })
    const tribosUnicas = [...tribosSet].sort()

    const invFiltrado = inventario.filter(c => {
      const matchNome = c.name?.toLowerCase().includes(buscaNome.toLowerCase()) ||
                        c.printed_name?.toLowerCase().includes(buscaNome.toLowerCase())
      
      const matchCor = filtroCor ? (c.colors || ['C']).includes(filtroCor) : true
      
      const typeLineOriginal = c.type_line || ''
      const matchTipo = filtroTipo ? typeLineOriginal.toLowerCase().includes(filtroTipo.toLowerCase()) : true
      const matchSubtipo = filtroSubtipo ? typeLineOriginal.includes(filtroSubtipo) : true
      const matchColecao = filtroColecao ? c.set_name === filtroColecao : true

      return matchNome && matchCor && matchTipo && matchSubtipo && matchColecao
    }).sort((a, b) => (a.printed_name || a.name || '').localeCompare(b.printed_name || b.name || ''))
    return (
      <div style={styles.page}>
        {msg && <div style={styles.alertaFixo}>{msg}</div>}
        <HeaderDeck titulo="Editando" />
        <IdentidadeCores cartas={cartasNoDeck} />
        <BarraProgresso />
        <h3 style={styles.subtitle}>No Deck ({totalCartasDeck} cartas)</h3>
        {loading ? (
          <div style={styles.grid}>{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <div style={styles.gridDeck}>
            {[...cartasNoDeck]
              .sort((a, b) => (a.printed_name || a.name || '').localeCompare(b.printed_name || b.name || ''))
              .map(carta => (
              <CardMagic
                key={carta.id} carta={carta} quantidade={carta.quantidade_deck}
                onAumentarQtd={() => adicionarAoDeck(carta)}
                onDiminuirQtd={() => diminuirDoDeck(carta)}
                onRemover={() => removerTudoDoDeck(carta)}
              />
            ))}
          </div>
        )}
        <hr style={styles.divisor} />
        <h3 style={styles.subtitle}>Fichário</h3>
        <div style={styles.filterRow}>
          <input style={styles.inputBusca} placeholder="Filtrar acervo..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} />
          <select style={styles.select} value={filtroCor} onChange={e => setFiltroCor(e.target.value)}>
            <option value="">Todas as Cores</option>
            <option value="W">Branco (W)</option>
            <option value="U">Azul (U)</option>
            <option value="B">Preto (B)</option>
            <option value="R">Vermelho (R)</option>
            <option value="G">Verde (G)</option>
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
        <div style={styles.grid}>
          {invFiltrado.map(carta => (
            <div key={carta.id} style={styles.cardContainer}>
              <CardMagic carta={carta} onAdicionar={carta.disponivel > 0 ? () => adicionarAoDeck(carta) : undefined} />
              <div style={styles.statusFisico}>
                Total: {carta.qtdFisica} | Livres: <strong style={{ color: carta.disponivel > 0 ? '#10b981' : '#ef4444' }}>{carta.disponivel}</strong>
              </div>
            </div>
          ))}
        </div>

        {modalMaoAberta && (
          <div style={styles.modalOverlay} onClick={() => setModalMaoAberta(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h2 style={{...styles.title, textAlign: 'center', marginBottom: '1.5rem'}}>Mão Inicial</h2>
              <div style={styles.maoGrid}>
                {maoInicial.map((carta, index) => (
                  <CardMagic key={`${carta.id}-${index}`} carta={carta} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                <button style={styles.btnSimular} onClick={simularMao}>🔄 Mulligan</button>
                <button style={styles.btnVoltar} onClick={() => setModalMaoAberta(false)}>✖ Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {msg && <div style={styles.alertaFixo}>{msg}</div>}
      <h2 style={styles.title}>Meus Decks</h2>
      <div style={styles.row}>
        <input style={styles.input} placeholder="Novo deck..." value={nomeDeck} onChange={e => setNomeDeck(e.target.value)} onKeyDown={e => e.key === 'Enter' && criarDeck()} />
        <select style={styles.selectModo} value={modoDeck} onChange={e => setModoDeck(e.target.value)}>
          <option value="standard">⚔️ Standard (60)</option>
          <option value="commander">👑 Commander (100)</option>
        </select>
        <button style={styles.btn} onClick={criarDeck}>Criar</button>
      </div>
      {decks.length === 0 && <p style={styles.info}>Nenhum deck criado ainda.</p>}
      <div style={styles.lista}>
        {decks.map(deck => (
          <div key={deck.id} style={styles.deckCard}>
            <span style={styles.deckNome}>{getIconeDeck(deck)} {deck.nome}</span>
            <span style={styles.modoBadge}>{deck.modo === 'commander' ? '👑' : '⚔️'}</span>
            <button style={styles.btnVer} onClick={() => abrirVisualizacao(deck)}>👁 Ver</button>
            <button style={styles.btnEdit} onClick={() => abrirEditor(deck)}>✏ Editar</button>
            <button style={styles.btnDel} onClick={() => excluirDeck(deck.id)}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { padding:'2rem', background:'transparent', minHeight:'100vh' },
  title: { color:'var(--accent-gold)', marginBottom:'0', fontSize:'1.4rem', fontFamily:'var(--font-magic)', letterSpacing:'1px', textShadow:'0 2px 4px rgba(0,0,0,0.5)' },
  subtitle: { color:'var(--accent-gold)', margin:'1rem 0', fontFamily:'var(--font-magic)', letterSpacing:'1px' },
  headerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.5rem' },
  row: { display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  input: { flex:2, minWidth:'150px', padding:'0.75rem', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-main)', border:'1px solid rgba(212, 175, 55, 0.3)', fontFamily:'var(--font-sans)', fontSize:'1rem' },
  selectModo: { flex:1, minWidth:'160px', padding:'0.75rem', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-main)', border:'1px solid rgba(212, 175, 55, 0.3)', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'1rem' },
  inputNome: { padding:'0.5rem 0.75rem', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-main)', border:'1px solid var(--accent-gold)', fontSize:'1.1rem', width:'250px', fontFamily:'var(--font-sans)' },
  btnSimular: { padding:'0.5rem 1rem', background:'#4b5563', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.85rem', transition:'all 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(13, 14, 21, 0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' },
  modalContent: { background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '12px', border: '1px solid var(--accent-gold)', maxWidth: '95vw', overflowX: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.9)' },
  maoGrid: { display: 'flex', gap: '1rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '1rem' },
  btn: { padding:'0.75rem 1.5rem', background:'var(--accent-purple)', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.9rem', transition:'all 0.2s' },
  btnVoltar: { padding:'0.5rem 1rem', background:'#374151', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontFamily:'var(--font-magic)', fontWeight:'bold', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.85rem', transition:'all 0.2s' },
  btnExport: { padding:'0.5rem 1rem', background:'#4b5563', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.85rem', transition:'all 0.2s' },
  btnVer: { background:'#059669', color:'#fff', border:'none', borderRadius:'4px', padding:'0.4rem 0.8rem', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.8rem', transition:'all 0.2s' },
  btnEdit: { background:'#2563eb', color:'#fff', border:'none', borderRadius:'4px', padding:'0.4rem 0.8rem', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.8rem', transition:'all 0.2s' },
  btnDel: { background:'#dc2626', color:'#fff', border:'none', borderRadius:'4px', padding:'0.4rem 0.8rem', cursor:'pointer', fontWeight:'bold', fontFamily:'var(--font-magic)', letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.8rem', transition:'all 0.2s' },
  alertaFixo: { position: 'fixed', top: '20px', right: '20px', background: 'rgba(13, 14, 21, 0.95)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', padding: '1rem 1.5rem', borderRadius: '4px', zIndex: 9999, fontFamily: 'var(--font-magic)', fontSize: '1.1rem', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)', backdropFilter: 'blur(4px)' },
  info: { color:'var(--accent-gold)', fontFamily:'var(--font-magic)', letterSpacing:'1px' },
  lista: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  deckCard: { background:'var(--bg-card)', padding:'1rem', borderRadius:'6px', display:'flex', alignItems:'center', gap:'0.75rem', border:'1px solid rgba(255,255,255,0.05)', boxShadow:'0 4px 6px rgba(0,0,0,0.3)' },
  deckNome: { color:'var(--text-main)', fontWeight:'bold', flex:1, display:'flex', alignItems:'center', fontFamily:'var(--font-sans)', fontSize:'1.05rem', letterSpacing:'0.5px' },
  modoBadge: { fontSize:'1rem' },
  btnEditar: { background: 'transparent', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem', outline: 'none', boxShadow: 'none',transition: 'transform 0.2s'},
  gridDeck: { display:'flex', flexWrap:'wrap', gap:'1rem', background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)' },
  grid: { display:'flex', flexWrap:'wrap', gap:'1rem' },
  divisor: { borderColor:'rgba(212, 175, 55, 0.2)', margin:'2rem 0' },
  cardContainer: { background:'var(--bg-card)', paddingBottom:'0.5rem', borderRadius:'8px', display:'flex', flexDirection:'column', alignItems:'center', border:'1px solid rgba(255,255,255,0.05)' },
  statusFisico: { fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.5rem', fontFamily:'var(--font-sans)', fontWeight:'bold' },
  filterRow: { display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  inputBusca: { flex:2, padding:'0.75rem', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-main)', border:'1px solid rgba(212, 175, 55, 0.3)', fontFamily:'var(--font-sans)' },
  select: { flex:1, padding:'0.75rem', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-main)', border:'1px solid rgba(212, 175, 55, 0.3)', fontFamily:'var(--font-sans)' },
  progressoContainer: { background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', marginBottom:'1.5rem', border:'1px solid rgba(212, 175, 55, 0.2)' },
  progressoBarra: { background:'#374151', borderRadius:'999px', height:'8px', overflow:'hidden' },
  progressoFill: { height:'100%', borderRadius:'999px', transition:'width 0.3s ease' }
}