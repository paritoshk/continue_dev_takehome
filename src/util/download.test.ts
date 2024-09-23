import fs from "fs";
import path from "path";
import { installSinglePackage } from "./download"; // Adjust the import path as necessary
import { nodeModulesPath } from "./paths";
import { DependencyInstallation } from "../types";

describe("installSinglePackage", () => {
  it("downloads and installs to a specified directory", async () => {
    const dep: DependencyInstallation = {
      name: "is-thirteen",
      version: "2.0.0",
      parentDirectory: "test/node_modules/is-thirteen", // Updated to include the package name
    };

    await installSinglePackage(dep);
    const modulePath = path.join(
      nodeModulesPath,
      "test",
      "node_modules",
      "is-thirteen"
    );

    // Check if the directories exist
    expect(fs.existsSync(modulePath)).toBe(true);

    // Check the package.json file
    const packageJsonPath = path.join(modulePath, "package.json");
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    expect(packageJson.name).toBe(dep.name);
    expect(packageJson.version).toBe(dep.version);
  });
});

afterEach(() => {
  const modulePath = path.join(nodeModulesPath, "test", "node_modules", "is-thirteen");
  if (fs.existsSync(modulePath)) {
    fs.rmSync(modulePath, { recursive: true, force: true });
  }
});
