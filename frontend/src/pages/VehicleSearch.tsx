import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { excelAPI } from '../services/api'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export default function VehicleSearch() {
  const { user: currentUser } = useAuth()
  
  // State for vehicle search
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleFilters, setVehicleFilters] = useState({
    registration_number: '',
    loan_number: '',
    customer_name: '',
    branch: '',
    make: '',
    model: ''
  })
  const [vehiclePage, setVehiclePage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch Excel vehicles for search
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['excel-vehicles', { vehicleSearch, vehicleFilters, vehiclePage }],
    queryFn: () => excelAPI.searchVehicles({ 
      search: vehicleSearch, 
      ...vehicleFilters, 
      page: vehiclePage, 
      limit: 20 
    }),
  })

  const vehicles = vehiclesData?.data?.data || []
  const vehiclePagination = vehiclesData?.data?.pagination

  const handleExportToExcel = async () => {
    try {
      const response = await excelAPI.searchVehicles({ 
        search: vehicleSearch, 
        ...vehicleFilters, 
        page: 1, 
        limit: 1000 // Get more data for export
      })
      
      // Create CSV content
      const headers = [
        'Registration Number',
        'Customer Name', 
        'Loan Number',
        'Make',
        'Model',
        'Branch',
        'Chassis Number',
        'Engine Number',
        'EMI',
        'Address',
        'First Confirmer Name',
        'First Confirmer No',
        'Second Confirmer Name',
        'Second Confirmer No',
        'Third Confirmer Name',
        'Third Confirmer No',
        'POS',
        'Bucket',
        'Sec 17',
        'Seasoning',
        'TBR',
        'Allocation',
        'Product Name'
      ]
      
      const csvContent = [
        headers.join(','),
        ...vehicles.map((vehicle: any) => [
          vehicle.registration_number || '',
          vehicle.customer_name || '',
          vehicle.loan_number || '',
          vehicle.make || '',
          vehicle.model || '',
          vehicle.branch || '',
          vehicle.chasis_number || '',
          vehicle.engine_number || '',
          vehicle.emi || '',
          vehicle.address || '',
          vehicle.first_confirmer_name || '',
          vehicle.first_confirmer_no || '',
          vehicle.second_confirmer_name || '',
          vehicle.second_confirmer_no || '',
          vehicle.third_confirmer_name || '',
          vehicle.third_confirmer_no || '',
          vehicle.pos || '',
          vehicle.bucket || '',
          vehicle.sec_17 || '',
          vehicle.seasoning || '',
          vehicle.tbr || '',
          vehicle.allocation || '',
          vehicle.product_name || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vehicle_search_results_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const clearFilters = () => {
    setVehicleSearch('')
    setVehicleFilters({
      registration_number: '',
      loan_number: '',
      customer_name: '',
      branch: '',
      make: '',
      model: ''
    })
    setVehiclePage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Search</h1>
          <p className="text-gray-600">Search through Excel-uploaded vehicle data</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            <FunnelIcon className="h-5 w-5" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          {vehicles.length > 0 && (
            <button
              onClick={handleExportToExcel}
              className="btn-secondary"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export to CSV
            </button>
          )}
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {/* Main Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search across all fields (registration, customer, loan number, etc.)..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All Filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    placeholder="Registration number"
                    value={vehicleFilters.registration_number}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, registration_number: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Number</label>
                  <input
                    type="text"
                    placeholder="Loan number"
                    value={vehicleFilters.loan_number}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, loan_number: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={vehicleFilters.customer_name}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    placeholder="Branch"
                    value={vehicleFilters.branch}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, branch: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    placeholder="Make"
                    value={vehicleFilters.make}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, make: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="Model"
                    value={vehicleFilters.model}
                    onChange={(e) => setVehicleFilters(prev => ({ ...prev, model: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {vehicles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                Found <span className="font-semibold">{vehiclePagination?.total || vehicles.length}</span> vehicles
                {vehiclePagination && vehiclePagination.pages > 1 && (
                  <span className="ml-2">(Page {vehiclePage} of {vehiclePagination.pages})</span>
                )}
              </p>
            </div>
            <div className="text-sm text-blue-600">
              Showing {((vehiclePage - 1) * 20) + 1} - {Math.min(vehiclePage * 20, vehiclePagination?.total || vehicles.length)} of {vehiclePagination?.total || vehicles.length}
            </div>
          </div>
        </div>
      )}

      {/* Vehicles List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {vehiclesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Searching vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle: any) => (
                <div key={vehicle._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Primary Info */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Registration Number</p>
                        <p className="text-sm text-gray-600 font-mono">{vehicle.registration_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Customer Name</p>
                        <p className="text-sm text-gray-600">{vehicle.customer_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Loan Number</p>
                        <p className="text-sm text-gray-600 font-mono">{vehicle.loan_number || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Make & Model</p>
                        <p className="text-sm text-gray-600">{vehicle.make || 'N/A'} {vehicle.model || ''}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Branch</p>
                        <p className="text-sm text-gray-600">{vehicle.branch || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">EMI</p>
                        <p className="text-sm text-gray-600">{vehicle.emi || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Technical Details */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chassis Number</p>
                        <p className="text-sm text-gray-600 font-mono">{vehicle.chasis_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Engine Number</p>
                        <p className="text-sm text-gray-600 font-mono">{vehicle.engine_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address</p>
                        <p className="text-sm text-gray-600 truncate">{vehicle.address || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">POS</p>
                        <p className="text-sm text-gray-600">{vehicle.pos || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Bucket</p>
                        <p className="text-sm text-gray-600">{vehicle.bucket || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Product Name</p>
                        <p className="text-sm text-gray-600">{vehicle.product_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmer Details (if available) */}
                  {(vehicle.first_confirmer_name || vehicle.second_confirmer_name || vehicle.third_confirmer_name) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Confirmer Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {vehicle.first_confirmer_name && (
                          <div>
                            <p className="text-gray-600">1st Confirmer: {vehicle.first_confirmer_name} ({vehicle.first_confirmer_no})</p>
                          </div>
                        )}
                        {vehicle.second_confirmer_name && (
                          <div>
                            <p className="text-gray-600">2nd Confirmer: {vehicle.second_confirmer_name} ({vehicle.second_confirmer_no})</p>
                          </div>
                        )}
                        {vehicle.third_confirmer_name && (
                          <div>
                            <p className="text-gray-600">3rd Confirmer: {vehicle.third_confirmer_name} ({vehicle.third_confirmer_no})</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Pagination */}
      {vehiclePagination && vehiclePagination.pages > 1 && (
        <div className="flex justify-center">
          <nav className="flex space-x-2">
            {/* Previous Page */}
            {vehiclePage > 1 && (
              <button
                onClick={() => setVehiclePage(vehiclePage - 1)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              >
                Previous
              </button>
            )}
            
            {/* Page Numbers */}
            {Array.from({ length: vehiclePagination.pages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setVehiclePage(pageNum)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pageNum === vehiclePage
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            {/* Next Page */}
            {vehiclePage < vehiclePagination.pages && (
              <button
                onClick={() => setVehiclePage(vehiclePage + 1)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              >
                Next
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  )
} 