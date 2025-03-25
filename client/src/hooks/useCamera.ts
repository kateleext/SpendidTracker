import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useCamera = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const isCameraInitializing = useRef(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Add explicit iOS detection
  const isiOS = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream).current;

  // Add a cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Ensure camera is stopped when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Add an effect to monitor video play state for iOS Safari
  useEffect(() => {
    if (!videoRef.current || !isiOS) return;

    const checkPlayState = () => {
      if (videoRef.current && 
          !videoRef.current.paused && 
          videoRef.current.readyState >= 2 && 
          !isVideoPlaying) {
        console.log('useCamera: Video is actually playing on iOS, updating state');
        setIsVideoPlaying(true);
      }
    };

    // Check state periodically for iOS
    const intervalId = setInterval(checkPlayState, 500);

    // Add play event listener as backup
    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        console.log('useCamera: Play event triggered');
        setIsVideoPlaying(true);
      });
    }

    return () => {
      clearInterval(intervalId);
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', () => {});
      }
    };
  }, [videoRef.current, isiOS, isVideoPlaying]);

  // Force restart camera - especially helpful for iOS
  const forceRestartCamera = useCallback(async () => {
    console.log('useCamera: Force restarting camera');

    // Set a flag to prevent multiple restarts
    if (isCameraInitializing.current) {
      console.log('useCamera: Camera already initializing, not forcing restart');
      return false;
    }

    isCameraInitializing.current = true;

    // First ensure camera is fully stopped
    await stopCamera();

    // Add a longer delay to ensure resources are released
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          const success = await startCamera();
          resolve(success);
        } catch (err) {
          console.error('useCamera: Force restart failed:', err);
          resolve(false);
        } finally {
          // Make sure we reset the flag even if there's an error
          isCameraInitializing.current = false;
        }
      }, isiOS ? 1000 : 300);
    });
  }, [stopCamera, startCamera, isiOS]);

  // Add state to track camera start attempts
  const cameraAttempts = useRef(0);
  const lastAttemptTime = useRef(0);
  const maxAttempts = 3;

  const startCamera = useCallback(async () => {
    console.log('useCamera: startCamera called, is iOS:', isiOS);

    const now = Date.now();

    // Prevent rapid re-initialization attempts (common cause of loops)
    if (now - lastAttemptTime.current < 2000) {
      console.log('useCamera: Attempted to start camera too soon after last attempt, blocking');
      return false;
    }

    // Track attempt time
    lastAttemptTime.current = now;

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

    // Limit the number of attempts to prevent infinite loops
    if (cameraAttempts.current >= maxAttempts) {
      console.log(`useCamera: Exceeded maximum camera initialization attempts (${maxAttempts})`);
      return false;
    }

    cameraAttempts.current += 1;
    isCameraInitializing.current = true;
    console.log(`useCamera: Starting camera initialization (attempt ${cameraAttempts.current}/${maxAttempts})`);

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

      // Clean up any existing streams first
      await stopCamera();

      // Add a short delay after stopping the camera before trying to start it again
      // This is especially important for iOS
      if (isiOS) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('useCamera: Requesting camera access...');

      // Set constraints to always use the back camera on mobile devices including iOS
      let constraints;
      const isMobile = /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Try with environment first (back camera)
        constraints = {
          video: { 
            facingMode: { exact: 'environment' } 
          },
          audio: false
        };
      } else {
        // For desktop, use front camera
        constraints = {
          video: { 
            facingMode: 'user' 
          },
          audio: false
        };
      }

      console.log(`useCamera: Using constraints: ${JSON.stringify(constraints)}`);

      let mediaStream;
      try {
        // Try with initial constraints (exact environment for mobile)
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('useCamera: Failed with initial constraints, trying with environment (not exact)', err);

        try {
          // For mobile, try with non-exact environment mode
          if (isMobile) {
            const fallbackConstraints = {
              video: { facingMode: 'environment' },
              audio: false
            };
            mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          } else {
            // Last resort - try with basic constraints
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        } catch (secondErr) {
          console.warn('useCamera: Second attempt failed, falling back to basic constraints', secondErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      console.log(`useCamera: Got media stream with ${mediaStream.getVideoTracks().length} video tracks`);

      // Set stream first, then handle video element
      setStream(mediaStream);
      setCapturedImage(null);

      // Only set video source if the element is available
      if (!videoRef.current) {
        console.warn('useCamera: Video ref is not available');
        isCameraInitializing.current = false;
        return false;
      }

      console.log('useCamera: Setting video srcObject with media stream');

      try {
        // Set the media stream as the source
        videoRef.current.srcObject = mediaStream;

        // For iOS, we need explicit play handling with user interaction
        if (isiOS) {
          console.log('useCamera: iOS detected, preparing video element');

          // For iOS, set these properties
          videoRef.current.setAttribute('playsinline', true);
          videoRef.current.setAttribute('muted', true);
          videoRef.current.setAttribute('autoplay', true);

          // Add event listeners to detect when video starts playing
          videoRef.current.onloadedmetadata = async () => {
            console.log('useCamera: Video metadata loaded, attempting to play');
            try {
              // We use the play() promise to detect if autoplay works
              await videoRef.current.play();
              console.log('useCamera: Video playback started successfully');
              setIsVideoPlaying(true);
            } catch (err) {
              console.error('useCamera: Error playing video:', err);
              // On iOS, play() might be rejected if not triggered by user gesture
              // We'll rely on manual camera start button in this case
            }
          };
        } else {
          // For non-iOS, use a more standard approach
          videoRef.current.onloadedmetadata = async () => {
            console.log('useCamera: Video metadata loaded, attempting to play');
            try {
              await videoRef.current.play();
              console.log('useCamera: Video playback started successfully');
              setIsVideoPlaying(true);
            } catch (err) {
              console.error('useCamera: Error playing video:', err);
            }
          };
        }

        // Add a fallback timeout for detecting play state
        setTimeout(() => {
          if (videoRef.current && !isVideoPlaying) {
            console.log('useCamera: Checking video play state after timeout');
            if (!videoRef.current.paused && videoRef.current.readyState >= 2) {
              console.log('useCamera: Video is actually playing, updating state');
              setIsVideoPlaying(true);
            }
          }
        }, 1000);

      } catch (err) {
        console.error('useCamera: Error setting up video element:', err);
      }

      isCameraInitializing.current = false;
      console.log('useCamera: Camera initialization process completed');
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
  }, [toast, t, isVideoPlaying, isiOS]);

  const stopCamera = useCallback(() => {
    // Reset initialization flag to ensure we can start again
    isCameraInitializing.current = false;

    console.log('useCamera: Stopping camera stream');

    // Set video playing state to false immediately
    setIsVideoPlaying(false);

    // First, deal with the video element
    if (videoRef.current) {
      try {
        console.log('useCamera: Cleaning up video element');
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.onloadedmetadata = null;
        console.log('useCamera: Video element cleaned up');
      } catch (err) {
        console.error('useCamera: Error cleaning up video element:', err);
      }
    }

    // Then, deal with the stream tracks
    if (stream) {
      try {
        stream.getTracks().forEach(track => {
          console.log(`useCamera: Stopping track: ${track.kind}`);
          track.stop();
        });
      } catch (err) {
        console.error('useCamera: Error stopping stream tracks:', err);
      }
      // Clear the stream reference
      setStream(null);
    }

    return Promise.resolve(); // Return a resolved promise for async usage
  }, [stream]);

  const capturePhoto = useCallback(() => {
    // For iOS, we might want to attempt capture even if isVideoPlaying is false
    // since it's sometimes difficult to detect play state correctly on iOS
    const shouldAttemptCapture = isiOS || isVideoPlaying;

    if (!videoRef.current) {
      console.error('useCamera: Cannot capture photo - video element not available');
      return null;
    }

    if (!shouldAttemptCapture) {
      console.error('useCamera: Cannot capture photo - video is not playing');
      return null;
    }

    try {
      console.log('useCamera: Attempting to capture photo from video element');

      const canvas = document.createElement('canvas');
      const video = videoRef.current;

      // Log the video element state
      console.log('Video element state:', {
        videoWidth: video.videoWidth || 0,
        videoHeight: video.videoHeight || 0,
        paused: video.paused,
        ended: video.ended,
        readyState: video.readyState,
        offsetWidth: video.offsetWidth || 0,
        offsetHeight: video.offsetHeight || 0
      });

      // Default dimensions
      let width = 640;
      let height = 480;

      // Try to get actual video dimensions
      if (video.videoWidth && video.videoHeight) {
        width = video.videoWidth;
        height = video.videoHeight;
        console.log(`useCamera: Using video dimensions: ${width}x${height}`);
      } else if (video.offsetWidth && video.offsetHeight) {
        width = video.offsetWidth;
        height = video.offsetHeight;
        console.log(`useCamera: Using element dimensions: ${width}x${height}`);
      } else {
        console.log(`useCamera: Using default dimensions: ${width}x${height}`);
      }

      // Ensure dimensions are valid
      width = Math.max(width, 1);
      height = Math.max(height, 1);

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('useCamera: Could not get canvas context');
        return null;
      }

      // Fill with background color
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, width, height);

      // Try to draw video frame to canvas
      try {
        ctx.drawImage(video, 0, 0, width, height);
        console.log('useCamera: Successfully drew video frame to canvas');
      } catch (err) {
        console.error('useCamera: Error drawing video to canvas:', err);

        // On iOS, try a different approach if the first one fails
        if (isiOS) {
          console.log('useCamera: Trying alternative approach for iOS');
          try {
            // Try drawing with different parameters
            ctx.drawImage(video, 0, 0);
          } catch (err2) {
            console.error('useCamera: Second attempt failed:', err2);
            return null;
          }
        } else {
          return null;
        }
      }

      // Create data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      console.log(`useCamera: Generated data URL of length ${dataUrl.length}`);

      // Store the captured image
      setCapturedImage(dataUrl);

      console.log('useCamera: Photo capture successful');
      return dataUrl;
    } catch (error) {
      console.error('useCamera: Error capturing photo:', error);
      return null;
    }
  }, [isVideoPlaying, isiOS]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  return {
    videoRef,
    stream,
    capturedImage,
    isVideoPlaying,
    isiOS,
    startCamera,
    stopCamera,
    capturePhoto,
    resetCapture,
    forceRestartCamera
  };
};