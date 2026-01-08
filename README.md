# Vite React Shadcn Template

A modern, feature-rich React application built with Vite, TypeScript, and shadcn/ui components. This template provides a solid foundation for building scalable web applications with a beautiful, accessible UI.

## 🚀 Features

- **Modern Tech Stack**: Built with React, TypeScript, Vite, and Tailwind CSS
- **Beautiful UI Components**: Powered by shadcn/ui with Radix UI primitives
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Form Handling**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query for efficient server state management
- **Drag & Drop**: DnD Kit for intuitive drag and drop interactions
- **Dark Mode**: Built-in dark/light theme support
- **Charts & Data Visualization**: Recharts for data visualization
- **Date Handling**: date-fns for date operations
- **Accessibility**: ARIA-compliant components from Radix UI
- **Animations**: Smooth animations with Tailwind CSS and custom keyframes

## 🛠️ Technology Stack

### Framework & Language
- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [Vite](https://vitejs.dev/) - Fast build tool and development server
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### UI Components & Libraries
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built using Radix UI and Tailwind CSS
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components
- [Lucide React](https://lucide.dev/) - Beautifully simple icons
- [Recharts](https://recharts.org/) - Charting library based on D3
- [React Hook Form](https://react-hook-form.com/) - Performant, flexible forms
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [Sonner](https://sonner.emilkowal.ski/) - Accessible toast component

### Additional Libraries
- [TanStack Query](https://tanstack.com/query) - Server state management
- [DnD Kit](https://dndkit.com/) - Modern, lightweight drag and drop toolkit
- [React Router](https://reactrouter.com/) - Declarative routing for React
- [date-fns](https://date-fns.org/) - Modern JavaScript date utility library
- [Supabase](https://supabase.com/) - Open source Firebase alternative

## 📦 Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd vite_react_shadcn_ts
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## 🚀 Development

1. **Start the development server**

```bash
npm run dev
```

Your application will be available at `http://localhost:8080`

2. **Build for production**

```bash
npm run build
```

3. **Preview the production build**

```bash
npm run preview
```

4. **Lint the code**

```bash
npm run lint
```

## 🗂️ Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Utility functions and configuration
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── assets/            # Images and other assets
│   ├── types/             # TypeScript type definitions
│   └── App.tsx            # Main application component
├── components.json        # shadcn/ui configuration
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## 🧪 Testing

Coming soon - Testing utilities will be added to help ensure code quality.

## 💄 Customization

### UI Theme
- Modify the theme in `tailwind.config.ts`
- Update color schemes in the `extend.colors` section
- Add custom animations in the `extend.animation` section

### Components
- Add new components to the `src/components/ui` directory
- Use `npx shadcn-ui@latest add [component-name]` to install additional shadcn/ui components
- Create page-specific components in the `src/components` directory

## 🚀 Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Set build command to `npm run build`
3. Set output directory to `dist`
4. Set Node version to 18.x or higher

### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command to `npm run build`
3. Set publish directory to `dist`

### GitHub Pages
1. Build the project with `npm run build`
2. Deploy the `dist` folder to your GitHub Pages branch

## 🔧 Commands

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run build:dev` - Build the application in development mode
- `npm run lint` - Lint the codebase
- `npm run preview` - Preview the production build locally

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions, feel free to open an issue in the repository.