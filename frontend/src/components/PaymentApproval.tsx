import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../utils/config';
import { useAuth } from '../hooks/useAuth';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentTextIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface PaymentProof {
  _id: string;
  paymentId?: {
    _id: string;
    monthlyAmount?: number;
    totalAmount?: number;
    paymentPeriod?: string;
    dueDate?: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  proofType: 'screenshot' | 'transaction_number';
  proofImageUrl?: string;
  proofImageName?: string;
  transactionNumber?: string;
  paymentDate: string;
  amount: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
}

export default function PaymentApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminNotes, setAdminNotes] = useState('');

  // Determine if user is Super Admin
  const isSuperAdmin = user?.role === 'superAdmin' || user?.role === 'superSuperAdmin';
  
  console.log('🔍 PaymentApproval component debug:');
  console.log('   User:', user);
  console.log('   User role:', user?.role);
  console.log('   Is Super Admin:', isSuperAdmin);

  // Get pending payment proofs
  const { data: proofsData, isLoading } = useQuery({
    queryKey: ['pending-payment-proofs', user?.role],
    queryFn: async () => {
      let endpoint;
      
      // Determine the correct endpoint based on user role
      if (user?.role === 'superSuperAdmin') {
        endpoint = '/api/super-super-admin-payments/pending-proofs';
      } else if (isSuperAdmin) {
        endpoint = '/api/admin-payments/pending-proofs';
      } else {
        endpoint = '/api/payment-qr/admin/pending-proofs';
      }
      
      console.log('🔍 Frontend PaymentApproval query:');
      console.log('   User role:', user?.role);
      console.log('   Is Super Admin:', isSuperAdmin);
      console.log('   Endpoint:', endpoint);
      
      const token = localStorage.getItem('token');
      console.log('   Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch pending proofs');
      const data = await response.json();
      console.log('   Response data:', data);
      console.log('   Payment proofs count:', data.data?.length || 0);
      return data.data as PaymentProof[];
    },
    enabled: !!user,
    staleTime: 0, // Disable caching for debugging
    cacheTime: 0  // Disable caching for debugging
  });

  // Review payment proof mutation
  const reviewProofMutation = useMutation({
    mutationFn: async ({ proofId, status, notes }: { proofId: string; status: string; notes: string }) => {
      let endpoint;
      
      // Determine the correct endpoint based on user role
      if (user?.role === 'superSuperAdmin') {
        endpoint = `/api/super-super-admin-payments/proof/${proofId}/review`;
      } else if (isSuperAdmin) {
        endpoint = `/api/admin-payments/proof/${proofId}/review`;
      } else {
        endpoint = `/api/payment-qr/proof/${proofId}/review`;
      }
      
      console.log('🔍 Reviewing payment proof:');
      console.log('   User role:', user?.role);
      console.log('   Endpoint:', endpoint);
      console.log('   Proof ID:', proofId);
      console.log('   Status:', status);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, adminNotes: notes })
      });
      if (!response.ok) throw new Error('Failed to review payment proof');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Payment proof reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['pending-payment-proofs', user?.role] });
      
      // Also invalidate payment queries to refresh payment status
      if (user?.role === 'superSuperAdmin') {
        queryClient.invalidateQueries({ queryKey: ['super-super-admin-payments'] });
      } else if (user?.role === 'superAdmin') {
        queryClient.invalidateQueries({ queryKey: ['super-admin-my-payments'] });
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      }
      
      setShowReviewModal(false);
      setSelectedProof(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to review payment proof');
    }
  });

  const handleReviewProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProof) return;
    
    reviewProofMutation.mutate({
      proofId: selectedProof._id,
      status: reviewStatus,
      notes: adminNotes
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingProofs = proofsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Approval</h1>
          <p className="text-gray-600">Review and approve payment proofs from users</p>
        </div>
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">
            {pendingProofs.length} pending review{pendingProofs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Pending Proofs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pending Payment Proofs</h3>
        </div>
        <div className="p-6">
          {pendingProofs.length > 0 ? (
            <div className="space-y-4">
              {pendingProofs.map((proof) => (
                <div key={proof._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{proof.userId.name}</h4>
                      <p className="text-sm text-gray-600">{proof.userId.email}</p>
                      <p className="text-sm text-gray-600">{proof.userId.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(proof.amount)}
                      </p>
                                             <p className="text-sm text-gray-600">
                         {proof.paymentId?.paymentPeriod || 'Admin Payment'}
                       </p>
                       <p className="text-sm text-gray-600">
                         {proof.userId.phone || 'N/A'}
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Payment Details</h5>
                      <div className="space-y-1 text-sm text-gray-600">
                                                 <p>Due Date: {proof.paymentId?.dueDate ? formatDate(proof.paymentId.dueDate) : 'Not specified'}</p>
                        <p>Payment Date: {formatDate(proof.paymentDate)}</p>
                        <p>Proof Type: {proof.proofType === 'screenshot' ? 'Screenshot' : 'Transaction Number'}</p>
                        {proof.transactionNumber && (
                          <p>Transaction: {proof.transactionNumber}</p>
                        )}
                      </div>
                    </div>

                    {proof.proofType === 'screenshot' && proof.proofImageUrl && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Payment Screenshot</h5>
                        <div className="relative">
                          <img
                            src={getImageUrl(proof.proofImageUrl)}
                            alt="Payment Screenshot"
                            className="w-full h-32 object-cover rounded border"
                            onLoad={(e) => {
                              console.log('✅ Proof image loaded successfully:', getImageUrl(proof.proofImageUrl!));
                            }}
                            onError={(e) => {
                              console.error('❌ Proof image failed to load:', getImageUrl(proof.proofImageUrl!), e);
                            }}
                            crossOrigin="anonymous"
                          />
                          <button
                            onClick={() => {
                              setSelectedProof(proof);
                              setShowReviewModal(true);
                            }}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
                          >
                            <EyeIcon className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {proof.notes && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">User Notes</h5>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {proof.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedProof(proof);
                        setReviewStatus('rejected');
                        setShowReviewModal(true);
                      }}
                      className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProof(proof);
                        setReviewStatus('approved');
                        setShowReviewModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending proofs</h3>
              <p className="mt-1 text-sm text-gray-500">
                All payment proofs have been reviewed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedProof && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Payment Proof
              </h3>
              
              <form onSubmit={handleReviewProof}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Status
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="reviewStatus"
                          value="approved"
                          checked={reviewStatus === 'approved'}
                          onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                          className="mr-2"
                        />
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                        Approve
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="reviewStatus"
                          value="rejected"
                          checked={reviewStatus === 'rejected'}
                          onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                          className="mr-2"
                        />
                        <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                        Reject
                      </label>
                    </div>
                  </div>

                  {selectedProof.proofType === 'screenshot' && selectedProof.proofImageUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Screenshot
                      </label>
                      <img
                        src={getImageUrl(selectedProof.proofImageUrl)}
                        alt="Payment Screenshot"
                        className="w-full h-48 object-contain border rounded"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700">
                      Admin Notes (optional)
                    </label>
                    <textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add any notes about this review..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedProof(null);
                      setAdminNotes('');
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewProofMutation.isPending}
                    className={`btn btn-sm ${
                      reviewStatus === 'approved' 
                        ? 'btn-primary' 
                        : 'text-red-600 border-red-600 hover:bg-red-50'
                    }`}
                  >
                    {reviewProofMutation.isPending ? 'Reviewing...' : 
                     reviewStatus === 'approved' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
