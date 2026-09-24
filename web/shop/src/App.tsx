import { Routes, Route } from 'react-router-dom';
import Shop from './Shop';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shop />} />
    </Routes>
  );
}
