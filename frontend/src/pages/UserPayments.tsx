import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface PaymentDetail {
  _id: string;
  userId: string;
  userRole: string;
  monthlyAmount: number;
  paymentMonth: number;
  paymentYear: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAmount: number;
  paidDate: string | null;
  admin: {
    _id: string;
    name: string;
    displayName?: string;
    email: string;
    phone: string;
    isDeleted?: boolean;
  };
  paymentPeriod: string;
  daysOverdue: number;
  notes: string;
}

interface PaymentSummary {
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
}

export default function UserPayments() {
  const { user: currentUser } = useAuth();
  
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Get user's payment dues
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['user-payment-dues', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status })
      });
      
      const response = await fetch(`/api/payments/user-dues?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch payment dues');
      const data = await response.json();
      return data;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Use UTC methods to avoid timezone conversion issues
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const clearFilters = () => {
    setFilters({ status: '' });
    setPage(1);
  };

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary: PaymentSummary = paymentsData?.summary || {
    pending: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payment Dues</h1>
          <p className="text-gray-600">View and track your monthly payment obligations</p>
        </div>
        <div className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {currentUser?.role === 'auditor' ? 'Auditor' : 'Field Agent'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(summary.pending.amount)}
              </p>
              <p className="text-sm text-gray-500">{summary.pending.count} payments</p>
            </div>
          </div>
        </div>

        {/* Paid Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Payments</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.paid.amount)}
              </p>
              <p className="text-sm text-gray-500">{summary.paid.count} payments</p>
            </div>
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.overdue.amount)}
              </p>
              <p className="text-sm text-gray-500">{summary.overdue.count} payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-outline btn-sm"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn btn-outline btn-sm"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentsData?.data?.map((payment: PaymentDetail) => (
                <tr key={payment._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.paymentPeriod}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.monthlyAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.dueDate)}
                    {payment.status === 'overdue' && (
                      <div className="text-xs text-red-600 mt-1">
                        {payment.daysOverdue} days overdue
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${
                        payment.admin.isDeleted ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {payment.admin.displayName || payment.admin.name}
                      </div>
                      <div className="text-sm text-gray-500">{payment.admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.status === 'paid' ? (
                      <div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(payment.paidAmount)}
                        </div>
                        {payment.paidDate && (
                          <div className="text-xs text-gray-500">
                            Paid on {formatDate(payment.paidDate)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {(!paymentsData?.data || paymentsData.data.length === 0) && (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status ? 'Try adjusting your filters.' : 'You have no payment records yet.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {paymentsData?.pagination && paymentsData.pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((paymentsData.pagination.page - 1) * paymentsData.pagination.limit) + 1} to{' '}
                {Math.min(paymentsData.pagination.page * paymentsData.pagination.limit, paymentsData.pagination.total)} of{' '}
                {paymentsData.pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= paymentsData.pagination.pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Payment Information</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Monthly payments are due based on your account creation date</p>
          <p>• Payment amounts are set by your admin</p>
          <p>• Overdue payments may affect your account status</p>
          <p>• Contact your admin for any payment-related questions</p>
        </div>
      </div>
    </div>
  );
}
