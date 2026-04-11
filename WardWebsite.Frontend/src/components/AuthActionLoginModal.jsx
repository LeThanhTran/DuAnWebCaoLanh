import LoginForm from './LoginForm'

export default function AuthActionLoginModal({
  open,
  actionLabel = 'thao tác này',
  onClose,
  onLoginSuccess,
  loginSuccessOptions = {}
}) {
  if (!open) {
    return null
  }

  const safeActionLabel = String(actionLabel || 'thao tác này').trim()

  const handleLoginSuccess = (userData, options) => {
    onLoginSuccess?.(userData, options || loginSuccessOptions)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/55 px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-4xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 w-9 h-9 rounded-full bg-slate-900/85 text-white text-lg leading-none hover:bg-slate-800"
          aria-label="Đóng cửa sổ đăng nhập"
        >
          ×
        </button>

        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <p className="text-sm font-semibold">
            Bạn cần đăng nhập để thực hiện {safeActionLabel}.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Hệ thống sẽ tiếp tục thao tác sau khi bạn đăng nhập thành công.
          </p>
        </div>

        <div className="max-h-[92vh] overflow-y-auto rounded-xl">
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            loginSuccessOptions={loginSuccessOptions}
          />
        </div>
      </div>
    </div>
  )
}
