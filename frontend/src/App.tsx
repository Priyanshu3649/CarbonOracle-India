import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import UploadCsv from './pages/UploadCsv';
import ManualEntry from './pages/ManualEntry';
import TreeRecords from './pages/TreeRecords';
import { Plots, Species } from './pages/SimplePages';
import Login from './pages/Login';
import BlockchainReports from './pages/BlockchainReports';
import { AuthProvider, useAuth } from './lib/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-brand-light font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/upload" element={<UploadCsv />} />
                    <Route path="/manual" element={<ManualEntry />} />
                    <Route path="/trees" element={<TreeRecords />} />
                    <Route path="/plots" element={<Plots />} />
                    <Route path="/species" element={<Species />} />
                    <Route path="/blockchain" element={<BlockchainReports />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
