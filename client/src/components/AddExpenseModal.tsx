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
  const { 
    videoRef, 
    capturedImage, 
    isVideoPlaying, // New state from the updated hook
    startCamera, 
    stopCamera, 
    capturePhoto, 
    resetCapture 
  } = useCamera();

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

  // Initialize camera when showing camera view
  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout | null = null;

    // Initialize camera when modal is open and we're in camera view
    // Note: we now want to initialize even if cameraInitialized was previously true
    // This ensures we reinitialize after going back from preview
    if (isOpen && showCameraView) {
      console.log('AddExpenseModal: Starting camera initialization sequence');
      console.log(`AddExpenseModal: Camera state - initialized: ${cameraInitialized}, video playing: ${isVideoPlaying}`);

      // Only start initialization if camera isn't already playing video
      if (!isVideoPlaying) {
        // Wait a moment to avoid rapid initialization
        initTimeout = setTimeout(async () => {
          if (!mounted) return;

          console.log('AddExpenseModal: Actually initializing camera now');

          try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
              console.log('Media devices not supported');
              toast({
                title: t('error'),
                description: t('cameraNotSupported'),
                variant: 'destructive',
              });
              return;
            }

            // Stop any existing camera first to ensure clean state
            stopCamera();

            // Short delay to ensure previous camera is fully stopped
            await new Promise(resolve => setTimeout(resolve, 100));

            const success = await startCamera();

            if (mounted && success) {
              console.log('Camera initialized successfully');
              setCameraInitialized(true);
            } else if (mounted) {
              // Camera failed to initialize but component is still mounted
              toast({
                title: t('error'),
                description: t('cameraInitializationFailed'),
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('Camera initialization error:', err);
            if (mounted) {
              toast({
                title: t('error'),
                description: t('cameraInitializationError'),
                variant: 'destructive',
              });
            }
          }
        }, 300);
      }
    }

    // Cleanup function to handle unmounting or component unload
    return () => {
      mounted = false;

      if (initTimeout) {
        clearTimeout(initTimeout);
      }

      // Stop camera only when modal closes completely or when leaving camera view
      if (!isOpen || !showCameraView) {
        console.log('AddExpenseModal: Modal closed or leaving camera view, stopping camera');
        stopCamera();
      }
    };
  }, [isOpen, showCameraView, isVideoPlaying, startCamera, stopCamera, toast, t]);

  // Update cameraInitialized state based on isVideoPlaying
  useEffect(() => {
    // When video starts playing, mark camera as fully initialized
    if (isVideoPlaying && !cameraInitialized) {
      setCameraInitialized(true);
      console.log('Camera fully initialized and playing');
    }
    // If video stops playing while camera was considered initialized, update state
    else if (!isVideoPlaying && cameraInitialized && showCameraView) {
      setCameraInitialized(false);
      console.log('Video stopped playing, camera needs reinitialization');
    }
  }, [isVideoPlaying, cameraInitialized, showCameraView]);

  // Handle capture button click
  const handleCapture = () => {
    console.log('AddExpenseModal: Capturing photo');

    // Check if video is actually playing before attempting capture
    if (!isVideoPlaying) {
      console.error('Cannot capture - video is not playing');
      toast({
        title: t('error'),
        description: t('cameraNotReady'),
        variant: 'destructive',
      });
      return;
    }

    const photoData = capturePhoto();

    if (photoData) {
      console.log('Photo captured successfully');
      setShowCameraView(false);
    } else {
      toast({
        title: t('error'),
        description: t('photoCaptureFailed'),
        variant: 'destructive',
      });
    }
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
      const dataURLParts = capturedImage.split(',');
      if (dataURLParts.length !== 2) {
        throw new Error('Invalid image data format');
      }

      const mimeMatch = dataURLParts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      console.log(`AddExpenseModal: Image MIME type: ${mime}`);

      // Handle base64 data
      let base64Data;
      try {
        base64Data = dataURLParts[1];
        console.log(`AddExpenseModal: Base64 data length: ${base64Data.length}`);
      } catch (err) {
        console.error('Error extracting base64 data:', err);
        throw new Error('Failed to process image data');
      }

      // Ensure we have valid base64 data
      if (!base64Data || base64Data.trim() === '') {
        console.error('AddExpenseModal: Empty base64 data');
        throw new Error('No image data available');
      }

      // Convert base64 to binary with chunking for large images
      let blob: Blob;
      try {
        const byteCharacters = atob(base64Data);
        const byteArrays = [];

        // Process in chunks to avoid memory issues
        const chunkSize = 1024; // Process 1kb at a time
        for (let i = 0; i < byteCharacters.length; i += chunkSize) {
          const chunk = byteCharacters.slice(i, i + chunkSize);
          const byteNumbers = new Array(chunk.length);

          for (let j = 0; j < chunk.length; j++) {
            byteNumbers[j] = chunk.charCodeAt(j);
          }

          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        // Create blob with proper MIME type
        blob = new Blob(byteArrays, { type: mime });
        console.log(`AddExpenseModal: Created blob of type ${mime}, size: ${blob.size} bytes`);

        if (blob.size === 0) {
          throw new Error('Created blob has zero size');
        }
      } catch (err) {
        console.error('Error creating blob:', err);
        throw new Error('Failed to process image');
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, `expense_${Date.now()}.jpg`);
      formData.append('amount', amount);
      formData.append('title', title || 'Expense');

      console.log('AddExpenseModal: Submitting form data');
      // Submit the form
      createExpenseMutation.mutate(formData);
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast({
        title: t('error'),
        description: error.message || t('errorProcessingImage'),
        variant: 'destructive',
      });
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    console.log('AddExpenseModal: Cancel button clicked');

    // If we're in the form view (after taking a picture), go back to camera view
    if (!showCameraView && capturedImage) {
      console.log('AddExpenseModal: Going back to camera view from preview');

      // First reset the captured image
      resetCapture();

      // Then update UI state
      setShowCameraView(true);

      // Force re-initialization by stopping camera first
      stopCamera();
      setCameraInitialized(false);

      // Add a slight delay before restarting the camera
      // This gives time for the previous camera to properly close
      setTimeout(() => {
        console.log('AddExpenseModal: Restarting camera after delay');
        startCamera().then(success => {
          if (success) {
            console.log('AddExpenseModal: Camera restarted successfully');
          } else {
            console.error('AddExpenseModal: Failed to restart camera');
            toast({
              title: t('error'),
              description: t('cameraRestartFailed'),
              variant: 'destructive',
            });
          }
        });
      }, 300);
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
            className={`font-medium ${!showCameraView && capturedImage && amount ? 'text-[#6bbb5c] font-semibold' : 'text-gray-400'}`}
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
              {/* Always render the video element to ensure it's in the DOM */}
              <video 
                ref={videoRef} 
                className={`h-full w-full object-cover ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                playsInline 
                autoPlay
                muted
              />

              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                  <p>{t('initializingCamera', 'Initializing camera...')}</p>
                </div>
              )}

              {isVideoPlaying && (
                <div className="absolute bottom-8 w-full flex flex-col items-center justify-center">
                  <div className="w-[6rem] h-[6rem] rounded-full flex items-center justify-center border-2 border-white">
                    <button 
                      className="w-[5.2rem] h-[5.2rem] bg-white rounded-full flex items-center justify-center shadow-lg"
                      onClick={handleCapture}
                      type="button"
                      aria-label={t('takePicture')}
                    >
                      <div className="w-[4.8rem] h-[4.8rem] rounded-full border-3 border-[#4a5d44]"></div>
                    </button>
                  </div>
                </div>
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
                  inputMode="numeric" 
                  pattern="[0-9]*[.,]?[0-9]*"
                  className="w-full py-3 px-10 bg-transparent border border-white/30 rounded-lg text-3xl font-medium text-white" 
                  placeholder="0.00" 
                  step="0.01" 
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => {
                    // When user presses Enter/Return on amount field, move to description field
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Find and focus the description input
                      const descriptionInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (descriptionInput) {
                        descriptionInput.focus();
                      }
                    }
                  }}
                  autoFocus
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                  onClick={() => {
                    // Find and focus the description input
                    const descriptionInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (descriptionInput) {
                      descriptionInput.focus();
                    }
                  }}
                >
                  {t('enter')}
                </button>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-white text-sm mb-2">{t('description')}</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full py-3 px-4 bg-transparent border border-white/30 rounded-lg text-white" 
                  placeholder="Expense" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    // When user presses Enter/Return on description field, save expense
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      
                      // Only proceed if save button is enabled
                      if (capturedImage && amount && parseFloat(amount) > 0 && !createExpenseMutation.isPending) {
                        handleSave();
                      }
                    }
                  }}
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                  onClick={() => {
                    // Only proceed if save button is enabled
                    if (capturedImage && amount && parseFloat(amount) > 0 && !createExpenseMutation.isPending) {
                      handleSave();
                    }
                  }}
                  disabled={!capturedImage || !amount || parseFloat(amount) <= 0 || createExpenseMutation.isPending}
                >
                  {t('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddExpenseModal;