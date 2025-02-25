"use client";

import { useState } from "react";

export default function Home() {
  const [inputType, setInputType] = useState("code"); // "code" or "repo"
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input) {
      setError("Please enter code or a GitHub repository URL");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: inputType,
          content: input,
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to analyze code please check the code or link and try again"
        );
      }

      const data = await response.json();
      // Filter out duplicate eslint errors and warnings based on line and message
      const uniqueLintIssues = data.lintIssues.reduce((unique, item) => {
        const identifier = `${item.line}-${item.message}`;
        return unique.some(
          (issue) => `${issue.line}-${issue.message}` === identifier
        )
          ? unique
          : [...unique, item];
      }, []);
      data.lintIssues = uniqueLintIssues;

      // Filter out duplicate security issues based on title
      const uniqueSecurityIssues = data.securityIssues.reduce(
        (unique, item) => {
          const identifier = `${item.location}-${item.title}`;
          return unique.some(
            (issue) => `${issue.location}-${issue.title}` === identifier
          )
            ? unique
            : [...unique, item];
        },
        []
      );
      data.securityIssues = uniqueSecurityIssues;
      setResults(data);
    } catch (err) {
      setError(err.message || "An error occurred during code analysis");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Code Review
          </h1>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/yogeshr6/kodewalibai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Code Review
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Paste your code or enter a GitHub repository URL to get a
                comprehensive review.
              </p>

              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Currently, only Python and
                  JavaScript/JSX files are supported for review.
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name="inputType"
                        value="code"
                        checked={inputType === "code"}
                        onChange={() => setInputType("code")}
                      />
                      <span className="ml-2">Code Snippet</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name="inputType"
                        value="repo"
                        checked={inputType === "repo"}
                        onChange={() => setInputType("repo")}
                      />
                      <span className="ml-2">GitHub Repository</span>
                    </label>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {inputType === "code" ? (
                    <textarea
                      className="w-full h-64 px-3 py-2 text-gray-700 dark:text-gray-300 border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Paste your Python or JavaScript code here..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-gray-700 dark:text-gray-300 border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter GitHub repository URL (e.g., https://github.com/username/repo)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Note: Only Python (.py) and JavaScript (.js, .jsx) files
                        from the repository will be analyzed.
                      </p>
                    </>
                  )}

                  {error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  <div className="mt-4">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                      disabled={isLoading}
                    >
                      {isLoading ? "Analyzing..." : "Review Code"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {isLoading && (
              <div className="px-4 py-5 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
                <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  Analyzing your code... This may take a moment.
                </p>
              </div>
            )}

            {results && !isLoading && (
              <div className="px-4 py-5 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Review Results
                </h3>

                {results.lintIssues && results.lintIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                      ESLint Issues ({results.lintIssues.length})
                    </h4>
                    <ul className="space-y-2">
                      {results.lintIssues.map((issue, index) => (
                        <li
                          key={index}
                          className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md"
                        >
                          <span className="font-mono text-sm">
                            Line {issue.line}: {issue.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.securityIssues &&
                  results.securityIssues.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Security Issues ({results.securityIssues.length})
                      </h4>
                      <ul className="space-y-2">
                        {results.securityIssues.map((issue, index) => (
                          <li
                            key={index}
                            className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
                          >
                            <div className="font-medium">{issue.title}</div>
                            <div className="text-sm mt-1">
                              {issue.description}
                            </div>
                            {issue.location && (
                              <div className="font-mono text-xs mt-1">
                                Location: {issue.location}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {results.aiReview && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                      AI Review
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                      <div className="prose dark:prose-invert max-w-none">
                        {results.aiReview}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
