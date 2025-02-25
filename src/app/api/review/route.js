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
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Security patterns to scan for
const securityPatterns = [
  {
    pattern: /eval\s*\(/g,
    title: "Dangerous use of eval()",
    description:
      "The eval() function can execute arbitrary code, posing a security risk.",
  },
  {
    pattern: /document\.write\s*\(/g,
    title: "Insecure DOM manipulation",
    description: "document.write() is vulnerable to XSS attacks.",
  },
  {
    pattern: /innerHTML\s*=/g,
    title: "Potential XSS vulnerability",
    description: "Using innerHTML can lead to cross-site scripting attacks.",
  },
  {
    pattern: /localStorage\s*\.\s*setItem\s*\(/g,
    title: "Sensitive data storage",
    description:
      "Be cautious when storing data in localStorage as it is not secure for sensitive information.",
  },
  {
    pattern: /password|token|secret|key/gi,
    title: "Potential hardcoded credentials",
    description:
      "Possible sensitive information found. Never hardcode passwords or keys.",
  },
  {
    pattern: /\.exec\s*\(\s*req\.body|\.exec\s*\(\s*req\.query/g,
    title: "SQL Injection risk",
    description:
      "Direct use of user input in database queries creates SQL injection vulnerabilities.",
  },
  {
    pattern: /http:/g,
    title: "Insecure HTTP protocol",
    description:
      "Using HTTP instead of HTTPS can expose data to eavesdropping.",
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
    semi: ["error", "always"],
  },
};

// Function to scan code for security issues
function scanForSecurityIssues(code) {
  const issues = [];

  securityPatterns.forEach((pattern) => {
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

    /* Example of how to call OpenAI API:
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a code review assistant. Analyze the following code for quality, architecture, and best practices."
        },
        {
          role: "user",
          content: code
        }
      ],
    });
    
    return completion.choices[0].message.content;
    */

    // Sample response for demonstration
    return `
      ## Code Review

      ### Structure and Readability
      - The code is generally well-structured but could benefit from more consistent formatting.
      - Consider adding more comments to explain complex logic.
      
      ### Best Practices
      - Follow the principle of single responsibility for functions and components.
      - Implement proper error handling for asynchronous operations.
      
      ### Performance Considerations
      - Look for opportunities to memoize expensive calculations.
      - Consider using optimized data structures for large datasets.
      
      These are general suggestions. For more specific feedback, connect the application to a full AI code review service.
    `;
  } catch (error) {
    console.error("Error getting AI review:", error);
    return "Unable to perform AI review at this time.";
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
  if (
    code.includes("import React") ||
    (code.includes("class") && code.includes("extends React.Component"))
  ) {
    return code.includes("tsx") ? ".tsx" : ".jsx";
  }
  if (
    code.includes("function") &&
    code.includes("=>") &&
    code.includes("const")
  ) {
    return ".js";
  }
  if (code.includes("<!DOCTYPE html>") || code.includes("<html>")) {
    return ".html";
  }
  if (code.includes("@import") || (code.includes("{}") && code.includes(";"))) {
    return ".css";
  }
  return ".js"; // Default to JavaScript
}

// Process all files in a repository
async function processRepositoryFiles(files) {
  const results = {
    lintIssues: [],
    securityIssues: [],
    fileCount: Object.keys(files).length,
    processedFiles: [],
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fileExt = path.extname(filePath);

    // Only process code files that ESLint can handle
    if ([".js", ".jsx", ".ts", ".tsx"].includes(fileExt)) {
      try {
        const lintResult = await lintCode(content, fileExt);

        if (lintResult.length > 0) {
          results.lintIssues.push({
            filePath,
            issues: lintResult,
          });
        }

        const securityResult = scanForSecurityIssues(content);

        if (securityResult.length > 0) {
          results.securityIssues.push({
            filePath,
            issues: securityResult,
          });
        }

        results.processedFiles.push(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  }

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
      const fileExt = guessFileExtension(content);
      const lintIssues = await lintCode(content, fileExt);
      const securityIssues = scanForSecurityIssues(content);
      const aiReview = await getAIReview(content);

      return NextResponse.json({
        lintIssues,
        securityIssues,
        aiReview,
      });
    }

    // Handle GitHub repository URL
    if (type === "repo") {
      try {
        const files = await processRepository(content);
        const results = await processRepositoryFiles(files);

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
        return NextResponse.json(
          {
            error: `Error processing repository: ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid request type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
