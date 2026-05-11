import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Login from './pages/Login.jsx'
import Accueil from './pages/Accueil.jsx'
import ListeClients from './pages/ListeClients.jsx'
import DetailClient from './pages/DetailClient.jsx'
import NouveauClient from './pages/NouveauClient.jsx'
import Identification from './pages/Identification.jsx'
import AjoutFiche from './pages/AjoutFiche.jsx'
import DetailFiche from './pages/DetailFiche.jsx'
import EditFiche from './pages/EditFiche.jsx'
import ImprimerFiches from './pages/ImprimerFiches.jsx'
import ListeUtilisateurs from './pages/ListeUtilisateurs.jsx'
import NouveauUtilisateur from './pages/NouveauUtilisateur.jsx'
import Journal from './pages/Journal.jsx'

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/clients" element={<ListeClients />} />
            <Route path="/clients/nouveau" element={<NouveauClient />} />
            <Route path="/clients/:id" element={<DetailClient />} />
            <Route path="/fiches/identification" element={<Identification />} />
            <Route path="/fiches/nouveau" element={<AjoutFiche />} />
            <Route path="/fiches/imprimer" element={<ImprimerFiches />} />
            <Route path="/fiches/:id" element={<DetailFiche />} />
            <Route path="/fiches/:id/modifier" element={<EditFiche />} />
            <Route path="/utilisateurs" element={<ListeUtilisateurs />} />
            <Route path="/utilisateurs/nouveau" element={<NouveauUtilisateur />} />
            <Route path="/journal" element={<Journal />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}
