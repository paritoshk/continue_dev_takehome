import fs from "fs";
import { DEFAULT_PACKAGE_JSON } from "../../util/packageJson";
import { outputDir, packageJsonPath } from "../../util/paths";
import { getPackageInfo } from "../../util/registry";

export async function addPackage(packageString: string): Promise<void> {
  const [packageName, version = "latest"] = packageString.split("@");
  
  const packageInfo = await getPackageInfo({
    name: packageName,
    version,
    parentDirectory: ''
  });

  const resolvedVersion = packageInfo.version;

  let packageJson;
  try {
    packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf8"));
  } catch (error) {
    packageJson = DEFAULT_PACKAGE_JSON;
  }

  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies[packageName] = resolvedVersion;

  await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}
