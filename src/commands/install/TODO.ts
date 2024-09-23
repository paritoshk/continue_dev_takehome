import { InstallationPlan, DependencyInstallation } from "../../types";
import { getPackageInfo } from "../../util/registry";
import semver from "semver";

interface DependencyTree {
  [key: string]: {
    version: string;
    dependencies: DependencyTree;
  };
}

export async function constructInstallationPlan(
  topLevelDependencies: Record<string, string>
): Promise<InstallationPlan> {
  const dependencyTree: DependencyTree = {};
  const flatDependencies: Record<string, string> = {};
  const installationPlan: InstallationPlan = [];

  await resolveDependencies(topLevelDependencies, dependencyTree, flatDependencies);
  
  // Add top-level dependencies first
  for (const [name, version] of Object.entries(topLevelDependencies)) {
    installationPlan.push({
      name,
      version: flatDependencies[name],
      parentDirectory: `.pnpm/${name}@${flatDependencies[name]}/node_modules/${name}`,
    });
  }

  // Add nested dependencies
  for (const [name, version] of Object.entries(flatDependencies)) {
    if (!(name in topLevelDependencies)) {
      installationPlan.push({
        name,
        version,
        parentDirectory: `.pnpm/${name}@${version}/node_modules/${name}`,
      });
    }
  }

  return installationPlan;
}

async function resolveDependencies(
  dependencies: Record<string, string>,
  tree: DependencyTree,
  flat: Record<string, string>,
  path: string[] = []
): Promise<void> {
  for (const [name, versionRange] of Object.entries(dependencies)) {
    if (path.includes(name)) {
      console.warn(`Circular dependency detected: ${path.join(" -> ")} -> ${name}`);
      continue;
    }

    const existingVersion = flat[name];
    if (existingVersion && semver.satisfies(existingVersion, versionRange)) {
      continue;
    }

    const parentDirectory = path.length > 0
      ? `.pnpm/${path[path.length - 1]}@${tree[path[path.length - 1]]?.version}/node_modules/${name}`
      : `.pnpm/${name}@${versionRange}/node_modules/${name}`;

    const packageInfo = await getPackageInfo({
      name,
      version: versionRange,
      parentDirectory
    });
    const version = packageInfo.version;

    if (existingVersion && !semver.satisfies(version, versionRange)) {
      console.warn(`Version conflict for ${name}: ${existingVersion} vs ${version}`);
    }

    flat[name] = version;
    tree[name] = { version, dependencies: {} };

    await resolveDependencies(
      packageInfo.dependencies || {},
      tree[name].dependencies,
      flat,
      [...path, name]
    );
  }
}
