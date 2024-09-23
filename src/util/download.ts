import fs from "fs";
import https from "https";
import path from "path";
import * as tar from "tar";
import { DependencyInstallation } from "../types";
import { nodeModulesPath } from "./paths";
import { getPackageInfo } from "./registry";

export async function installSinglePackage(dep: DependencyInstallation): Promise<void> {
  console.log(`Installing ${dep.name}@${dep.version}...`);
  const packageInfo = await getPackageInfo(dep);
  
  if (!packageInfo.dist || !packageInfo.dist.tarball) {
    console.error(`Tarball URL not found for ${dep.name}@${dep.version}`);
    throw new Error(`Invalid package info for ${dep.name}@${dep.version}`);
  }

  const tarballUrl = packageInfo.dist.tarball;
  const targetDir = path.join(nodeModulesPath, dep.parentDirectory);
  fs.mkdirSync(targetDir, { recursive: true });
  const tarballPath = path.join(targetDir, `${dep.name}-${dep.version}.tgz`);

  try {
    await downloadTarball(tarballUrl, tarballPath);
    await extractTarball(tarballPath, targetDir);
    
    // Create package.json in the correct location
    const packageJsonPath = path.join(targetDir, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageInfo, null, 2));
    
    // Create a symlink in the root node_modules if it doesn't already exist
    const symlinkPath = path.join(nodeModulesPath, dep.name);
    if (!fs.existsSync(symlinkPath)) {
      const relativePath = path.relative(path.dirname(symlinkPath), targetDir);
      fs.symlinkSync(relativePath, symlinkPath, 'dir');
    }
    
    console.log(`Successfully installed ${dep.name}@${dep.version}`);
  } catch (e) {
    console.error(`Error installing package ${dep.name}@${dep.version}:`, e);
    throw e;
  } finally {
    if (fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
  }
}

async function downloadTarball(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download tarball: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);

      file.on("finish", () => {
        file.close();
        console.log(`Downloaded tarball to ${destination}`);
        resolve();
      });
    }).on("error", (error) => {
      fs.unlink(destination, () => {}); // Delete the file asynchronously on error
      reject(error);
    });
  });
}

async function extractTarball(tarballPath: string, destination: string): Promise<void> {
  try {
    await tar.x({
      file: tarballPath,
      cwd: destination,
      strip: 1,
    });
    console.log(`Extracted ${tarballPath} to ${destination}`);
  } catch (error) {
    console.error(`Error extracting tarball ${tarballPath}:`, error);
    throw error;
  }
}
