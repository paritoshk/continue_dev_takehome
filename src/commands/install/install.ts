import fs from "fs";
import path from "path";
import { packageJsonPath } from "../../util/paths";
import { constructInstallationPlan } from "./challenge";
import { installSinglePackage } from "../../util/download";

/**
 * This is the function that is called when the `install` CLI command is run
 */
export async function installAllDependencies(): Promise<void> {
  console.log("Installing dependencies...");

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at path: ${packageJsonPath}`);
  }

  // Read and parse package.json
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  let packageJson;
  
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (err) {
    throw new Error("Failed to parse package.json");
  }

  const dependencies = packageJson.dependencies || {};

  console.log("Dependencies found:", dependencies);

  // Construct installation plan
  const installationPlan = await constructInstallationPlan(dependencies);

  // Install each dependency
  for (const dep of installationPlan) {
    console.log(`Installing ${dep.name}@${dep.version}...`);
    await installSinglePackage(dep);
  }

  console.log("Installation complete!");
}
