import { ESLint } from "eslint";
import { NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readdir, rm } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import path from "path";
// Import for AI API integration
import OpenAI from "openai";
// Import GitHub repository processor
import { processRepository } from "@/utils/githubProcessor";

// Initialize OpenAI client (would need an API key in production)
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY_2 });

// Security patterns to scan for
const securityPatterns = [
  // JavaScript patterns
  {
    pattern: /eval\s*\(/g,
    title: "Dangerous use of eval()",
    description:
      "The eval() function can execute arbitrary code, posing a security risk.",
    languages: ["js", "jsx", "ts", "tsx", "py"],
  },
  {
    pattern: /document\.write\s*\(/g,
    title: "Insecure DOM manipulation",
    description: "document.write() is vulnerable to XSS attacks.",
    languages: ["js", "jsx", "ts", "tsx"],
  },
  {
    pattern: /innerHTML\s*=/g,
    title: "Potential XSS vulnerability",
    description: "Using innerHTML can lead to cross-site scripting attacks.",
    languages: ["js", "jsx", "ts", "tsx"],
  },
  {
    pattern: /localStorage\s*\.\s*setItem\s*\(/g,
    title: "Sensitive data storage",
    description:
      "Be cautious when storing data in localStorage as it is not secure for sensitive information.",
    languages: ["js", "jsx", "ts", "tsx"],
  },
  {
    pattern: /password|token|secret|key/gi,
    title: "Potential hardcoded credentials",
    description:
      "Possible sensitive information found. Never hardcode passwords or keys.",
    languages: ["js", "jsx", "ts", "tsx", "py"],
  },
  {
    pattern: /\.exec\s*\(\s*req\.body|\.exec\s*\(\s*req\.query/g,
    title: "SQL Injection risk",
    description:
      "Direct use of user input in database queries creates SQL injection vulnerabilities.",
    languages: ["js", "jsx", "ts", "tsx"],
  },
  {
    pattern: /http:/g,
    title: "Insecure HTTP protocol",
    description:
      "Using HTTP instead of HTTPS can expose data to eavesdropping.",
    languages: ["js", "jsx", "ts", "tsx", "py"],
  },
  {
    pattern: /apiKey\s*=\s*["']*[^"']+/g,
    title: "Hardcoded API keys",
    description:
      "Hardcoded API keys or tokens expose your service to unauthorized access.",
    languages: ["js", "jsx", "ts", "tsx", "py"],
  },
  // Python-specific patterns
  {
    pattern: /exec\s*\(/g,
    title: "Dangerous use of exec()",
    description:
      "The exec() function can execute arbitrary code, posing a security risk.",
    languages: ["py"],
  },
  {
    pattern: /input\s*\(/g,
    title: "Unsafe input usage",
    description:
      "Using input() without proper validation can lead to security vulnerabilities.",
    languages: ["py"],
  },
  {
    pattern: /os\.system\s*\(/g,
    title: "Dangerous system command execution",
    description:
      "Direct execution of system commands can lead to command injection vulnerabilities.",
    languages: ["py"],
  },
  {
    pattern: /subprocess\.call\s*\(/g,
    title: "Unsafe subprocess execution",
    description:
      "Make sure to sanitize inputs when using subprocess to prevent command injection.",
    languages: ["py"],
  },
  {
    pattern: /pickle\.load/g,
    title: "Unsafe deserialization",
    description:
      "Using pickle for deserialization can lead to remote code execution vulnerabilities.",
    languages: ["py"],
  },
];

// Configure ESLint
const eslintConfig = {
  parser: "@babel/eslint-parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
    babelOptions: {
      presets: ["@babel/preset-react"],
    },
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  // We're just using some basic rules for now
  rules: {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "no-undef": "error",
    "no-cond-assign": "error",
    "no-unreachable": "warn",
    "no-compare-neg-zero": "error",
    semi: ["error", "always"],
  },
};

// Function to scan code for security issues
function scanForSecurityIssues(code, fileExt = ".js") {
  const issues = [];
  const fileType = fileExt.replace(".", "");

  securityPatterns.forEach((pattern) => {
    // Skip patterns that don't apply to this file type
    if (pattern.languages && !pattern.languages.includes(fileType)) {
      return;
    }

    const matches = [...code.matchAll(pattern.pattern)];

    if (matches.length > 0) {
      // Find line numbers for each match
      matches.forEach((match) => {
        // Calculate line number
        const lineNumber = code.substring(0, match.index).split("\n").length;

        issues.push({
          title: pattern.title,
          description: pattern.description,
          location: `Line ${lineNumber}`,
        });
      });
    }
  });

  return issues;
}

// Function to get AI review
async function getAIReview(code) {
  try {
    // For now, we'll return a static analysis since we're not connecting to an actual API
    // In production, this would call an AI API like OpenAI

    // Example of how to call OpenAI API:
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a code review assistant. Analyze the following code for quality, architecture, and best practices.",
        },
        {
          role: "user",
          content: code,
        },
      ],
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    // console.error("Error getting AI review:", error);
    // return "Unable to perform AI review at this time.";
    return "";
  }
}

// Function to analyze code using ESLint
async function lintCode(code, ext = ".js") {
  // Create a temporary directory
  const tempDir = join(tmpdir(), "code-review-" + uuidv4());
  await mkdir(tempDir, { recursive: true });

  const tempFile = join(tempDir, `temp${ext}`);
  await writeFile(tempFile, code);

  try {
    const eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: eslintConfig,
    });

    const results = await eslint.lintFiles([tempFile]);

    // Format the results
    const issues = results[0].messages.map((message) => ({
      line: message.line,
      column: message.column,
      severity: message.severity === 2 ? "error" : "warning",
      message: message.message,
      ruleId: message.ruleId,
    }));

    // Clean up the temporary directory
    await rm(tempDir, { recursive: true, force: true });

    return issues;
  } catch (error) {
    console.error("Error linting code:", error);

    // Clean up the temporary directory even if there's an error
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (rmError) {
      console.error("Error removing temporary directory:", rmError);
    }

    return [];
  }
}

// Function to determine file extension from code
function guessFileExtension(code) {
  // Check for React components
  if (
    code.includes("import React") ||
    (code.includes("class") && code.includes("extends React.Component")) ||
    code.includes("ReactDOM.render")
  ) {
    return code.includes("tsx") ? ".tsx" : ".jsx";
  }

  // Check for JavaScript functions and arrow functions
  if (
    code.includes("function") ||
    code.includes("=>") ||
    code.includes("const") ||
    code.includes("let") ||
    code.includes("var")
  ) {
    return ".js";
  }

  // Check for HTML documents
  if (code.includes("<!DOCTYPE html>") || code.includes("<html>")) {
    return ".html";
  }

  // Check for CSS styles
  if (code.includes("@import") || (code.includes("{}") && code.includes(";"))) {
    return ".css";
  }

  // Check for Python functions
  if (
    code.includes("def ") ||
    code.includes("import ") ||
    code.includes("class ")
  ) {
    return ".py"; // Return Python file extension
  }

  return ".js"; // Default to JavaScript
}

// Process all files in a repository
async function processRepositoryFiles(files) {
  console.log(`Starting analysis of ${Object.keys(files).length} files`);

  const results = {
    lintIssues: [],
    securityIssues: [],
    fileCount: Object.keys(files).length,
    processedFiles: [],
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fileExt = path.extname(filePath).toLowerCase();

    // Only process code files that ESLint can handle
    if ([".js", ".jsx", ".ts", ".tsx", ".py"].includes(fileExt)) {
      try {
        console.log(`Analyzing file: ${filePath}`);

        // Run ESLint on JavaScript files
        if ([".js", ".jsx", ".ts", ".tsx"].includes(fileExt)) {
          const lintResult = await lintCode(content, fileExt);

          if (lintResult && lintResult.length > 0) {
            results.lintIssues.push({
              filePath,
              issues: lintResult,
            });
            console.log(
              `Found ${lintResult.length} lint issues in ${filePath}`
            );
          }
        }

        // Run security scan on all files
        const securityResult = scanForSecurityIssues(content, fileExt);

        if (securityResult && securityResult.length > 0) {
          results.securityIssues.push({
            filePath,
            issues: securityResult,
          });
          console.log(
            `Found ${securityResult.length} security issues in ${filePath}`
          );
        }

        results.processedFiles.push(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    } else {
      console.log(`Skipping unsupported file type: ${filePath}`);
    }
  }

  // Flatten the lint issues for the response
  const flattenedLintIssues = results.lintIssues.flatMap((fileResult) =>
    fileResult.issues.map((issue) => ({
      ...issue,
      filePath: fileResult.filePath,
    }))
  );

  // Flatten the security issues for the response
  const flattenedSecurityIssues = results.securityIssues.flatMap((fileResult) =>
    fileResult.issues.map((issue) => ({
      ...issue,
      filePath: fileResult.filePath,
    }))
  );

  results.lintIssues = flattenedLintIssues;
  results.securityIssues = flattenedSecurityIssues;

  console.log(
    `Analysis complete. Found ${flattenedLintIssues.length} lint issues and ${flattenedSecurityIssues.length} security issues`
  );

  return results;
}

// Main API handler
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    // Handle code snippet
    if (type === "code") {
      try {
        const fileExt = guessFileExtension(content);
        if (fileExt !== ".py" && fileExt !== ".js" && fileExt !== ".jsx") {
          return NextResponse.json(
            {
              error:
                "Unsupported file type. Only Python and JavaScript/JSX are supported.",
            },
            { status: 400 }
          );
        }
        const lintIssues = await lintCode(content, fileExt);
        const securityIssues = scanForSecurityIssues(content, fileExt);
        const aiReview = await getAIReview(content);

        return NextResponse.json({
          lintIssues,
          securityIssues,
          aiReview,
        });
      } catch (error) {
        console.error("Error analyzing code snippet:", error);
        return NextResponse.json(
          { error: `Failed to analyze code: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Handle GitHub repository URL
    if (type === "repo") {
      try {
        console.log("Processing GitHub repository:", content);

        if (!content.includes("github.com")) {
          return NextResponse.json(
            {
              error:
                "Invalid GitHub URL. Please provide a valid GitHub repository URL.",
            },
            { status: 400 }
          );
        }

        const files = await processRepository(content);
        console.log(
          `Repository processed. Found ${Object.keys(files).length} files`
        );

        if (Object.keys(files).length === 0) {
          return NextResponse.json(
            { error: "No JavaScript or Python files found in the repository." },
            { status: 404 }
          );
        }

        const results = await processRepositoryFiles(files);
        console.log("Repository analysis complete:", {
          fileCount: results.fileCount,
          processedFiles: results.processedFiles.length,
        });

        // Generate AI review only for repositories with reasonable size
        let aiReview = null;
        const sampleFiles = Object.entries(files).slice(0, 3);

        if (sampleFiles.length > 0) {
          // Sample the first few files for AI review
          const combinedContent = sampleFiles
            .map(([path, content]) => `// File: ${path}\n\n${content}`)
            .join("\n\n");

          aiReview = await getAIReview(combinedContent);
        }

        return NextResponse.json({
          repositoryUrl: content,
          fileCount: results.fileCount,
          processedFiles: results.processedFiles,
          lintIssues: results.lintIssues,
          securityIssues: results.securityIssues,
          aiReview,
        });
      } catch (error) {
        console.error("Repository analysis error:", error);
        return NextResponse.json(
          {
            error: `Error processing repository: ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid request type. Must be 'code' or 'repo'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
