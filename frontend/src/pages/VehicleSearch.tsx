import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { excelAPI } from '../services/api'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export default function VehicleSearch() {
  const { user: currentUser } = useAuth()
  
  // State for vehicle search
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [searchType, setSearchType] = useState('all') // 'all', 'registration_number', 'loan_number', 'chasis_number', 'engine_number'
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
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Fetch Excel vehicles for search - automatically when search term has 4+ characters
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['excel-vehicles', { vehicleSearch, searchType, vehicleFilters, vehiclePage }],
    queryFn: () => excelAPI.searchVehicles({ 
      search: vehicleSearch,
      searchType: searchType,
      ...vehicleFilters, 
      page: vehiclePage, 
      limit: 20 
    }),
    enabled: vehicleSearch.trim().length >= 4 || Object.values(vehicleFilters).some(v => v && v.trim().length > 0), // Auto-search when 4+ chars or filters used
  })

  const vehicles = vehiclesData?.data?.data || []
  const vehiclePagination = vehiclesData?.data?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is now automatic, just reset page
    setVehiclePage(1) // Reset to first page on new search
  }

  const handleClearSearch = () => {
    setVehicleSearch('')
    setSearchType('all')
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

  const handleViewDetails = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setShowDetailsModal(true)
  }

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

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <form onSubmit={handleSearch}>
            {/* Main Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Search</label>
              <div className="flex space-x-3">
                {/* Search Type Dropdown - Only for super admin and admin */}
                {(currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'admin') && (
                  <div className="w-48">
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="input"
                    >
                      <option value="all">Search All Fields</option>
                      <option value="registration_number">Registration Number</option>
                      <option value="loan_number">Loan Number</option>
                      <option value="chasis_number">Chassis Number</option>
                      <option value="engine_number">Engine Number</option>
                    </select>
                  </div>
                )}
                
                {/* Search Input */}
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={
                      searchType === 'all' 
                        ? "Search across all fields (registration, customer, loan number, etc.)..."
                        : `Search by ${searchType.replace('_', ' ')} (minimum 4 characters)...`
                    }
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="input pl-10 w-full"
                  />
                                     {vehicleSearch && vehicleSearch.trim().length < 4 && (
                     <p className="text-sm text-orange-600 mt-1">
                       Enter at least 4 characters to search automatically
                     </p>
                   )}
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
                  <button
                    type="button"
                    onClick={handleClearSearch}
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

            {/* Search Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary"
              >
                Clear
              </button>
                             <button
                 type="submit"
                 className="btn-primary"
                 disabled={
                   (!vehicleSearch && Object.values(vehicleFilters).every(v => !v)) ||
                   (vehicleSearch && vehicleSearch.trim().length < 4)
                 }
               >
                 <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                 Reset Page
               </button>
            </div>
          </form>
        </div>
      </div>

             {/* Results Summary */}
       {(vehicleSearch.trim().length >= 4 || Object.values(vehicleFilters).some(v => v && v.trim().length > 0)) && vehicles.length > 0 && (
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
                     {!(vehicleSearch.trim().length >= 4 || Object.values(vehicleFilters).some(v => v && v.trim().length > 0)) ? (
             <div className="text-center py-12">
               <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to search</h3>
               <p className="mt-1 text-sm text-gray-500">
                 Enter at least 4 characters to search automatically, or use filters below.
               </p>
             </div>
           ) : vehiclesLoading ? (
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
            <div className="space-y-3">
              {vehicles.map((vehicle: any) => (
                <div key={vehicle._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Registration</p>
                          <p className="text-sm text-gray-600 font-mono">{vehicle.registration_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Customer</p>
                          <p className="text-sm text-gray-600">{vehicle.customer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Loan Number</p>
                          <p className="text-sm text-gray-600 font-mono">{vehicle.loan_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Make & Model</p>
                          <p className="text-sm text-gray-600">{vehicle.make || 'N/A'} {vehicle.model || ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleViewDetails(vehicle)}
                        className="btn-secondary"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

             {/* Vehicle Pagination */}
       {(vehicleSearch.trim().length >= 4 || Object.values(vehicleFilters).some(v => v && v.trim().length > 0)) && vehiclePagination && vehiclePagination.pages > 1 && (
         <div className="flex justify-center">
           <nav className="flex items-center space-x-1 max-w-full overflow-x-auto">
             {/* Previous Page */}
             {vehiclePage > 1 && (
               <button
                 onClick={() => setVehiclePage(vehiclePage - 1)}
                 className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 whitespace-nowrap"
               >
                 Previous
               </button>
             )}
             
             {/* First Page */}
             {vehiclePage > 3 && (
               <>
                 <button
                   onClick={() => setVehiclePage(1)}
                   className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                 >
                   1
                 </button>
                 {vehiclePage > 4 && (
                   <span className="px-2 text-gray-500">...</span>
                 )}
               </>
             )}
             
             {/* Page Numbers around current page */}
             {Array.from({ length: vehiclePagination.pages }, (_, i) => i + 1)
               .filter(pageNum => 
                 pageNum === 1 || 
                 pageNum === vehiclePagination.pages || 
                 (pageNum >= vehiclePage - 1 && pageNum <= vehiclePage + 1)
               )
               .map((pageNum, index, array) => (
                 <React.Fragment key={pageNum}>
                   {index > 0 && array[index - 1] !== pageNum - 1 && (
                     <span className="px-2 text-gray-500">...</span>
                   )}
                   <button
                     onClick={() => setVehiclePage(pageNum)}
                     className={`px-3 py-2 text-sm font-medium rounded-md ${
                       pageNum === vehiclePage
                         ? 'bg-blue-600 text-white'
                         : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                     }`}
                   >
                     {pageNum}
                   </button>
                 </React.Fragment>
               ))}
             
             {/* Last Page */}
             {vehiclePage < vehiclePagination.pages - 2 && (
               <>
                 {vehiclePage < vehiclePagination.pages - 3 && (
                   <span className="px-2 text-gray-500">...</span>
                 )}
                 <button
                   onClick={() => setVehiclePage(vehiclePagination.pages)}
                   className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                 >
                   {vehiclePagination.pages}
                 </button>
               </>
             )}
             
             {/* Next Page */}
             {vehiclePage < vehiclePagination.pages && (
               <button
                 onClick={() => setVehiclePage(vehiclePage + 1)}
                 className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 whitespace-nowrap"
               >
                 Next
               </button>
             )}
           </nav>
         </div>
       )}

      {/* Vehicle Details Modal */}
      {showDetailsModal && selectedVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {/* Primary Info */}
                 <div className="space-y-3">
                   <h4 className="font-medium text-gray-900 border-b pb-2">Primary Information</h4>
                                       <div>
                      <p className="text-sm font-medium text-gray-700">Excel File</p>
                      <p className="text-sm text-gray-900 font-mono">{selectedVehicle.excelFile?.filename || selectedVehicle.excelFile?.originalName || 'N/A'}</p>
                    </div>
                   <div>
                     <p className="text-sm font-medium text-gray-700">Registration Number</p>
                     <p className="text-sm text-gray-900 font-mono">{selectedVehicle.registration_number || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-gray-700">Customer Name</p>
                     <p className="text-sm text-gray-900">{selectedVehicle.customer_name || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-gray-700">Loan Number</p>
                     <p className="text-sm text-gray-900 font-mono">{selectedVehicle.loan_number || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-gray-700">Branch</p>
                     <p className="text-sm text-gray-900">{selectedVehicle.branch || 'N/A'}</p>
                   </div>
                 </div>

                {/* Vehicle Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Vehicle Information</h4>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Make</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.make || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Model</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.model || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Chassis Number</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedVehicle.chasis_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Engine Number</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedVehicle.engine_number || 'N/A'}</p>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Financial Information</h4>
                  <div>
                    <p className="text-sm font-medium text-gray-700">EMI</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.emi || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">POS</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.pos || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bucket</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.bucket || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Product Name</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.product_name || 'N/A'}</p>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Additional Information</h4>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Sec 17</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.sec_17 || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Seasoning</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.seasoning || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">TBR</p>
                    <p className="text-sm text-gray-900">{selectedVehicle.tbr || 'N/A'}</p>
                  </div>
                </div>

                {/* Confirmer Details */}
                {(selectedVehicle.first_confirmer_name || selectedVehicle.second_confirmer_name || selectedVehicle.third_confirmer_name) && (
                  <div className="space-y-3 md:col-span-2 lg:col-span-3">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Confirmer Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedVehicle.first_confirmer_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">1st Confirmer</p>
                          <p className="text-sm text-gray-900">{selectedVehicle.first_confirmer_name}</p>
                          <p className="text-sm text-gray-600">{selectedVehicle.first_confirmer_no}</p>
                        </div>
                      )}
                      {selectedVehicle.second_confirmer_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">2nd Confirmer</p>
                          <p className="text-sm text-gray-900">{selectedVehicle.second_confirmer_name}</p>
                          <p className="text-sm text-gray-600">{selectedVehicle.second_confirmer_no}</p>
                        </div>
                      )}
                      {selectedVehicle.third_confirmer_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">3rd Confirmer</p>
                          <p className="text-sm text-gray-900">{selectedVehicle.third_confirmer_name}</p>
                          <p className="text-sm text-gray-600">{selectedVehicle.third_confirmer_no}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 