import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
}

const getNavigation = (userRole?: string) => {
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  ]

  // Add role-specific navigation items
  if (userRole === 'superSuperAdmin' || userRole === 'superAdmin' || userRole === 'admin') {
    baseNavigation.push({ name: 'Users', href: '/users', icon: UsersIcon })
    baseNavigation.push({ name: 'Excel Files', href: '/excel-files', icon: DocumentArrowUpIcon })
  }

  // Add admin-specific features
  if (userRole === 'admin') {
    baseNavigation.push({ name: 'OTP Management', href: '/otp-management', icon: KeyIcon })
    baseNavigation.push({ name: 'Notifications', href: '/notifications', icon: BellIcon })
  }

  // Add notifications for super admins too
  if (userRole === 'superAdmin' || userRole === 'superSuperAdmin') {
    baseNavigation.push({ name: 'Notifications', href: '/notifications', icon: BellIcon })
  }

  if (userRole === 'auditor') {
    baseNavigation.push({ name: 'Field Agents', href: '/users', icon: UsersIcon })
  }

  // Add common navigation items
  baseNavigation.push(
    { name: 'Vehicle Search', href: '/vehicle-search', icon: MagnifyingGlassIcon }
  )



  return baseNavigation
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-semibold text-gray-900">Repo App</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {getNavigation(user?.role).map((item: any) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-link ${
                    isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-semibold text-gray-900">Repo App</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {getNavigation(user?.role).map((item: any) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-link ${
                    isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center gap-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {user?.name}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center gap-x-2">
                <Link
                  to="/profile"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <UserCircleIcon className="h-6 w-6" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 