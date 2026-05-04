export default function CardMagic({ carta, onAdicionar, onRemover, quantidade, onAumentarQtd, onDiminuirQtd }) {
  const nomePrincipal = carta.printed_name || carta.name
  const classeRaridade = `rarity-${carta.rarity || 'common'}`

  return (
    <div style={styles.card}>
      <div className="card-foil" style={{ position:'relative', width:'100%' }}>
        <img
          src={carta.image_uris?.normal || carta.card_faces?.[0]?.image_uris?.normal}
          alt={nomePrincipal}
          className={classeRaridade}
          style={styles.img}
        />
        {quantidade !== undefined && (
          <div style={styles.contadorBadge}>{quantidade}</div>
        )}
      </div>

      <p style={styles.name}>{nomePrincipal}</p>
      {(onDiminuirQtd || onAumentarQtd) && (
        <div style={styles.qtdRow}>
          {onDiminuirQtd && <button style={styles.btnQtd} onClick={onDiminuirQtd}>－</button>}
          {onAumentarQtd && <button style={styles.btnQtd} onClick={onAumentarQtd}>＋</button>}
        </div>
      )}

      <div style={styles.actions}>
        {onAdicionar && <button style={styles.btnAdd} onClick={() => onAdicionar(carta)}>＋ Adicionar</button>}
        {onRemover && <button style={styles.btnRem} onClick={() => onRemover(carta)}>🗑 Remover</button>}
      </div>
    </div>
  )
}

const styles = {
  card: { background:'var(--bg-card)', borderRadius:'10px', padding:'0.75rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', width:'180px', border:'1px solid rgba(255,255,255,0.05)' },
  img: { width:'100%', borderRadius:'6px', display:'block' },
  contadorBadge: {
    position: 'absolute', 
    top: '0', 
    left: '0',
    width: '28px',
    height: '28px',
    background: 'rgb(63, 63, 63)', 
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
    borderTopLeftRadius: '6px',
    display: 'flex', 
    alignItems: 'flex-start', 
    justifyContent: 'flex-start',
    paddingTop: '2px',
    paddingLeft: '4px',
    zIndex: 10,
    fontFamily: 'var(--font-sans)'
  },
  name: { color:'var(--text-main)', fontSize:'0.85rem', textAlign:'center', margin:0, fontWeight:'bold', fontFamily:'var(--font-sans)' },
  qtdRow: { display:'flex', alignItems:'center', gap:'0.5rem' },
  btnQtd: { background:'#374151', color:'#fff', border:'none', borderRadius:'6px', padding:'0.2rem 0.5rem', cursor:'pointer', fontSize:'1rem', fontWeight:'bold' },
  actions: { display:'flex', gap:'0.5rem', marginTop:'0.25rem' },
  btnAdd: { background:'#059669', color:'#fff', border:'none', borderRadius:'6px', padding:'0.3rem 0.6rem', cursor:'pointer', fontSize:'0.8rem', fontFamily:'var(--font-sans)', fontWeight:'500' },
  btnRem: { background:'#dc2626', color:'#fff', border:'none', borderRadius:'6px', padding:'0.3rem 0.6rem', cursor:'pointer', fontSize:'0.8rem', fontFamily:'var(--font-sans)', fontWeight:'500' }
}