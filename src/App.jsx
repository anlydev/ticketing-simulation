import { Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import QueuePage from './pages/QueuePage.jsx';
import SeatPage from './pages/SeatPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import { SimulationProvider } from './context/SimulationContext.jsx';

export default function App() {
  return (
    <SimulationProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/queue/:performanceId" element={<QueuePage />} />
        <Route path="/seats/:performanceId" element={<SeatPage />} />
        <Route path="/payment/:performanceId" element={<PaymentPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SimulationProvider>
  );
}
