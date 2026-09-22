import { Navigate, Route, Routes } from 'react-router-dom';
import { getRole } from './api/auth';
import Header from './components/exhibitor/Header';
import AdminHeader from './components/admin/AdminHeader';
import CustomerHeader from './components/customer/CustomerHeader';
import Footer from './components/Footer';
import ExpoList from './pages/exhibitor/ExpoList';
import ExpoDetail from './pages/exhibitor/ExpoDetail';
import BoothApplication from './pages/exhibitor/BoothApplication';
import ConsultationRequests from './pages/exhibitor/ConsultationRequests';
import LeadCapture from './pages/exhibitor/LeadCapture';
import Login from './pages/Login';
import OAuth2Redirect from './pages/OAuth2Redirect';
import OAuth2Consent from './pages/OAuth2Consent';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MyPage from './pages/exhibitor/MyPage';
import BoothManage from './pages/exhibitor/BoothManage';
import BoothInsights from './pages/exhibitor/BoothInsights';
import BoothVehicleRegister from './pages/exhibitor/BoothVehicleRegister';
import Payment from './pages/exhibitor/Payment';
import CustomerExpoList from './pages/customer/CustomerExpoList';
import ExhibitorList from './pages/customer/ExhibitorList';
import ExhibitorVehicleList from './pages/customer/ExhibitorVehicleList';
import VehicleDetail from './pages/customer/VehicleDetail';
import CustomerMyPage from './pages/customer/CustomerMyPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExpoList from './pages/admin/AdminExpoList';
import AdminExpoDetail from './pages/admin/AdminExpoDetail';
import AdminExpoCreate from './pages/admin/AdminExpoCreate';
import AdminExpoEdit from './pages/admin/AdminExpoEdit';
import AdminRevenueStats from './pages/admin/AdminRevenueStats';
import AdminStats from './pages/admin/AdminStats';
import AdminMemberList from './pages/admin/AdminMemberList';
import AdminMemberDetail from './pages/admin/AdminMemberDetail';
import AdminAttendeeList from './pages/admin/AdminAttendeeList';
import AdminExhibitorList from './pages/admin/AdminExhibitorList';

// 역할별 헤더만 다르고 본문, 푸터 배치는 공통.
// 관리자 페이지는 각자 AdminSidebarLayout으로 자체 래핑하므로 이 Layout/AdminHeader는
// 관리자 화면에서는 쓰이지 않고, 로그인한 관리자가 약관/개인정보 처리방침(LegalLayout)을 볼 때만 쓰인다.
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
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
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

      {/* 관리자 페이지는 전부 AdminSidebarLayout으로 자체 래핑 - 여기선 Layout/AdminHeader를 안 씀 */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/expos/new" element={<AdminExpoCreate />} />
      <Route path="/admin/expos/:expoId/edit" element={<AdminExpoEdit />} />
      <Route path="/admin/applications" element={<AdminExpoList />} />
      <Route path="/admin/applications/:expoId" element={<AdminExpoDetail />} />
      <Route path="/admin/stats" element={<AdminStats />} />
      <Route path="/admin/stats/payments" element={<AdminRevenueStats />} />
      <Route path="/admin/members" element={<AdminMemberList />} />
      {/* 참관객/참가업체 관리 - 회원 관리 하위 메뉴. 상세보기는 역할 공용인 AdminMemberDetail을 그대로 재사용 */}
      <Route path="/admin/members/attendees" element={<AdminAttendeeList />} />
      <Route path="/admin/members/exhibitors" element={<AdminExhibitorList />} />
      <Route path="/admin/members/:userId" element={<AdminMemberDetail />} />
    </Routes>
  );
}

export default App;
