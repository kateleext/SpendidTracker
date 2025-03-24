import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { useCamera } from '../hooks/useCamera';
import { useToast } from '@/hooks/use-toast';

const AddExpenseModal = () => {
  const { t } = useTranslation();
  const { isAddExpenseModalOpen, closeAddExpenseModal } = useAppContext();
  const { videoRef, capturedImage, startCamera, stopCamera, capturePhoto, resetCapture } = useCamera();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('groceries');
  const [showCameraView, setShowCameraView] = useState<boolean>(true);
  
  // Initialize camera when modal opens
  useEffect(() => {
    if (isAddExpenseModalOpen) {
      resetCapture();
      setAmount('');
      setTitle('groceries');
      setShowCameraView(true);
      
      const initCamera = async () => {
        await startCamera();
      };
      
      initCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isAddExpenseModalOpen, startCamera, stopCamera, resetCapture]);
  
  // Handle capture button click
  const handleCapture = () => {
    capturePhoto();
    setShowCameraView(false);
  };
  
  // Set up expense creation mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current'] });
      
      toast({
        title: t('expenseAdded'),
        description: t('expenseAddedSuccess'),
      });
      
      closeAddExpenseModal();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message || t('expenseAddFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Handle save button click
  const handleSave = async () => {
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
    
    // Convert data URL to Blob
    const fetchResponse = await fetch(capturedImage);
    const blob = await fetchResponse.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('image', blob, 'expense.jpg');
    formData.append('amount', amount);
    formData.append('title', title || 'groceries');
    
    // Submit the form
    createExpenseMutation.mutate(formData);
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    if (!showCameraView && !capturedImage) {
      setShowCameraView(true);
      startCamera();
    } else {
      closeAddExpenseModal();
    }
  };
  
  if (!isAddExpenseModalOpen) {
    return null;
  }

  return (
    <div id="addExpenseModal" className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="bg-white w-full h-full overflow-auto">
        {/* Header with close button */}
        <div className="sticky top-0 z-10 px-4 py-3 flex justify-between items-center bg-white border-b border-gray-200">
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={handleCancel}
          >
            {t('cancel')}
          </button>
          <h2 className="text-lg font-semibold">{t('addExpense')}</h2>
          <button 
            className="text-accent font-medium hover:text-accent-light"
            onClick={handleSave}
            disabled={showCameraView || createExpenseMutation.isPending}
          >
            {createExpenseMutation.isPending ? t('saving') : t('save')}
          </button>
        </div>
        
        {/* Camera/Image section - taller in fullscreen */}
        <div className="add-expense-preview w-full h-72 bg-gray-200">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              className="w-full h-full object-cover" 
              alt="Captured expense" 
            />
          ) : (
            <div id="cameraPreview" className="w-full h-full flex items-center justify-center bg-black">
              <video 
                ref={videoRef} 
                className="h-full w-full object-cover" 
                playsInline 
              />
              <button 
                className="absolute bottom-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                onClick={handleCapture}
              >
                <div className="w-14 h-14 rounded-full border-2 border-accent"></div>
              </button>
            </div>
          )}
        </div>
        
        {/* Form section */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-text-secondary text-sm mb-2">{t('amount')}</label>
            <div className="relative">
              <span className="absolute top-4 left-4 text-text-secondary text-xl">$</span>
              <input 
                type="number" 
                className="w-full py-3 px-10 border border-gray-300 rounded-lg text-2xl font-medium" 
                placeholder="0.00" 
                step="0.01" 
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={showCameraView}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-text-secondary text-sm mb-2">{t('description')}</label>
            <input 
              type="text" 
              className="w-full py-3 px-4 border border-gray-300 rounded-lg" 
              placeholder="groceries" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={showCameraView}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
