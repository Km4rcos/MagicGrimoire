export default function IdentidadeCores({ cartas }) {
  if (!cartas || cartas.length === 0) return null

  const coresSet = new Set()
  cartas.forEach(c => {
    if (c.colors && c.colors.length > 0) {
      c.colors.forEach(cor => coresSet.add(cor))
    }
  })

  const coresArray = Array.from(coresSet)
  if (coresArray.length === 0) coresArray.push('C')

  const iconesClasses = { 
    W: 'ms-w', 
    U: 'ms-u', 
    B: 'ms-b', 
    R: 'ms-r', 
    G: 'ms-g', 
    C: 'ms-c' 
  }
  const nomesCores = { W: 'Branco', U: 'Azul', B: 'Preto', R: 'Vermelho', G: 'Verde', C: 'Incolor' }

  return (
    <div style={{ display:'flex', gap:'10px', alignItems:'center', background:'rgba(26, 28, 41, 0.8)', padding:'0.5rem 1rem', borderRadius:'8px', marginBottom:'1.5rem', width:'fit-content', border:'1px solid var(--accent-gold)' }}>
      <span style={{ color:'var(--text-main)', fontWeight:'bold', fontSize:'0.9rem', fontFamily:'var(--font-magic)', letterSpacing:'1px' }}>
        Identidade do Deck:
      </span>
      {coresArray.map(cor => (
        <span key={cor} title={nomesCores[cor]} style={{ fontSize:'1.4rem' }}>
          <i className={`ms ${iconesClasses[cor]} ms-cost ms-shadow`}></i>
        </span>
      ))}
    </div>
  )
}