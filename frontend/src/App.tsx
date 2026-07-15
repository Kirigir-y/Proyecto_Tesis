import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Login from "./pages/Login";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import NovedadesList from "./pages/dashboard/NovedadesList";
import NovedadesForm from "./pages/dashboard/NovedadesForm";
import CalendarioList from "./pages/dashboard/CalendarioList";
import CalendarioForm from "./pages/dashboard/CalendarioForm";
import ResidentesList from "./pages/dashboard/ResidentesList";
import ResidentesForm from "./pages/dashboard/ResidentesForm";
import MedicamentosLista from "./pages/dashboard/MedicamentosLista";
import MedicamentosForm from "./pages/dashboard/MedicamentosForm";
import AdministracionMedicamentos from "./pages/dashboard/AdministracionMedicamentos";

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="novedades" element={<NovedadesList />} />
              <Route path="novedades/nuevo" element={<NovedadesForm />} />
              <Route path="novedades/:id" element={<NovedadesForm />} />
              <Route path="calendario" element={<CalendarioList />} />
              <Route path="calendario/nuevo" element={<CalendarioForm />} />
              <Route path="calendario/:id" element={<CalendarioForm />} />
              <Route path="residentes" element={<ResidentesList />} />
              <Route path="residentes/nuevo" element={<ResidentesForm />} />
              <Route path="residentes/:id" element={<ResidentesForm />} />
              <Route path="medicamentos" element={<MedicamentosLista />} />
              <Route path="medicamentos/nuevo" element={<MedicamentosForm />} />
              <Route path="medicamentos/:id" element={<MedicamentosForm />} />
              <Route path="administracion" element={<AdministracionMedicamentos />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
