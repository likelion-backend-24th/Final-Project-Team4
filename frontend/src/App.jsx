import { Navigate, Route, Routes } from 'react-router-dom';
import { getRole } from './api/auth';
import Header from './components/Header';
import AdminHeader from './components/AdminHeader';
import CustomerHeader from './components/customer/CustomerHeader';
import Footer from './components/Footer';
import ExpoList from './pages/ExpoList';
import ExpoDetail from './pages/ExpoDetail';
import BoothApplication from './pages/BoothApplication';
import ConsultationRequests from './pages/ConsultationRequests';
import LeadCapture from './pages/LeadCapture';
import Login from './pages/Login';
import OAuth2Redirect from './pages/OAuth2Redirect';
import OAuth2Consent from './pages/OAuth2Consent';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
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

// 역할별 헤더만 다르고 본문, 푸터 배치는 공통
function Layout({ header, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function ExhibitorLayout({ children }) {
  return <Layout header={<Header />}>{children}</Layout>;
}

function CustomerLayout({ children }) {
  return <Layout header={<CustomerHeader />}>{children}</Layout>;
}

function AdminLayout({ children }) {
  return <Layout header={<AdminHeader />}>{children}</Layout>;
}

// 약관, 개인정보처리방침은 비로그인 포함 모든 역할이 봄 -> 로그인한 역할의 헤더를 그대로 보여줌
// 비로그인은 "둘러보기"와 같은 참관객 화면 기준
function LegalLayout({ children }) {
  const role = getRole();
  if (role === 'EXHIBITOR') return <ExhibitorLayout>{children}</ExhibitorLayout>;
  if (role === 'ADMIN') return <AdminLayout>{children}</AdminLayout>;
  return <CustomerLayout>{children}</CustomerLayout>;
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
      <Route path="/oauth2/consent" element={<OAuth2Consent />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<LegalLayout><Terms /></LegalLayout>} />
      <Route path="/privacy" element={<LegalLayout><PrivacyPolicy /></LegalLayout>} />

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