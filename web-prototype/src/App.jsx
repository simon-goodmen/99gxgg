import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileLayout from './layouts/MobileLayout';
import Home from './pages/Home';
import Steel from './pages/Steel';
import Concrete from './pages/Concrete';
import Materials from './pages/Materials';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="steel" element={<Steel />} />
          <Route path="concrete" element={<Concrete />} />
          <Route path="materials" element={<Materials />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
