import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { excelAPI, notificationsAPI } from '../services/api'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  ClockIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

// Custom hook for debouncing search input
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function VehicleSearch() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  
  // State for ULTRA-FAST vehicle search (simplified)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [searchType, setSearchType] = useState('all') // Only: 'all', 'registration_number', 'chasis_number', 'engine_number'
  const [vehiclePage, setVehiclePage] = useState(1)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Debounced search for better performance (reduces API calls by 80%)
  const debouncedSearch = useDebounce(vehicleSearch, 300); // 300ms delay

  // LIGHTNING-FAST search query with proper loading states
  const { data: vehiclesData, isLoading: vehiclesLoading, isFetching, isPreviousData } = useQuery({
    queryKey: ['excel-vehicles-fast', { search: debouncedSearch, searchType, page: vehiclePage }],
    queryFn: () => excelAPI.searchVehicles({ 
      search: debouncedSearch,
      searchType: searchType,
      page: vehiclePage, 
      limit: 25 // Slightly increased for better UX
    }),
    enabled: debouncedSearch.trim().length >= 3, // Reduced to 3 characters
    staleTime: 30000, // 30 seconds - matches backend cache
    cacheTime: 60000, // 1 minute - shorter for fresh uploads
    keepPreviousData: true, // Smooth pagination but show loading
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 1, // Reduce retry attempts for speed
  })

  const vehicles = vehiclesData?.data?.data || []
  const vehiclePagination = vehiclesData?.data?.pagination



  const handleViewDetails = async (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setShowDetailsModal(true)
    
    // Log notification if user is field agent or auditor
    if (currentUser?.role === 'fieldAgent' || currentUser?.role === 'auditor') {
      try {
        await notificationsAPI.logAction({
          vehicleNumber: vehicle.registration_number || vehicle.loan_number || 'Unknown',
          action: 'viewed',
          vehicleId: vehicle._id
        })
      } catch (error) {
        console.log('Failed to log notification:', error)
        // Don't show error to user as this is a background operation
      }
    }
  }

  // Export functionality removed

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Search</h1>
          <p className="text-gray-600">Search through Excel-uploaded vehicle data</p>
        </div>
        <div className="flex space-x-3">
          {/* Export functionality removed */}
        </div>
      </div>

      {/* LIGHTNING-FAST Search Form */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BoltIcon className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Ultra-Fast Vehicle Search</h3>
              {vehiclesData?.data?.performance && (
                <span className="badge badge-success text-xs">
                  {vehiclesData.data.performance.queryTime} 
                  {vehiclesData.data.performance.cached && ' (cached)'}
                </span>
              )}
            </div>
            {(isFetching && !isPreviousData) && (
              <div className="flex items-center text-blue-600">
                <ClockIcon className="h-4 w-4 mr-1 animate-spin" />
                <span className="text-sm">Searching...</span>
              </div>
            )}
            {(isFetching && isPreviousData) && (
              <div className="flex items-center text-orange-600">
                <ClockIcon className="h-4 w-4 mr-1 animate-spin" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Search Type Selector */}
            <div className="flex space-x-3">
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search In</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Fields</option>
                  <option value="registration_number">Registration Number</option>
                  <option value="chasis_number">Chassis Number</option>
                  <option value="engine_number">Engine Number</option>
                </select>
              </div>
              
              {/* Clear and Refresh buttons */}
              <div className="flex items-end space-x-2">
                {vehicleSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearch('');
                      setVehiclePage(1);
                      setSearchType('all');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // Force refresh by invalidating cache
                    queryClient.invalidateQueries({ queryKey: ['excel-vehicles-fast'] });
                  }}
                  className="btn btn-outline btn-sm"
                  title="Refresh search results to get latest data"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Term {debouncedSearch !== vehicleSearch && '(typing...)'}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    searchType === 'all' 
                      ? "Search anywhere in registration, chassis, or engine number..."
                      : `Search anywhere in ${searchType.replace('_', ' ')}...`
                  }
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="form-input pl-10 text-base"
                />
                {vehicleSearch && vehicleSearch.trim().length < 3 && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center">
                    <BoltIcon className="h-4 w-4 mr-1" />
                    Enter at least 3 characters to search anywhere in the field
                  </p>
                )}
                {vehicleSearch.trim().length >= 3 && debouncedSearch === vehicleSearch && !isFetching && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <BoltIcon className="h-4 w-4 mr-1" />
                    Found {vehicles.length} results (supports partial matching)
                  </p>
                )}
                {vehicleSearch.trim().length >= 3 && (isFetching && !isPreviousData) && (
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1 animate-spin" />
                    Searching for "{debouncedSearch}"...
                  </p>
                )}
                {vehicleSearch.trim().length >= 3 && (isFetching && isPreviousData) && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1 animate-spin" />
                    Updating results for "{debouncedSearch}"...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>



       {/* Results Summary */}
       {vehicleSearch.trim().length >= 3 && vehicles.length > 0 && (
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
           {vehicleSearch.trim().length < 3 ? (
             <div className="text-center py-12">
               <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to search</h3>
               <p className="mt-1 text-sm text-gray-500">
                 Enter at least 3 characters to search automatically.
               </p>
             </div>
           ) : (vehiclesLoading || (isFetching && !isPreviousData)) ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">
                Searching for "{debouncedSearch}" anywhere in vehicle data...
              </p>
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
              {(isFetching && isPreviousData) && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-orange-400 mr-2 animate-spin" />
                    <p className="text-sm text-orange-700">
                      Updating results for "{debouncedSearch}"... Showing previous results below.
                    </p>
                  </div>
                </div>
              )}
              {vehicles.map((vehicle: any) => (
                <div key={vehicle._id} className="border-2 border-gray-400 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {currentUser?.role === 'fieldAgent' ? (
                        // For field agents: Show only registration number
                        <div>
                          <p className="text-sm font-medium text-gray-900">Registration Number</p>
                          <p className="text-sm text-gray-600 font-mono">{vehicle.registration_number || 'N/A'}</p>
                        </div>
                      ) : (
                        // For other roles: Show all three fields
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Registration Number</p>
                            <p className="text-sm text-gray-600 font-mono">{vehicle.registration_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Chassis Number</p>
                            <p className="text-sm text-gray-600 font-mono">{vehicle.chasis_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Engine Number</p>
                            <p className="text-sm text-gray-600 font-mono">{vehicle.engine_number || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleViewDetails(vehicle)}
                        className="btn btn-secondary"
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
       {vehicleSearch.trim().length >= 3 && vehiclePagination && vehiclePagination.pages > 1 && (
         <div className="flex justify-center">
           <nav className="flex items-center space-x-1 max-w-full overflow-x-auto">
             {/* Previous Page */}
             {vehiclePage > 1 && (
               <button
                 onClick={() => setVehiclePage(vehiclePage - 1)}
                 className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400 whitespace-nowrap"
               >
                 Previous
               </button>
             )}
             
             {/* First Page */}
             {vehiclePage > 3 && (
               <>
                 <button
                   onClick={() => setVehiclePage(1)}
                   className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400"
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
                         : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400'
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
                   className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400"
                 >
                   {vehiclePagination.pages}
                 </button>
               </>
             )}
             
             {/* Next Page */}
             {vehiclePage < vehiclePagination.pages && (
               <button
                 onClick={() => setVehiclePage(vehiclePage + 1)}
                 className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400 whitespace-nowrap"
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
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentUser?.role === 'fieldAgent' ? 'Vehicle Information' : 'Vehicle Details'}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {currentUser?.role === 'fieldAgent' ? (
                // Simplified view for field agents - only 4 specific fields
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-4 text-center">Vehicle Details</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Customer Name:</span>
                        <span className="text-sm text-blue-900 font-semibold">{selectedVehicle.customer_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Registration No:</span>
                        <span className="text-sm text-blue-900 font-mono font-semibold">{selectedVehicle.registration_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Chassis No:</span>
                        <span className="text-sm text-blue-900 font-mono font-semibold">{selectedVehicle.chasis_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-blue-800">Engine Number:</span>
                        <span className="text-sm text-blue-900 font-mono font-semibold">{selectedVehicle.engine_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Full view for other roles
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {/* Primary Info */}
                   <div className="space-y-3">
                     <h4 className="font-medium text-gray-900 border-b pb-2">Primary Information</h4>
                     <div>
                       <p className="text-sm font-medium text-gray-700">Excel File</p>
                       <p className="text-sm text-gray-900 font-mono">{selectedVehicle.excel_file?.originalName || selectedVehicle.excel_file?.filename || 'N/A'}</p>
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
              )}
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