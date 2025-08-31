import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { excelAPI, notificationsAPI, backOfficeNumbersAPI, inventoryAPI } from '../services/api'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  ClockIcon,
  BoltIcon,
  DocumentTextIcon,
  UserIcon,
  CogIcon,
  SparklesIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  PlusIcon
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
  const [searchType, setSearchType] = useState('registration_number') // Default to registration number
  const [vehiclePage, setVehiclePage] = useState(1)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [selectedVehicleForInventory, setSelectedVehicleForInventory] = useState<any>(null)
  const [inventoryFormData, setInventoryFormData] = useState({
    driverName: '',
    driverNumber: '',
    speedMeterReading: '',
    originalRCBook: '',
    insurancePolicyUpto: '',
    parkingYardName: '',
    parkingExpensesPerDay: '',
    keyAvailability: '',
    tyreConditionFront: '',
    tyreConditionRear: '',
    tyreMake: '',
    bodyType: '',
    bodyCondition: '',
    numberOfWheels: '',
    airConditioner: '',
    jockeyWithRod: '',
    toolSet: '',
    rearViewMirror: '',
    stephnee: '',
    tarpaulinRope: '',
    tutorAmplifier: '',
    stereoSet: '',
    battery: '',
    seatCovers: '',
    wiper: '',
    otherSpecificItems: ''
  })
  const [isCreatingInventory, setIsCreatingInventory] = useState(false)

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

  // Get back office numbers for field agents
  const { data: backOfficeNumbers } = useQuery({
    queryKey: ['back-office-numbers-field-agent'],
    queryFn: async () => {
      const response = await backOfficeNumbersAPI.getFieldAgentNumbers();
      return response.data.data;
    },
    enabled: currentUser?.role === 'fieldAgent',
  });

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

  const handleGenerateInventory = (vehicle: any) => {
    console.log('Generating inventory for vehicle:', vehicle)
    setSelectedVehicleForInventory(vehicle)
    setShowInventoryModal(true)
    // Reset form data
    setInventoryFormData({
      driverName: '',
      driverNumber: '',
      speedMeterReading: '',
      originalRCBook: '',
      insurancePolicyUpto: '',
      parkingYardName: '',
      parkingExpensesPerDay: '',
      keyAvailability: '',
      tyreConditionFront: '',
      tyreConditionRear: '',
      tyreMake: '',
      bodyType: '',
      bodyCondition: '',
      numberOfWheels: '',
      airConditioner: '',
      jockeyWithRod: '',
      toolSet: '',
      rearViewMirror: '',
      stephnee: '',
      tarpaulinRope: '',
      tutorAmplifier: '',
      stereoSet: '',
      battery: '',
      seatCovers: '',
      wiper: '',
      otherSpecificItems: ''
    })
  }

  const handleInventoryFormChange = (field: string, value: string) => {
    setInventoryFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateInventory = async () => {
    // Validate required fields
    if (!inventoryFormData.driverName.trim() || !inventoryFormData.driverNumber.trim()) {
      toast.error('Driver name and driver number are required')
      return
    }

    if (!selectedVehicleForInventory?._id) {
      toast.error('Vehicle information is missing')
      return
    }

    console.log('Selected vehicle for inventory:', selectedVehicleForInventory)

    setIsCreatingInventory(true)
    try {
      // Build inventory data object, only including fields that have values
      const inventoryData: any = {
        vehicleId: selectedVehicleForInventory._id,
        driverName: inventoryFormData.driverName.trim(),
        driverNumber: inventoryFormData.driverNumber.trim()
      }

      // Add optional fields only if they have values
      if (inventoryFormData.speedMeterReading.trim()) {
        inventoryData.speedMeterReading = inventoryFormData.speedMeterReading.trim()
      }
      if (inventoryFormData.originalRCBook) {
        inventoryData.originalRCBook = inventoryFormData.originalRCBook
      }
      if (inventoryFormData.insurancePolicyUpto) {
        inventoryData.insurancePolicyUpto = inventoryFormData.insurancePolicyUpto
      }
      if (inventoryFormData.parkingYardName.trim()) {
        inventoryData.parkingYardName = inventoryFormData.parkingYardName.trim()
      }
      if (inventoryFormData.parkingExpensesPerDay.trim()) {
        inventoryData.parkingExpensesPerDay = inventoryFormData.parkingExpensesPerDay.trim()
      }
      if (inventoryFormData.keyAvailability) {
        inventoryData.keyAvailability = inventoryFormData.keyAvailability
      }
      if (inventoryFormData.tyreConditionFront) {
        inventoryData.tyreConditionFront = inventoryFormData.tyreConditionFront
      }
      if (inventoryFormData.tyreConditionRear) {
        inventoryData.tyreConditionRear = inventoryFormData.tyreConditionRear
      }
      if (inventoryFormData.tyreMake.trim()) {
        inventoryData.tyreMake = inventoryFormData.tyreMake.trim()
      }
      if (inventoryFormData.bodyType.trim()) {
        inventoryData.bodyType = inventoryFormData.bodyType.trim()
      }
      if (inventoryFormData.bodyCondition) {
        inventoryData.bodyCondition = inventoryFormData.bodyCondition
      }
      if (inventoryFormData.numberOfWheels.trim()) {
        inventoryData.numberOfWheels = inventoryFormData.numberOfWheels.trim()
      }
      if (inventoryFormData.airConditioner) {
        inventoryData.airConditioner = inventoryFormData.airConditioner
      }
      if (inventoryFormData.jockeyWithRod) {
        inventoryData.jockeyWithRod = inventoryFormData.jockeyWithRod
      }
      if (inventoryFormData.toolSet) {
        inventoryData.toolSet = inventoryFormData.toolSet
      }
      if (inventoryFormData.rearViewMirror) {
        inventoryData.rearViewMirror = inventoryFormData.rearViewMirror
      }
      if (inventoryFormData.stephnee) {
        inventoryData.stephnee = inventoryFormData.stephnee
      }
      if (inventoryFormData.tarpaulinRope) {
        inventoryData.tarpaulinRope = inventoryFormData.tarpaulinRope
      }
      if (inventoryFormData.tutorAmplifier) {
        inventoryData.tutorAmplifier = inventoryFormData.tutorAmplifier
      }
      if (inventoryFormData.stereoSet) {
        inventoryData.stereoSet = inventoryFormData.stereoSet
      }
      if (inventoryFormData.battery) {
        inventoryData.battery = inventoryFormData.battery
      }
      if (inventoryFormData.seatCovers) {
        inventoryData.seatCovers = inventoryFormData.seatCovers
      }
      if (inventoryFormData.wiper) {
        inventoryData.wiper = inventoryFormData.wiper
      }
      if (inventoryFormData.otherSpecificItems.trim()) {
        inventoryData.otherSpecificItems = inventoryFormData.otherSpecificItems.trim()
      }

      console.log('Creating inventory with data:', inventoryData)

      const response = await inventoryAPI.createInventory(inventoryData)

      toast.success('Inventory created successfully!')
      setShowInventoryModal(false)
      setSelectedVehicleForInventory(null)
      
      // Optionally refresh the search results or navigate to inventory page
      // You can add navigation here if needed
    } catch (error: any) {
      console.error('Error creating inventory:', error)
      toast.error(error.response?.data?.message || 'Failed to create inventory')
    } finally {
      setIsCreatingInventory(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Vehicle Search</h1>
                <p className="text-gray-600 mt-1">Search through Excel-uploaded vehicle data with advanced filtering</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <SparklesIcon className="w-4 h-4" />
                <span>Powered by AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                  <BoltIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Smart Vehicle Search</h2>
                  <p className="text-blue-100 text-sm">Find vehicles instantly with intelligent search</p>
                </div>
              </div>
              {vehiclesData?.data?.performance && (
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">
                      {vehiclesData.data.performance.queryTime} 
                      {vehiclesData.data.performance.cached && ' (cached)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search Type Selector */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Field
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                >
                  <option value="all">🔍 All Fields</option>
                  <option value="registration_number">🚗 Registration Number</option>
                  <option value="chasis_number">🔧 Chassis Number</option>
                  <option value="engine_number">⚙️ Engine Number</option>
                </select>
              </div>
              
              {/* Search Input */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Term {debouncedSearch !== vehicleSearch && '(typing...)'}
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={
                      searchType === 'all' 
                        ? "🔍 Search anywhere in registration, chassis, or engine number..."
                        : `🔍 Search anywhere in ${searchType.replace('_', ' ')}...`
                    }
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-3">
                {vehicleSearch && (
                                  <button
                  type="button"
                  onClick={() => {
                    setVehicleSearch('');
                    setVehiclePage(1);
                    setSearchType('registration_number');
                  }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['excel-vehicles-fast'] });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200"
                  title="Refresh search results to get latest data"
                >
                  <CogIcon className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center space-x-4">
                {(isFetching && !isPreviousData) && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Searching...</span>
                  </div>
                )}
                {(isFetching && isPreviousData) && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Updating...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Search Feedback */}
            <div className="mt-4">
              {vehicleSearch && vehicleSearch.trim().length < 3 && (
                <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <BoltIcon className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-orange-700">
                    Enter at least 3 characters to search anywhere in the field
                  </p>
                </div>
              )}
              {vehicleSearch.trim().length >= 3 && debouncedSearch === vehicleSearch && !isFetching && vehicles.length > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <BoltIcon className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-700">
                    Found {vehicles.length} results (supports partial matching)
                  </p>
                </div>
              )}
              {vehicleSearch.trim().length >= 3 && (isFetching && !isPreviousData) && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <ClockIcon className="h-4 w-4 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-700">
                    Searching for "{debouncedSearch}"...
                  </p>
                </div>
              )}
              {vehicleSearch.trim().length >= 3 && (isFetching && isPreviousData) && (
                <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <ClockIcon className="h-4 w-4 text-orange-500 animate-spin" />
                  <p className="text-sm text-orange-700">
                    Updating results for "{debouncedSearch}"...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {vehicleSearch.trim().length >= 3 && vehicles.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                               <div>
                 <p className="text-lg font-semibold text-gray-900">
                   Found <span className="text-blue-600">{vehiclePagination?.total || vehicles.length}</span> vehicles
                 </p>
                 <div className="flex items-center space-x-2 mt-1">
                   <span className="text-xs text-gray-500">Sorted alphabetically by registration number</span>
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">A-Z</span>
                 </div>
                 {vehiclePagination && vehiclePagination.pages > 1 && (
                   <p className="text-sm text-gray-600">
                     Page {vehiclePage} of {vehiclePagination.pages}
                   </p>
                 )}
               </div>
              </div>
              <div className="text-sm text-gray-500">
                Showing {((vehiclePage - 1) * 20) + 1} - {Math.min(vehiclePage * 20, vehiclePagination?.total || vehicles.length)} of {vehiclePagination?.total || vehicles.length}
              </div>
            </div>
          </div>
        )}



        {/* Vehicles List */}
        <div className="mt-6">
          {vehicleSearch.trim().length < 3 ? (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mx-auto mb-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Search</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Enter at least 3 characters to start searching through vehicle data. Our smart search will find matches anywhere in the specified fields.
              </p>
            </div>
          ) : (vehiclesLoading || (isFetching && !isPreviousData)) ? (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mx-auto mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Searching...</h3>
              <p className="text-gray-600">
                Searching for "{debouncedSearch}" anywhere in vehicle data...
              </p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mx-auto mb-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Vehicles Found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Try adjusting your search criteria or try a different search term. Our search supports partial matching for better results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(isFetching && isPreviousData) && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-orange-400 mr-3 animate-spin" />
                    <p className="text-orange-700 font-medium">
                      Updating results for "{debouncedSearch}"... Showing previous results below.
                    </p>
                  </div>
                </div>
              )}
              
              {vehicles.map((vehicle: any) => (
                <div key={vehicle._id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Data Type Label */}
                        {vehicle.dataType && (
                          <div className="mb-4">
                                                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                               vehicle.dataType === 'SUPER ADMIN DATA' 
                                 ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                 : vehicle.dataType.includes(' DATA') && vehicle.dataType !== 'SELF DATA'
                                 ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                 : 'bg-blue-100 text-blue-800 border border-blue-200'
                             }`}>
                              <SparklesIcon className="w-3 h-3 mr-1" />
                              {vehicle.dataType}
                            </span>
                          </div>
                        )}
                        
                        {currentUser?.role === 'fieldAgent' ? (
                          // For field agents: Show only registration number
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Registration Number</p>
                                <p className="text-lg font-bold text-gray-900 font-mono">{vehicle.registration_number || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // For other roles: Show all three fields
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Registration</p>
                                  <p className="text-lg font-bold text-gray-900 font-mono">{vehicle.registration_number || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                                  <CogIcon className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Chassis</p>
                                  <p className="text-lg font-bold text-gray-900 font-mono">{vehicle.chasis_number || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                                  <BoltIcon className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Engine</p>
                                  <p className="text-lg font-bold text-gray-900 font-mono">{vehicle.engine_number || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-6">
                        <button
                          onClick={() => handleViewDetails(vehicle)}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Pagination */}
        {vehicleSearch.trim().length >= 3 && vehiclePagination && vehiclePagination.pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
              {/* Previous Page */}
              {vehiclePage > 1 && (
                <button
                  onClick={() => setVehiclePage(vehiclePage - 1)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                >
                  <span>←</span>
                  <span>Previous</span>
                </button>
              )}
              
              {/* First Page */}
              {vehiclePage > 3 && (
                <>
                  <button
                    onClick={() => setVehiclePage(1)}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
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
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        pageNum === vehiclePage
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                  >
                    {vehiclePagination.pages}
                  </button>
                </>
              )}
              
              {/* Next Page */}
              {vehiclePage < vehiclePagination.pages && (
                <button
                  onClick={() => setVehiclePage(vehiclePage + 1)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                >
                  <span>Next</span>
                  <span>→</span>
                </button>
              )}
            </nav>
          </div>
        )}

        {/* Vehicle Details Modal */}
        {showDetailsModal && selectedVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-2xl rounded-2xl bg-white">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                    <DocumentTextIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {currentUser?.role === 'fieldAgent' ? 'Vehicle Information' : 'Vehicle Details'}
                    </h3>
                    <p className="text-gray-600">Complete vehicle information and specifications</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {/* Data Type Label */}
                {selectedVehicle.dataType && (
                  <div className="mb-6 text-center">
                                         <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                       selectedVehicle.dataType === 'SUPER ADMIN DATA' 
                         ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                         : selectedVehicle.dataType.includes(' DATA') && selectedVehicle.dataType !== 'SELF DATA'
                         ? 'bg-orange-100 text-orange-800 border border-orange-200'
                         : 'bg-blue-100 text-blue-800 border border-blue-200'
                     }`}>
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      {selectedVehicle.dataType}
                    </span>
                  </div>
                )}
                
                                                                   {currentUser?.role === 'fieldAgent' ? (
                    // Simplified view for field agents - including make field
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                        <h4 className="font-bold text-blue-900 mb-6 text-center text-lg">Vehicle Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex justify-between items-center py-3 border-b border-blue-200">
                            <span className="text-sm font-semibold text-blue-800">Customer Name:</span>
                            <span className="text-sm text-blue-900 font-bold">{selectedVehicle.customer_name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-blue-200">
                            <span className="text-sm font-semibold text-blue-800">Registration No:</span>
                            <span className="text-sm text-blue-900 font-bold font-mono">{selectedVehicle.registration_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-blue-200">
                            <span className="text-sm font-semibold text-blue-800">Make:</span>
                            <span className="text-sm text-blue-900 font-bold">{selectedVehicle.make || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-blue-200">
                            <span className="text-sm font-semibold text-blue-800">Chassis No:</span>
                            <span className="text-sm text-blue-900 font-bold font-mono">{selectedVehicle.chasis_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3">
                            <span className="text-sm font-semibold text-blue-800">Engine Number:</span>
                            <span className="text-sm text-blue-900 font-bold font-mono">{selectedVehicle.engine_number || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                                             {/* Back Office Numbers for Field Agents */}
                       {backOfficeNumbers && backOfficeNumbers.length > 0 && (
                         <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                           <div className="flex items-center space-x-3 mb-4">
                             <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                               <PhoneIcon className="w-4 h-4 text-green-600" />
                             </div>
                             <h4 className="font-bold text-green-900 text-lg">Back Office Contacts</h4>
                           </div>
                           <p className="text-sm text-green-700 mb-4">Contact your admin for assistance</p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {backOfficeNumbers.map((number: any) => (
                               <div key={number._id} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                                 <div className="flex items-center space-x-3">
                                   <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                                     <PhoneIcon className="w-4 h-4 text-green-600" />
                                   </div>
                                   <div>
                                     <p className="font-medium text-gray-900 text-sm">{number.name}</p>
                                     <a 
                                       href={`tel:${number.mobileNumber}`}
                                       className="text-green-600 hover:text-green-800 text-sm font-mono"
                                     >
                                       {number.mobileNumber}
                                     </a>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Generate Inventory Button for Field Agents */}
                       <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                         <div className="flex items-center space-x-3 mb-4">
                           <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                             <ClipboardDocumentListIcon className="w-4 h-4 text-purple-600" />
                           </div>
                           <h4 className="font-bold text-purple-900 text-lg">Generate Inventory</h4>
                         </div>
                         <p className="text-sm text-purple-700 mb-4">
                           Create a detailed inventory report for this vehicle seizure
                         </p>
                         <button
                           onClick={() => handleGenerateInventory(selectedVehicle)}
                           className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                         >
                           <ClipboardDocumentListIcon className="w-4 h-4" />
                           <span>Generate Inventory</span>
                         </button>
                       </div>
                    </div>
                ) : (
                  // Full view for other roles - conditionally show fields based on access
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Primary Info */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                          <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-gray-900">Primary Information</h4>
                      </div>
                      
                                             {/* Show Excel File name only when it's available and user has access */}
                       {selectedVehicle.excel_file?.originalName && (
                         <div className="bg-blue-50 rounded-lg p-4">
                           <p className="text-sm font-semibold text-gray-700 mb-1">Excel File</p>
                           <p className="text-sm text-gray-900 font-mono">{selectedVehicle.excel_file.originalName}</p>
                         </div>
                       )}
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Registration Number</p>
                        <p className="text-sm text-gray-900 font-mono font-bold">{selectedVehicle.registration_number || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Customer Name</p>
                        <p className="text-sm text-gray-900 font-bold">{selectedVehicle.customer_name || 'N/A'}</p>
                      </div>
                      
                      {/* Only show loan_number if it exists in the vehicle data */}
                      {selectedVehicle.hasOwnProperty('loan_number') && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Loan Number</p>
                          <p className="text-sm text-gray-900 font-mono font-bold">{selectedVehicle.loan_number || 'N/A'}</p>
                        </div>
                      )}
                      
                      {/* Only show branch if it exists in the vehicle data */}
                      {selectedVehicle.hasOwnProperty('branch') && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Branch</p>
                          <p className="text-sm text-gray-900 font-bold">{selectedVehicle.branch || 'N/A'}</p>
                        </div>
                      )}
                    </div>

                    {/* Vehicle Details */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                          <CogIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <h4 className="font-bold text-gray-900">Vehicle Information</h4>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Make</p>
                        <p className="text-sm text-gray-900 font-bold">{selectedVehicle.make || 'N/A'}</p>
                      </div>
                      
                      {/* Only show model if it exists in the vehicle data */}
                      {selectedVehicle.hasOwnProperty('model') && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Model</p>
                          <p className="text-sm text-gray-900 font-bold">{selectedVehicle.model || 'N/A'}</p>
                        </div>
                      )}
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Chassis Number</p>
                        <p className="text-sm text-gray-900 font-mono font-bold">{selectedVehicle.chasis_number || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Engine Number</p>
                        <p className="text-sm text-gray-900 font-mono font-bold">{selectedVehicle.engine_number || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Financial Details - only show if user has access */}
                    {(selectedVehicle.hasOwnProperty('emi') || selectedVehicle.hasOwnProperty('pos') || selectedVehicle.hasOwnProperty('bucket') || selectedVehicle.hasOwnProperty('product_name')) && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                            <BoltIcon className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="font-bold text-gray-900">Financial Information</h4>
                        </div>
                        
                        {selectedVehicle.hasOwnProperty('emi') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">EMI</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.emi || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('pos') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">POS</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.pos || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('bucket') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Bucket</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.bucket || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('product_name') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Product Name</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.product_name || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Details - only show if user has access */}
                    {(selectedVehicle.hasOwnProperty('address') || selectedVehicle.hasOwnProperty('sec_17') || selectedVehicle.hasOwnProperty('seasoning') || selectedVehicle.hasOwnProperty('allocation')) && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                            <UserIcon className="w-4 h-4 text-orange-600" />
                          </div>
                          <h4 className="font-bold text-gray-900">Additional Information</h4>
                        </div>
                        
                        {selectedVehicle.hasOwnProperty('address') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Address</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.address || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('sec_17') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Sec 17</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.sec_17 || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('seasoning') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Seasoning</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.seasoning || 'N/A'}</p>
                          </div>
                        )}
                        
                        {selectedVehicle.hasOwnProperty('allocation') && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Allocation</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedVehicle.allocation || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Confirmer Details - only show if user has access */}
                    {(selectedVehicle.hasOwnProperty('first_confirmer_name') || selectedVehicle.hasOwnProperty('second_confirmer_name') || selectedVehicle.hasOwnProperty('third_confirmer_name')) && (
                      <div className="space-y-4 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <h4 className="font-bold text-gray-900">Confirmer Details</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {selectedVehicle.hasOwnProperty('first_confirmer_name') && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-gray-700 mb-1">1st Confirmer</p>
                              <p className="text-sm text-gray-900 font-bold">{selectedVehicle.first_confirmer_name || 'N/A'}</p>
                              {selectedVehicle.hasOwnProperty('first_confirmer_no') && (
                                <p className="text-sm text-gray-600">{selectedVehicle.first_confirmer_no || 'N/A'}</p>
                              )}
                            </div>
                          )}
                          
                          {selectedVehicle.hasOwnProperty('second_confirmer_name') && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-gray-700 mb-1">2nd Confirmer</p>
                              <p className="text-sm text-gray-900 font-bold">{selectedVehicle.second_confirmer_name || 'N/A'}</p>
                              {selectedVehicle.hasOwnProperty('second_confirmer_no') && (
                                <p className="text-sm text-gray-600">{selectedVehicle.second_confirmer_no || 'N/A'}</p>
                              )}
                            </div>
                          )}
                          
                          {selectedVehicle.hasOwnProperty('third_confirmer_name') && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-gray-700 mb-1">3rd Confirmer</p>
                              <p className="text-sm text-gray-900 font-bold">{selectedVehicle.third_confirmer_name || 'N/A'}</p>
                              {selectedVehicle.hasOwnProperty('third_confirmer_no') && (
                                <p className="text-sm text-gray-600">{selectedVehicle.third_confirmer_no || 'N/A'}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Inventory Creation Modal */}
      {showInventoryModal && selectedVehicleForInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border w-11/12 max-w-4xl shadow-2xl rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Generate Inventory</h3>
                  <p className="text-gray-600">Create inventory for {selectedVehicleForInventory.registration_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
              >
                <span className="text-gray-600 text-xl">×</span>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Auto-filled Information */}
                <div className="md:col-span-2 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-3">Auto-filled Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Registration Number</p>
                      <p className="text-sm text-blue-900 font-semibold">{selectedVehicleForInventory.registration_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Customer Name</p>
                      <p className="text-sm text-blue-900 font-semibold">{selectedVehicleForInventory.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Make</p>
                      <p className="text-sm text-blue-900 font-semibold">{selectedVehicleForInventory.make}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Chassis Number</p>
                      <p className="text-sm text-blue-900 font-semibold">{selectedVehicleForInventory.chasis_number}</p>
                    </div>
                  </div>
                </div>

                {/* Mandatory Driver Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-red-600" />
                    Driver Information (Required)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.driverName}
                        onChange={(e) => handleInventoryFormChange('driverName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter driver name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Driver Number *
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.driverNumber}
                        onChange={(e) => handleInventoryFormChange('driverNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter driver number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Basic Vehicle Details */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-green-600" />
                    Basic Vehicle Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Speed Meter Reading (KMS)
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.speedMeterReading}
                        onChange={(e) => handleInventoryFormChange('speedMeterReading', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 45,000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Original RC Book
                      </label>
                      <select
                        value={inventoryFormData.originalRCBook}
                        onChange={(e) => handleInventoryFormChange('originalRCBook', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Insurance Policy Upto
                      </label>
                      <input
                        type="date"
                        value={inventoryFormData.insurancePolicyUpto}
                        onChange={(e) => handleInventoryFormChange('insurancePolicyUpto', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Parking Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <HomeIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    Parking Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name & Place of Parking Yard
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.parkingYardName}
                        onChange={(e) => handleInventoryFormChange('parkingYardName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter parking yard details"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parking Expenses Per Day
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.parkingExpensesPerDay}
                        onChange={(e) => handleInventoryFormChange('parkingExpensesPerDay', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., ₹100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Availability
                      </label>
                      <select
                        value={inventoryFormData.keyAvailability}
                        onChange={(e) => handleInventoryFormChange('keyAvailability', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tyre Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2 text-orange-600" />
                    Tyre Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tyre Make
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.tyreMake}
                        onChange={(e) => handleInventoryFormChange('tyreMake', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., MRF, Apollo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tyre Condition Front
                      </label>
                      <select
                        value={inventoryFormData.tyreConditionFront}
                        onChange={(e) => handleInventoryFormChange('tyreConditionFront', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select condition</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="bad">Bad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tyre Condition Rear
                      </label>
                      <select
                        value={inventoryFormData.tyreConditionRear}
                        onChange={(e) => handleInventoryFormChange('tyreConditionRear', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select condition</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="bad">Bad</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Body Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Body Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body Type
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.bodyType}
                        onChange={(e) => handleInventoryFormChange('bodyType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Sedan, SUV, Hatchback"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body Condition
                      </label>
                      <select
                        value={inventoryFormData.bodyCondition}
                        onChange={(e) => handleInventoryFormChange('bodyCondition', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select condition</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="bad">Bad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Wheels
                      </label>
                      <input
                        type="text"
                        value={inventoryFormData.numberOfWheels}
                        onChange={(e) => handleInventoryFormChange('numberOfWheels', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 4"
                      />
                    </div>
                  </div>
                </div>

                {/* Equipment & Accessories */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Equipment & Accessories
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { field: 'airConditioner', label: 'Air Conditioner' },
                      { field: 'jockeyWithRod', label: 'Jockey with Rod' },
                      { field: 'toolSet', label: 'Tool Set' },
                      { field: 'rearViewMirror', label: 'Rear View Mirror' },
                      { field: 'stephnee', label: 'Stephnee (Disc & Tyre)' },
                      { field: 'tarpaulinRope', label: 'Tarpaulin & Rope' },
                      { field: 'tutorAmplifier', label: 'Tutor/Amplifier' },
                      { field: 'stereoSet', label: 'Stereo Set' },
                      { field: 'battery', label: 'Battery' },
                      { field: 'seatCovers', label: 'Seat Covers' },
                      { field: 'wiper', label: 'Wiper' }
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label}
                        </label>
                        <select
                          value={inventoryFormData[field as keyof typeof inventoryFormData]}
                          onChange={(e) => handleInventoryFormChange(field, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select option</option>
                          <option value="available">Available</option>
                          <option value="not available">Not Available</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Specific Items */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2 text-green-600" />
                    Other Specific Items
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Any other specific items
                    </label>
                    <textarea
                      value={inventoryFormData.otherSpecificItems}
                      onChange={(e) => handleInventoryFormChange('otherSpecificItems', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter any other specific items or notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 space-x-3">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                disabled={isCreatingInventory}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInventory}
                disabled={isCreatingInventory || !inventoryFormData.driverName.trim() || !inventoryFormData.driverNumber.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingInventory ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Inventory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}