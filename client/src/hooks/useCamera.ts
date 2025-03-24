import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useCamera = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isCameraInitializing = useRef<boolean>(false);

  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isCameraInitializing.current) {
      console.log('useCamera: Camera initialization already in progress, skipping');
      return false;
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
      
      // Clean up any existing streams first to ensure we don't have conflicts
      if (stream) {
        console.log('useCamera: Stopping existing stream before initializing new one');
        stream.getTracks().forEach(track => {
          console.log(`useCamera: Stopping track: ${track.kind} (enabled: ${track.enabled}, readyState: ${track.readyState})`);
          track.stop();
        });
        setStream(null);
      }
      
      if (videoRef.current) {
        console.log('useCamera: Clearing video element srcObject');
        videoRef.current.srcObject = null;
      }
      
      console.log('useCamera: Requesting camera access with environment facing mode...');
      // Check if we're on a mobile device and use simpler constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Simpler camera settings based on device type
      const constraints = {
        video: isMobile 
          ? { facingMode: 'environment' } // Simple constraints for mobile
          : { facingMode: 'user' } // For desktop, just use the front camera
      };
      
      console.log(`useCamera: Using constraints for ${isMobile ? 'mobile' : 'desktop'}: ${JSON.stringify(constraints)}`);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log(`useCamera: Got media stream with ${mediaStream.getVideoTracks().length} video tracks`);
      
      setStream(mediaStream);
      setCapturedImage(null);
      
      // Only set video source if the element is available
      if (videoRef.current) {
        console.log('useCamera: Setting video srcObject with media stream');
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          console.log('useCamera: Video metadata loaded, attempting to play');
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('useCamera: Error playing video:', err);
            });
          }
        };
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
    
    if (stream) {
      console.log('useCamera: Stopping camera stream');
      stream.getTracks().forEach(track => {
        console.log(`useCamera: Stopping track: ${track.kind}`);
        track.stop();
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      console.log('useCamera: Clearing video element srcObject');
      // Pause video first to prevent any video processing
      videoRef.current.pause();
      // Remove the source
      videoRef.current.srcObject = null;
      // Remove any event listeners that might have been set
      videoRef.current.onloadedmetadata = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) {
      console.error('useCamera: Cannot capture photo - video element not available');
      return null;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Ensure we have valid dimensions
      if (!video.videoWidth || !video.videoHeight) {
        console.error('useCamera: Video dimensions not available');
        return null;
      }
      
      console.log(`useCamera: Video dimensions ${video.videoWidth}x${video.videoHeight}`);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('useCamera: Could not get canvas context');
        return null;
      }
      
      // Draw the current video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Create a high-quality JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log(`useCamera: Photo captured, data URL length: ${dataUrl.length}`);
      
      // Store the captured image
      setCapturedImage(dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('useCamera: Error capturing photo:', error);
      return null;
    }
  }, []);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  return {
    videoRef,
    stream,
    capturedImage,
    startCamera,
    stopCamera,
    capturePhoto,
    resetCapture
  };
};
