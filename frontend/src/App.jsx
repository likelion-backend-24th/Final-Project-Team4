import { Navigate, Route, Routes } from 'react-router-dom';
import { getRole } from './api/auth';
import Header from './components/Header';
import AdminHeader from './components/AdminHeader';
import CustomerHeader from './components/customer/CustomerHeader';
import ExpoList from './pages/ExpoList';
import ExpoDetail from './pages/ExpoDetail';
import BoothApplication from './pages/BoothApplication';
import ConsultationRequests from './pages/ConsultationRequests';
import LeadCapture from './pages/LeadCapture';
import Login from './pages/Login';
import OAuth2Redirect from './pages/OAuth2Redirect';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MyPage from './pages/MyPage';
import BoothManage from './pages/BoothManage';
import BoothInsights from './pages/BoothInsights';
import BoothVehicleRegister from './pages/BoothVehicleRegister';
import Payment from './pages/Payment';
import CustomerExpoList from './pages/customer/CustomerExpoList';
import ExhibitorList from './pages/customer/ExhibitorList';
import ExhibitorVehicleList from './pages/customer/ExhibitorVehicleList';
import VehicleDetail from './pages/customer/VehicleDetail';
import CustomerMyPage from './pages/customer/CustomerMyPage';
// import AdminDashboard from './pages/admin/AdminDashboard'; // 대시보드 탭 임시 비활성화
import AdminExpoList from './pages/admin/AdminExpoList';
import AdminExpoDetail from './pages/admin/AdminExpoDetail';
import AdminExpoCreate from './pages/admin/AdminExpoCreate';
import AdminExpoEdit from './pages/admin/AdminExpoEdit';
import AdminRevenueStats from './pages/admin/AdminRevenueStats';

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

// "/"는 원래 참가업체(EXHIBITOR) 전용 홈. USER/ADMIN 계정이 로그인 후 새탭·북마크 등으로
// 여기 들어오면 API가 403만 내려줄 뿐 자동으로 자기 화면으로 보내주지 않았음 -> role 보고 보내줌
function ExhibitorHome() {
  const role = getRole();
  if (role === 'USER') return <Navigate to="/customer" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin/applications" replace />;
  return (
    <ExhibitorLayout>
      <ExpoList />
    </ExhibitorLayout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<ExhibitorHome />} />
      <Route path="/expos/:expoId" element={<ExhibitorLayout><ExpoDetail /></ExhibitorLayout>} />
      <Route path="/expos/:expoId/apply" element={<ExhibitorLayout><BoothApplication /></ExhibitorLayout>} />
      <Route path="/mypage" element={<ExhibitorLayout><MyPage /></ExhibitorLayout>} />
      <Route path="/mypage/booths/:boothId" element={<ExhibitorLayout><BoothManage /></ExhibitorLayout>} />
      <Route path="/mypage/booths/:boothId/insights" element={<ExhibitorLayout><BoothInsights /></ExhibitorLayout>} />
      <Route
        path="/mypage/booths/:boothId/vehicles/new"
        element={<ExhibitorLayout><BoothVehicleRegister /></ExhibitorLayout>}
      />
      <Route
        path="/mypage/booths/:boothId/vehicles/:vehicleId/edit"
        element={<ExhibitorLayout><BoothVehicleRegister /></ExhibitorLayout>}
      />
      <Route path="/consultations" element={<ExhibitorLayout><ConsultationRequests /></ExhibitorLayout>} />
      <Route path="/leads" element={<ExhibitorLayout><LeadCapture /></ExhibitorLayout>} />
      <Route path="/payment/:groupId" element={<ExhibitorLayout><Payment /></ExhibitorLayout>} />

      <Route path="/customer" element={<CustomerLayout><CustomerExpoList /></CustomerLayout>} />
      <Route
        path="/customer/expos/:expoId"
        element={<CustomerLayout><ExhibitorList /></CustomerLayout>}
      />
      <Route
        path="/customer/expos/:expoId/booths/:boothId"
        element={<CustomerLayout><ExhibitorVehicleList /></CustomerLayout>}
      />
      <Route
        path="/customer/expos/:expoId/vehicles/:vehicleId"
        element={<CustomerLayout><VehicleDetail /></CustomerLayout>}
      />
      <Route path="/customer/mypage" element={<CustomerLayout><CustomerMyPage /></CustomerLayout>} />

      {/* 대시보드 임시 비활성화: /admin 접속 시 참가신청 관리로 이동 */}
      <Route path="/admin" element={<Navigate to="/admin/applications" replace />} />
      <Route path="/admin/expos/new" element={<AdminLayout><AdminExpoCreate /></AdminLayout>} />
      <Route path="/admin/expos/:expoId/edit" element={<AdminLayout><AdminExpoEdit /></AdminLayout>} />
      <Route path="/admin/applications" element={<AdminLayout><AdminExpoList /></AdminLayout>} />
      <Route path="/admin/applications/:expoId" element={<AdminLayout><AdminExpoDetail /></AdminLayout>} />
      <Route path="/admin/stats" element={<AdminLayout><AdminRevenueStats /></AdminLayout>} />
    </Routes>
  );
}

export default App;