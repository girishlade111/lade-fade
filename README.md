# Lade Transfer - Secure File Sharing Platform

Lade Transfer is a secure, privacy-focused file sharing application that allows users to upload files and generate time-limited shareable links. Files automatically expire and delete after a specified time period, ensuring no traces are left behind.

## Features

- 🔒 **Privacy First**: End-to-end secure file sharing with automatic deletion
- ⏰ **Time Limited**: Set custom expiry times (10 minutes to 24 hours)
- 🗑️ **Auto-Delete**: Files automatically vanish after expiry - no traces left
- 🔐 **Password Protection**: Optional password protection for sensitive files
- ⚡ **Instant Sharing**: Generate shareable links in seconds
- 🔥 **Burn After Read**: Files can self-destruct after first download

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: React Query
- **Routing**: React Router
- **Backend**: Supabase (Database, Authentication, Storage)
- **Deployment**: Vercel (or your preferred platform)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/girishlade111/lade-fade.git
   ```

2. Navigate to the project directory:
   ```bash
   cd lade-fade
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   Create a `.env.local` file in the root directory with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit `http://localhost:5173`

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)

## Supabase Setup

1. Create a new Supabase project
2. Set up the database tables using the provided SQL migrations in the `supabase/migrations` directory
3. Configure Supabase Storage with an `uploads` bucket
4. Set up authentication providers as needed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Vite](https://vitejs.dev/) for the fast development environment