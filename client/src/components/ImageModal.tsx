import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  image: string | null;
  onClose: () => void;
}

const ImageModal = ({ isOpen, image, onClose }: ImageModalProps) => {
  const { t } = useTranslation();

  if (!isOpen || !image) {
    return null;
  }

  // Handle download image
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image;
    link.download = `spendid-expense-${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="image-modal fixed top-0 left-0 w-full h-full bg-black/80 z-50 flex items-center justify-center flex-col">
      <div className="modal-image-container max-w-[90%] max-h-[80%] relative">
        <button
          className="modal-close absolute -top-8 right-0 bg-transparent border-0 text-white text-2xl"
          onClick={onClose}
          type="button"
          aria-label={t('close')}
        >
          <X size={24} />
        </button>
        <img src={image} alt="Expense detail" className="modal-image max-w-full max-h-[80vh] rounded-lg shadow-lg" />
      </div>
      <button
        className="modal-download mt-5 bg-accent text-white border-0 rounded-full py-2 px-5 text-[14px] font-medium cursor-pointer flex items-center shadow-md"
        onClick={handleDownload}
        type="button"
      >
        <Download className="mr-1.5" size={16} />
        {t('download')}
      </button>
    </div>
  );
};

export default ImageModal;
