import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import LowStock from './pages/LowStock'
import OutOfStock from './pages/OutOfStock'
import NotCounted from './pages/NotCounted'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import StockAdjustment from './pages/StockAdjustment'
import TransactionHistory from './pages/TransactionHistory'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/low-stock" element={<ProtectedRoute><LowStock /></ProtectedRoute>} />
        <Route path="/out-of-stock" element={<ProtectedRoute><OutOfStock /></ProtectedRoute>} />
        <Route path="/not-counted" element={<ProtectedRoute><NotCounted /></ProtectedRoute>} />
        <Route path="/stock-in" element={<ProtectedRoute><StockIn /></ProtectedRoute>} />
        <Route path="/stock-out" element={<ProtectedRoute><StockOut /></ProtectedRoute>} />
        <Route
          path="/stock-adjustment"
          element={<ProtectedRoute allowedRoles={['admin', 'manager']}><StockAdjustment /></ProtectedRoute>}
        />
        <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
        <Route
          path="/suppliers"
          element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Suppliers /></ProtectedRoute>}
        />
        <Route
          path="/reports"
          element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>}
        />
        <Route
          path="/users"
          element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>}
        />
      </Routes>
    </AuthProvider>
  )
}
