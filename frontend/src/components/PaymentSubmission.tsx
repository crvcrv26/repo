import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../utils/config';
import {
  QrCodeIcon,
  PhotoIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface QRCode {
  _id: string;
  qrImageUrl: string;
  description: string;
  adminId: {
    name: string;
    email: string;
    phone: string;
  };
}

interface PaymentDetail {
  _id: string;
  monthlyAmount: number;
  dueDate: string;
  paymentPeriod: string;
  hasProof?: boolean;
  proofStatus?: 'pending' | 'approved' | 'rejected';
}

export default function PaymentSubmission() {
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [proofType, setProofType] = useState<'screenshot' | 'transaction_number'>('screenshot');

  // Get QR code
  const { data: qrCode, isLoading: qrLoading, error: qrError } = useQuery<QRCode, Error>({
    queryKey: ['payment-qr'],
    queryFn: async () => {
      const response = await fetch('/api/payment-qr/qr', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('QR fetch response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('QR fetch error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch QR code');
      }
      const data = await response.json();
      console.log('QR data:', data);
      return data.data as QRCode;
    },
    retry: 1,
    retryDelay: 1000
  });

  // Get user's pending payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['user-payment-dues'],
    queryFn: async () => {
      const response = await fetch('/api/payments/user-dues?status=pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      return data;
    }
  });

  // Submit payment proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/payment-qr/proof', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed to submit payment proof');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payment proof submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['user-payment-dues'] });
      setShowSubmitModal(false);
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit payment proof');
    }
  });

  const handleSubmitProof = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Remove any existing proofType from form data to avoid duplicates
    formData.delete('proofType');
    
    // Add the payment ID and proof type
    formData.append('paymentId', selectedPayment!._id);
    formData.append('proofType', proofType);
    
    console.log('Submitting proof with data:', {
      paymentId: selectedPayment!._id,
      proofType: proofType,
      formDataEntries: Array.from(formData.entries())
    });
    
    submitProofMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  if (qrLoading || paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingPayments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Submission</h1>
          <p className="text-gray-600">Submit payment proofs for your dues</p>
        </div>
      </div>

      {/* QR Code Section */}
      {qrCode && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment QR Code</h3>
            <QrCodeIcon className="h-6 w-6 text-blue-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="flex justify-center">
               <img
                 src={getImageUrl(qrCode.qrImageUrl)}
                 alt="Payment QR Code"
                 className="w-64 h-64 object-contain border rounded-lg shadow-lg"
                 onLoad={(e) => {
                   console.log('✅ QR image loaded successfully:', getImageUrl(qrCode.qrImageUrl));
                 }}
                 onError={(e) => {
                   console.error('❌ QR image failed to load:', getImageUrl(qrCode.qrImageUrl), e);
                   console.error('Error details:', e);
                   e.currentTarget.style.display = 'none';
                 }}
                 crossOrigin="anonymous"
               />
             </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Admin Details</h4>
                <p className="text-sm text-gray-600">{qrCode.adminId.name}</p>
                <p className="text-sm text-gray-600">{qrCode.adminId.email}</p>
                <p className="text-sm text-gray-600">{qrCode.adminId.phone}</p>
              </div>
              
              {qrCode.description && (
                <div>
                  <h4 className="font-medium text-gray-900">Instructions</h4>
                  <p className="text-sm text-gray-600">{qrCode.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Error */}
      {qrError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">QR Code Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {qrError.message || 'Failed to load QR code'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pending Payments</h3>
        </div>
        <div className="p-6">
          {pendingPayments.length > 0 ? (
            <div className="space-y-4">
              {pendingPayments.map((payment: PaymentDetail) => (
                <div key={payment._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{payment.paymentPeriod}</h4>
                      <p className="text-sm text-gray-600">Due: {formatDate(payment.dueDate)}</p>
                    </div>
                                         <div className="text-right">
                       <p className="text-lg font-semibold text-gray-900">
                         {formatCurrency(payment.monthlyAmount)}
                       </p>
                       {payment.hasProof ? (
                         <div className="mt-2">
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                             payment.proofStatus === 'approved' 
                               ? 'bg-green-100 text-green-800'
                               : payment.proofStatus === 'rejected'
                               ? 'bg-red-100 text-red-800'
                               : 'bg-yellow-100 text-yellow-800'
                           }`}>
                             {payment.proofStatus === 'approved' ? 'Approved' :
                              payment.proofStatus === 'rejected' ? 'Rejected' : 'Waiting for Approval'}
                           </span>
                           {payment.proofStatus === 'rejected' && (
                             <button
                               onClick={() => {
                                 setSelectedPayment(payment);
                                 setShowSubmitModal(true);
                               }}
                               className="btn btn-primary btn-sm mt-2 ml-2"
                             >
                               Resubmit
                             </button>
                           )}
                         </div>
                       ) : (
                         <button
                           onClick={() => {
                             setSelectedPayment(payment);
                             setShowSubmitModal(true);
                           }}
                           className="btn btn-primary btn-sm mt-2"
                         >
                           Submit Payment
                         </button>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payments</h3>
              <p className="mt-1 text-sm text-gray-500">
                You have no pending payments to submit.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Payment Proof Modal */}
      {showSubmitModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedPayment?.hasProof && selectedPayment?.proofStatus === 'rejected' 
                  ? 'Resubmit Payment Proof' 
                  : 'Submit Payment Proof'}
              </h3>
              
              <form onSubmit={handleSubmitProof}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proof Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="proofType"
                          value="screenshot"
                          checked={proofType === 'screenshot'}
                          onChange={(e) => setProofType(e.target.value as 'screenshot' | 'transaction_number')}
                          className="mr-2"
                        />
                        Screenshot
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="proofType"
                          value="transaction_number"
                          checked={proofType === 'transaction_number'}
                          onChange={(e) => setProofType(e.target.value as 'screenshot' | 'transaction_number')}
                          className="mr-2"
                        />
                        Transaction Number
                      </label>
                    </div>
                  </div>
                  
                  {proofType === 'screenshot' && (
                    <div>
                      <label htmlFor="proofImage" className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Screenshot
                      </label>
                      <input
                        type="file"
                        name="proofImage"
                        id="proofImage"
                        accept="image/*"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                  
                  {proofType === 'transaction_number' && (
                    <div>
                      <label htmlFor="transactionNumber" className="block text-sm font-medium text-gray-700">
                        Transaction Number
                      </label>
                      <input
                        type="text"
                        name="transactionNumber"
                        id="transactionNumber"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter transaction number"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      id="paymentDate"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      step="0.01"
                      min="0"
                      defaultValue={selectedPayment.monthlyAmount}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes (optional)
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add any additional notes..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitModal(false);
                      setSelectedPayment(null);
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitProofMutation.isPending}
                    className="btn btn-primary"
                  >
                    {submitProofMutation.isPending 
                      ? 'Submitting...' 
                      : selectedPayment?.hasProof && selectedPayment?.proofStatus === 'rejected'
                        ? 'Resubmit Proof'
                        : 'Submit Proof'}
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
