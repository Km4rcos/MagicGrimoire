import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Fichario from './pages/Fichario'
import Busca from './pages/Busca'
import Decks from './pages/Decks'
import Navbar from './components/Navbar'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ textAlign:'center', marginTop:'4rem', color:'#fff' }}>Carregando...</div>

  return (
    <BrowserRouter>
      {session && <Navbar session={session} />}
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Fichario session={session} /> : <Navigate to="/login" />} />
        <Route path="/busca" element={session ? <Busca session={session} /> : <Navigate to="/login" />} />
        <Route path="/decks" element={session ? <Decks session={session} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}// Este arquivo é o ponto de entrada da aplicação. Ele gerencia a autenticação do usuário e define as rotas para as diferentes páginas (Login, Fichário, Busca e Decks). O componente Navbar é exibido apenas quando o usuário está autenticado.