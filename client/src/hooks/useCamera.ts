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
      console.log('Camera initialization already in progress, skipping');
      return false;
    }
    
    isCameraInitializing.current = true;
    
    try {
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia is not supported in this browser');
        toast({
          title: t('cameraNotSupported', 'Camera Not Supported'),
          description: t('browserDoesNotSupportCamera', 'Your browser does not support camera access.'),
          variant: 'destructive',
        });
        isCameraInitializing.current = false;
        return false;
      }
      
      // If we already have a stream and it's active, don't reinitialize
      if (stream && stream.active && videoRef.current && videoRef.current.srcObject) {
        console.log('Camera already initialized and active, skipping');
        isCameraInitializing.current = false;
        return true;
      }
      
      // First stop any existing streams to avoid conflicts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      console.log('Requesting camera access...');
      // Try to get camera access with environment (back) camera preference
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setCapturedImage(null);
      
      // Only set video source if the element is available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
            });
          }
        };
      }
      
      isCameraInitializing.current = false;
      return true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // More user-friendly error message
      let errorMessage = t('cameraAccessError', 'Could not access your camera. Please check permissions.');
      
      // Check if error is a permission error
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = t('cameraPermissionDenied', 'Camera access was denied. Please allow camera permissions.');
        } else if (error.name === 'NotFoundError') {
          errorMessage = t('noCameraDetected', 'No camera detected on your device.');
        }
      }
      
      toast({
        title: t('cameraError', 'Camera Error'),
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
      console.log('Stopping camera stream');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    
    return dataUrl;
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
