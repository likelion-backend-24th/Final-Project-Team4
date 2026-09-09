import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import AdminHeader from './components/AdminHeader';
import CustomerHeader from './components/customer/CustomerHeader';
import ExpoList from './pages/ExpoList';
import ExpoDetail from './pages/ExpoDetail';
import BoothApplication from './pages/BoothApplication';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import BoothManage from './pages/BoothManage';
import Payment from './pages/Payment';
import CustomerExpoList from './pages/customer/CustomerExpoList';
import ExhibitorVehicleList from './pages/customer/ExhibitorVehicleList';
import VehicleDetail from './pages/customer/VehicleDetail';
import CustomerMyPage from './pages/customer/CustomerMyPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExpoList from './pages/admin/AdminExpoList';
import AdminExpoDetail from './pages/admin/AdminExpoDetail';
import AdminExpoCreate from './pages/admin/AdminExpoCreate';

function ExhibitorLayout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function CustomerLayout({ children }) {
  return (
    <>
      <CustomerHeader />
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
      <Route path="/mypage/booths/:boothId" element={<ExhibitorLayout><BoothManage /></ExhibitorLayout>} />
      <Route path="/payment/:groupId" element={<ExhibitorLayout><Payment /></ExhibitorLayout>} />

      <Route path="/customer" element={<CustomerLayout><CustomerExpoList /></CustomerLayout>} />
      <Route
        path="/customer/expos/:expoId"
        element={<CustomerLayout><ExhibitorVehicleList /></CustomerLayout>}
      />
      <Route
        path="/customer/expos/:expoId/vehicles/:vehicleId"
        element={<CustomerLayout><VehicleDetail /></CustomerLayout>}
      />
      <Route path="/customer/mypage" element={<CustomerLayout><CustomerMyPage /></CustomerLayout>} />

      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/expos/new" element={<AdminLayout><AdminExpoCreate /></AdminLayout>} />
      <Route path="/admin/applications" element={<AdminLayout><AdminExpoList /></AdminLayout>} />
      <Route path="/admin/applications/:expoId" element={<AdminLayout><AdminExpoDetail /></AdminLayout>} />
    </Routes>
  );
}

export default App;
