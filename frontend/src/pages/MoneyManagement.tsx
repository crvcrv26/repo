import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moneyAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  UsersIcon,
  TruckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import MoneyRecordForm from '../components/MoneyRecordForm';

interface MoneyRecord {
  _id: string;
  registration_number: string;
  bill_date: string;
  bank: string;
  make: string;
  model: string;
  status: string;
  yard_name: string;
  repo_bill_amount: number;
  repo_payment_status: string;
  total_bill_amount: number;
  loan_number: string;
  customer_name: string;
  load: string;
  load_details: string;
  confirmed_by: string;
  repo_date: string;
  service_tax: number;
  payment_to_repo_team: number;
  field_agent?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  created_by: {
    _id: string;
    name: string;
    email: string;
  };
  updated_by: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface AdminCount {
  _id: string;
  adminName: string;
  adminEmail: string;
  count: number;
}

export default function MoneyManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    bank: '',
    status: '',
    repo_payment_status: '',
    from: '',
    to: ''
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [search]);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MoneyRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MoneyRecord | null>(null);

  // Fetch money records - use debounced search
  const { data: moneyData, isLoading, error } = useQuery({
    queryKey: ['money-records', debouncedSearch, filters, page],
    queryFn: () => moneyAPI.getAll({
      search: debouncedSearch.trim(),
      bank: filters.bank.trim(),
      status: filters.status.trim(),
      repo_payment_status: filters.repo_payment_status.trim(),
      from: filters.from,
      to: filters.to,
      page,
      limit: 20
    }),
    staleTime: 30000, // Keep data fresh for 30 seconds
    cacheTime: 60000, // Cache for 1 minute
    keepPreviousData: true // Prevent loading states during filter changes
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => moneyAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['money-records'] });
      toast.success('Money record deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    }
  });



  const handleDelete = async (record: MoneyRecord) => {
    if (window.confirm(`Are you sure you want to delete the record for ${record.registration_number}?`)) {
      deleteMutation.mutate(record._id);
    }
  };

  const handleView = (record: MoneyRecord) => {
    setViewingRecord(record);
    setShowViewModal(true);
  };

  const handleEdit = (record: MoneyRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setShowForm(true);
  };





  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingRecord(null);
  };

  const handleExport = async () => {
    try {
      const response = await moneyAPI.export({
        search,
        ...filters
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `money-records-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Records exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export records');
    }
  };

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setFilters({
      bank: '',
      status: '',
      repo_payment_status: '',
      from: '',
      to: ''
    });
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setShowFilters(false);
  };

  const hasActiveFilters = debouncedSearch || Object.values(filters).some(f => f);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Show admin counts for Super Admins
  if (currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') {
    const adminCounts: AdminCount[] = moneyData?.data?.adminCounts || [];
    const totalRecords = moneyData?.data?.total || 0;

    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--brand-navy)]">Money Management Overview</h1>
          <p className="text-gray-600 mt-2">Admin-wise money record statistics</p>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 text-[var(--brand-yellow)] mr-2" />
              <h2 className="text-xl font-semibold">Admin Data Counts</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Total Records: <span className="font-semibold text-[var(--brand-navy)]">{totalRecords}</span>
              </div>
            </div>
          </div>
          <div className="card-body">
            {adminCounts.length > 0 ? (
              <div className="space-y-4">
                {adminCounts.map((admin) => (
                  <div key={admin._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--brand-yellow)] bg-opacity-20 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-[var(--brand-yellow)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--brand-navy)]">{admin.adminName}</h3>
                        <p className="text-sm text-gray-600">{admin.adminEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[var(--brand-navy)]">{admin.count}</div>
                      <div className="text-sm text-gray-600">records</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Money Records</h3>
                <p className="text-gray-600">No admins have created money records yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Records</h3>
            <p className="text-gray-600">Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  const records: MoneyRecord[] = moneyData?.data?.data || [];
  const pagination = moneyData?.data?.pagination || {};

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--brand-navy)]">Money Management</h1>
        <p className="text-gray-600 mt-2">
          {currentUser?.role === 'fieldAgent' 
            ? 'View your assigned payment and billing records' 
            : 'Manage payment and billing records for repossession work'}
        </p>
        
        {/* Summary Card for Field Agents */}
        {currentUser?.role === 'fieldAgent' && (
          <div className="mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-blue-900">Your Records</h3>
                  <p className="text-blue-700">
                    You have {records.length} assigned money record{records.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by registration, bank, customer name..."
              className="form-input pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline ${showFilters || hasActiveFilters ? 'bg-[var(--brand-yellow)] bg-opacity-20 border-[var(--brand-yellow)] text-[var(--brand-navy)]' : ''}`}
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-[var(--brand-yellow)] text-[var(--brand-navy)] text-xs px-1.5 py-0.5 rounded-full font-medium">
                Active
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50">
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear All
            </button>
          )}
          
          {/* Only show Add Record button for non-field agents */}
          {currentUser?.role !== 'fieldAgent' && (
            <button onClick={handleAdd} className="btn btn-primary">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Record
            </button>
          )}
          
          <button 
            onClick={handleExport} 
            className="btn btn-outline"
            title="Export records to Excel"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <input
                  type="text"
                  value={filters.bank}
                  onChange={(e) => handleFilterChange('bank', e.target.value)}
                  placeholder="Filter by bank"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Status</option>
                  <option value="ON YARD">ON YARD</option>
                  <option value="RELEASE">RELEASE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={filters.repo_payment_status}
                  onChange={(e) => handleFilterChange('repo_payment_status', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Payment Status</option>
                  <option value="Payment Due">Payment Due</option>
                  <option value="Done">Done</option>
                  <option value="Partial">Partial</option>
                  <option value="Processing">Processing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button onClick={clearFilters} className="btn btn-outline btn-sm">
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="card">
        <div className="card-body p-0">
          {records.length > 0 ? (
            <div className="overflow-x-auto max-h-[70vh] border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 z-20 min-w-[140px] px-4 py-3 border-r border-gray-200">Registration</th>
                    <th className="min-w-[100px] px-4 py-3 border-r border-gray-200">Bill Date</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Repo Date</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Bank</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Vehicle</th>
                    <th className="min-w-[100px] px-4 py-3 border-r border-gray-200">Status</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Yard</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Repo Amount</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Payment Status</th>
                    <th className="min-w-[120px] px-4 py-3 border-r border-gray-200">Payment to Repo Team</th>
                    <th className="min-w-[140px] px-4 py-3 border-r border-gray-200">Field Agent</th>
                    {currentUser?.role !== 'fieldAgent' && (
                      <th className="w-32 sticky right-0 bg-gray-50 z-20 px-4 py-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white z-10 min-w-[140px] px-4 py-3 border-r border-gray-200">
                        <div className="font-mono font-semibold text-[var(--brand-navy)] text-sm">
                          {record.registration_number}
                        </div>
                        <div className="text-xs text-gray-500">{record.loan_number}</div>
                      </td>
                      <td className="min-w-[100px] px-4 py-3 border-r border-gray-200">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm">{formatDate(record.bill_date)}</span>
                        </div>
                      </td>
                      <td className="min-w-[120px] px-4 py-3 border-r border-gray-200">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm">{formatDate(record.repo_date)}</span>
                        </div>
                      </td>
                      <td className="min-w-[120px] font-medium text-sm px-4 py-3 border-r border-gray-200">{record.bank}</td>
                      <td className="min-w-[120px] px-4 py-3 border-r border-gray-200">
                        <div className="text-sm">
                          <div className="font-medium">{record.make}</div>
                          <div className="text-gray-600 text-xs">{record.model}</div>
                        </div>
                      </td>
                      <td className="min-w-[100px] px-4 py-3 border-r border-gray-200">
                        <span className={`badge text-xs ${
                          record.status.includes('YARD') ? 'badge-warning' :
                          record.status.includes('RELEASE') ? 'badge-success' :
                          'badge-gray'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="min-w-[120px] text-sm px-4 py-3 border-r border-gray-200">{record.yard_name}</td>
                      <td className="min-w-[120px] px-4 py-3 border-r border-gray-200">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 text-green-600 mr-1" />
                          <span className="font-semibold text-sm">{formatCurrency(record.repo_bill_amount)}</span>
                        </div>
                      </td>
                      <td className="min-w-[120px] px-4 py-3 border-r border-gray-200">
                        <span className={`badge text-xs ${
                          record.repo_payment_status === 'Done' ? 'badge-success' :
                          record.repo_payment_status === 'Payment Due' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {record.repo_payment_status}
                        </span>
                      </td>
                      <td className="min-w-[120px] px-4 py-3 border-r border-gray-200">
                        <span className="font-semibold text-sm text-[var(--brand-navy)]">
                          {formatCurrency(record.payment_to_repo_team)}
                        </span>
                      </td>
                      <td className="min-w-[140px] px-4 py-3 border-r border-gray-200">
                        {record.field_agent ? (
                          <div className="text-sm">
                            <div className="font-medium">{record.field_agent.name}</div>
                            <div className="text-gray-600 text-xs">{record.field_agent.phone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not assigned</span>
                        )}
                      </td>
                      {currentUser?.role !== 'fieldAgent' ? (
                        <td className="sticky right-0 bg-white z-10 w-32 px-4 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleView(record)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md border border-transparent hover:border-yellow-200 transition-all duration-200"
                              title="View complete record"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-200 transition-all duration-200"
                              title="Edit record"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-all duration-200"
                              title="Delete record"
                              disabled={deleteMutation.isPending}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="sticky right-0 bg-white z-10 w-16 px-4 py-3">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleView(record)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md border border-transparent hover:border-yellow-200 transition-all duration-200"
                              title="View complete record"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
              <p className="text-gray-600 mb-4">
                {search || Object.values(filters).some(f => f) 
                  ? 'No records match your current filters.' 
                  : currentUser?.role === 'fieldAgent' 
                    ? 'No records have been assigned to you yet.' 
                    : 'Start by adding your first money record.'}
              </p>
              {currentUser?.role !== 'fieldAgent' && (
                <button onClick={handleAdd} className="btn btn-primary">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add First Record
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.current - 1) * 20) + 1} to {Math.min(pagination.current * 20, pagination.total)} of {pagination.total} records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrev}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.current} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNext}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <MoneyRecordForm
          record={editingRecord}
          onClose={handleCloseForm}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['money-records'] });
            handleCloseForm();
          }}
        />
      )}

      {/* View Record Modal */}
      {showViewModal && viewingRecord && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content max-w-4xl">
              <div className="modal-header">
                <h2 className="text-xl font-semibold text-[var(--brand-navy)]">
                  Money Record Details
                </h2>
                <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="modal-body">
                {/* Vehicle Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)] mb-4 flex items-center">
                    <TruckIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                    Vehicle Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Registration Number</label>
                      <p className="text-lg font-mono font-bold text-[var(--brand-navy)]">{viewingRecord.registration_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Vehicle</label>
                      <p className="text-sm text-gray-900">{viewingRecord.make} {viewingRecord.model}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bank</label>
                      <p className="text-sm text-gray-900">{viewingRecord.bank}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <span className={`badge ${
                        viewingRecord.status.includes('YARD') ? 'badge-warning' :
                        viewingRecord.status.includes('RELEASE') ? 'badge-success' :
                        'badge-gray'
                      }`}>
                        {viewingRecord.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)] mb-4 flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                    Billing Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bill Date</label>
                      <p className="text-sm text-gray-900">{formatDate(viewingRecord.bill_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Repo Date</label>
                      <p className="text-sm text-gray-900">{formatDate(viewingRecord.repo_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Yard Name</label>
                      <p className="text-sm text-gray-900">{viewingRecord.yard_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Status</label>
                      <span className={`badge ${
                        viewingRecord.repo_payment_status === 'Done' ? 'badge-success' :
                        viewingRecord.repo_payment_status === 'Payment Due' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {viewingRecord.repo_payment_status}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Repo Bill Amount</label>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(viewingRecord.repo_bill_amount)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment to Repo Team</label>
                      <p className="text-lg font-semibold text-[var(--brand-navy)]">{formatCurrency(viewingRecord.payment_to_repo_team)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Field Agent</label>
                      <p className="text-sm text-gray-900">
                        {viewingRecord.field_agent ? (
                          <>
                            {viewingRecord.field_agent.name}<br />
                            <span className="text-gray-500">{viewingRecord.field_agent.phone}</span>
                          </>
                        ) : (
                          'Not assigned'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer & Loan Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)] mb-4 flex items-center">
                    <UsersIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                    Customer & Loan Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Customer Name</label>
                      <p className="text-sm text-gray-900">{viewingRecord.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Loan Number</label>
                      <p className="text-sm font-mono text-gray-900">{viewingRecord.loan_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Confirmed By</label>
                      <p className="text-sm text-gray-900">{viewingRecord.confirmed_by}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Load</label>
                      <p className="text-sm text-gray-900">{viewingRecord.load || 'N/A'}</p>
                    </div>
                    {viewingRecord.load_details && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Load Details</label>
                        <p className="text-sm text-gray-900">{viewingRecord.load_details}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta Information */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)] mb-4">
                    Record Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created By</label>
                      <p className="text-sm text-gray-900">{viewingRecord.created_by.name}</p>
                      <p className="text-xs text-gray-500">{viewingRecord.created_by.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated By</label>
                      <p className="text-sm text-gray-900">{viewingRecord.updated_by.name}</p>
                      <p className="text-xs text-gray-500">{viewingRecord.updated_by.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created At</label>
                      <p className="text-sm text-gray-900">{formatDate(viewingRecord.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                      <p className="text-sm text-gray-900">{formatDate(viewingRecord.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={handleCloseViewModal} className="btn btn-outline">
                  Close
                </button>
                {currentUser?.role !== 'fieldAgent' && (
                  <button
                    onClick={() => {
                      handleEdit(viewingRecord);
                      handleCloseViewModal();
                    }}
                    className="btn btn-primary"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit Record
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
