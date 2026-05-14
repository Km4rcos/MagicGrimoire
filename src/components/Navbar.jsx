import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>MagicGrimoire</span>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Fichário</Link>
        <Link to="/busca" style={styles.link}>Adicionar Cartas</Link>
        <Link to="/decks" style={styles.link}>Meus Decks</Link>
      </div>
      <button onClick={handleLogout} style={styles.btn}>Sair</button>
    </nav>
  )
}

const styles = {
  nav: { 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'space-between', 
    padding:'1rem 2rem', 
    background:'var(--bg-card)', 
    borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
    flexWrap:'wrap', 
    gap:'1rem',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  brand: { 
    fontSize:'1.4rem', 
    fontWeight:'bold', 
    color:'var(--accent-gold)',
    fontFamily:'var(--font-magic)', 
    letterSpacing:'1px',
    textShadow:'0 2px 4px rgba(0,0,0,0.5)'
  },
  links: { 
    display:'flex', 
    gap:'2rem', 
    flexWrap:'wrap' 
  },
  link: { 
    color:'var(--text-main)', 
    textDecoration:'none', 
    fontWeight:'500',
    fontFamily:'var(--font-magic)',
    fontSize:'1.1rem',
    letterSpacing:'1px'
  },
  btn: { 
    background:'transparent', 
    color:'var(--accent-purple)', 
    border:'1px solid var(--accent-purple)', 
    borderRadius:'6px', 
    padding:'0.4rem 1.2rem', 
    cursor:'pointer',
    fontFamily:'var(--font-sans)',
    fontWeight:'bold',
    transition:'all 0.2s'
  }
}