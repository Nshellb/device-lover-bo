"use client";

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-zinc-50 dark:text-zinc-900"
    >
      {message}
    </div>
  );
}
