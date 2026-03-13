import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { set } from 'date-fns';

interface RTOUploadProps {
  selectedDate?: Date;
  onUploadSuccess: (data: any) => void;
}

export const RTOUpload: React.FC<RTOUploadProps> = ({
  selectedDate,
  onUploadSuccess,
}) => {
  const [oldSheetFile, setOldSheetFile] = useState<File | null>(null);
  const [shipOwlNimbusFile, setShipOwlNimbusFile] = useState<File | null>(null);
  const [nimbuFile, setNimbuFile] = useState<File | null>(null);
  const [shipOwlFile, setShipOwlFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf('.'));

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.includes(fileExtension)
    );
  };

  const handleOldSheetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setOldSheetFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
      }
    }
  };
  const handleShipOwlNimbusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setShipOwlNimbusFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
      }
    }
  };

  const handleNimbuFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setNimbuFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
      }
    }
  };

  const handleShipOwlFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setShipOwlFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!oldSheetFile && !nimbuFile && !shipOwlFile && !shipOwlNimbusFile) {
      alert('Please select at least one file (Parcel X, NimbusPost,shipOwlNimbusFile, or ShipOwl)');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      // Add old sheet file if provided
      if (oldSheetFile) {
        formData.append('file', oldSheetFile);
      }
    if (shipOwlNimbusFile) {
        formData.append('shipOwlNimbusFile', shipOwlNimbusFile);
      }
      // Add Nimbu file if provided
      if (nimbuFile) {
        formData.append('nimbuFile', nimbuFile);
      }

      // Add ShipOwl file if provided
      if (shipOwlFile) {
        formData.append('shipOwlFile', shipOwlFile);
      }

      formData.append(
        'date',
        selectedDate
          ? selectedDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      );

      const response = await fetch(API_ENDPOINTS.RTO.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        onUploadSuccess(result);
        setOldSheetFile(null);
        setShipOwlNimbusFile(null);
        setNimbuFile(null);
        setShipOwlFile(null);
        // Reset file inputs
        const oldSheetInput = document.getElementById(
          'old-sheet-upload',
        ) as HTMLInputElement;
        const nimbuInput = document.getElementById(
          'nimbu-file-upload',
        ) as HTMLInputElement;
        const shipOwlInput = document.getElementById(
          'shipowl-file-upload',
        ) as HTMLInputElement;
        if (oldSheetInput) oldSheetInput.value = '';
        if (nimbuInput) nimbuInput.value = '';
        if (shipOwlInput) shipOwlInput.value = '';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
          <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          </div>
          Upload RTO Excel File
        </CardTitle>
        <CardDescription className="text-gray-600 text-base">
          Upload RTO Excel sheets. You can upload Parcel X, NimbusPost, and/or
          ShipOwl sheets. The system will automatically merge data from
          all sheets. Courier names (Delhivery and XB) will be normalized.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Old Sheet Upload */}
        <div className="space-y-4">
          <Label
            htmlFor="old-sheet-upload"
            className="text-sm font-semibold text-gray-700"
          >
            Parcel X
          </Label>
          <div className="relative">
            <Input
              id="old-sheet-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleOldSheetChange}
              className="h-14 border-2 border-dashed border-gray-300 hover:border-blue-400 focus:border-blue-500 rounded-xl transition-all duration-200 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            />
            <Upload className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
          {oldSheetFile && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm text-green-700 font-semibold">
                  Selected: {oldSheetFile.name}
                </span>
                <p className="text-xs text-green-600">
                  Size: {(oldSheetFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Nimbu Sheet Upload */}
        <div className="space-y-4">
          <Label
            htmlFor="nimbu-file-upload"
            className="text-sm font-semibold text-gray-700"
          >
            NimbusPost
          </Label>
          <div className="relative">
            <Input
              id="nimbu-file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleNimbuFileChange}
              className="h-14 border-2 border-dashed border-gray-300 hover:border-purple-400 focus:border-purple-500 rounded-xl transition-all duration-200 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
            />
            <Upload className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
          {nimbuFile && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <span className="text-sm text-purple-700 font-semibold">
                  Selected: {nimbuFile.name}
                </span>
                <p className="text-xs text-purple-600">
                  Size: {(nimbuFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ShipOwl Upload */}
        <div className="space-y-4">
          <Label
            htmlFor="shipowl-file-upload"
            className="text-sm font-semibold text-gray-700"
          >
            ShipOwl
          </Label>
          <div className="relative">
            <Input
              id="shipowl-file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleShipOwlFileChange}
              className="h-14 border-2 border-dashed border-gray-300 hover:border-green-400 focus:border-green-500 rounded-xl transition-all duration-200 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-opacity-20"
            />
            <Upload className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
          {shipOwlFile && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm text-green-700 font-semibold">
                  Selected: {shipOwlFile.name}
                </span>
                <p className="text-xs text-green-600">
                  Size: {(shipOwlFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </div>


           <div className="space-y-4">
          <Label
            htmlFor="old-sheet-upload"
            className="text-sm font-semibold text-gray-700"
          >
            ShipOwl Nimbus
          </Label>
          <div className="relative">
            <Input
              id="old-sheet-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleShipOwlNimbusChange}
              className="h-14 border-2 border-dashed border-gray-300 hover:border-red-400 focus:border-red-500 rounded-xl transition-all duration-200 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20"
            />
            <Upload className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
          {shipOwlNimbusFile && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm text-green-700 font-semibold">
                  Selected: {shipOwlNimbusFile.name}
                </span>
                <p className="text-xs text-green-600">
                  Size: {(shipOwlNimbusFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={(!oldSheetFile && !nimbuFile && !shipOwlFile && !shipOwlNimbusFile) || isUploading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {isUploading ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-lg">Uploading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5" />
              <span className="text-lg">Upload RTO Data</span>
            </div>
          )}
        </Button>

        {/* Upload Result */}
        {uploadResult && (
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-green-800">
                Upload Successful!
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Date</p>
                <p className="text-sm font-semibold text-green-800">
                  {uploadResult.date}
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">
                  Total Records
                </p>
                <p className="text-sm font-semibold text-green-800">
                  {uploadResult.totalRecords}
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Files</p>
                <p className="text-sm font-semibold text-green-800 truncate">
                  {oldSheetFile?.name || ''}{' '}
                  {nimbuFile ? (oldSheetFile ? ', ' : '') + nimbuFile.name : ''}
                </p>
              </div>
            </div>
            {uploadResult.barcodes && uploadResult.barcodes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-green-800 mb-3">
                  Sample Data Preview:
                </p>
                <div className="bg-white/60 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {uploadResult.barcodes
                      .slice(0, 5)
                      .map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                            {item.barcode}
                          </span>
                          <span className="text-slate-600 truncate ml-2">
                            {item.productName}
                          </span>
                        </div>
                      ))}
                    {uploadResult.barcodes.length > 5 && (
                      <p className="text-xs text-slate-500 text-center">
                        ... and {uploadResult.barcodes.length - 5} more items
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
