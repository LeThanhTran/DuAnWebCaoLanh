import { useEffect, useMemo, useState } from 'react'
import { changeMyPassword, getMyProfile, updateMyProfile, uploadMyAvatar } from '../services/profileService'

const initialProfileForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  address: ''
}

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
}

export default function ProfilePage({ user, onUserUpdated }) {
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(initialProfileForm)
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarInputKey, setAvatarInputKey] = useState(0)

  const [loading, setLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' })
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchProfile()
  }, [])

  const displayName = useMemo(() => {
    if (profile?.fullName?.trim()) {
      return profile.fullName.trim()
    }

    if (user?.fullName?.trim()) {
      return user.fullName.trim()
    }

    return user?.username || 'Người dùng'
  }, [profile?.fullName, user?.fullName, user?.username])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await getMyProfile()
      setProfile(data)
      setProfileForm({
        fullName: data.fullName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        address: data.address || ''
      })
    } catch (errorMessage) {
      setProfileMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileMessage({ type: '', text: '' })

    try {
      setProfileSaving(true)
      const result = await updateMyProfile(profileForm)
      setProfile(result.profile)

      if (result.user && onUserUpdated) {
        onUserUpdated(result.user)
      }

      setProfileMessage({ type: 'success', text: result.message || 'Cập nhật hồ sơ thành công' })
    } catch (errorMessage) {
      setProfileMessage({ type: 'error', text: errorMessage })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setProfileMessage({ type: 'error', text: 'Vui lòng chọn ảnh đại diện trước khi tải lên' })
      return
    }

    const maxSizeBytes = 5 * 1024 * 1024
    if (avatarFile.size > maxSizeBytes) {
      setProfileMessage({ type: 'error', text: 'Ảnh đại diện tối đa 5MB' })
      return
    }

    try {
      setAvatarUploading(true)
      setProfileMessage({ type: '', text: '' })
      const result = await uploadMyAvatar(avatarFile)
      setProfile(result.profile)
      setAvatarFile(null)
      setAvatarInputKey((value) => value + 1)

      if (result.user && onUserUpdated) {
        onUserUpdated(result.user)
      }

      setProfileMessage({ type: 'success', text: result.message || 'Cập nhật ảnh đại diện thành công' })
    } catch (errorMessage) {
      setProfileMessage({ type: 'error', text: errorMessage })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin mật khẩu' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' })
      return
    }

    try {
      setPasswordSaving(true)
      const result = await changeMyPassword(passwordForm)
      setPasswordForm(initialPasswordForm)
      setPasswordMessage({ type: 'success', text: result.message || 'Đổi mật khẩu thành công' })
    } catch (errorMessage) {
      setPasswordMessage({ type: 'error', text: errorMessage })
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pf-loading fx-fade-up">
        <div className="pf-loading-dot" />
        <p>Đang tải hồ sơ cá nhân...</p>
      </div>
    )
  }

  const roleName = profile?.role || user?.role || 'Viewer'
  const username = profile?.username || user?.username || 'nguoi-dung'
  const createdAtText = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN')
    : 'Không xác định'
  const updatedAtText = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString('vi-VN')
    : 'Chưa cập nhật'

  return (
    <div className="pf-page space-y-6">
      <div className="pf-hero fx-fade-up">
        <div>
          <p className="pf-hero-eyebrow">Tài khoản cá nhân</p>
          <h1>Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin liên hệ, ảnh đại diện và bảo mật tài khoản theo cách trực quan hơn.</p>
        </div>
        <div className="pf-hero-chip">
          <span>{roleName}</span>
          <small>Cập nhật gần nhất: {updatedAtText}</small>
        </div>
      </div>

      {profileMessage.text && (
        <div className={`pf-alert ${
          profileMessage.type === 'success'
            ? 'pf-alert-success'
            : 'pf-alert-error'
        }`}>
          {profileMessage.text}
        </div>
      )}

      <div className="pf-grid">
        <div className="pf-panel fx-fade-up">
          <div className="pf-account-box">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Ảnh đại diện"
                className="pf-avatar-image"
              />
            ) : (
              <div className="pf-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <p className="pf-account-name">{displayName}</p>
            <p className="pf-account-handle">@{username}</p>
            <span className="pf-role-pill">
              {roleName}
            </span>
            <div className="pf-meta-list">
              <span>Ngày tạo: {createdAtText}</span>
              <span>Lần cập nhật: {updatedAtText}</span>
            </div>
          </div>

          <div className="pf-upload-box">
            <label className="pf-label">Ảnh đại diện</label>
            <input
              key={avatarInputKey}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              className="pf-file-input"
            />
            <p className="pf-upload-hint">Chấp nhận JPG, PNG, WEBP. Kích thước tối đa 5MB.</p>
            {avatarFile && <p className="pf-file-selected">Đã chọn: {avatarFile.name}</p>}
            <button
              type="button"
              onClick={handleAvatarUpload}
              disabled={avatarUploading}
              className="pf-btn pf-btn-primary"
            >
              {avatarUploading ? 'Đang tải ảnh...' : 'Cập nhật ảnh đại diện'}
            </button>
          </div>
        </div>

        <div className="pf-panel fx-fade-up">
          <h2 className="pf-panel-title">Thông tin cá nhân</h2>

          <form onSubmit={handleProfileSubmit} className="pf-form-grid">
            <div className="pf-field">
              <label className="pf-label">Họ và tên</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
                className="pf-input"
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="pf-field">
              <label className="pf-label">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                className="pf-input"
                placeholder="example@email.com"
              />
            </div>

            <div className="pf-field">
              <label className="pf-label">Số điện thoại</label>
              <input
                type="text"
                value={profileForm.phoneNumber}
                onChange={(event) => setProfileForm({ ...profileForm, phoneNumber: event.target.value })}
                className="pf-input"
                placeholder="09xxxxxxxx"
              />
            </div>

            <div className="pf-field pf-field-full">
              <label className="pf-label">Địa chỉ</label>
              <textarea
                value={profileForm.address}
                onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })}
                className="pf-textarea"
                placeholder="Nhập địa chỉ hiện tại"
              />
            </div>

            <div className="pf-field-full">
              <button
                type="submit"
                disabled={profileSaving}
                className="pf-btn pf-btn-success"
              >
                {profileSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="pf-panel fx-fade-up">
        <div className="pf-password-header">
          <h2 className="pf-panel-title">Đổi mật khẩu</h2>
          <p>Tăng độ an toàn bằng cách dùng mật khẩu mạnh và cập nhật định kỳ.</p>
        </div>

        {passwordMessage.text && (
          <div className={`pf-alert ${
            passwordMessage.type === 'success'
              ? 'pf-alert-success'
              : 'pf-alert-error'
          }`}>
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="pf-password-grid">
          <div className="pf-field">
            <label className="pf-label">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              className="pf-input"
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Mật khẩu mới</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              className="pf-input"
              placeholder="Ít nhất 6 ký tự"
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={passwordForm.confirmNewPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmNewPassword: event.target.value })}
              className="pf-input"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <div className="pf-field-full">
            <button
              type="submit"
              disabled={passwordSaving}
              className="pf-btn pf-btn-warn"
            >
              {passwordSaving ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
