# Ward Website - ASP.NET Core + React

## Cấu trúc dự án

```
WardWebsite.API/
├── Models/
│   ├── User.cs
│   └── Role.cs
├── Data/
│   └── AppDbContext.cs
├── Controllers/
│   └── UsersController.cs
├── Program.cs
├── appsettings.json
└── WardWebsite.API.csproj

WardWebsite.Frontend/
├── src/
│   ├── components/
│   │   ├── UserList.jsx
│   │   └── UserForm.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Setup Backend

### 1. Cấu hình Database (Azure SQL - khuyến nghị)
- Tạo Azure SQL Server + Azure SQL Database trên Azure Portal.
- Lấy chuỗi kết nối ADO.NET và cấu hình vào biến môi trường `ConnectionStrings__DefaultConnection`.
- Ví dụ (PowerShell):

```powershell
$env:ConnectionStrings__DefaultConnection = "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<database>;Persist Security Info=False;User ID=<user>;Password=<password>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
```

- Backend sử dụng EF Core migration và tự chạy `db.Database.Migrate()` khi khởi động, nên không cần chạy thủ công `database.sql`.
- File `database.sql` chỉ dùng tham khảo hoặc khi bạn cần import dữ liệu thủ công cho môi trường riêng.

### 2. Cài đặt Dependencies
```bash
cd WardWebsite.API
dotnet restore
```

### 3. Chạy Server
```bash
dotnet run
# Server chạy ở http://localhost:5000
```

### 4. Cập nhật schema bằng migration (khi có thay đổi model)
```bash
dotnet ef database update
```

## Setup Frontend

### 1. Cài đặt Dependencies
```bash
cd WardWebsite.Frontend
npm install
```

### 2. Chạy Dev Server
```bash
npm run dev
# Frontend ở http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập, nhận JWT token

### Users
- `GET /api/users` - Lấy tất cả users (cần auth)
- `GET /api/users/{id}` - Lấy user theo ID (cần auth)
- `POST /api/users` - Tạo user mới
- `DELETE /api/users/{id}` - Xóa user (cần auth)

### Articles
- `GET /api/articles?page=1&pageSize=10` - Lấy danh sách bài (phân trang)
- `GET /api/articles/{id}` - Lấy chi tiết bài viết
- `POST /api/articles` - Tạo bài viết (cần auth)
- `PUT /api/articles/{id}` - Cập nhật bài viết (cần auth)
- `DELETE /api/articles/{id}` - Xóa bài viết (cần auth)

### Comments
- `GET /api/articles/{articleId}/comments` - Lấy bình luận của bài
- `POST /api/articles/{articleId}/comments` - Tạo bình luận mới

### Services (Dịch vụ hành chính)
- `GET /api/services` - Lấy danh sách dịch vụ

### Applications (Hồ sơ nộp)
- `GET /api/applications` - Lấy tất cả hồ sơ (admin)
- `GET /api/applications/{id}` - Lấy chi tiết hồ sơ
- `POST /api/applications` - Nộp hồ sơ mới

## Các model hiện có

### User
- Id: int (Primary Key)
- Username: string
- PasswordHash: string
- RoleId: int (Foreign Key → Role)

### Role
- Id: int (Primary Key)
- Name: string (Admin, Editor, Viewer)
- Users: ICollection (1-n)

### Article
- Id: int (Primary Key)
- Title: string
- Content: string
- CreatedAt: DateTime
- CategoryId: int (Foreign Key → Category)
- Comments: ICollection (1-n)

### Category
- Id: int (Primary Key)
- Name: string
- Articles: ICollection (1-n)

### Comment
- Id: int (Primary Key)
- Content: string
- ArticleId: int (Foreign Key → Article)
- CreatedAt: DateTime

### Service (Dịch vụ hành chính)
- Id: int (Primary Key)
- Name: string
- Description: string
- Applications: ICollection (1-n)

### Application (Hồ sơ nộp)
- Id: int (Primary Key)
- FullName: string
- ServiceId: int (Foreign Key → Service)
- Status: string (Pending, Processing, Approved, Rejected)
- CreatedAt: DateTime

## Chỉnh sửa Connection String

### Azure SQL (khuyến nghị)

Khai báo trong `appsettings.json` hoặc biến môi trường `ConnectionStrings__DefaultConnection`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<database>;Persist Security Info=False;User ID=<user>;Password=<password>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
}
```

### SQL Server local (tùy chọn cho dev máy cá nhân)

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=WardWebsite;Trusted_Connection=true;Encrypt=false;TrustServerCertificate=true;"
}
```

## Ghi chú

- Password được hash bằng BCrypt
- Frontend proxy API call qua `/api` → `http://localhost:5000`
- CORS cho phép tất cả (chỉ cho dev)
