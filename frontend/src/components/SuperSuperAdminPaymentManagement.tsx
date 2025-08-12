import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  CalendarIcon,
  CogIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { getImageUrl } from '../utils/config';

interface SuperSuperAdminPaymentRate {
  _id: string;
  perUserRate: number;
  serviceRate: number;
  effectiveFrom: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

interface SuperSuperAdminPayment {
  _id: string;
  superAdminId: {
    _id: string;
    name: string;
    email: string;
    isDeleted?: boolean;
    deletedAt?: string;
  };
  superSuperAdminId: {
    _id: string;
    name: string;
    email: string;
  };
  month: string;
  userCount: number;
  deletedUserCount?: number;
  perUserRate: number;
  serviceRate: number;
  isProrated: boolean;
  proratedDays?: number;
  totalDaysInMonth?: number;
  proratedServiceRate?: number;
  userAmount: number;
  totalAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentDate?: string;
  paymentProof?: {
    _id: string;
    status: 'pending' | 'approved' | 'rejected';
    proofImageUrl: string;
    transactionNumber?: string;
    paymentDate: string;
    amount: number;
    notes?: string;
  };
  paymentPeriod: string;
  createdAt: string;
}

const SuperSuperAdminPaymentManagement: React.FC = () => {
  const [showRateModal, setShowRateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [rateForm, setRateForm] = useState({
    perUserRate: '',
    serviceRate: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch current payment rates
  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ['super-super-admin-payment-rates'],
    queryFn: async () => {
      const response = await api.get('/super-super-admin-payments/rates');
      return response.data;
    }
  });

  // Fetch super admin payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['super-super-admin-payments'],
    queryFn: async () => {
      const response = await api.get('/super-super-admin-payments');
      return response.data;
    }
  });

  // Set payment rates mutation
  const setRatesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/super-super-admin-payments/rates', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment rates updated successfully');
      setShowRateModal(false);
      setRateForm({ perUserRate: '', serviceRate: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['super-super-admin-payment-rates'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update payment rates');
    }
  });

  // Generate payments mutation
  const generatePaymentsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/super-super-admin-payments/generate', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.data.generated} payments successfully`);
      setShowGenerateModal(false);
      setSelectedMonth('');
      queryClient.invalidateQueries({ queryKey: ['super-super-admin-payments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate payments');
    }
  });

  const handleSetRates = (e: React.FormEvent) => {
    e.preventDefault();
    setRatesMutation.mutate(rateForm);
  };

  const handleGeneratePayments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }
    generatePaymentsMutation.mutate({ month: selectedMonth });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Paid
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-4 h-4 mr-1" />
          Pending
        </span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="w-4 h-4 mr-1" />
          Overdue
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  const getProofStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Approved
        </span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="w-4 h-4 mr-1" />
          Rejected
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-4 h-4 mr-1" />
          Pending
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  const currentRate = ratesData?.data;
  const payments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SuperSuperAdmin Payment Management</h1>
        <p className="text-gray-600">Manage payment rates and generate payments for Super Admins</p>
      </div>

      {/* Payment Rates Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Payment Rates</h2>
          <button
            onClick={() => setShowRateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CogIcon className="w-4 h-4 mr-2" />
            Set Rates
          </button>
        </div>

        {ratesLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        ) : currentRate ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Per User Rate</h3>
              <p className="text-2xl font-bold text-gray-900">₹{currentRate.perUserRate}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Service Rate</h3>
              <p className="text-2xl font-bold text-gray-900">₹{currentRate.serviceRate}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Effective From</h3>
              <p className="text-sm text-gray-900">{formatDate(currentRate.effectiveFrom)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payment rates set</p>
            <p className="text-sm text-gray-400 mt-1">
              Set payment rates to start generating payments
            </p>
          </div>
        )}
      </div>

      {/* Generate Payments Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Generate Payments</h2>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Generate Payments
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Generate monthly payments for all Super Admins based on their user count and service charges.
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Super Admin Payments</h2>
        </div>
        {paymentsLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Super Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proof
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment: SuperSuperAdminPayment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.superAdminId.name}
                            {payment.superAdminId.isDeleted && (
                              <span className="text-red-500 ml-2">(Deleted)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{payment.superAdminId.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserGroupIcon className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {payment.userCount}
                          {payment.deletedUserCount && payment.deletedUserCount > 0 && (
                            <span className="text-red-500"> ({payment.deletedUserCount} deleted)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{payment.totalAmount}</div>
                      <div className="text-xs text-gray-500">
                        Users: ₹{payment.userAmount} + Service: ₹{payment.isProrated ? payment.proratedServiceRate : payment.serviceRate}
                        {payment.isProrated && (
                          <div className="text-xs text-orange-600">
                            Prorated ({payment.proratedDays}/{payment.totalDaysInMonth} days)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.paymentProof ? (
                        getProofStatusBadge(payment.paymentProof.status)
                      ) : (
                        <span className="text-sm text-gray-500">No proof</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CurrencyDollarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payments found</p>
            <p className="text-sm text-gray-400 mt-1">
              Generate payments to see them here
            </p>
          </div>
        )}
      </div>

      {/* Set Rates Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Set Payment Rates</h3>
              <form onSubmit={handleSetRates} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Per User Rate (₹)</label>
                  <input
                    type="number"
                    value={rateForm.perUserRate}
                    onChange={(e) => setRateForm({ ...rateForm, perUserRate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter per user rate"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Rate (₹)</label>
                  <input
                    type="number"
                    value={rateForm.serviceRate}
                    onChange={(e) => setRateForm({ ...rateForm, serviceRate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter service rate"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <textarea
                    value={rateForm.notes}
                    onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={setRatesMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {setRatesMutation.isPending ? 'Setting...' : 'Set Rates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generate Payments Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Payments</h3>
              <form onSubmit={handleGeneratePayments} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p>This will generate payments for all Super Admins for the selected month.</p>
                  <p className="mt-1">Payments will be calculated based on:</p>
                  <ul className="mt-1 list-disc list-inside">
                    <li>Total active users + deleted users in that month</li>
                    <li>Service charges (prorated if Super Admin was created mid-month)</li>
                  </ul>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatePaymentsMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {generatePaymentsMutation.isPending ? 'Generating...' : 'Generate Payments'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperSuperAdminPaymentManagement;
