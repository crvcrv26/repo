import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ClipboardDocumentListIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  DocumentTextIcon,
  SparklesIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface Inventory {
  _id: string;
  inventoryNumber: string;
  registrationNumber: string;
  customerName: string;
  make: string;
  chasisNumber: string;
  engineNumber: string;
  fieldAgentName: string;
  fieldAgentPhone: string;
  adminName: string;
  driverName: string;
  driverNumber: string;
  seizureDate: string;
  createdAt: string;
  // Optional fields
  speedMeterReading?: string;
  originalRCBook?: string;
  insurancePolicyUpto?: string;
  parkingYardName?: string;
  parkingExpensesPerDay?: string;
  keyAvailability?: string;
  tyreConditionFront?: string;
  tyreConditionRear?: string;
  tyreMake?: string;
  bodyType?: string;
  bodyCondition?: string;
  numberOfWheels?: string;
  airConditioner?: string;
  jockeyWithRod?: string;
  toolSet?: string;
  rearViewMirror?: string;
  stephnee?: string;
  tarpaulinRope?: string;
  tutorAmplifier?: string;
  stereoSet?: string;
  battery?: string;
  seatCovers?: string;
  wiper?: string;
  otherSpecificItems?: string;
  vehicleId: {
    _id: string;
    registration_number: string;
    customer_name: string;
    make: string;
    chasis_number: string;
    engine_number: string;
  };
  fieldAgentId?: {
    _id: string;
    name: string;
    email: string;
  };
  adminId?: {
    _id: string;
    name: string;
  };
}

export default function Inventory() {
  const { user: currentUser } = useAuth();
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get inventories based on user role
  const { data: inventories, isLoading } = useQuery({
    queryKey: ['inventories', currentUser?.role],
    queryFn: async () => {
      let response;
      switch (currentUser?.role) {
        case 'fieldAgent':
          response = await inventoryAPI.getFieldAgentInventories();
          break;
        case 'admin':
          response = await inventoryAPI.getAdminInventories();
          break;
        case 'auditor':
          response = await inventoryAPI.getAuditorInventories();
          break;
        default:
          throw new Error('Invalid user role');
      }
      return response.data.data as Inventory[];
    },
    enabled: !!currentUser?.role
  });

  const handleViewDetails = (inventory: Inventory) => {
    console.log('Selected inventory:', inventory);
    
    // Ensure all required fields have fallback values
    const safeInventory = {
      ...inventory,
      registrationNumber: inventory.registrationNumber || 'N/A',
      customerName: inventory.customerName || 'N/A',
      make: inventory.make || 'N/A',
      chasisNumber: inventory.chasisNumber || 'N/A',
      engineNumber: inventory.engineNumber || 'N/A',
      fieldAgentName: inventory.fieldAgentName || 'N/A',
      fieldAgentPhone: inventory.fieldAgentPhone || 'N/A',
      adminName: inventory.adminName || 'N/A',
      driverName: inventory.driverName || 'N/A',
      driverNumber: inventory.driverNumber || 'N/A',
      seizureDate: inventory.seizureDate || inventory.createdAt || new Date().toISOString(),
      createdAt: inventory.createdAt || new Date().toISOString(),
      inventoryNumber: inventory.inventoryNumber || 'N/A'
    };
    
    console.log('Safe inventory for modal:', safeInventory);
    setSelectedInventory(safeInventory);
    setShowDetailsModal(true);
  };

  const handleDownload = async (inventoryId: string) => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-generation' });
      
      const response = await inventoryAPI.downloadInventory(inventoryId);
      
      console.log('Download response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data length:', response.data?.length);
      console.log('Response headers:', response.headers);
      
      // Check content type to determine if it's PDF or HTML
      const contentType = response.headers['content-type'];
      console.log('Content-Type:', contentType);
      
      if (contentType && contentType.includes('text/html')) {
        // It's HTML fallback, convert arraybuffer to string
        const decoder = new TextDecoder('utf-8');
        const htmlContent = decoder.decode(response.data);
        console.log('HTML content preview:', htmlContent.substring(0, 200));
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory-${inventoryId}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('HTML file downloaded! PDF generation failed, but you can open this HTML file in a browser and print to PDF.', { id: 'pdf-generation' });
        return;
      }
      
      // It's PDF data
      console.log('Creating PDF blob with size:', response.data.length);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      console.log('Blob created with size:', blob.size);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${inventoryId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!', { id: 'pdf-generation' });
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.message || 'Failed to download inventory', { id: 'pdf-generation' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">
            {currentUser?.role === 'fieldAgent' && 'View your generated inventories'}
            {currentUser?.role === 'admin' && 'View inventories from your field agents'}
            {currentUser?.role === 'auditor' && 'View inventories from your admin\'s field agents'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
          <span className="text-lg font-semibold text-gray-700">
            {inventories?.length || 0} Inventories
          </span>
        </div>
      </div>

      {/* Inventories List */}
      <div className="bg-white rounded-lg shadow">
        {inventories && inventories.length > 0 ? (
          <div className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Inventories</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {inventories.map((inventory) => (
                <div key={inventory._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {inventory.inventoryNumber}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(inventory.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Vehicle Details</p>
                          <p className="text-sm text-gray-900 font-semibold">
                            {inventory.registrationNumber}
                          </p>
                          <p className="text-xs text-gray-600">{inventory.customerName}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500">Field Agent</p>
                          <p className="text-sm text-gray-900 font-semibold">
                            {inventory.fieldAgentName}
                          </p>
                          <p className="text-xs text-gray-600">{inventory.fieldAgentPhone}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500">Driver</p>
                          <p className="text-sm text-gray-900 font-semibold">
                            {inventory.driverName}
                          </p>
                          <p className="text-xs text-gray-600">{inventory.driverNumber}</p>
                        </div>
                        
                        {(currentUser?.role === 'admin' || currentUser?.role === 'auditor') && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Admin</p>
                            <p className="text-sm text-gray-900 font-semibold">
                              {inventory.adminName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => handleViewDetails(inventory)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownload(inventory._id)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {currentUser?.role === 'fieldAgent' && 'Generate your first inventory from vehicle search'}
              {currentUser?.role === 'admin' && 'Your field agents haven\'t generated any inventories yet'}
              {currentUser?.role === 'auditor' && 'No inventories have been generated yet'}
            </p>
          </div>
        )}
      </div>

      {/* Inventory Details Modal */}
      {showDetailsModal && selectedInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-2xl rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Inventory Details</h3>
                  <p className="text-gray-600">Complete inventory information</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
              >
                <span className="text-gray-600 text-xl">×</span>
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inventory Header */}
                <div className="md:col-span-2 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-blue-900">Inventory #{selectedInventory.inventoryNumber}</h4>
                      <p className="text-sm text-blue-700">Generated on {formatDate(selectedInventory.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-900">Seizure Date</p>
                      <p className="text-sm text-blue-700">{formatDate(selectedInventory.seizureDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Agency Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Agency Information
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Agency Name</p>
                      <p className="text-sm text-gray-900">{selectedInventory.adminName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Seizure Agent</p>
                      <p className="text-sm text-gray-900">{selectedInventory.fieldAgentName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Seizure Phone Number</p>
                      <p className="text-sm text-gray-900">{selectedInventory.fieldAgentPhone}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-green-600" />
                    Vehicle Information
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Registration Number</p>
                      <p className="text-sm text-gray-900 font-mono">{selectedInventory.registrationNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Customer Name</p>
                      <p className="text-sm text-gray-900">{selectedInventory.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Make</p>
                      <p className="text-sm text-gray-900">{selectedInventory.make}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Chassis Number</p>
                      <p className="text-sm text-gray-900 font-mono">{selectedInventory.chasisNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Engine Number</p>
                      <p className="text-sm text-gray-900 font-mono">{selectedInventory.engineNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-orange-600" />
                    Driver Information
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Driver Name</p>
                      <p className="text-sm text-gray-900">{selectedInventory.driverName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Driver Number</p>
                      <p className="text-sm text-gray-900">{selectedInventory.driverNumber}</p>
                    </div>
                  </div>
                </div>

                                 {/* Basic Vehicle Details */}
                 {(selectedInventory.speedMeterReading || selectedInventory.originalRCBook || selectedInventory.insurancePolicyUpto) && (
                   <div className="space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <DocumentTextIcon className="w-5 h-5 mr-2 text-green-600" />
                       Basic Vehicle Details
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                       {selectedInventory.speedMeterReading && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Speed Meter Reading (KMS)</p>
                           <p className="text-sm text-gray-900">{selectedInventory.speedMeterReading}</p>
                         </div>
                       )}
                       {selectedInventory.originalRCBook && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Original RC Book</p>
                           <p className="text-sm text-gray-900">{selectedInventory.originalRCBook}</p>
                         </div>
                       )}
                       {selectedInventory.insurancePolicyUpto && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Insurance Policy Upto</p>
                           <p className="text-sm text-gray-900">{formatDate(selectedInventory.insurancePolicyUpto)}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Parking Information */}
                 {(selectedInventory.parkingYardName || selectedInventory.parkingExpensesPerDay || selectedInventory.keyAvailability) && (
                   <div className="space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <HomeIcon className="w-5 h-5 mr-2 text-indigo-600" />
                       Parking Information
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                       {selectedInventory.parkingYardName && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Name & Place of Parking Yard</p>
                           <p className="text-sm text-gray-900">{selectedInventory.parkingYardName}</p>
                         </div>
                       )}
                       {selectedInventory.parkingExpensesPerDay && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Parking Expenses Per Day</p>
                           <p className="text-sm text-gray-900">{selectedInventory.parkingExpensesPerDay}</p>
                         </div>
                       )}
                       {selectedInventory.keyAvailability && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Key Availability</p>
                           <p className="text-sm text-gray-900">{selectedInventory.keyAvailability}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Tyre Information */}
                 {(selectedInventory.tyreMake || selectedInventory.tyreConditionFront || selectedInventory.tyreConditionRear) && (
                   <div className="space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <SparklesIcon className="w-5 h-5 mr-2 text-orange-600" />
                       Tyre Information
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                       {selectedInventory.tyreMake && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Tyre Make</p>
                           <p className="text-sm text-gray-900">{selectedInventory.tyreMake}</p>
                         </div>
                       )}
                       {selectedInventory.tyreConditionFront && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Tyre Condition Front</p>
                           <p className="text-sm text-gray-900">{selectedInventory.tyreConditionFront}</p>
                         </div>
                       )}
                       {selectedInventory.tyreConditionRear && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Tyre Condition Rear</p>
                           <p className="text-sm text-gray-900">{selectedInventory.tyreConditionRear}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Body Information */}
                 {(selectedInventory.bodyType || selectedInventory.bodyCondition || selectedInventory.numberOfWheels) && (
                   <div className="space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <SparklesIcon className="w-5 h-5 mr-2 text-blue-600" />
                       Body Information
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                       {selectedInventory.bodyType && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Body Type</p>
                           <p className="text-sm text-gray-900">{selectedInventory.bodyType}</p>
                         </div>
                       )}
                       {selectedInventory.bodyCondition && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Body Condition</p>
                           <p className="text-sm text-gray-900">{selectedInventory.bodyCondition}</p>
                         </div>
                       )}
                       {selectedInventory.numberOfWheels && (
                         <div>
                           <p className="text-sm font-semibold text-gray-700">Number of Wheels</p>
                           <p className="text-sm text-gray-900">{selectedInventory.numberOfWheels}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Equipment & Accessories */}
                 {(selectedInventory.airConditioner || selectedInventory.jockeyWithRod || selectedInventory.toolSet || selectedInventory.rearViewMirror || selectedInventory.stephnee || selectedInventory.tarpaulinRope || selectedInventory.tutorAmplifier || selectedInventory.stereoSet || selectedInventory.battery || selectedInventory.seatCovers || selectedInventory.wiper) && (
                   <div className="md:col-span-2 space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                       Equipment & Accessories
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {selectedInventory.airConditioner && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Air Conditioner</p>
                             <p className="text-sm text-gray-900">{selectedInventory.airConditioner}</p>
                           </div>
                         )}
                         {selectedInventory.jockeyWithRod && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Jockey with Rod</p>
                             <p className="text-sm text-gray-900">{selectedInventory.jockeyWithRod}</p>
                           </div>
                         )}
                         {selectedInventory.toolSet && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Tool Set</p>
                             <p className="text-sm text-gray-900">{selectedInventory.toolSet}</p>
                           </div>
                         )}
                         {selectedInventory.rearViewMirror && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Rear View Mirror</p>
                             <p className="text-sm text-gray-900">{selectedInventory.rearViewMirror}</p>
                           </div>
                         )}
                         {selectedInventory.stephnee && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Stephnee (Disc & Tyre)</p>
                             <p className="text-sm text-gray-900">{selectedInventory.stephnee}</p>
                           </div>
                         )}
                         {selectedInventory.tarpaulinRope && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Tarpaulin & Rope</p>
                             <p className="text-sm text-gray-900">{selectedInventory.tarpaulinRope}</p>
                           </div>
                         )}
                         {selectedInventory.tutorAmplifier && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Tutor/Amplifier</p>
                             <p className="text-sm text-gray-900">{selectedInventory.tutorAmplifier}</p>
                           </div>
                         )}
                         {selectedInventory.stereoSet && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Stereo Set</p>
                             <p className="text-sm text-gray-900">{selectedInventory.stereoSet}</p>
                           </div>
                         )}
                         {selectedInventory.battery && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Battery</p>
                             <p className="text-sm text-gray-900">{selectedInventory.battery}</p>
                           </div>
                         )}
                         {selectedInventory.seatCovers && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Seat Covers</p>
                             <p className="text-sm text-gray-900">{selectedInventory.seatCovers}</p>
                           </div>
                         )}
                         {selectedInventory.wiper && (
                           <div className="p-3 border border-gray-200 rounded-lg">
                             <p className="text-sm font-semibold text-gray-700">Wiper</p>
                             <p className="text-sm text-gray-900">{selectedInventory.wiper}</p>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Other Specific Items */}
                 {selectedInventory.otherSpecificItems && (
                   <div className="md:col-span-2 space-y-4">
                     <h4 className="font-bold text-gray-900 flex items-center">
                       <SparklesIcon className="w-5 h-5 mr-2 text-green-600" />
                       Other Specific Items
                     </h4>
                     <div className="bg-white border border-gray-200 rounded-lg p-4">
                       <p className="text-sm text-gray-900">{selectedInventory.otherSpecificItems}</p>
                     </div>
                   </div>
                 )}
              </div>
            </div>

            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => handleDownload(selectedInventory._id)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="ml-3 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
