import simpleGit from "simple-git";
import { mkdir, rm, readdir, readFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";

// Function to extract owner and repo from GitHub URL
export function parseGitHubUrl(url) {
  // Handle different GitHub URL formats
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) {
      throw new Error("Not a GitHub URL");
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub repository URL format");
    }

    return {
      owner: parts[0],
      repo: parts[1],
    };
  } catch (error) {
    throw new Error(`Invalid GitHub URL: ${error.message}`);
  }
}

// Function to clone a GitHub repository
export async function cloneRepository(url) {
  const { owner, repo } = parseGitHubUrl(url);
  const tempDir = path.join(tmpdir(), `github-${owner}-${repo}-${uuidv4()}`);

  try {
    await mkdir(tempDir, { recursive: true });
    const git = simpleGit();

    console.log(`Cloning ${url} to ${tempDir}...`);
    await git.clone(url, tempDir);

    return tempDir;
  } catch (error) {
    // Clean up if cloning fails
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Error cleaning up temp directory:", cleanupError);
    }

    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

// Function to get all code files from a directory, filtering for Python and JavaScript files only
export async function getCodeFiles(dir, extensions = [".js", ".jsx", ".py"]) {
  const files = [];

  async function scanDirectory(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, and other common non-source directories
        if (
          ![
            "node_modules",
            ".git",
            "dist",
            "build",
            "out",
            ".next",
            "coverage",
            "__pycache__",
            "venv",
            "env",
            ".venv",
          ].includes(entry.name)
        ) {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await scanDirectory(dir);
  return files;
}

// Function to read and process a repository
export async function processRepository(url) {
  let repoDir = null;

  try {
    repoDir = await cloneRepository(url);
    const codeFiles = await getCodeFiles(repoDir);

    const fileContents = {};

    for (const filePath of codeFiles) {
      try {
        const content = await readFile(filePath, "utf8");
        // Use relative path from the repo root
        const relativePath = path.relative(repoDir, filePath);
        fileContents[relativePath] = content;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }

    return fileContents;
  } catch (error) {
    throw new Error(`Error processing repository: ${error.message}`);
  } finally {
    // Clean up the temporary directory
    if (repoDir) {
      try {
        await rm(repoDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Error cleaning up repository directory:", error);
      }
    }
  }
}
