import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useCamera = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isCameraInitializing = useRef<boolean>(false);

  // Add a new state to track if video is actually playing
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Add a cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Ensure camera is stopped when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    console.log('useCamera: startCamera called');

    // Prevent multiple simultaneous initialization attempts
    if (isCameraInitializing.current) {
      console.log('useCamera: Camera initialization already in progress, skipping');
      return false;
    }

    // If video is already playing, return success
    if (isVideoPlaying && stream && videoRef.current && videoRef.current.srcObject) {
      console.log('useCamera: Camera already initialized and playing, skipping');
      return true;
    }

    isCameraInitializing.current = true;
    console.log('useCamera: Starting camera initialization');

    try {
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('useCamera: getUserMedia is not supported in this browser');
        toast({
          title: t('cameraNotSupported'),
          description: t('browserDoesNotSupportCamera'),
          variant: 'destructive',
        });
        isCameraInitializing.current = false;
        return false;
      }

      // This is critical - make sure we're in a clean state before starting
      // Call stopCamera to ensure all resources are properly released
      console.log('useCamera: Ensuring clean state before starting camera');

      // Clean up any existing streams
      if (stream) {
        console.log('useCamera: Cleaning up existing stream');
        stream.getTracks().forEach(track => {
          console.log(`useCamera: Stopping track: ${track.kind} (enabled: ${track.enabled}, readyState: ${track.readyState})`);
          try {
            track.stop();
          } catch (err) {
            console.error(`useCamera: Error stopping track ${track.kind}:`, err);
          }
        });
        setStream(null);
      }

      // Clean up video element
      if (videoRef.current) {
        console.log('useCamera: Cleaning up video element');
        try {
          videoRef.current.pause();
        } catch (err) {
          console.error('useCamera: Error pausing video:', err);
        }

        try {
          videoRef.current.srcObject = null;
        } catch (err) {
          console.error('useCamera: Error clearing video srcObject:', err);
        }

        videoRef.current.onloadedmetadata = null;
      }

      // Reset state
      setIsVideoPlaying(false);

      console.log('useCamera: Requesting camera access...');
      // Check if we're on a mobile device and use appropriate constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // FIXED: Mobile should use environment (back camera), desktop should use user (front camera)
      const constraints = {
        video: isMobile 
          ? { 
              facingMode: { exact: 'environment' }, // Use back camera on mobile
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          : { 
              facingMode: 'user', // Use front camera on desktop
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false
      };

      console.log(`useCamera: Using constraints for ${isMobile ? 'mobile' : 'desktop'}: ${JSON.stringify(constraints)}`);

      let mediaStream;
      try {
        // Try with exact constraints first
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('useCamera: Failed with exact constraints, falling back to simpler constraints', err);

        // If that fails (especially on mobile), try with simpler constraints
        const fallbackConstraints = { 
          video: true, 
          audio: false 
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      console.log(`useCamera: Got media stream with ${mediaStream.getVideoTracks().length} video tracks`);

      setStream(mediaStream);
      setCapturedImage(null);
      setIsVideoPlaying(false);

      // Only set video source if the element is available
      if (videoRef.current) {
        console.log('useCamera: Setting video srcObject with media stream');

        try {
          // Set the media stream as the source
          videoRef.current.srcObject = mediaStream;

          // IMPROVED: More robust video playback handling with multiple fallbacks
          const setupVideoPlayback = async () => {
            if (!videoRef.current) return false;
            
            // Set both event handlers to be more resilient
            return new Promise<boolean>((resolve) => {
              if (!videoRef.current) return resolve(false);
              
              // Set play event to detect successful playback
              videoRef.current.onplay = function() {
                console.log('useCamera: Video play event fired');
                setIsVideoPlaying(true);
                resolve(true);
              };
              
              // Handler for metadata loaded
              videoRef.current.onloadedmetadata = function() {
                console.log('useCamera: Video metadata loaded');
                startVideoPlayback();
              };
              
              // Additional handler for when data is actually loadable
              videoRef.current.onloadeddata = function() {
                console.log('useCamera: Video data loaded');
                startVideoPlayback();
              };
              
              // Make video muted by default - this helps with autoplay policies
              if (videoRef.current) {
                videoRef.current.muted = true;
                // @ts-ignore - playsInline is not recognized by TypeScript
                videoRef.current.playsInline = true;
              }
              
              // Separate function to attempt playback with multiple retries
              const startVideoPlayback = async () => {
                if (!videoRef.current || isVideoPlaying) return;
                
                try {
                  console.log('useCamera: Attempting to play video');
                  
                  // Use the play() method which returns a promise
                  await videoRef.current.play();
                  
                  console.log('useCamera: Video playback started successfully');
                  setIsVideoPlaying(true);
                  resolve(true);
                } catch (err) {
                  console.error('useCamera: Error playing video:', err);
                  
                  // Auto-retry with a more aggressive approach
                  let retryCount = 0;
                  const maxRetries = 3;
                  
                  const attemptRetry = () => {
                    if (retryCount >= maxRetries || !videoRef.current) {
                      console.error('useCamera: Max retries reached or video element gone');
                      return resolve(false);
                    }
                    
                    retryCount++;
                    setTimeout(async () => {
                      if (!videoRef.current) return resolve(false);
                      
                      try {
                        console.log(`useCamera: Retry #${retryCount} playing video`);
                        await videoRef.current.play();
                        console.log('useCamera: Video playback started on retry');
                        setIsVideoPlaying(true);
                        resolve(true);
                      } catch (retryErr) {
                        console.error(`useCamera: Retry #${retryCount} failed:`, retryErr);
                        attemptRetry(); // Try again with increasing delay
                      }
                    }, retryCount * 800); // Increasing delay between retries
                  };
                  
                  attemptRetry();
                }
              };
              
              // Also try to start playback immediately if browser doesn't trigger events
              setTimeout(startVideoPlayback, 300);
            });
          };
          
          // Wait for video to be ready with a timeout
          const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.warn('useCamera: Video setup timed out');
              resolve(false);
            }, 8000); // Longer timeout for slower devices
          });

          // Run the setup and handle timeout
          Promise.race([setupVideoPlayback(), timeoutPromise]).then((success) => {
            if (!success) {
              console.warn('useCamera: Video failed to initialize properly');
              toast({
                title: t('cameraError'),
                description: t('videoPlaybackFailed'),
                variant: 'destructive',
              });
            }
          });
        } catch (err) {
          console.error('useCamera: Error setting up video element:', err);
        }
      } else {
        console.warn('useCamera: Video ref is not available');
      }

      isCameraInitializing.current = false;
      console.log('useCamera: Camera initialization successful');
      return true;
    } catch (error) {
      console.error('useCamera: Error accessing camera:', error);

      // More user-friendly error message
      let errorMessage = t('cameraAccessError');

      // Check if error is a permission error
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = t('cameraPermissionDenied');
        } else if (error.name === 'NotFoundError') {
          errorMessage = t('noCameraDetected');
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = t('cameraConstraintsError');
        }
      }

      toast({
        title: t('cameraError'),
        description: errorMessage,
        variant: 'destructive',
      });

      isCameraInitializing.current = false;
      return false;
    }
  }, [toast, t, stream]);

  const stopCamera = useCallback(() => {
    // Reset initialization flag to ensure we can start again
    isCameraInitializing.current = false;

    console.log('useCamera: Stopping camera stream');

    // Set video playing state to false immediately
    setIsVideoPlaying(false);

    if (stream) {
      try {
        // Log track details before stopping
        stream.getTracks().forEach(track => {
          console.log(`useCamera: Stopping track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);

          // Force stop the track
          try {
            track.stop();
          } catch (err) {
            console.error(`useCamera: Error stopping ${track.kind} track:`, err);
          }
        });
      } catch (err) {
        console.error('useCamera: Error stopping stream tracks:', err);
      }

      // Clear the stream reference
      setStream(null);
    } else {
      console.log('useCamera: No stream to stop');
    }

    // Clean up video element
    if (videoRef.current) {
      try {
        console.log('useCamera: Cleaning up video element');

        // Pause video first
        try {
          videoRef.current.pause();
        } catch (err) {
          console.error('useCamera: Error pausing video:', err);
        }

        // Remove the source object
        try {
          videoRef.current.srcObject = null;
        } catch (err) {
          console.error('useCamera: Error clearing video srcObject:', err);
        }

        // Remove any event listeners
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onloadeddata = null;
        videoRef.current.onplay = null;

        console.log('useCamera: Video element cleaned up');
      } catch (err) {
        console.error('useCamera: Error cleaning up video element:', err);
      }
    } else {
      console.log('useCamera: No video element to clean up');
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) {
      console.error('useCamera: Cannot capture photo - video element not available');
      toast({
        title: t('captureError'),
        description: t('videoElementNotAvailable'),
        variant: 'destructive',
      });
      return null;
    }

    if (!isVideoPlaying) {
      console.error('useCamera: Cannot capture photo - video is not playing');
      toast({
        title: t('captureError'),
        description: t('videoNotPlaying'),
        variant: 'destructive',
      });
      return null;
    }

    // Add debugging for video dimensions
    if (videoRef.current) {
      console.log('Video element dimensions:', {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        offsetWidth: videoRef.current.offsetWidth,
        offsetHeight: videoRef.current.offsetHeight,
        clientWidth: videoRef.current.clientWidth,
        clientHeight: videoRef.current.clientHeight
      });
    }

    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;

      // Set default dimensions in case video dimensions aren't available
      let width = 640;
      let height = 480;

      // Use actual video dimensions if available
      if (video.videoWidth && video.videoHeight) {
        width = video.videoWidth;
        height = video.videoHeight;
        console.log(`useCamera: Using actual video dimensions ${width}x${height}`);
      } else {
        // If dimensions aren't available, try to use the element dimensions
        if (video.offsetWidth && video.offsetHeight) {
          width = video.offsetWidth;
          height = video.offsetHeight;
          console.log(`useCamera: Using element dimensions ${width}x${height}`);
        } else {
          console.log(`useCamera: Using default dimensions ${width}x${height}`);
        }
      }

      // Ensure dimensions are not zero
      if (width <= 0 || height <= 0) {
        console.error('useCamera: Invalid dimensions for canvas', width, height);
        width = Math.max(width, 1);
        height = Math.max(height, 1);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('useCamera: Could not get canvas context');
        return null;
      }

      // Fill with a default color first (just in case drawing fails)
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, width, height);

      // Try to draw the current video frame to the canvas
      try {
        ctx.drawImage(video, 0, 0, width, height);
        console.log('useCamera: Successfully drew video frame to canvas');
      } catch (err) {
        console.error('useCamera: Error drawing video to canvas:', err);
        toast({
          title: t('captureError'),
          description: t('errorDrawingToCanvas'),
          variant: 'destructive',
        });
        return null;
      }

      // Create a high-quality JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log(`useCamera: Photo captured, data URL length: ${dataUrl.length}`);

      // Store the captured image
      setCapturedImage(dataUrl);

      return dataUrl;
    } catch (error) {
      console.error('useCamera: Error capturing photo:', error);
      toast({
        title: t('captureError'),
        description: t('generalCaptureError'),
        variant: 'destructive',
      });
      return null;
    }
  }, [isVideoPlaying, toast, t]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  return {
    videoRef,
    stream,
    capturedImage,
    isVideoPlaying,
    startCamera,
    stopCamera,
    capturePhoto,
    resetCapture
  };
};