import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCamera } from '../hooks/useCamera';
import { useToast } from '@/hooks/use-toast';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddExpenseModal = ({ isOpen, onClose }: AddExpenseModalProps) => {
  const { t } = useTranslation();
  const { videoRef, capturedImage, startCamera, stopCamera, capturePhoto, resetCapture } = useCamera();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [showCameraView, setShowCameraView] = useState<boolean>(true);
  const [cameraInitialized, setCameraInitialized] = useState<boolean>(false);
  
  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('AddExpenseModal: Modal opened, resetting form values');
      resetCapture();
      setAmount('');
      setTitle(''); // Empty title, will use placeholder instead
      setShowCameraView(true);
      setCameraInitialized(false); // Start with camera disabled until explicitly started
    }
  }, [isOpen, resetCapture]);
  
  // Initialize camera only once when the component first mounts
  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout | null = null;
    
    if (isOpen && showCameraView) {
      console.log('AddExpenseModal: Starting camera initialization sequence');
      
      // First, ensure any previous camera is stopped
      stopCamera();
      
      // Wait a moment to avoid rapid initialization/reinitialization
      initTimeout = setTimeout(async () => {
        if (!mounted) return;
        
        console.log('AddExpenseModal: Actually initializing camera now');
        
        try {
          if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            console.log('Media devices not supported');
            return;
          }
          
          const success = await startCamera();
          
          if (mounted && success) {
            console.log('Camera initialized successfully');
            setCameraInitialized(true);
          }
        } catch (err) {
          console.error('Camera initialization error:', err);
        }
      }, 800); // Slightly longer delay to ensure cleanup is complete
    }
    
    // Cleanup function to handle unmounting or component unload
    return () => {
      mounted = false;
      
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      
      // Stop camera when component unmounts or when switching away from camera view
      if (!isOpen || !showCameraView) {
        console.log('AddExpenseModal: Stopping camera because modal closed or view changed');
        stopCamera();
        setCameraInitialized(false);
      }
    };
  }, [isOpen, showCameraView, startCamera, stopCamera]);
  
  // Handle capture button click
  const handleCapture = () => {
    console.log('AddExpenseModal: Capturing photo');
    capturePhoto();
    setShowCameraView(false);
  };
  
  // Set up expense creation mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('AddExpenseModal: Submitting expense data');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to save expense');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate expense and budget queries to refresh data
      console.log('AddExpenseModal: Expense saved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/history'] });
      
      toast({
        title: t('expenseAdded'),
        description: t('expenseAddedSuccess'),
      });
      
      onClose();
    },
    onError: (error) => {
      console.error('AddExpenseModal: Error saving expense', error);
      toast({
        title: t('error'),
        description: error.message || t('expenseAddFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Handle save button click
  const handleSave = async () => {
    console.log('AddExpenseModal: Save button clicked');
    if (!capturedImage) {
      toast({
        title: t('error'),
        description: t('pleaseCapturePicture'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: t('error'),
        description: t('pleaseEnterAmount'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('AddExpenseModal: Processing captured image');
      
      // Convert data URL to Blob with proper type
      // Properly extract the base64 data from the data URL
      const dataURLParts = capturedImage.split(',');
      const mime = dataURLParts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const base64Data = dataURLParts[1];
      const byteCharacters = atob(base64Data);
      
      // Convert base64 to binary
      const byteArrays = [];
      for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);
        for (let j = 0; j < slice.length; j++) {
          byteNumbers[j] = slice.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      // Create blob with proper MIME type
      const blob = new Blob(byteArrays, { type: mime });
      console.log(`AddExpenseModal: Created blob of type ${mime}, size: ${blob.size} bytes`);
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'expense.jpg');
      formData.append('amount', amount);
      formData.append('title', title || 'groceries');
      
      console.log('AddExpenseModal: Submitting form data');
      // Submit the form
      createExpenseMutation.mutate(formData);
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: t('error'),
        description: t('errorProcessingImage'),
        variant: 'destructive',
      });
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    console.log('AddExpenseModal: Cancel button clicked');
    
    // If we're in the form view (after taking a picture), go back to camera view
    if (!showCameraView && capturedImage) {
      resetCapture();
      setShowCameraView(true);
      // Camera will start automatically through the useEffect
    } else {
      // If we're in camera view, close the modal completely
      stopCamera();
      setCameraInitialized(false);
      onClose();
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div id="addExpenseModal" className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="w-full h-full relative overflow-hidden">
        {/* Header with buttons - always visible and above all other content */}
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex justify-between items-center bg-black/50 backdrop-blur-sm">
          <button 
            className="text-white hover:text-gray-200 font-medium"
            onClick={handleCancel}
            type="button"
          >
            {showCameraView ? t('back') : t('cancel')}
          </button>
          <h2 className="text-lg font-semibold text-white">
            {showCameraView ? t('snapAnExpense') : (capturedImage ? t('reviewExpense') : t('addExpense'))}
          </h2>
          <button 
            className={`font-medium ${!showCameraView && capturedImage && amount ? 'text-[#6bbb5c] font-bold' : 'text-gray-400'}`}
            onClick={handleSave}
            disabled={showCameraView || !capturedImage || !amount || createExpenseMutation.isPending}
            type="button"
          >
            {createExpenseMutation.isPending ? t('saving') : t('save')}
          </button>
        </div>
        
        {/* Full-screen Camera/Image section */}
        <div className="absolute inset-0 pt-12 z-10">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              className="w-full h-full object-cover" 
              alt="Captured expense" 
            />
          ) : (
            <div id="cameraPreview" className="w-full h-full flex items-center justify-center bg-black">
              {cameraInitialized ? (
                <video 
                  ref={videoRef} 
                  className="h-full w-full object-cover" 
                  playsInline 
                  autoPlay
                />
              ) : (
                <div className="text-white text-center">
                  <p>{t('initializingCamera', 'Initializing camera...')}</p>
                </div>
              )}
              
              {cameraInitialized && (
                <>
                  <button 
                    className="absolute bottom-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                    onClick={handleCapture}
                    type="button"
                    aria-label={t('takePicture')}
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-[#4a5d44]"></div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Form section - semi-transparent card at the bottom */}
        {!showCameraView && capturedImage && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-6 rounded-t-xl z-20">
            <div className="mb-6">
              <label className="block text-white text-sm mb-2">{t('amount')}</label>
              <div className="relative">
                <span className="absolute top-4 left-4 text-white text-xl">$</span>
                <input 
                  type="number" 
                  className="w-full py-3 px-10 bg-transparent border border-white/30 rounded-lg text-3xl font-medium text-white" 
                  placeholder="0.00" 
                  step="0.01" 
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-white text-sm mb-2">{t('description')}</label>
              <input 
                type="text" 
                className="w-full py-3 px-4 bg-transparent border border-white/30 rounded-lg text-white" 
                placeholder="groceries" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddExpenseModal;
