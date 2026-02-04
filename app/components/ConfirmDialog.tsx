interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 backdrop-blur-sm z-50' onClick={onCancel}>
      {/* Dialog */}
      <div className='fixed inset-0 flex items-center justify-center z-40 p-4'>
        <div className='bg-stone-50 dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6'>
          <h2 className='text-xl font-bold mb-4'>{title}</h2>
          <p className='text-stone-700 dark:text-stone-400 mb-6'>{message}</p>

          <div className='flex gap-3 justify-end'>
            <button
              onClick={onCancel}
              className='px-4 py-2 bg-[var(--color-systalblue)] hover:bg-blue-400 rounded font-semibold transition-colors'
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className='px-4 py-2 bg-red-700 hover:bg-red-900 text-white rounded font-semibold transition-colors'
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
