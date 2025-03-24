import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useCamera = () => {
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia is not supported in this browser');
        toast({
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
          variant: 'destructive',
        });
        return false;
      }
      
      // First stop any existing streams to avoid conflicts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Try to get camera access with environment (back) camera preference
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
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
      
      return true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // More user-friendly error message
      let errorMessage = 'Could not access your camera. Please check permissions.';
      
      // Check if error is a permission error
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access was denied. Please allow camera permissions.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera detected on your device.';
        }
      }
      
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
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
