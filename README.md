# KodeReview

KodeReview is a web application that helps developers identify potential issues in their code through automated analysis and AI-powered code reviews. The application allows users to either paste code snippets directly or provide a GitHub repository URL for analysis.

## Features

- **Code Analysis**: Paste code snippets to get instant feedback
- **GitHub Repository Integration**: Analyze entire GitHub repositories
- **ESLint Integration**: Detect common coding errors and style issues
- **Security Scanning**: Identify potential security vulnerabilities in code
- **AI-Powered Reviews**: Get high-level code quality feedback using AI (when configured)

## Technologies Used

- **Next.js**: React framework for the frontend and API routes
- **ESLint**: JavaScript linting utility
- **Simple-Git**: For GitHub repository processing
- **OpenAI API**: For advanced AI-powered code reviews (optional)
- **TailwindCSS**: For styling the application

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git installed (for GitHub repository analysis)

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/kodereview.git
   cd kodereview
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key (optional):

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Analyzing Code Snippets

1. Select "Code Snippet" option
2. Paste your code in the provided text area
3. Click "Review Code"
4. View the analysis results, including:
   - ESLint issues
   - Security concerns
   - AI-powered recommendations (if configured)

### Analyzing GitHub Repositories

1. Select "GitHub Repository" option
2. Enter the GitHub repository URL (e.g., https://github.com/username/repo)
3. Click "Review Code"
4. View the analysis results for the repository files

## Customization

### Adding Custom ESLint Rules

You can customize the ESLint configuration by editing the `eslintConfig` object in `src/app/api/review/route.js`.

### Adding Security Patterns

To add more security patterns for detection, modify the `securityPatterns` array in `src/app/api/review/route.js`.

### Enhancing the AI Review

For production use, uncomment and configure the OpenAI integration in `src/app/api/review/route.js`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ESLint for providing the linting capabilities
- OpenAI for advanced code review capabilities
- Simple-Git for GitHub repository integration

## Future Enhancements

- Support for more programming languages
- More detailed security analysis
- Integration with other code hosting platforms
- User accounts for saving code review history
