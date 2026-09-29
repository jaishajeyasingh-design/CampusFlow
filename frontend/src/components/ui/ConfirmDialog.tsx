import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: AlertCircle,
      wrapperClass: 'bg-rose-50 text-rose-600 border border-rose-200',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      wrapperClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      buttonVariant: 'primary' as const,
    },
    primary: {
      icon: Info,
      wrapperClass: 'bg-blue-50 text-blue-600 border border-blue-200',
      buttonVariant: 'primary' as const,
    },
  };

  const currentConfig = iconConfig[variant];
  const IconComponent = currentConfig.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={currentConfig.buttonVariant}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start space-x-3 py-1">
        <div className={`p-2 rounded-lg shrink-0 ${currentConfig.wrapperClass}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
          {message}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
