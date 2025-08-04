# Repo App Frontend

A modern React admin dashboard for vehicle repossession management, built with TypeScript, Tailwind CSS, and Vite.

## 🚀 Features

- **Modern UI/UX** with Tailwind CSS
- **TypeScript** for type safety
- **React Query** for data fetching and caching
- **React Router** for navigation
- **Form handling** with React Hook Form
- **Toast notifications** with React Hot Toast
- **Responsive design** for all devices
- **Real-time updates** with optimistic UI
- **Advanced search and filtering**
- **Bulk operations** for efficient management
- **File upload** with drag & drop
- **Data export** capabilities

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Query** for data management
- **React Router** for navigation
- **React Hook Form** for forms
- **Axios** for API calls
- **Heroicons** for icons
- **React Hot Toast** for notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running (see backend README)

## 🚀 Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

The frontend is configured to proxy API calls to the backend at `http://localhost:5000`. You can modify this in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   └── Layout.tsx     # Main layout with sidebar
├── hooks/             # Custom React hooks
│   └── useAuth.ts     # Authentication hook
├── pages/             # Page components
│   ├── Dashboard.tsx  # Dashboard overview
│   ├── Login.tsx      # Login page
│   ├── Users.tsx      # User management
│   ├── Vehicles.tsx   # Vehicle management
│   ├── Tasks.tsx      # Task management
│   ├── Proofs.tsx     # Proof management
│   ├── Upload.tsx     # File upload
│   └── Profile.tsx    # User profile
├── services/          # API services
│   └── api.ts        # API configuration and endpoints
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## 🔐 Authentication

The app uses JWT-based authentication with automatic token management:

- **Login**: `/login` - User authentication
- **Protected Routes**: All routes except login require authentication
- **Token Storage**: JWT tokens stored in localStorage
- **Auto Logout**: Automatic logout on token expiration

## 📊 Key Features

### Dashboard
- Overview statistics
- Recent activity
- Quick actions

### Vehicle Management
- List all vehicles with search/filter
- Add new vehicles
- Edit vehicle details
- Assign to agents
- Update status
- View proofs

### User Management
- List all users
- Add new users
- Edit user details
- Role management
- User statistics

### Task Management
- View assigned tasks
- Update task status
- Track progress
- Performance analytics

### File Upload
- Single file upload
- Bulk Excel upload
- Template download
- Progress tracking

## 🎨 UI Components

### Buttons
```tsx
<button className="btn btn-primary">Primary Button</button>
<button className="btn btn-secondary">Secondary Button</button>
<button className="btn btn-danger">Danger Button</button>
```

### Cards
```tsx
<div className="card p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

### Forms
```tsx
<input className="input" placeholder="Enter text" />
<select className="input">
  <option>Option 1</option>
</select>
```

## 🔄 State Management

The app uses React Query for server state management:

- **Automatic caching**
- **Background refetching**
- **Optimistic updates**
- **Error handling**
- **Loading states**

## 📱 Responsive Design

The app is fully responsive with:

- **Mobile-first** approach
- **Sidebar navigation** (collapsible on mobile)
- **Touch-friendly** interface
- **Optimized tables** for mobile

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Environment Variables
Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🔧 Development

### Adding New Pages
1. Create a new component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

### Adding New API Endpoints
1. Add endpoint in `src/services/api.ts`
2. Use in components with React Query

### Styling
- Use Tailwind CSS classes
- Custom styles in `src/index.css`
- Component-specific styles with CSS modules if needed

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Error**
   - Ensure backend is running on port 5000
   - Check proxy configuration in `vite.config.ts`

2. **TypeScript Errors**
   - Run `npm install` to ensure all types are installed
   - Check `tsconfig.json` configuration

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check for missing dependencies

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for efficient vehicle repossession management** 