import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { backOfficeNumbersAPI } from '../services/api';
import {
  PhoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface BackOfficeNumber {
  _id: string;
  name: string;
  mobileNumber: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  mobileNumber: string;
}

export default function BackOfficeNumbers() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<BackOfficeNumber | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', mobileNumber: '' });

  // Get back office numbers
  const { data: backOfficeNumbers, isLoading } = useQuery({
    queryKey: ['back-office-numbers'],
    queryFn: async () => {
      const response = await backOfficeNumbersAPI.getAdminNumbers();
      return response.data.data as BackOfficeNumber[];
    }
  });

  // Create back office number mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await backOfficeNumbersAPI.createNumber(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Back office number created successfully');
      queryClient.invalidateQueries({ queryKey: ['back-office-numbers'] });
      setShowCreateModal(false);
      setFormData({ name: '', mobileNumber: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create back office number');
    }
  });

  // Update back office number mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      const response = await backOfficeNumbersAPI.updateNumber(id, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Back office number updated successfully');
      queryClient.invalidateQueries({ queryKey: ['back-office-numbers'] });
      setShowEditModal(false);
      setSelectedNumber(null);
      setFormData({ name: '', mobileNumber: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update back office number');
    }
  });

  // Delete back office number mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await backOfficeNumbersAPI.deleteNumber(id);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Back office number deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['back-office-numbers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete back office number');
    }
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await backOfficeNumbersAPI.toggleActive(id);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Back office number status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['back-office-numbers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNumber) {
      updateMutation.mutate({ id: selectedNumber._id, data: formData });
    }
  };

  const handleEditClick = (number: BackOfficeNumber) => {
    setSelectedNumber(number);
    setFormData({ name: number.name, mobileNumber: number.mobileNumber });
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this back office number?')) {
      deleteMutation.mutate(id);
    }
  };

  const activeNumbers = backOfficeNumbers?.filter(num => num.isActive) || [];
  const inactiveNumbers = backOfficeNumbers?.filter(num => !num.isActive) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Back Office Numbers</h1>
          <p className="text-gray-600">Manage contact numbers for your field agents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={activeNumbers.length >= 4}
          className={`btn ${activeNumbers.length >= 4 ? 'btn-disabled' : 'btn-primary'}`}
          title={activeNumbers.length >= 4 ? 'Maximum 4 active numbers allowed' : ''}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Number
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <PhoneIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Numbers</p>
              <p className="text-2xl font-bold text-gray-900">{backOfficeNumbers?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Numbers</p>
              <p className="text-2xl font-bold text-gray-900">{activeNumbers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <EyeSlashIcon className="h-8 w-8 text-gray-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactive Numbers</p>
              <p className="text-2xl font-bold text-gray-900">{inactiveNumbers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Numbers */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b-2 border-gray-400">
          <h3 className="text-lg font-semibold text-gray-900">Active Numbers</h3>
          <p className="text-sm text-gray-600">These numbers are visible to your field agents</p>
        </div>
        <div className="p-6">
          {activeNumbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeNumbers.map((number) => (
                <div key={number._id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(number)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActiveMutation.mutate(number._id)}
                        disabled={toggleActiveMutation.isPending}
                        className="text-orange-600 hover:text-orange-900"
                        title="Deactivate"
                      >
                        <EyeSlashIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(number._id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{number.name}</h4>
                  <p className="text-sm text-gray-600">{number.mobileNumber}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active numbers</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add your first back office number to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inactive Numbers */}
      {inactiveNumbers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b-2 border-gray-400">
            <h3 className="text-lg font-semibold text-gray-900">Inactive Numbers</h3>
            <p className="text-sm text-gray-600">These numbers are not visible to field agents</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inactiveNumbers.map((number) => (
                <div key={number._id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(number)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActiveMutation.mutate(number._id)}
                        disabled={toggleActiveMutation.isPending}
                        className="text-green-600 hover:text-green-900"
                        title="Activate"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(number._id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{number.name}</h4>
                  <p className="text-sm text-gray-600">{number.mobileNumber}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Back Office Number</h3>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', mobileNumber: '' });
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn btn-primary"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedNumber && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Back Office Number</h3>
              <form onSubmit={handleEdit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-mobileNumber" className="block text-sm font-medium text-gray-700">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="edit-mobileNumber"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedNumber(null);
                      setFormData({ name: '', mobileNumber: '' });
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn btn-primary"
                  >
                    {updateMutation.isPending ? 'Updating...' : 'Update'}
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
