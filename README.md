# MemoryBox

MemoryBox is a personal web application designed to capture and cherish memories, anniversaries, love notes, messages, and photos. It provides a digital space for couples or individuals to store and revisit special moments.

## Features

- **Dashboard**: Overview of your memory collection
- **Memories**: Record and view personal memories
- **Anniversaries**: Track important dates and anniversaries
- **Love Notes**: Write and read heartfelt messages
- **Messages**: Exchange messages with loved ones
- **Gallery**: Upload and view photos
- **Timeline**: Visualize memories over time
- **Profile**: Manage your personal information

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: PHP, MySQL
- **Authentication**: JWT
- **File Uploads**: Supported for photos

## Installation

### Prerequisites
- Node.js and npm
- PHP 7.4 or higher
- MySQL database
- Composer (for PHP dependencies)

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd memorybox
   ```

2. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

3. Set up the backend:
   - Copy `api/config/env.example.php` to `api/config/env.php`
   - Configure your database settings in `env.php`
   - Run database migrations if any

4. Start the development servers:
   - Frontend: `npm run dev`
   - Backend: Ensure your PHP server is running (e.g., via Apache or built-in server)

## Usage

1. Register a new account or log in
2. Navigate through the dashboard to add memories, anniversaries, notes, and photos
3. View your collection in the gallery and timeline

## Live Site

Visit the live application at: [https://memorybox.infinityfreeapp.com/](https://memorybox.infinityfreeapp.com/)

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.