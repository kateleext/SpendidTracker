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
      // Check device type
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isMobile = isiOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      console.log(`useCamera: Device detection - iOS: ${isiOS}, Mobile: ${isMobile}`);

      // iOS-specific constraints (much simpler to avoid issues)
      let constraints;
      if (isiOS) {
        // For iOS, use the simplest possible constraints to start
        constraints = { 
          video: true, 
          audio: false 
        };
        console.log('useCamera: Using simplified constraints for iOS');
      } else if (isMobile) {
        // For other mobile devices
        constraints = {
          video: { 
            facingMode: { exact: 'environment' }, // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        console.log('useCamera: Using mobile constraints');
      } else {
        // For desktop
        constraints = {
          video: { 
            facingMode: 'user', // Use front camera on desktop
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        console.log('useCamera: Using desktop constraints');
      }

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

          // Wait for video to be ready with a timeout
          const playPromise = new Promise((resolve) => {
            if (!videoRef.current) return resolve(false);

            // iOS Safari specific handling
            const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

            if (isiOS) {
              console.log('useCamera: iOS device detected, using special playback handling');

              // Set up specific handlers for iOS
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.setAttribute('webkit-playsinline', 'true');

              // Add event listeners for iOS
              const playHandler = async () => {
                console.log('useCamera: iOS video play event fired');
                setIsVideoPlaying(true);
                resolve(true);
              };

              const errorHandler = (err: any) => {
                console.error('useCamera: iOS video error:', err);
                resolve(false);
              };

              // Add event listeners
              videoRef.current.addEventListener('playing', playHandler, { once: true });
              videoRef.current.addEventListener('error', errorHandler, { once: true });

              // Attempt to play with user interaction simulation
              try {
                console.log('useCamera: Attempting to play video on iOS');
                videoRef.current.play()
                  .then(() => {
                    console.log('useCamera: iOS video play successful');
                  })
                  .catch(err => {
                    console.error('useCamera: iOS video play failed:', err);
                    toast({
                      title: t('cameraError'),
                      description: t('iosVideoPlaybackIssue'),
                      variant: 'destructive',
                    });
                  });
              } catch (err) {
                console.error('useCamera: Error during iOS video play attempt:', err);
              }
            } else {
              // Normal handling for non-iOS devices
              // Handle metadata loaded event
              videoRef.current.onloadedmetadata = async () => {
                console.log('useCamera: Video metadata loaded, attempting to play');
                if (videoRef.current) {
                  try {
                    await videoRef.current.play();
                    console.log('useCamera: Video playback started successfully');
                    setIsVideoPlaying(true);
                    resolve(true);
                  } catch (err) {
                    console.error('useCamera: Error playing video:', err);
                    resolve(false);
                  }
                }
              };
            }
          });

          // Wait for video to be ready with a timeout
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(false), 5000);
          });

          // Race the video loading against a timeout
          Promise.race([playPromise, timeoutPromise]).then((result) => {
            if (!result) {
              console.warn('useCamera: Video failed to play within timeout');
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

    // For iOS, we might want to attempt capture even if isVideoPlaying is false
    // as the event might not have fired correctly
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (!isVideoPlaying && !isiOS) {
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