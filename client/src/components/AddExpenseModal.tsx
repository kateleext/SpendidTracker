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
    <div id="addExpenseModal" className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl w-[90%] max-w-[360px] overflow-hidden shadow-xl">
        <div className="add-expense-preview w-full h-48 bg-gray-200">
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
                className="absolute bottom-4 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md"
                onClick={handleCapture}
              >
                <div className="w-12 h-12 rounded-full border-2 border-accent"></div>
              </button>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-text-secondary text-sm mb-1">{t('amount')}</label>
            <div className="relative">
              <span className="absolute top-3 left-3 text-text-secondary">$</span>
              <input 
                type="number" 
                className="w-full py-2 px-8 border border-gray-300 rounded-lg" 
                placeholder="0.00" 
                step="0.01" 
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={showCameraView}
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-text-secondary text-sm mb-1">{t('description')}</label>
            <input 
              type="text" 
              className="w-full py-2 px-3 border border-gray-300 rounded-lg" 
              placeholder="groceries" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={showCameraView}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white text-text-primary"
              onClick={handleCancel}
            >
              {t('cancel')}
            </button>
            <button 
              className="px-5 py-2 border-0 rounded-lg text-sm font-medium bg-accent text-white"
              onClick={handleSave}
              disabled={showCameraView || createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
