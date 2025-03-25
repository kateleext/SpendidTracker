import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Expense } from '../types';
import { formatDistance, isToday, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemoryCardProps {
  expense: Expense;
  onImageClick: (imageUrl: string) => void;
}

// Helper function to format time display using Hong Kong timezone
const formatTimeDisplay = (dateTimeString: string, t: any): string => {
  const HK_TIMEZONE = 'Asia/Hong_Kong';
  
  // Convert to Hong Kong timezone
  const date = toZonedTime(parseISO(dateTimeString), HK_TIMEZONE);
  
  // Get current time in Hong Kong timezone
  const now = toZonedTime(new Date(), HK_TIMEZONE);
  
  // Check if date is today in Hong Kong timezone
  const isHkToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
    
  if (isHkToday) {
    // For today's expenses, show "X hours ago" or the time
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24 && diffInHours > 0.5) {
      // Format relative time with i18n support
      const minutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      
      if (hours >= 1) {
        return t('hoursAgo', { count: hours });
      } else if (minutes >= 1) {
        return t('minutesAgo', { count: minutes });
      } else {
        return t('justNow');
      }
    } else {
      // Show military time for very recent expenses
      return formatInTimeZone(date, HK_TIMEZONE, 'HH:mm');
    }
  } else {
    // For older expenses, just show the time
    return formatInTimeZone(date, HK_TIMEZONE, 'HH:mm');
  }
};

const MemoryCard = ({ expense, onImageClick }: MemoryCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleImageClick = () => {
    console.log('MemoryCard: Opening image', expense.image_url);
    onImageClick(expense.image_url);
  };

  // Format amount as currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(expense.amount));

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async () => {
      console.log('MemoryCard: Deleting expense', expense.id);
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
      
      // For 204 No Content responses, just return success without trying to parse JSON
      if (response.status === 204) {
        return { success: true };
      }
      
      return response.json();
    },
    onSuccess: () => {
      console.log('MemoryCard: Expense deleted successfully');
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/history'] });
      
      toast({
        title: t('expenseDeleted', 'Expense Deleted'),
        description: t('expenseDeletedSuccess', 'Your expense has been deleted'),
      });
    },
    onError: (error) => {
      console.error('MemoryCard: Error deleting expense', error);
      toast({
        title: t('error'),
        description: error.message || t('expenseDeleteFailed', 'Failed to delete expense'),
        variant: 'destructive',
      });
    }
  });

  const handleDelete = () => {
    deleteExpenseMutation.mutate();
  };

  return (
    <div className="memory-card bg-secondary-bg rounded-xl mx-5 mb-5 overflow-hidden shadow-lg">
      <div className="memory-image-wrapper relative pb-[100%] overflow-hidden">
        <img
          src={expense.image_url}
          alt={expense.title}
          className="memory-image absolute top-0 left-0 w-full h-full object-cover cursor-pointer"
          onClick={handleImageClick}
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                aria-label={t('options')}
              >
                <MoreVertical size={18} className="text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white shadow-md rounded-md min-w-[150px]">
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-500 cursor-pointer flex items-center gap-2"
              >
                <Trash2 size={16} />
                {t('delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="memory-details py-4 px-5">
        <div className="memory-title-row flex justify-between items-center">
          <div className="flex flex-col">
            <div className="memory-title text-[16px] font-semibold text-text-primary">
              {expense.title}
            </div>
            <div className="memory-time text-[12px] text-gray-500 mt-1">
              {formatTimeDisplay(expense.created_at)}
            </div>
          </div>
          <div className="memory-amount text-[16px] font-bold text-accent">
            {formattedAmount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;
