import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { moneyAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface ImportResult {
  fileId: string;
  filename: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ row: number; reason: string }>;
  dedupeEnabled: boolean;
}

interface ImportMoneyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportMoneyModal({ onClose, onSuccess }: ImportMoneyModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dedupe, setDedupe] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => moneyAPI.import(formData),
    onSuccess: (response) => {
      const result = response.data.data;
      setImportResult(result);
      
      if (result.failedCount === 0) {
        toast.success(`Successfully imported ${result.insertedCount + result.updatedCount} records`);
      } else if (result.insertedCount + result.updatedCount > 0) {
        toast.success(`Imported ${result.insertedCount + result.updatedCount} records with ${result.failedCount} errors`);
      } else {
        toast.error(`Import failed: ${result.failedCount} errors`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Import failed');
    }
  });

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      toast.error('Please select a valid Excel (.xlsx) file');
      return;
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    
    setFile(selectedFile);
    setImportResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dedupe', dedupe.toString());
    
    importMutation.mutate(formData);
  };

  const handleDownloadTemplate = () => {
    // Create a template with the required headers
    const headers = [
      'Bill Date',
      'Bank',
      'RegistrationNumber',
      'Make',
      'Model',
      'STATUS',
      'Yard Name',
      'Repo Bill Amount',
      'Repo Payment Status',
      'Total Bill Amount',
      'Loan Number',
      'Customer Name',
      'Load',
      'Load Details',
      'Confirm By',
      'Repo Date',
      'ServiceTax',
      'Payment To Repo Team'
    ];

    const csvContent = headers.join(',') + '\n' +
      '2025-01-15,HDFC Bank,BR01FY9181,Hero,Splendor Plus,.ON YARD,ABC Recovery Yard,5000,Payment Due,9000,LN123456,Raj Kumar,,Sample load details,Sandeep Kumar,2025-01-10,500,1000';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'money-records-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully');
  };

  const handleFinish = () => {
    if (importResult && (importResult.insertedCount > 0 || importResult.updatedCount > 0)) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content max-w-2xl">
          <div className="modal-header">
            <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Import Money Records</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="modal-body">
            {!importResult ? (
              <>
                {/* Template Download Section */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">Excel Template Required</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Your Excel file must have these exact headers (case-sensitive). 
                        <strong>Tip:</strong> Export existing data to get the perfect template format!
                      </p>
                      <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded font-mono mb-3">
                        Bill Date, Bank, RegistrationNumber, Make, Model, STATUS, Yard Name, 
                        Repo Bill Amount, Repo Payment Status, Total Bill Amount, Loan Number, 
                        Customer Name, Load, Load Details, Confirm By, Repo Date, ServiceTax, 
                        Payment To Repo Team
                      </div>
                      <button
                        onClick={handleDownloadTemplate}
                        className="btn btn-outline btn-sm"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File (.xlsx)
                  </label>
                  
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-[var(--brand-yellow)] bg-[var(--brand-yellow)] bg-opacity-10' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-1">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Drag and drop your Excel file here, or click to browse
                        </p>
                        <p className="text-xs text-gray-500">
                          Only .xlsx files up to 50MB are supported
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Import Options</label>
                  
                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={dedupe}
                        onChange={(e) => setDedupe(e.target.checked)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Enable Deduplication</span>
                        <p className="text-xs text-gray-500 mt-1">
                          When enabled, records with the same registration number, bank, and bill month 
                          will be updated instead of creating duplicates. When disabled, all records 
                          will be inserted as new entries.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              /* Import Results Section */
              <div className="space-y-6">
                <div className="text-center">
                  {importResult.failedCount === 0 ? (
                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  )}
                  
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)] mb-2">
                    Import {importResult.failedCount === 0 ? 'Completed' : 'Completed with Issues'}
                  </h3>
                  
                  <p className="text-gray-600">
                    Processed {importResult.totalRows} rows from {importResult.filename}
                  </p>
                </div>

                {/* Results Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.insertedCount}</div>
                    <div className="text-sm text-green-700">Inserted</div>
                  </div>
                  
                  {importResult.dedupeEnabled && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{importResult.updatedCount}</div>
                      <div className="text-sm text-blue-700">Updated</div>
                    </div>
                  )}
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{importResult.skippedCount}</div>
                    <div className="text-sm text-gray-700">Skipped</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.failedCount}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>

                {/* Error Details */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Error Details (showing first {Math.min(10, importResult.errors.length)} of {importResult.errors.length})
                    </h4>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm p-3 bg-red-50 border border-red-200 rounded">
                          <span className="font-medium text-red-800">Row {error.row}:</span>
                          <span className="text-red-700 ml-2">{error.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {!importResult ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  disabled={importMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importMutation.isPending}
                  className="btn btn-primary"
                >
                  {importMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
                      Import Records
                    </>
                  )}
                </button>
              </>
            ) : (
              <button onClick={handleFinish} className="btn btn-primary w-full">
                {importResult.insertedCount > 0 || importResult.updatedCount > 0 ? 'View Records' : 'Close'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
