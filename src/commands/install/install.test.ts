import fs from "fs";
import path from "path";
import { DEFAULT_PACKAGE_JSON } from "../../util/packageJson";
import { nodeModulesPath, outputDir, packageJsonPath } from "../../util/paths";
import { installAllDependencies } from "./install";
import tar from "tar";

describe("npm install function", () => {
  it("should install lodash", async () => {
    // Hardcode package.json to include only lodash
    if (!outputDir) {
      fs.mkdirSync(outputDir);
    }
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          ...DEFAULT_PACKAGE_JSON,
          dependencies: {
            "lodash": "^4.17.21",
          },
        },
        undefined,
        2
      )
    );

    // Run install command
    await installAllDependencies();

    // Check that lodash is installed
    const p = path.join(nodeModulesPath, ".pnpm", "lodash@4.17.21", "node_modules", "lodash");
    expect(fs.existsSync(p)).toBe(true);
    const lodashPackageJson = JSON.parse(
      fs.readFileSync(path.join(p, "package.json"), "utf8")
    );
    expect(lodashPackageJson.version).toBe("4.17.21");
  });
});

afterEach(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});
