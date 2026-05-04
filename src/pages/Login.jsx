import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState('login')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !senha.trim()) { setMsg('Preencha todos os campos.'); return }
    setLoading(true)
    setMsg('')
    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) setMsg(error.message)
      else setMsg('Conta criada! Verifique seu e-mail.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setMsg('E-mail ou senha incorretos.')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✨</div>
          <h1 style={styles.title}>MagicGrimoireDB</h1>
        </div>
        <p style={styles.subtitle}>{modo === 'login' ? 'Entrar na conta' : 'Criar conta'}</p>
        <input style={styles.input} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <input style={styles.input} type="password" placeholder="Senha (mínimo 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        {msg && <p style={styles.msg}>{msg}</p>}
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
        <p style={styles.toggle} onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setMsg('') }}>
          {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f1a' },
  card: { background:'#1a1a2e', padding:'2.5rem', borderRadius:'12px', width:'100%', maxWidth:'420px', display:'flex', flexDirection:'column', gap:'1rem', margin:'0 1rem' },
  title: { color:'#a78bfa', textAlign:'center', margin:0, fontSize:'1.8rem' },
  subtitle: { color:'#94a3b8', textAlign:'center', margin:0 },
  input: { padding:'0.75rem', borderRadius:'8px', border:'1px solid #374151', background:'#111827', color:'#fff', fontSize:'1rem' },
  btn: { padding:'0.75rem', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  msg: { color:'#f87171', textAlign:'center', margin:0 },
  toggle: { color:'#a78bfa', textAlign:'center', cursor:'pointer', fontSize:'0.9rem' }
}