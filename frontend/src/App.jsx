import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import AdminHeader from './components/AdminHeader';
import ExpoList from './pages/ExpoList';
import ExpoDetail from './pages/ExpoDetail';
import BoothApplication from './pages/BoothApplication';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import Payment from './pages/Payment';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExpoList from './pages/admin/AdminExpoList';
import AdminExpoDetail from './pages/admin/AdminExpoDetail';

function ExhibitorLayout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function AdminLayout({ children }) {
  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<ExhibitorLayout><ExpoList /></ExhibitorLayout>} />
      <Route path="/expos/:expoId" element={<ExhibitorLayout><ExpoDetail /></ExhibitorLayout>} />
      <Route path="/expos/:expoId/apply" element={<ExhibitorLayout><BoothApplication /></ExhibitorLayout>} />
      <Route path="/mypage" element={<ExhibitorLayout><MyPage /></ExhibitorLayout>} />
      <Route path="/payment/:applicationId" element={<ExhibitorLayout><Payment /></ExhibitorLayout>} />

      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/applications" element={<AdminLayout><AdminExpoList /></AdminLayout>} />
      <Route path="/admin/applications/:expoId" element={<AdminLayout><AdminExpoDetail /></AdminLayout>} />
    </Routes>
  );
}

export default App;
