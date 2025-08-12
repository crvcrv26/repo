import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeIcon,
  UsersIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { 
  ChartBarIcon as ChartBarSolid 
} from '@heroicons/react/24/solid';

interface LayoutProps {
  children: React.ReactNode;
}

const getNavigation = (userRole?: string) => {
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, description: 'Overview and analytics' },
  ];

  // Add role-specific navigation items
  if (userRole === 'superSuperAdmin' || userRole === 'superAdmin' || userRole === 'admin') {
    baseNavigation.push({ 
      name: 'Users', 
      href: '/users', 
      icon: UsersIcon, 
      description: 'Manage team members' 
    });
    baseNavigation.push({ 
      name: 'Excel Files', 
      href: '/excel-files', 
      icon: DocumentArrowUpIcon, 
      description: 'Upload and manage data' 
    });
  }

  // Add admin-specific features (non-payment related)
  if (userRole === 'admin' || userRole === 'superAdmin' || userRole === 'superSuperAdmin') {
    baseNavigation.push({ 
      name: 'Money Management', 
      href: '/money', 
      icon: CurrencyDollarIcon, 
      description: 'Payment & billing records' 
    });
    baseNavigation.push({ 
      name: 'OTP Management', 
      href: '/otp-management', 
      icon: KeyIcon, 
      description: 'Generate access codes' 
    });
    baseNavigation.push({ 
      name: 'Notifications', 
      href: '/notifications', 
      icon: BellIcon, 
      description: 'Activity alerts' 
    });
  }



  if (userRole === 'auditor') {
    baseNavigation.push({ 
      name: 'Money Management', 
      href: '/money', 
      icon: CurrencyDollarIcon, 
      description: 'Payment & billing records' 
    });
    baseNavigation.push({ 
      name: 'Field Agents', 
      href: '/users', 
      icon: UsersIcon, 
      description: 'View team members' 
    });
  }

  // Add field agent specific navigation
  if (userRole === 'fieldAgent') {
    // Field agent payment items are now in the dropdown
  }

  // Add common navigation items
  baseNavigation.push({
    name: 'Vehicle Search', 
    href: '/vehicle-search', 
    icon: MagnifyingGlassIcon, 
    description: 'Find and track vehicles'
  });

  return baseNavigation;
};

const getPaymentNavigation = (userRole?: string) => {
  const paymentItems = [];

  // Add payment items for super super admin
  if (userRole === 'superSuperAdmin') {
    paymentItems.push({ 
      name: 'Payment Management', 
      href: '/admin-payments', 
      icon: CurrencyDollarIcon, 
      description: 'Manage team payments' 
    });
    paymentItems.push({ 
      name: 'QR Code Management', 
      href: '/qr-management', 
      icon: QrCodeIcon, 
      description: 'Upload and manage QR codes' 
    });
    paymentItems.push({ 
      name: 'Payment Approval', 
      href: '/payment-approval', 
      icon: CheckCircleIcon, 
      description: 'Review payment proofs' 
    });
    paymentItems.push({ 
      name: 'Admin Payment Management', 
      href: '/admin-payment-management', 
      icon: CurrencyDollarIcon, 
      description: 'Manage admin payments' 
    });
    paymentItems.push({ 
      name: 'SuperSuperAdmin Payment Management', 
      href: '/super-super-admin-payments', 
      icon: CurrencyDollarIcon, 
      description: 'Manage super admin payments' 
    });
  }

  // Add payment items for super admin
  if (userRole === 'superAdmin') {
    paymentItems.push({ 
      name: 'Payment Management', 
      href: '/admin-payments', 
      icon: CurrencyDollarIcon, 
      description: 'Manage team payments' 
    });
    paymentItems.push({ 
      name: 'QR Code Management', 
      href: '/qr-management', 
      icon: QrCodeIcon, 
      description: 'Upload and manage QR codes' 
    });
    paymentItems.push({ 
      name: 'Payment Approval', 
      href: '/payment-approval', 
      icon: CheckCircleIcon, 
      description: 'Review payment proofs' 
    });
    paymentItems.push({ 
      name: 'Admin Payment Management', 
      href: '/admin-payment-management', 
      icon: CurrencyDollarIcon, 
      description: 'Manage admin payments' 
    });
    paymentItems.push({ 
      name: 'My SuperSuperAdmin Payments', 
      href: '/super-admin-my-payments', 
      icon: CurrencyDollarIcon, 
      description: 'View payments to super super admin' 
    });
  }

  // Add payment items for admin
  if (userRole === 'admin') {
    paymentItems.push({ 
      name: 'Payment Management', 
      href: '/admin-payments', 
      icon: CurrencyDollarIcon, 
      description: 'Manage team payments' 
    });
    paymentItems.push({ 
      name: 'QR Code Management', 
      href: '/qr-management', 
      icon: QrCodeIcon, 
      description: 'Upload and manage QR codes' 
    });
    paymentItems.push({ 
      name: 'Payment Approval', 
      href: '/payment-approval', 
      icon: CheckCircleIcon, 
      description: 'Review payment proofs' 
    });
    paymentItems.push({ 
      name: 'My Admin Payments', 
      href: '/admin-my-payments', 
      icon: CurrencyDollarIcon, 
      description: 'View payments to super admin' 
    });
  }

  // Add payment items for auditor
  if (userRole === 'auditor') {
    paymentItems.push({ 
      name: 'My Payments', 
      href: '/user-payments', 
      icon: CurrencyDollarIcon, 
      description: 'View payment dues' 
    });
    paymentItems.push({ 
      name: 'Payment Submission', 
      href: '/payment-submission', 
      icon: QrCodeIcon, 
      description: 'Submit payment proofs' 
    });
  }

  // Add payment items for field agent
  if (userRole === 'fieldAgent') {
    paymentItems.push({ 
      name: 'My Payments', 
      href: '/user-payments', 
      icon: CurrencyDollarIcon, 
      description: 'View payment dues' 
    });
    paymentItems.push({ 
      name: 'Payment Submission', 
      href: '/payment-submission', 
      icon: QrCodeIcon, 
      description: 'Submit payment proofs' 
    });
  }

  return paymentItems;
};

const getRoleBadgeColor = (role?: string) => {
  switch (role) {
    case 'superSuperAdmin':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    case 'superAdmin':
      return 'bg-gradient-to-r from-pink-500 to-red-500 text-white';
    case 'admin':
      return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white';
    case 'fieldAgent':
      return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
    case 'auditor':
      return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPageTitle = (pathname: string, navigation: any[]) => {
  const currentPage = navigation.find(item => item.href === pathname);
  return currentPage?.name || 'Dashboard';
};

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [paymentsDropdownOpen, setPaymentsDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = getNavigation(user?.role);
  const paymentNavigation = getPaymentNavigation(user?.role);
  const pageTitle = getPageTitle(location.pathname, [...navigation, ...paymentNavigation]);

  // Check if current page is a payment page
  const isPaymentPage = paymentNavigation.some(item => item.href === location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              {/* Mobile sidebar header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <ChartBarSolid className="h-5 w-5 text-white" />
                  </div>
                  <span className="ml-3 text-xl font-bold text-gray-900">RepoTrack</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}

                {/* Mobile Payments Dropdown */}
                {paymentNavigation.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setPaymentsDropdownOpen(!paymentsDropdownOpen)}
                      className={`nav-item w-full text-left ${isPaymentPage ? 'active' : ''}`}
                    >
                      <CurrencyDollarIcon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">Payments</div>
                        <div className="text-xs text-gray-500 mt-0.5">Payment management</div>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${paymentsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {paymentsDropdownOpen && (
                      <div className="ml-6 space-y-1">
                        {paymentNavigation.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                              <item.icon className="h-5 w-5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </nav>

              {/* Mobile user section */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-10 w-10 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm w-full"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Desktop sidebar header */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <ChartBarSolid className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">RepoTrack</span>
            </div>
          </div>

          {/* Desktop navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Payments Dropdown - at bottom */}
          {paymentNavigation.length > 0 && (
            <div className="px-4 pb-4">
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentsDropdownOpen(!paymentsDropdownOpen)}
                  className={`nav-item w-full text-left ${isPaymentPage ? 'active' : ''}`}
                >
                  <CurrencyDollarIcon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Payments</div>
                    <div className="text-xs text-gray-500 mt-0.5">Payment management</div>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${paymentsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {paymentsDropdownOpen && (
                  <div className="ml-6 space-y-1">
                    {paymentNavigation.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop user section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Top navigation bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
                <p className="text-sm text-gray-500">
                  {[...navigation, ...paymentNavigation].find(item => item.href === location.pathname)?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Desktop user menu */}
              <div className="hidden lg:flex lg:items-center lg:space-x-4">
                <span className="text-sm text-gray-600">Welcome back,</span>
                <span className="font-medium text-gray-900">{user?.name}</span>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role}
                </div>
              </div>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <UserCircleIcon className="h-8 w-8" />
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-3" />
                      Profile Settings
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setUserMenuOpen(false)} 
        />
      )}
    </div>
  );
}