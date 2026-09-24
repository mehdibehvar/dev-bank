import { Routes, Route } from 'react-router-dom';
import BankDashboard from './BankDashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BankDashboard />} />
    </Routes>
  );
}
