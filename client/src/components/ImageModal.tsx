import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const ImageModal = () => {
  const { t } = useTranslation();
  const { isImageModalOpen, selectedImage, closeImageModal } = useAppContext();

  if (!isImageModalOpen || !selectedImage) {
    return null;
  }

  // Handle download image
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = selectedImage;
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
          onClick={closeImageModal}
        >
          <X size={24} />
        </button>
        <img src={selectedImage} alt="Expense detail" className="modal-image max-w-full max-h-[80vh] rounded-lg shadow-lg" />
      </div>
      <button
        className="modal-download mt-5 bg-accent text-white border-0 rounded-full py-2 px-5 text-[14px] font-medium cursor-pointer flex items-center shadow-md"
        onClick={handleDownload}
      >
        <Download className="mr-1.5" size={16} />
        {t('download')}
      </button>
    </div>
  );
};

export default ImageModal;
