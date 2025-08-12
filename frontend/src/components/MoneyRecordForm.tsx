import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { moneyAPI, excelAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

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
}

interface MoneyRecordFormProps {
  record?: MoneyRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
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
}

export default function MoneyRecordForm({ record, onClose, onSuccess }: MoneyRecordFormProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [vehicleFound, setVehicleFound] = useState<boolean | null>(null);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [regSearchTerm, setRegSearchTerm] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: record ? {
      ...record,
      bill_date: record.bill_date.split('T')[0],
      repo_date: record.repo_date.split('T')[0]
    } : {
      registration_number: '',
      bill_date: '',
      bank: '',
      make: '',
      model: '',
      status: '',
      yard_name: '',
      repo_bill_amount: 0,
      repo_payment_status: 'Payment Due',
      total_bill_amount: 0,
      loan_number: '',
      customer_name: '',
      load: '',
      load_details: '',
      confirmed_by: '',
      repo_date: '',
      service_tax: 0,
      payment_to_repo_team: 0
    }
  });

  const registrationNumber = watch('registration_number');

  // Vehicle search suggestions
  const { data: vehicleSuggestions } = useQuery({
    queryKey: ['vehicle-suggestions', regSearchTerm],
    queryFn: () => excelAPI.searchVehicles({
      search: regSearchTerm,
      searchType: 'registration_number',
      limit: 10
    }),
    enabled: regSearchTerm.length >= 3,
    staleTime: 30000
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (record) {
        return moneyAPI.update(record._id, data);
      } else {
        return moneyAPI.create(data);
      }
    },
    onSuccess: () => {
      toast.success(record ? 'Record updated successfully' : 'Record created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save record');
    }
  });

  // Vehicle lookup mutation
  const lookupMutation = useMutation({
    mutationFn: (regNumber: string) => moneyAPI.getVehicleByReg(regNumber),
    onSuccess: (response) => {
      setIsLookingUp(false);
      setHasLookedUp(true);
      
      if (response.data.found) {
        const vehicleData = response.data.data;
        setVehicleFound(true);
        
        // Pre-fill form with vehicle data (only if fields are empty)
        if (!watch('make')) setValue('make', vehicleData.make || '');
        if (!watch('model')) setValue('model', vehicleData.model || '');
        if (!watch('bank')) setValue('bank', vehicleData.bank || '');
        if (!watch('customer_name')) setValue('customer_name', vehicleData.customer_name || '');
        if (!watch('loan_number')) setValue('loan_number', vehicleData.loan_number || '');
        if (!watch('status')) setValue('status', vehicleData.status || '');
        
        toast.success('Vehicle data found and pre-filled');
      } else {
        setVehicleFound(false);
        toast.info('Vehicle not found in master data. Please enter details manually.');
      }
    },
    onError: (error: any) => {
      setIsLookingUp(false);
      setHasLookedUp(true);
      setVehicleFound(false);
      toast.error('Failed to lookup vehicle data');
    }
  });

  // Handle registration number selection from dropdown
  const handleRegistrationSelect = (vehicleData: any) => {
    setValue('registration_number', vehicleData.registration_number);
    setValue('make', vehicleData.make || '');
    setValue('model', vehicleData.model || '');
    setValue('bank', vehicleData.bank || '');
    setValue('customer_name', vehicleData.customer_name || '');
    setValue('loan_number', vehicleData.loan_number || '');
    setValue('status', vehicleData.status || '');
    
    setShowSuggestions(false);
    setVehicleFound(true);
    setHasLookedUp(true);
    setRegSearchTerm('');
    
    toast.success('Vehicle data filled automatically');
  };

  // Handle registration input change
  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setRegSearchTerm(value);
    setShowSuggestions(value.length >= 3);
    setHasLookedUp(false);
    setVehicleFound(null);
    return value; // Return for react-hook-form
  };

  // Auto-lookup when registration number is entered (on blur)
  const handleRegistrationBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200); // Delay to allow click on suggestion
  };

  const onSubmit = (data: FormData) => {
    saveMutation.mutate({
      ...data,
      registration_number: data.registration_number.toUpperCase().trim(),
      repo_bill_amount: Number(data.repo_bill_amount),
      total_bill_amount: Number(data.total_bill_amount),
      service_tax: Number(data.service_tax),
      payment_to_repo_team: Number(data.payment_to_repo_team)
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content max-w-4xl">
          <div className="modal-header">
            <h2 className="text-xl font-semibold text-[var(--brand-navy)]">
              {record ? 'Edit Money Record' : 'Add New Money Record'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
            {/* Vehicle Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <TruckIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Vehicle Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number *
                  </label>
                  <div className="relative">
                    <input
                      {...register('registration_number', { 
                        required: 'Registration number is required',
                        minLength: { value: 6, message: 'Registration number must be at least 6 characters' }
                      })}
                      onChange={(e) => {
                        handleRegistrationChange(e);
                        // Also update the form value
                        setValue('registration_number', e.target.value.toUpperCase());
                      }}
                      onBlur={handleRegistrationBlur}
                      onFocus={() => registrationNumber && registrationNumber.length >= 3 && setShowSuggestions(true)}
                      className="form-input pr-10"
                      placeholder="e.g., BR01FY9181 (type to search suggestions)"
                      style={{ textTransform: 'uppercase' }}
                      autoComplete="off"
                    />
                    
                    {/* Lookup status indicator */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {regSearchTerm.length >= 3 ? (
                        <MagnifyingGlassIcon className="h-5 w-5 text-blue-500" />
                      ) : vehicleFound === true ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" title="Vehicle data auto-filled" />
                      ) : vehicleFound === false ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" title="No vehicle found" />
                      ) : null}
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && vehicleSuggestions?.data?.data?.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-500 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {vehicleSuggestions.data.data.map((vehicle: any) => (
                          <div
                            key={vehicle._id}
                            onClick={() => handleRegistrationSelect(vehicle)}
                            className="px-4 py-3 hover:bg-[var(--brand-gray-50)] cursor-pointer border-b-2 border-gray-300 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-[var(--brand-navy)] font-mono">
                                  {vehicle.registration_number}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {vehicle.make} {vehicle.model} | {vehicle.bank}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {vehicle.customer_name}
                                </div>
                              </div>
                              <div className="text-xs text-[var(--brand-yellow)] bg-[var(--brand-yellow)] bg-opacity-10 px-2 py-1 rounded">
                                Click to select
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Debug dropdown - always show when searching */}
                    {showSuggestions && regSearchTerm.length >= 3 && (
                      <div className="absolute z-50 w-full mt-1 bg-red-100 border-2 border-red-500 rounded-md shadow-lg p-4 text-center">
                        <div className="text-sm font-bold text-red-800">DEBUG: Search active for "{regSearchTerm}"</div>
                        <div className="text-xs text-red-600 mt-1">
                          API Data: {vehicleSuggestions ? 'Loaded' : 'Loading...'}
                        </div>
                        {vehicleSuggestions?.data?.data && (
                          <div className="text-xs text-red-600">
                            Results: {vehicleSuggestions.data.data.length} vehicles
                          </div>
                        )}
                      </div>
                    )}

                    {/* No suggestions message */}
                    {showSuggestions && regSearchTerm.length >= 3 && 
                     vehicleSuggestions?.data?.data && vehicleSuggestions.data.data.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-400 rounded-md shadow-lg p-4 text-center text-gray-500">
                        <ExclamationTriangleIcon className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                        <div className="text-sm">No vehicles found matching "{regSearchTerm}"</div>
                        <div className="text-xs mt-1">You can still enter the registration number manually</div>
                      </div>
                    )}
                  </div>
                  {errors.registration_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.registration_number.message}</p>
                  )}
                  {regSearchTerm.length >= 3 && (
                    <p className="mt-1 text-sm text-blue-600">
                      Searching for vehicles... ({vehicleSuggestions?.data?.data?.length || 0} found)
                      {vehicleSuggestions && (
                        <span className="text-xs"> | API Response: {vehicleSuggestions.data.success ? 'Success' : 'Failed'}</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                  <input
                    {...register('make', { required: 'Make is required' })}
                    className="form-input"
                    placeholder="e.g., Hero"
                  />
                  {errors.make && <p className="mt-1 text-sm text-red-600">{errors.make.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    {...register('model', { required: 'Model is required' })}
                    className="form-input"
                    placeholder="e.g., Splendor Plus"
                  />
                  {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank *</label>
                  <input
                    {...register('bank', { required: 'Bank is required' })}
                    className="form-input"
                    placeholder="e.g., HDFC Bank"
                  />
                  {errors.bank && <p className="mt-1 text-sm text-red-600">{errors.bank.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    {...register('status', { required: 'Status is required' })}
                    className="form-select"
                  >
                    <option value="">Select Status</option>
                    <option value=".ON YARD">ON YARD</option>
                    <option value="RELEASE">RELEASE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="IN TRANSIT">IN TRANSIT</option>
                  </select>
                  {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                </div>
              </div>
            </div>

            {/* Billing Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Billing Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                  <input
                    {...register('bill_date', { required: 'Bill date is required' })}
                    type="date"
                    className="form-input"
                  />
                  {errors.bill_date && <p className="mt-1 text-sm text-red-600">{errors.bill_date.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repo Date *</label>
                  <input
                    {...register('repo_date', { required: 'Repo date is required' })}
                    type="date"
                    className="form-input"
                  />
                  {errors.repo_date && <p className="mt-1 text-sm text-red-600">{errors.repo_date.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yard Name *</label>
                  <input
                    {...register('yard_name', { required: 'Yard name is required' })}
                    className="form-input"
                    placeholder="e.g., ABC Recovery Yard"
                  />
                  {errors.yard_name && <p className="mt-1 text-sm text-red-600">{errors.yard_name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repo Payment Status *</label>
                  <select
                    {...register('repo_payment_status', { required: 'Payment status is required' })}
                    className="form-select"
                  >
                    <option value="Payment Due">Payment Due</option>
                    <option value="Done">Done</option>
                    <option value="Partial">Partial</option>
                    <option value="Processing">Processing</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  {errors.repo_payment_status && <p className="mt-1 text-sm text-red-600">{errors.repo_payment_status.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repo Bill Amount *</label>
                  <input
                    {...register('repo_bill_amount', { 
                      required: 'Repo bill amount is required',
                      min: { value: 0, message: 'Amount cannot be negative' }
                    })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                  {errors.repo_bill_amount && <p className="mt-1 text-sm text-red-600">{errors.repo_bill_amount.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Bill Amount *</label>
                  <input
                    {...register('total_bill_amount', { 
                      required: 'Total bill amount is required',
                      min: { value: 0, message: 'Amount cannot be negative' }
                    })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                  {errors.total_bill_amount && <p className="mt-1 text-sm text-red-600">{errors.total_bill_amount.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Tax</label>
                  <input
                    {...register('service_tax', { 
                      min: { value: 0, message: 'Amount cannot be negative' }
                    })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                  {errors.service_tax && <p className="mt-1 text-sm text-red-600">{errors.service_tax.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment to Repo Team</label>
                  <input
                    {...register('payment_to_repo_team', { 
                      min: { value: 0, message: 'Amount cannot be negative' }
                    })}
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                  {errors.payment_to_repo_team && <p className="mt-1 text-sm text-red-600">{errors.payment_to_repo_team.message}</p>}
                </div>
              </div>
            </div>

            {/* Customer & Loan Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <UserIcon className="h-5 w-5 text-[var(--brand-yellow)] mr-2" />
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Customer & Loan Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    {...register('customer_name', { required: 'Customer name is required' })}
                    className="form-input"
                    placeholder="e.g., Raj Kumar"
                  />
                  {errors.customer_name && <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Number *</label>
                  <input
                    {...register('loan_number', { required: 'Loan number is required' })}
                    className="form-input"
                    placeholder="e.g., LN123456789"
                  />
                  {errors.loan_number && <p className="mt-1 text-sm text-red-600">{errors.loan_number.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmed By *</label>
                  <input
                    {...register('confirmed_by', { required: 'Confirmed by is required' })}
                    className="form-input"
                    placeholder="e.g., Sandeep Kumar"
                  />
                  {errors.confirmed_by && <p className="mt-1 text-sm text-red-600">{errors.confirmed_by.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load</label>
                  <input
                    {...register('load')}
                    className="form-input"
                    placeholder="Optional load information"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load Details</label>
                  <textarea
                    {...register('load_details')}
                    rows={3}
                    className="form-input"
                    placeholder="Additional load details (optional)"
                  />
                </div>
              </div>
            </div>
          </form>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={saveMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {record ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                record ? 'Update Record' : 'Create Record'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
