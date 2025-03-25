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
    isVideoPlaying,
    startCamera, 
    stopCamera, 
    capturePhoto, 
    resetCapture,
    forceRestartCamera,
    isiOS
  } = useCamera();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [showCameraView, setShowCameraView] = useState<boolean>(true);
  const [cameraInitializing, setCameraInitializing] = useState<boolean>(false);

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('AddExpenseModal: Modal opened, resetting form values');
      resetCapture();
      setAmount('');
      setTitle('');
      setShowCameraView(true);
      setCameraInitializing(false);
    } else {
      // Make sure camera is stopped when modal is closed
      stopCamera();
    }
  }, [isOpen, resetCapture, stopCamera]);

  // Add ref to track camera initialization attempts
  const cameraStartAttemptRef = useRef(false);

  // Start camera when entering camera view - with protection against loops
  useEffect(() => {
    let mounted = true;

    // Only run this effect if the modal is open and camera view is active AND
    // we haven't already tried to start the camera
    if (isOpen && showCameraView && !cameraStartAttemptRef.current) {
      console.log('AddExpenseModal: Initializing camera view (first attempt)');

      // Mark that we've attempted to start the camera for this session
      cameraStartAttemptRef.current = true;

      // Use appropriate delay for iOS vs other platforms
      const delay = isiOS ? 1000 : 500;

      setCameraInitializing(true);

      // Only stop the camera first if we can guarantee it's already running
      // Otherwise, this can cause a restart loop
      if (isVideoPlaying) {
        console.log('AddExpenseModal: Camera appears to be running, stopping first');
        stopCamera();
      }

      const timeoutId = setTimeout(async () => {
        if (!mounted) return;

        console.log('AddExpenseModal: Starting camera after initial delay');

        try {
          const success = await startCamera();
          if (mounted) {
            setCameraInitializing(false);
            if (!success) {
              console.warn('AddExpenseModal: Camera failed to initialize on first attempt');
            }
          }
        } catch (err) {
          console.error('AddExpenseModal: Camera initialization error:', err);
          if (mounted) {
            setCameraInitializing(false);
          }
        }
      }, delay);

      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }

    // Only stop camera when explicitly closing the modal
    if (!isOpen && mounted) {
      console.log('AddExpenseModal: Modal closed, stopping camera');
      stopCamera();
      // Reset the attempt tracker when modal closes
      cameraStartAttemptRef.current = false;
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, showCameraView, startCamera, stopCamera, isiOS, isVideoPlaying]);

  // Add a separate effect to monitor and debug state changes
  useEffect(() => {
    console.log('AddExpenseModal: State update - showCameraView:', showCameraView, 'capturedImage:', !!capturedImage);
  }, [showCameraView, capturedImage]);

  // Handle capture button click
  const handleCapture = () => {
    console.log('AddExpenseModal: Capturing photo');

    // On iOS, we'll attempt to capture even if video playback state isn't detected correctly
    const photoData = capturePhoto();

    if (photoData) {
      console.log('AddExpenseModal: Photo captured successfully');

      // Important: Ensure we stop the camera before changing view state
      // This step is critical for preventing race conditions
      if (isiOS) {
        stopCamera();
      }

      // Force a small delay before switching views to ensure state updates properly
      setTimeout(() => {
        // Explicitly set showCameraView to false to switch to preview mode
        setShowCameraView(false);
        console.log('AddExpenseModal: Switched to preview mode');
      }, 100);
    } else {
      console.error('AddExpenseModal: Photo capture failed');
      toast({
        title: t('error'),
        description: t('photoCaptureFailed', 'Failed to capture photo'),
        variant: 'destructive',
      });
    }
  };

  // Use ref to track manual camera start attempts and prevent multiple requests
  const manualStartAttemptRef = useRef(false);

  // Handle manual camera start for iOS
  const handleManualCameraStart = async () => {
    // Prevent multiple rapid clicks on the manual start button
    if (manualStartAttemptRef.current) {
      console.log('AddExpenseModal: Manual start already in progress, ignoring');
      return;
    }

    console.log('AddExpenseModal: Manual camera start requested');

    // Set flags to prevent multiple attempts
    manualStartAttemptRef.current = true;
    setCameraInitializing(true);

    try {
      // First ensure camera is fully stopped
      await stopCamera();

      // Wait a moment to ensure resources are released
      await new Promise(resolve => setTimeout(resolve, 800));

      // Now try to start the camera
      const success = await startCamera();

      if (!success) {
        console.error('AddExpenseModal: Manual camera start failed');
        toast({
          title: t('error'),
          description: t('cameraStartFailed', 'Failed to start camera'),
          variant: 'destructive',
        });
      } else {
        console.log('AddExpenseModal: Manual camera start succeeded');
      }
    } catch (err) {
      console.error('AddExpenseModal: Error in manual camera start:', err);
    } finally {
      // Reset flags regardless of success/failure
      setCameraInitializing(false);

      // Reset manual start attempts flag after a delay
      setTimeout(() => {
        manualStartAttemptRef.current = false;
      }, 1500);
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
      console.log('AddExpenseModal: Expense saved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/history'] });

      toast({
        title: t('expenseAdded'),
        description: t('expenseAddedSuccess'),
      });

      // Stop camera and close modal
      stopCamera();
      onClose();
    },
    onError: (error: any) => {
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

      let blob;

      // Try the modern fetch approach first
      try {
        // Convert data URL to Blob using fetch API
        const response = await fetch(capturedImage);
        blob = await response.blob();
      } catch (fetchErr) {
        console.warn('AddExpenseModal: Fetch blob conversion failed, trying alternative method', fetchErr);

        // Fallback method for iOS that sometimes has issues with fetch
        const dataURIParts = capturedImage.split(',');
        const mimeType = dataURIParts[0].match(/:(.*?);/)[1];
        const byteString = atob(dataURIParts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }

        blob = new Blob([arrayBuffer], { type: mimeType });
      }

      // Validate the blob
      if (!blob || blob.size === 0) {
        throw new Error('Invalid image data');
      }

      console.log(`AddExpenseModal: Created blob of type ${blob.type}, size: ${blob.size} bytes`);

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, `expense_${Date.now()}.jpg`);
      formData.append('amount', amount);
      formData.append('title', title || 'groceries');

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

      // Reset the captured image
      resetCapture();

      // For iOS, completely stop the camera before restarting
      stopCamera();

      // Update UI state with a delay to ensure clean transition
      setTimeout(() => {
        setShowCameraView(true);

        // Start camera after UI update
        setTimeout(() => {
          startCamera();
        }, isiOS ? 800 : 300);
      }, 100);
    } else {
      // If we're in camera view, close the modal completely
      stopCamera();
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
          {/* Preview Image View */}
          {(!showCameraView && capturedImage) ? (
            <div className="w-full h-full">
              <img 
                src={capturedImage} 
                className="w-full h-full object-cover" 
                alt="Captured expense" 
              />
            </div>
          ) : (
            /* Camera View */
            <div id="cameraPreview" className="w-full h-full flex items-center justify-center bg-black">
              {/* Always render the video element to ensure it's in the DOM */}
              <video 
                ref={videoRef} 
                className={`h-full w-full object-cover ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                playsInline 
                autoPlay
                muted
              />

              {/* Camera initialization message */}
              {(!isVideoPlaying && showCameraView) && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                  <div className="p-4">
                    {cameraInitializing ? (
                      <p>{t('initializingCamera', 'Initializing camera...')}</p>
                    ) : (
                      <>
                        <p className="mb-4 text-lg">{t('cameraNotActive', 'Camera needs permission to activate')}</p>

                        {/* Show more prominent manual start button for iOS */}
                        {isiOS && (
                          <button
                            className="mt-4 px-6 py-3 bg-white text-black rounded-lg font-bold text-lg shadow-lg"
                            onClick={handleManualCameraStart}
                            type="button"
                            disabled={manualStartAttemptRef.current}
                          >
                            {manualStartAttemptRef.current 
                              ? t('startingCamera', 'Starting Camera...') 
                              : t('tapToStartCamera', 'Tap to Start Camera')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Camera capture button - always show in camera view for iOS */}
              {showCameraView && (
                <button 
                  className={`absolute bottom-8 w-16 h-16 ${isVideoPlaying ? 'bg-white' : 'bg-gray-300'} rounded-full flex items-center justify-center shadow-lg`}
                  onClick={handleCapture}
                  disabled={!isVideoPlaying && !isiOS}
                  type="button"
                  aria-label={t('takePicture')}
                >
                  <div className="w-14 h-14 rounded-full border-2 border-[#4a5d44]"></div>
                </button>
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
                  inputMode="decimal"
                  pattern="[0-9]*"
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